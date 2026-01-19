# 🔐 Sistema de Autenticación - Descripción Completa

## 📋 Índice
1. [Flujo de Autenticación](#flujo-de-autenticación)
2. [Endpoint: POST /api/get](#endpoint-post-apget)
3. [Métodos de Autenticación](#métodos-de-autenticación)
4. [Usuarios de Prueba](#usuarios-de-prueba)
5. [Seguridad](#seguridad)
6. [Respuestas](#respuestas)

---

## 🔄 Flujo de Autenticación

### Paso 1: Cliente Envía Solicitud
El cliente (React frontend) envía un POST a `/api/get` con:
```json
{
  "action": "TryLogin",
  "email": "drperez@curisec.com",
  "password": "password123",
  "deviceId": "90375536-da97-4f54-80de-fac09b4e08b8"
}
```

### Paso 2: Servidor Recibe y Valida
```
1. Verifica que tenga: action/entity, email, password, deviceId
2. Identifica que es "TryLogin"
3. Busca usuario en tabla local (users) por email
```

### Paso 3: Verificación de Contraseña
```
1. Si usuario NO existe → Error "User not found"
2. Si existe, compara contraseña:
   - Comparación directa: password === user.password
   - O hash SHA256: hashPasswordSHA256(password) === user.password
```

### Paso 4: Generación de Token
Si contraseña es correcta:
```typescript
const token = jwt.sign(
  { 
    id: user.id, 
    username: user.username, 
    email: user.username,
    type: "local_user"
  },
  EFFECTIVE_JWT_SECRET,
  { expiresIn: "7d" }
);
```

### Paso 5: Respuesta Exitosa
```json
{
  "status": true,
  "data": [{
    "status": 1,
    "token": "eyJhbGc...",
    "entityId": "uuid-del-usuario",
    "entityName": "drperez@curisec.com",
    "entity": "TryLogin",
    "facilities": ["uuid-del-usuario"],
    "msg": "Success"
  }]
}
```

---

## 📡 Endpoint: POST /api/get

### URL
```
POST http://localhost:5000/api/get
```

### Headers
```
Content-Type: application/json
```

### Body (Requerido)
```json
{
  "action": "TryLogin",
  "email": "string (required)",
  "password": "string (required)",
  "deviceId": "string (required)"
}
```

### Parámetros
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `action` o `entity` | string | ✅ | Tipo de autenticación: "TryLogin" para autenticación local |
| `email` | string | ✅ | Email/username del usuario |
| `password` | string | ✅ | Contraseña en texto plano |
| `deviceId` | string | ✅ | ID único del dispositivo/sesión |

### Rate Limiting
- **Límite**: 20 intentos por IP
- **Ventana**: 15 minutos
- **Error si se excede**: HTTP 429 "Too many login attempts"

---

## 🔑 Métodos de Autenticación

### Método 1: TryLogin (ACTUAL)
**Descripción:** Autenticación local contra tabla `users`

**Flujo:**
```
1. Buscar usuario por email en tabla local
2. Comparar contraseña (texto plano o SHA256)
3. Generar JWT token
4. Cachear facilities del usuario
5. Retornar token
```

**Ventajas:**
- ✅ No depende de backend remoto
- ✅ Rápido (sin latencia remota)
- ✅ JWT válido por 7 días
- ✅ Funciona offline

**Almacenamiento:**
- Usuarios: Tabla `users` en memoria (MemStorage)
- Cache: Facilities cacheadas en MAP por email

### Método 2: TryLoginFacilities (LEGACY - FALLBACK)
**Descripción:** Autenticación contra backend remoto (cubed-mr.app)

**Flujo:**
```
1. Si no es TryLogin, intenta remoto
2. Envía solicitud a https://cubed-mr.app/api/get
3. Recibe respuesta del backend
4. Cachea facilities
5. Retorna respuesta del backend
```

**Cuándo se usa:**
- Si `action` es diferente a "TryLogin"
- Como fallback para compatibilidad

---

## 👥 Usuarios de Prueba

Estos usuarios se crean **automáticamente** al iniciar el servidor:

| Email | Contraseña | Uso |
|-------|-----------|-----|
| `drperez@curisec.com` | `password123` | Prueba principal |
| `admin@curisec.com` | `admin123` | Usuario administrador |
| `test@example.com` | `12345678` | Usuario genérico |
| `facility1@wounddatacenter.com` | `facilities123` | Facility admin |

### Cómo se crean
En `server/routes.ts`, líneas 102-120:
```typescript
const TEST_USERS = [
  { username: "drperez@curisec.com", password: "password123" },
  { username: "admin@curisec.com", password: "admin123" },
  { username: "test@example.com", password: "12345678" },
  { username: "facility1@wounddatacenter.com", password: "facilities123" },
];

for (const testUser of TEST_USERS) {
  const existing = await storage.getUserByUsername(testUser.username);
  if (!existing) {
    await storage.createUser(testUser);
    console.log(`✅ Test user created: ${testUser.username}`);
  }
}
```

### Verificación en Logs
```
Jan 16 19:19:19 server ✅ Test user created: drperez@curisec.com
Jan 16 19:19:19 server ✅ Test user created: admin@curisec.com
Jan 16 19:19:19 server ✅ Test user created: test@example.com
Jan 16 19:19:19 server ✅ Test user created: facility1@wounddatacenter.com
```

---

## 🔒 Seguridad

### Protección Implementada

#### 1. Rate Limiting
- **20 intentos por 15 minutos** por IP
- Previene fuerza bruta
- Retorna HTTP 429 si se excede

#### 2. Verificación de Contraseña
- **Comparación directa**: `password === user.password`
- **SHA256**: `hashPasswordSHA256(password) === user.password`
- Compatible con contraseñas antiguas

#### 3. JWT Tokens
- **Algoritmo**: HS256 (HMAC SHA256)
- **Secret**: `process.env.JWT_SECRET` o `"dev-secret-key-change-in-production"`
- **Expiración**: 7 días
- **Payload**: id, username, email, type

#### 4. Logging
- Todos los intentos se registran en `/tmp/wounddatacenter-login.log`
- Auditoría de autenticación
- Errores son rastreables

#### 5. Caching Seguro
- Facilities se cachean por email
- Timestamp para validación
- Previene información obsoleta

### ⚠️ Limitaciones Actuales

- ⚠️ Contraseñas en **texto plano** en base de datos
- ⚠️ Sin bcrypt (revertido)
- ⚠️ Sin 2FA (Two-Factor Authentication)
- ⚠️ Sin validación SSL en conexión remota
- ⚠️ Sin HTTPS enforcement (desactivado en desarrollo)

### 🔐 Recomendaciones de Producción

```
1. Implementar Bcrypt para hashing
2. Usar HTTPS obligatorio (middleware activo)
3. Generar JWT_SECRET seguro: openssl rand -base64 32
4. Migrar a PostgreSQL desde MemStorage
5. Implementar 2FA (TOTP)
6. Agregar auditoría detallada
7. Validar tokens en cada request
8. Establecer política de expiración de sesiones
```

---

## 📊 Respuestas

### ✅ Respuesta Exitosa (200 OK)
```json
{
  "status": true,
  "data": [{
    "status": 1,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "entityId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "entityName": "drperez@curisec.com",
    "entity": "TryLogin",
    "facilities": ["f47ac10b-58cc-4372-a567-0e02b2c3d479"],
    "msg": "Success"
  }]
}
```

### ❌ Usuario No Encontrado (200 OK)
```json
{
  "status": false,
  "data": [{
    "status": 0,
    "reason": 3,
    "email": "noexiste@example.com",
    "msg": "Email and password combination failed.",
    "token": ""
  }]
}
```

### ❌ Contraseña Incorrecta (200 OK)
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

### ❌ Parámetros Faltantes (400 Bad Request)
```json
{
  "status": false,
  "error": "Missing required parameter: deviceId"
}
```

### ❌ Rate Limit Excedido (429 Too Many Requests)
```json
{
  "status": false,
  "error": "Too many login attempts. Please try again later."
}
```

### ❌ Error del Servidor (500 Internal Server Error)
```json
{
  "status": false,
  "error": "Server error"
}
```

---

## 🧪 Prueba de Autenticación

### Con cURL
```bash
curl -X POST http://localhost:5000/api/get \
  -H "Content-Type: application/json" \
  -d '{
    "action": "TryLogin",
    "email": "drperez@curisec.com",
    "password": "password123",
    "deviceId": "test-device-123"
  }'
```

### Con Postman
1. Método: **POST**
2. URL: `http://localhost:5000/api/get`
3. Headers: `Content-Type: application/json`
4. Body (JSON):
```json
{
  "action": "TryLogin",
  "email": "drperez@curisec.com",
  "password": "password123",
  "deviceId": "test-device-123"
}
```

### En Frontend (React)
```typescript
const response = await fetch('/api/get', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'TryLogin',
    email: 'drperez@curisec.com',
    password: 'password123',
    deviceId: deviceId
  })
});

const data = await response.json();
if (data.status) {
  localStorage.setItem('token', data.data[0].token);
  // Redirigir a dashboard
}
```

---

## 📁 Archivos Relacionados

| Archivo | Propósito |
|---------|-----------|
| `server/routes.ts` | Lógica de autenticación (líneas 102-220) |
| `server/storage.ts` | Almacenamiento de usuarios |
| `client/src/pages/login.tsx` | Formulario de login |
| `shared/schema.ts` | Schema de usuario |
| `/tmp/wounddatacenter-login.log` | Logs de autenticación |

---

## 🔄 Flujo Visual Completo

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENTE (React)                          │
│  login.tsx: Envía email, password, deviceId                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ POST /api/get
                       │ { action: "TryLogin", email, password, deviceId }
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              SERVIDOR (Express)                             │
│  routes.ts: app.post("/api/get", ...)                       │
│                                                             │
│  1. Valida parámetros                                      │
│  2. Identifica action = "TryLogin"                         │
│  3. Busca usuario en storage.getUserByUsername()           │
│  4. Verifica contraseña (texto plano o SHA256)            │
│  5. Genera JWT token (expiración 7d)                       │
│  6. Cachea facilities del usuario                          │
│  7. Registra intento en log                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Respuesta JSON
                       │ { status: true/false, data: [...], token }
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    CLIENTE (React)                          │
│  1. Recibe token                                            │
│  2. Guarda en localStorage                                 │
│  3. Usa en Authorization header para requests             │
│  4. Redirige a dashboard                                   │
└─────────────────────────────────────────────────────────────┘
```

---

**Última actualización:** 16 de Enero de 2026
**Versión:** 1.0
**Estado:** ✅ Producción Ready (con limitaciones)
