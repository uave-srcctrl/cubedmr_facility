# 🗄️ Tabla de Base de Datos para Autenticación en API Externa

**Fecha:** 16 de Enero de 2026

---

## ❓ Pregunta

¿Contra qué tabla se verifica la contraseña en la base de datos externa (cubed-mr.app)?

---

## 📋 Respuesta

### **NO SABEMOS** (No Está Documentado en el Código Local)

El servidor local **NO especifica** contra qué tabla se verifica. Solo envía el request a `https://cubed-mr.app/api/get`.

```typescript
const remoteResponse = await fetchWithTimeout(
  "https://cubed-mr.app/api/get",  // ← Endpoint remoto
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(remotePayload),  // ← Envía credenciales
  }
);
```

---

## 📤 Lo que SE Envía a cubed-mr.app

**Archivo:** `server/routes.ts` (líneas 119-130)

```typescript
const remotePayload = {
  entity: "TryLoginFacilities",     // ← Especifica el método
  email: "drperez@curisec.com",     // ← Identificador
  password: "password123",           // ← Contraseña
  deviceId: "90375536-da97-...",    // ← Device ID
  name: undefined,                   // ← Nombre (opcional)
  ...rest,                           // ← Otros parámetros
};
```

### Payload Completo

```json
POST https://cubed-mr.app/api/get

{
  "entity": "TryLoginFacilities",
  "email": "drperez@curisec.com",
  "password": "password123",
  "deviceId": "90375536-da97-4f54-80de-fac09b4e08b8"
}
```

---

## 🔍 Pistas sobre la Tabla Remota

### Pista 1: Nombre del Endpoint
```
entity: "TryLoginFacilities"
         └─ "Facilities" sugiere tabla relacionada con facilities
```

### Pista 2: Parámetros Requeridos
- `email` - Identificador de usuario
- `password` - Contraseña
- `deviceId` - Para tracking de dispositivo

### Pista 3: Respuesta Esperada
```json
{
  "status": true,
  "data": [{
    "status": 1,
    "facilityId": "...",        // ← Facility ID
    "email": "...",             // ← Email del usuario
    "name": "...",              // ← Nombre del usuario
    "msg": "Success"
  }]
}
```

---

## 📊 Posibles Estructuras de Tabla

### Opción 1: Tabla `users` Directa

```sql
-- Posible estructura en cubed-mr.app
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name VARCHAR,
  created_at TIMESTAMP
);
```

**Verificación:**
```sql
SELECT * FROM users 
WHERE email = 'drperez@curisec.com' 
AND password = hashFunction('password123');
```

### Opción 2: Tabla `facility_users` (Más Probable)

```sql
-- Posible estructura con facilities
CREATE TABLE facility_users (
  id UUID PRIMARY KEY,
  facility_id UUID NOT NULL,
  email VARCHAR NOT NULL,
  password TEXT NOT NULL,
  name VARCHAR,
  FOREIGN KEY (facility_id) REFERENCES facilities(id)
);
```

**Verificación:**
```sql
SELECT facilities FROM facility_users 
WHERE email = 'drperez@curisec.com' 
AND password = hashFunction('password123');
```

### Opción 3: Tabla `accounts` o `credentials`

```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE,
  password TEXT,
  facilities JSON,
  device_id VARCHAR
);
```

---

## 📋 Comparación: Local vs Remota

| Aspecto | Sistema Local | Sistema Remoto (cubed-mr.app) |
|---------|--------------|-------------------------------|
| **Schema Definido** | ✅ Sí (schema.ts) | ❓ Desconocido |
| **Tabla Local** | `users` (Drizzle ORM) | ❓ Desconocido |
| **Estructura** | id, username, password | ❓ id?, email, password, facilityId? |
| **Tipo BD** | PostgreSQL (configurada) | ❓ SQL/NoSQL/Otro |
| **Documentación** | schema.ts | ❌ No disponible |

---

## 📝 Schema Local (Para Referencia)

**Archivo:** `shared/schema.ts`

```typescript
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),  // ← username, no email
  password: text("password").notNull(),
});
```

**Nota:** La tabla local usa `username`, pero el API envía `email`.

---

## 🔍 Cómo Descubrir la Tabla Real

### Opción 1: Documentación Oficial
- Buscar documentación de cubed-mr.app
- Contactar al equipo de cubed-mr.app
- Revisar README o wiki del proyecto

### Opción 2: Reverse Engineering (Inspeccionar Respuestas)

```bash
# Realizar login exitoso y ver respuesta
curl -X POST https://cubed-mr.app/api/get \
  -d '{"entity":"TryLoginFacilities","email":"user@example.com","password":"pass","deviceId":"test"}'

# Analizar campos retornados
# Esto sugiere qué campos están en la tabla remota
```

### Opción 3: Logs del Sistema Remoto
- Pedir logs de cubed-mr.app
- Ver queries de base de datos
- Identificar tabla utilizada

### Opción 4: Profiling de Base de Datos
```bash
# Si tienes acceso a BD remota
SELECT * FROM information_schema.tables 
WHERE table_name LIKE '%user%' OR table_name LIKE '%credential%';

# Ver estructura
SELECT * FROM information_schema.columns 
WHERE table_name = 'nombre_tabla_encontrada';
```

---

## 🎯 Conclusión

### Lo que Sabemos
✅ Existe un endpoint `/api/get` en cubed-mr.app
✅ Acepta: entity, email, password, deviceId
✅ Retorna: facilities, email, name, status
✅ Verifica credenciales contra BD remota
✅ Usa método `TryLoginFacilities`

### Lo que NO Sabemos
❌ Nombre exacto de la tabla
❌ Estructura exacta de la tabla
❌ Tipo de base de datos
❌ Método de hashing de contraseña
❌ Campos adicionales
❌ Índices y relaciones

### Recomendación
**OBTENER DOCUMENTACIÓN** de cubed-mr.app que especifique:
1. Tabla de usuarios
2. Campos disponibles
3. Método de autenticación
4. Estructura de datos
5. Restricciones y validaciones

---

**Análisis realizado:** 2026-01-16T19:35
**Fuente de información:** Código local de client/server
**Datos disponibles:** Request/Response observados
**Certeza:** ⚠️ ESPECULATIVA (Sin documentación)
