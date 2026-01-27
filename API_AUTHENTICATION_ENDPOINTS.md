# 🔐 Endpoints de Autenticación - API Remoto (cubed-mr.app)

## 📌 Base URL
```
https://cubed-mr.app
```

---

## 🔑 Endpoints de Autenticación

### 1. **Login de Facilities**

**Endpoint:** `POST /api/get`

**Propósito:** Autenticar un facility/usuario con credenciales

**Request:**
```json
{
  "entity": "TryLogin",
  "email": "facility@example.com",
  "password": "password123",
  "deviceId": "web-xxxxx",
  "name": "facility@example.com"
}
```

**Response (Exitoso - status: 1):**
```json
{
  "status": true,
  "data": [
    {
      "status": 1,
      "facilityId": "1",
      "entityId": "1",
      "entity": "Facility",
      "entityName": "Facility Name",
      "email": "facility@example.com",
      "token": "jwt-token-here",
      "facilities": [
        {
          "id": 1,
          "name": "Facility Name",
          "email": "facility@example.com"
        }
      ],
      "msg": "Login successful"
    }
  ]
}
```

**Response (Sesión Activa - status: 0, reason: 1):**
```json
{
  "status": false,
  "data": [
    {
      "status": 0,
      "reason": 1,
      "facilityId": "1",
      "email": "facility@example.com",
      "name": "Facility Name",
      "msg": "Facility currently authenticated"
    }
  ]
}
```

**Response (Credenciales Inválidas - status: 0, reason: 3):**
```json
{
  "status": false,
  "data": [
    {
      "status": 0,
      "reason": 3,
      "msg": "Email and password combination failed"
    }
  ]
}
```

**Response (Rate Limiting - status: 0, reason: 5):**
```json
{
  "status": false,
  "data": [
    {
      "status": 0,
      "reason": 5,
      "msg": "Too many attempts in the last 5 minutes"
    }
  ]
}
```

**Códigos de Error:**
| Reason | Código | Significado |
|--------|--------|------------|
| 1 | `0x5461938` | Facility ya está autenticado |
| 3 | `0x3881920` | Email/password inválido |
| 5 | N/A | Rate limiting activo (demasiados intentos) |

---

### 2. **Logout de Facilities**

**Endpoint:** `POST /api/get`

**Propósito:** Desautenticar un facility

**Request:**
```json
{
  "entity": "CloseSession",
  "email": "facility@example.com",
  "deviceId": "web-xxxxx"
}
```

**Response (Exitoso):**
```json
{
  "status": true,
  "data": [
    {
      "msg": "Logout successful",
      "status": 1
    }
  ]
}
```

---

## 📊 Flujo de Autenticación

```
Cliente (wounddatacenter)
    ↓
    POST /api/get (email, password, deviceId)
    ↓
Node.js Proxy (Express)
    ↓
    POST https://cubed-mr.app/api/get
    ↓
SQL Server remoto (cubed-mr.app)
    ↓ Validar credenciales
    ↓
Retornar token JWT + datos facility
    ↓
Guardar en localStorage (authToken, userFacilityId, etc)
    ↓
Redirigir a Dashboard
```

---

## 🔄 Estados de Autenticación

| Status | Reason | Significado | Acción |
|--------|--------|------------|--------|
| 1 | - | ✅ Login exitoso | Proceder al dashboard |
| 0 | 1 | ⚠️ Ya autenticado | Usar nueva deviceId o logout primero |
| 0 | 3 | ❌ Credenciales inválidas | Reintentar con credenciales correctas |
| 0 | 5 | 🚫 Rate limit | Esperar 5 minutos |

---

## 🔍 Parámetros Requeridos

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|------------|
| `entity` / `action` | string | Sí | Tipo de acción: `TryLogin`, `CloseSession` |
| `email` | string | Sí | Email del facility |
| `password` | string | Sí | Contraseña (se valida en BD remota) |
| `deviceId` | string | Sí | ID único del dispositivo (previene múltiples sesiones) |
| `name` | string | No | Nombre del facility (opcional) |

---

## ⚠️ Problemas Conocidos

### Credenciales Inválidas
Actualmente, **ningún facility se puede autenticar** porque las credenciales en remoteWoundcareDB no coinciden con las esperadas.

**Facilities Problemáticos:**
- `facility1@wounddatacenter.com` ❌
- `facility2@wounddatacenter.com` ❌
- `facility4@wounddatacenter.com` ❌
- `facility5@wounddatacenter.com` ❌

**Solución:** Sincronizar contraseñas en remoteWoundcareDB o usar credenciales correctas.

### Rate Limiting
Si haces más de X intentos fallidos en 5 minutos, recibirás error `reason: 5`.

**Solución:** Esperar 5 minutos o cambiar `deviceId` antes de reintentar.

### Sesión Activa
Si el mismo facility intenta loguear desde otro dispositivo sin desloguearse primero:

**Error:** `reason: 1` - "Facility currently authenticated"

**Soluciones:**
1. Usar diferente `deviceId` en cada login
2. Hacer logout primero desde el otro dispositivo
3. Ejecutar script de force-logout

---

## 🛠️ Testing

### Con curl
```bash
# Login
curl -X POST https://cubed-mr.app/api/get \
  -H "Content-Type: application/json" \
  -d '{
    "entity": "TryLogin",
    "email": "facility@example.com",
    "password": "password",
    "deviceId": "test-device"
  }'

# Logout
curl -X POST https://cubed-mr.app/api/get \
  -H "Content-Type: application/json" \
  -d '{
    "entity": "CloseSession",
    "email": "facility@example.com",
    "deviceId": "test-device"
  }'
```

### Con Node.js
```javascript
const response = await fetch('https://cubed-mr.app/api/get', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    entity: 'TryLogin',
    email: 'facility@example.com',
    password: 'password',
    deviceId: 'web-' + Math.random().toString(36).substr(2, 9)
  })
});

const data = await response.json();
console.log(data);
```

---

## 📚 Relación con Express (wounddatacenter)

El servidor Express en wounddatacenter actúa como proxy:

```typescript
// server/routes.ts - Línea 77-120
app.post("/api/get", loginLimiter, async (req, res) => {
  // Recibe request del cliente
  // Lo valida
  // Lo reenvía a https://cubed-mr.app/api/get
  // Retorna la respuesta al cliente
});
```

**Flujo:**
```
Cliente → Express (/facility/api/get) → cubed-mr.app/api/get → SQL Server
```

---

## 📖 Documentación Relacionada

- [FACILITIES_AUTHENTICATION_GUIDE.md](FACILITIES_AUTHENTICATION_GUIDE.md) - Guía detallada de autenticación
- [VERIFY_FACILITIES_REMOTE.md](VERIFY_FACILITIES_REMOTE.md) - Cómo verificar facilities
- [server/routes.ts](server/routes.ts) - Código del proxy Express
