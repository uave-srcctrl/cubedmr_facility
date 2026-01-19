# 🔐 Autenticación Local con TryLogin

## 📝 Descripción

Se ha implementado **autenticación local** usando la tabla `users` de la base de datos local, en lugar de (o además de) hacer proxy al backend remoto.

El flujo ahora es:

```
Cliente → POST /api/get (action: "TryLogin")
    ↓
Server verifica credenciales en tabla local `users`
    ↓
Si válidas: genera JWT token
    ↓
Retorna {status: true, data: [{status: 1, token, ...}]}
```

---

## 🗄️ Tabla `users`

**Ubicación:** `facility/shared/schema.ts`

```typescript
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});
```

**Campos:**
- `id`: UUID único
- `username`: Email del usuario (ej: drperez@curisec.com)
- `password`: Contraseña (almacenada como texto plano - mejorar en producción)

---

## 🔄 Cambios Implementados

### 1. Cliente (React) - `login.tsx`
- ✅ Cambió de `TryLoginFacilities` a `TryLogin`
- ✅ Elimina el parámetro `name` innecesario
- ✅ Mantiene compatibilidad con `deviceId`

```typescript
// Antes
action: "TryLoginFacilities"

// Ahora
action: "TryLogin"
```

### 2. Servidor (Express) - `routes.ts`
- ✅ Importa `jwt` para generar tokens
- ✅ Define `JWT_SECRET` desde variables de entorno
- ✅ Endpoint `/api/get` ahora:
  1. Si `action === "TryLogin"`: autentica contra tabla local
  2. Verifica credenciales contra `storage.getUserByUsername(email)`
  3. Genera JWT token si son válidas
  4. Cachea la información del usuario

**Flujo del endpoint:**

```typescript
if (requestedEntity === "TryLogin") {
  // 1. Buscar usuario
  const user = await storage.getUserByUsername(email);
  
  // 2. Verificar password
  if (password !== user.password) {
    return {status: false, data: [{reason: 3, msg: "..."}]}
  }
  
  // 3. Generar token
  const token = jwt.sign({...}, JWT_SECRET, {expiresIn: "7d"});
  
  // 4. Retornar éxito
  return {
    status: true,
    data: [{
      status: 1,
      token,
      entityId: user.id,
      entityName: user.username,
      facilities: [user.id]
    }]
  }
}
```

### 3. Respuesta de Login

**Exitoso:**
```json
{
  "status": true,
  "data": [{
    "status": 1,
    "token": "eyJhbGc...",
    "entityId": "123e4567-e89b-12d3-a456-426614174000",
    "entityName": "drperez@curisec.com",
    "entity": "TryLogin",
    "facilities": ["123e4567-e89b-12d3-a456-426614174000"],
    "msg": "Success"
  }]
}
```

**Fallido:**
```json
{
  "status": false,
  "data": [{
    "status": 0,
    "reason": 3,
    "email": "drperez@curisec.com",
    "msg": "Email and password combination failed.",
    "token": ""
  }]
}
```

---

## 🛠️ Setup & Pruebas

### 1. Crear usuarios de prueba

```bash
# El servidor tiene storage en memoria, así que los usuarios se crean por código
# Ver: facility/server/create-test-users.js
```

### 2. Probar autenticación con curl

```bash
curl -X POST "http://localhost:5000/api/get" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "TryLogin",
    "email": "drperez@curisec.com",
    "password": "password123",
    "deviceId": "web-device"
  }'
```

### 3. Ejecutar suite de pruebas

```bash
node /var/www/facility/test/test-local-auth.js
```

---

## 🔒 Seguridad

### Consideraciones actuales:
- ⚠️ Contraseñas almacenadas en **texto plano**
- ✅ JWT token válido por **7 días**
- ✅ Rate limiting en endpoint (**20 intentos / 15 min**)
- ⚠️ Storage en **memoria** (se pierde al reiniciar)

### Mejoras necesarias para Producción:
1. **Hashing de contraseñas**: Usar bcrypt/argon2
2. **Persistencia**: Migrar a PostgreSQL/MySQL
3. **JWT Secret**: Usar variable de entorno segura
4. **HTTPS**: Requerido para transmisión de credenciales
5. **Refresh tokens**: Implementar token refresh

---

## 📋 Usuarios de Prueba Disponibles

Después de crear usuarios con `create-test-users.js`:

| Email | Contraseña |
|-------|-----------|
| drperez@curisec.com | password123 |
| admin@curisec.com | admin123 |
| test@example.com | 12345678 |
| facility1@wounddatacenter.com | facilities123 |

---

## 🔄 Flujo Completo

```
1. Usuario ingresa credenciales en /facility/login
   ↓
2. Cliente POST /api/get con:
   {
     action: "TryLogin",
     email: "drperez@curisec.com",
     password: "password123",
     deviceId: "web-xxx"
   }
   ↓
3. Servidor verifica en tabla users
   ↓
4. Si válido: genera JWT, cachea usuario, retorna token
   ↓
5. Cliente almacena en localStorage:
   - authToken (JWT)
   - userEmail
   - userEntityId
   - userEntityName
   ↓
6. Cliente puede ahora hacer requests autenticados
   con header: Authorization: Bearer {token}
```

---

## 📁 Archivos Modificados/Creados

| Archivo | Cambio | Descripción |
|---------|--------|-------------|
| [facility/client/src/pages/login.tsx](facility/client/src/pages/login.tsx) | Modificado | Cambió a TryLogin |
| [facility/server/routes.ts](facility/server/routes.ts) | Modificado | Lógica de TryLogin local |
| [facility/test/test-local-auth.js](facility/test/test-local-auth.js) | Creado | Suite de pruebas |
| [facility/server/create-test-users.js](facility/server/create-test-users.js) | Creado | Crear usuarios de prueba |

---

## ✅ Próximos Pasos

- [ ] Reiniciar servidor Node.js
- [ ] Crear usuarios de prueba
- [ ] Ejecutar tests de autenticación
- [ ] Verificar login en interfaz web
- [ ] Implementar bcrypt para producción
- [ ] Migrar storage a BD persistente
- [ ] Configurar JWT_SECRET en environment
- [ ] Agregar refresh tokens
- [ ] Implementar logout
