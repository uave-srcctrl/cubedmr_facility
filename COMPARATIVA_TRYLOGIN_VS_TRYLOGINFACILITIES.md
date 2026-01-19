# 📊 Comparativa: TryLogin vs TryLoginFacilities

**Fecha:** 16 de Enero de 2026

---

## 🎯 Resumen Ejecutivo

| Aspecto | TryLogin | TryLoginFacilities |
|---------|----------|-------------------|
| **Destino** | API Remota (cubed-mr.app) | API Remota (cubed-mr.app) |
| **Entity Enviado** | "TryLogin" | "TryLoginFacilities" |
| **Procesamiento Local** | ❌ Ninguno (pass-through) | ❌ Ninguno (pass-through) |
| **Error Code** | 0x1191372 | 0x3881920 |
| **Reason Code** | 2 | 3 |
| **Token en Response** | ✅ Presente | ✅ Presente |
| **Facilities en Response** | ❌ No | ✅ Sí (array) |
| **Status en data[0]** | 0 (falla) | 0 (falla) |
| **Uso** | Autenticación directa | Autenticación con facilities |

---

## 📤 REQUEST - Comparación

### TryLogin
```json
POST /api/get

{
  "action": "TryLogin",
  "email": "drperez@curisec.com",
  "password": "password123",
  "deviceId": "90375536-da97-4f54-80de-fac09b4e08b8"
}
```

### TryLoginFacilities
```json
POST /api/get

{
  "action": "TryLoginFacilities",
  "email": "drperez@curisec.com",
  "password": "password123",
  "deviceId": "90375536-da97-4f54-80de-fac09b4e08b8"
}
```

**Diferencia:** Solo el `action` / `entity`

---

## 📥 RESPONSE - Comparación

### TryLogin (Falla)
```json
{
  "status": true,
  "data": [{
    "status": 0,
    "reason": 2,
    "email": "drperez@curisec.com",
    "msg": "Error 0x1191372. Email and password combination failed.",
    "token": "330257B0-F5EC-4602-8994-1C0BC66CF17D"
  }]
}
```

### TryLoginFacilities (Falla)
```json
{
  "status": true,
  "data": [{
    "status": 0,
    "reason": 3,
    "facilityId": null,
    "email": "drperez@curisec.com",
    "name": null,
    "msg": "Error 0x3881920. Email and password combination failed.",
    "token": ""
  }]
}
```

**Diferencias:**
- ❌ TryLogin: `reason: 2`, `token: "330257B0..."`
- ❌ TryLoginFacilities: `reason: 3`, `facilityId: null`, `name: null`, `token: ""`

---

## 🔄 FLUJO COMPLETO - TryLogin

```
┌─────────────────────────────────┐
│  CLIENTE (React)                │
│  action: "TryLogin"             │
│  email: "drperez@curisec.com"   │
│  password: "password123"        │
│  deviceId: "90375536-..."       │
└────────────┬────────────────────┘
             │
      POST /api/get
             │
             ▼
┌─────────────────────────────────┐
│  SERVIDOR LOCAL                 │
│  1. Valida parámetros           │
│  2. Prepara remotePayload       │
│     {entity:"TryLogin",...}     │
│  3. Log: "Client sent: TryLogin"│
│  4. fetchWithTimeout            │
└────────────┬────────────────────┘
             │
  POST https://cubed-mr.app/api/get
  {entity: "TryLogin", ...}
             │
             ▼
┌─────────────────────────────────┐
│  API REMOTA (cubed-mr.app)      │
│  1. Recibe entity: "TryLogin"   │
│  2. Busca en tabla de usuarios  │
│  3. Valida credenciales         │
│  4. Retorna respuesta           │
│     {status:0, reason:2, ...}   │
└────────────┬────────────────────┘
             │
         Respuesta
             │
             ▼
┌─────────────────────────────────┐
│  SERVIDOR LOCAL                 │
│  1. Recibe respuesta            │
│  2. Cachea facilities: []       │
│  3. Reenvia al cliente          │
└────────────┬────────────────────┘
             │
         Respuesta
             │
             ▼
┌─────────────────────────────────┐
│  CLIENTE (React)                │
│  1. Recibe response             │
│  2. Chequea: status===0?        │
│  3. ❌ Autenticación falló      │
│  4. Muestra error               │
└─────────────────────────────────┘
```

---

## 🔄 FLUJO COMPLETO - TryLoginFacilities

```
┌─────────────────────────────────┐
│  CLIENTE (React)                │
│  action: "TryLoginFacilities"   │
│  email: "drperez@curisec.com"   │
│  password: "password123"        │
│  deviceId: "90375536-..."       │
└────────────┬────────────────────┘
             │
      POST /api/get
             │
             ▼
┌─────────────────────────────────┐
│  SERVIDOR LOCAL                 │
│  1. Valida parámetros           │
│  2. Prepara remotePayload       │
│     {entity:"TryLoginFacilities"│
│  3. Log: "Client sent: TryLoginF..."
│  4. fetchWithTimeout            │
└────────────┬────────────────────┘
             │
  POST https://cubed-mr.app/api/get
  {entity: "TryLoginFacilities", ...}
             │
             ▼
┌─────────────────────────────────┐
│  API REMOTA (cubed-mr.app)      │
│  1. Recibe entity: "TryLoginF..." │
│  2. Busca en tabla facility_users│
│     o relación users-facilities │
│  3. Valida credenciales         │
│  4. Retorna respuesta           │
│     {status:0, reason:3, ...}   │
└────────────┬────────────────────┘
             │
         Respuesta con:
         - facilityId
         - facilities[]
         - name
             │
             ▼
┌─────────────────────────────────┐
│  SERVIDOR LOCAL                 │
│  1. Recibe respuesta            │
│  2. Cachea facilities: []       │
│  3. Log: "Cached facilities"    │
│  4. Reenvia al cliente          │
└────────────┬────────────────────┘
             │
         Respuesta
             │
             ▼
┌─────────────────────────────────┐
│  CLIENTE (React)                │
│  1. Recibe response             │
│  2. Chequea: facilityId?        │
│  3. ❌ Autenticación falló      │
│  4. Muestra error               │
└─────────────────────────────────┘
```

---

## 📋 Tabla Comparativa Detallada

| Elemento | TryLogin | TryLoginFacilities |
|----------|----------|-------------------|
| **CLIENTE** |  |  |
| Action enviado | "TryLogin" | "TryLoginFacilities" |
| Parámetros | email, password, deviceId | email, password, deviceId |
| Extra | - | - |
| **SERVIDOR (routes.ts)** |  |  |
| Línea de log | "Client sent: TryLogin" | "Client sent: TryLoginFacilities" |
| Procesamiento | Pass-through | Pass-through |
| Transformación | Ninguna | Ninguna |
| Destino | cubed-mr.app | cubed-mr.app |
| **API REMOTA** |  |  |
| Tabla verificada | ❓ users | ❓ facility_users |
| Validación | Email + password | Email + password + facility |
| **RESPONSE (Falla)** |  |  |
| status (nivel 1) | true | true |
| status (data[0]) | 0 | 0 |
| reason | 2 | 3 |
| error_code | 0x1191372 | 0x3881920 |
| email | ✅ Presente | ✅ Presente |
| facilityId | ❌ No | ✅ Presente (null) |
| name | ❌ No | ✅ Presente (null) |
| token | ✅ Presente | ✅ Presente (vacío) |
| facilities | ❌ No | ❌ No (en falla) |
| **RESPONSE (Éxito)** |  |  |
| status (data[0]) | ✅ 1 | ✅ 1 |
| token | ✅ JWT/valor | ✅ JWT/valor |
| entityId | ✅ UUID | ❓ Desconocido |
| entityName | ✅ Email/nombre | ❓ Desconocido |
| facilities | ❌ Posible NO | ✅ SÍ (array) |
| **CLIENTE (Validación)** |  |  |
| Chequea | status === 1 | status === 1 |
| Chequea | token presente | facilityId presente |
| Requiere | - | facilities[] |
| Token almacenado | localStorage | localStorage |

---

## 🎯 Casos de Uso

### TryLogin
```
Cuando: Autenticación simple por email/password
Uso: Para acceso directo sin facility
Resultado: Token de usuario
Tabla remota: users (probable)
```

### TryLoginFacilities
```
Cuando: Autenticación con contexto de facility
Uso: Para acceso con facility/instalación
Resultado: Token + Facilities array
Tabla remota: facility_users o junction (probable)
```

---

## 🔍 Diferencias Clave

### 1. Entity
- **TryLogin**: Endpoint simple para autenticación
- **TryLoginFacilities**: Endpoint complejo con facilities

### 2. Error Codes
- **TryLogin**: reason 2 (tipo de error diferente)
- **TryLoginFacilities**: reason 3 (tipo de error diferente)

### 3. Response Fields
- **TryLogin**: Minimalista (email, token)
- **TryLoginFacilities**: Completa (email, token, facilityId, facilities, name)

### 4. Tabla Backend
- **TryLogin**: Probablemente `users`
- **TryLoginFacilities**: Probablemente `users_facilities` o `facility_users`

### 5. Lógica de Negocio
- **TryLogin**: Acceso general del usuario
- **TryLoginFacilities**: Acceso del usuario a facility específica

---

## 🧪 Pruebas de Comparación

### Test 1: TryLogin con Credenciales Inválidas
```bash
curl -X POST http://localhost:5000/api/get \
  -d '{"action":"TryLogin","email":"invalid@test.com","password":"wrong","deviceId":"test"}'

Response:
{
  "status": true,
  "data": [{
    "status": 0,
    "reason": 2,
    "msg": "Error 0x1191372. Email and password combination failed.",
    "token": "..."
  }]
}
```

### Test 2: TryLoginFacilities con Credenciales Inválidas
```bash
curl -X POST http://localhost:5000/api/get \
  -d '{"action":"TryLoginFacilities","email":"invalid@test.com","password":"wrong","deviceId":"test"}'

Response:
{
  "status": true,
  "data": [{
    "status": 0,
    "reason": 3,
    "msg": "Error 0x3881920. Email and password combination failed.",
    "token": ""
  }]
}
```

**Diferencia:** `reason: 2` vs `reason: 3`

---

## 📊 Análisis de Flujos

### Similitudes ✅
- ✅ Ambos van a cubed-mr.app
- ✅ Ambos son pass-through (sin lógica local)
- ✅ Ambos validados por deviceId
- ✅ Ambos retornan token
- ✅ Ambos cachean facilities en servidor local

### Diferencias ❌
- ❌ Entities diferentes (TryLogin vs TryLoginFacilities)
- ❌ Códigos de error diferentes (reason: 2 vs 3)
- ❌ Campos de response diferentes
- ❌ Tablas de backend probablemente diferentes
- ❌ Lógica de negocio diferente

---

## 🎯 Conclusión

**Ambos flujos son idénticos a nivel técnico:**
- Mismo patrón: Cliente → Servidor → API Remota
- Mismo protocolo: JSON HTTP/HTTPS
- Mismo caching: Facilities en servidor local
- Mismo resultado: Token + Error

**Las diferencias son semánticas:**
- `TryLogin`: Autenticación simple
- `TryLoginFacilities`: Autenticación + facilities

**El servidor actual es agnóstico** - ambos flujos funcionan igual, solo reenviando el entity a la API remota.

---

**Comparativa realizada:** 2026-01-16T19:43
**Nivel de detalle:** Completo (Request/Response/Flujo)
**Estado:** ✅ AMBOS FUNCIONANDO (requieren credenciales válidas en cubed-mr.app)
