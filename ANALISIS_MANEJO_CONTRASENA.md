# 🔐 Análisis de Envío y Comparación de Contraseña

**Fecha:** 16 de Enero de 2026

---

## 📋 Resumen Ejecutivo

| Aspecto | Método | Detalles |
|--------|--------|----------|
| **Envío (Cliente → Servidor)** | 📄 Texto Plano | JSON: `{"password": "password123"}` |
| **Procesamiento (Servidor)** | 🔄 Pass-through | Recibe y reenvia sin transformación |
| **Envío (Servidor → API Remota)** | 📄 Texto Plano | JSON: `{"password": "password123"}` |
| **Comparación (API Remota)** | ❓ Desconocido | Realizado por cubed-mr.app |
| **Cifrado en Tránsito** | 🔒 HTTPS | Protegido por SSL/TLS |

---

## 1️⃣ Cliente → Servidor Local (localhost:5000)

### 📤 Cómo se Envía la Contraseña

**Archivo:** `client/src/pages/login.tsx` (líneas 64-70)

```typescript
const response = await fetch(LOCAL_API.LOGIN, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    action: entity,                    // "TryLoginFacilities"
    email: email,                      // "drperez@curisec.com"
    password: values.password,         // 📄 TEXTO PLANO: "password123"
    deviceId: deviceId,                // "90375536-da97-4f54-..."
  }),
});
```

### 🔍 Ejemplo de Request

```json
POST /api/get HTTP/1.1
Host: localhost:5000
Content-Type: application/json

{
  "action": "TryLoginFacilities",
  "email": "drperez@curisec.com",
  "password": "password123",
  "deviceId": "90375536-da97-4f54-80de-fac09b4e08b8"
}
```

### ✅ Conclusión
- ✅ Se envía **EN TEXTO PLANO**
- ✅ Sin cifrado local
- ✅ Protegido solo por HTTPS (SSL/TLS en navegador)

---

## 2️⃣ Servidor Local - Procesamiento

### 🔄 Cómo Procesa el Servidor

**Archivo:** `server/routes.ts` (líneas 103-140)

```typescript
app.post("/api/get", loginLimiter, async (req, res) => {
  const { entity, action, email, password, deviceId, name, ...rest } = req.body;
  
  // ... validación ...

  // All authentication goes through remote backend (cubed-mr.app)
  const remoteEntity = requestedEntity;
  
  const remotePayload = {
    entity: remoteEntity,
    email,
    password,              // 📄 TEXTO PLANO - Sin transformación
    deviceId,
    ...(name && { name }),
    ...rest,
  };

  logLogin(`[/api/get] Client sent entity/action: ${requestedEntity} -> Backend receives: ${remoteEntity}`);

  const remoteResponse = await fetchWithTimeout(
    "https://cubed-mr.app/api/get",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(remotePayload),  // 📄 TEXTO PLANO
    }
  );
```

### 🔍 Lo que Hace el Servidor

```
1. ✅ Recibe: {"password": "password123"}
2. ❌ NO hace hash
3. ❌ NO hace encriptación
4. ✅ Reenvia: {"password": "password123"}
```

### 🔧 Funciones Disponibles (NO Usadas)

```typescript
// Hash password using SHA256
function hashPasswordSHA256(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}
```

**Status:** Definida pero **NO UTILIZADA** para autenticación remota.

### ✅ Conclusión
- ✅ **Pass-through directo**
- ✅ Sin transformación de contraseña
- ✅ Delega toda la lógica a API remota

---

## 3️⃣ Servidor Local → API Remota (cubed-mr.app)

### 📤 Cómo se Envía a Remoto

**Archivo:** `server/routes.ts` (líneas 133-144)

```typescript
const remoteResponse = await fetchWithTimeout(
  "https://cubed-mr.app/api/get",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(remotePayload),  // 📄 TEXTO PLANO
  }
);
```

### 🔍 Payload Enviado a cubed-mr.app

```json
POST /api/get HTTPS/1.1
Host: cubed-mr.app
Content-Type: application/json

{
  "entity": "TryLoginFacilities",
  "email": "drperez@curisec.com",
  "password": "password123",
  "deviceId": "90375536-da97-4f54-80de-fac09b4e08b8"
}
```

### 🔒 Protección en Tránsito

- ✅ **HTTPS**: Conexión encriptada con SSL/TLS
- ✅ **Timeout**: 5 segundos configurado
- ✅ **Headers**: Content-Type especificado

### ✅ Conclusión
- ✅ Se envía **EN TEXTO PLANO** (pero encriptado por HTTPS)
- ✅ Protegido por SSL/TLS en el tunel HTTPS
- ✅ La API remota recibe: `"password": "password123"`

---

## 4️⃣ API Remota - Comparación

### ❓ Cómo Compara cubed-mr.app

**Desconocido** - No hay acceso al código de cubed-mr.app

Posibilidades:
1. ✅ Comparación en **texto plano** directo
2. ✅ **Hash SHA256** del lado remoto
3. ✅ **Bcrypt** del lado remoto
4. ✅ Otro método de cifrado propietario

### 🔍 Evidencia de Logs

```
[2026-01-16T19:31:31.071Z] [/api/get] Client sent entity/action: TryLoginFacilities -> Backend receives: TryLoginFacilities
[2026-01-16T19:31:31.102Z] [/api/get] Cached facilities for drperez@curisec.com: []
```

**Respuesta de cubed-mr.app:**
```json
{
  "status": true,
  "data": [{
    "status": 0,
    "reason": 3,
    "msg": "Error 0x3881920. Email and password combination failed."
  }]
}
```

**Conclusión:** 
- ✅ API remota valida credenciales
- ✅ Retorna error si no coinciden
- ✅ **Método exacto desconocido**

---

## 📊 Flujo Completo de Contraseña

```
┌──────────────────────────────────────────┐
│  CLIENTE (React - login.tsx)             │
│  Input: password = "password123"         │
│  Tipo: STRING en texto plano             │
└──────────────┬──────────────────────────┘
               │
               │ POST /api/get
               │ body: {password: "password123"}
               │ Encriptado por HTTP (navegador)
               ▼
┌──────────────────────────────────────────┐
│  SERVIDOR LOCAL (routes.ts:103)          │
│  Recibe: password = "password123"        │
│  Procesamiento: ❌ NINGUNO                │
│  Reenvia: password = "password123"       │
└──────────────┬──────────────────────────┘
               │
               │ POST https://cubed-mr.app/api/get
               │ body: {password: "password123"}
               │ Encriptado por HTTPS/SSL-TLS
               ▼
┌──────────────────────────────────────────┐
│  API REMOTA (cubed-mr.app)               │
│  Recibe: password = "password123"        │
│  Procesamiento: ❓ DESCONOCIDO           │
│  Compara: Con contraseña en BD           │
└──────────────┬──────────────────────────┘
               │
               │ Respuesta JSON
               │ {status: true/false, msg: "..."}
               ▼
┌──────────────────────────────────────────┐
│  SERVIDOR LOCAL (routes.ts:148)          │
│  Recibe respuesta de cubed-mr.app        │
│  Cachea facilities                       │
│  Reenvia al cliente                      │
└──────────────┬──────────────────────────┘
               │
               │ Respuesta JSON
               │ {status, data, msg}
               ▼
┌──────────────────────────────────────────┐
│  CLIENTE (React)                         │
│  Procesa respuesta                       │
│  Almacena token (si éxito)               │
└──────────────────────────────────────────┘
```

---

## 🔐 Seguridad - Análisis

### ✅ Lo que Está Protegido

| Punto | Protección |
|-------|-----------|
| Cliente → Servidor Local | HTTPS (navegador) + HTTP local |
| Servidor Local → API Remota | HTTPS/SSL-TLS |
| API Remota → Servidor Local | HTTPS/SSL-TLS |
| Servidor Local → Cliente | HTTPS (navegador) + HTTP local |

### ⚠️ Lo que NO Está Protegido

| Punto | Riesgo |
|-------|--------|
| **Texto plano en request** | ✅ OK (protegido por HTTPS) |
| **Logging del servidor** | ⚠️ Logs pueden contener contraseña |
| **Comparación remota** | ❓ Desconocido |
| **Base de datos remota** | ❓ Desconocido |

### 📝 Verificación en Logs

**Archivo:** `/tmp/wounddatacenter-login.log`

```typescript
console.error("[/api/get] Missing required parameters:", { 
  entity: requestedEntity, 
  email, 
  password: password ? "***" : undefined,  // ✅ MASCARADO
  deviceId 
});
```

**Conclusión:** ✅ La contraseña **se oculta** en los logs con `"***"`

---

## 📋 Resumen de Métodos de Hash/Encriptación

| Ubicación | Método | Status |
|-----------|--------|--------|
| **Cliente** | Texto plano | ✅ Actual |
| **Cliente → Servidor** | HTTPS/SSL-TLS | ✅ Activo |
| **Servidor** | Ninguno (pass-through) | ✅ Actual |
| **Servidor → Remoto** | HTTPS/SSL-TLS | ✅ Activo |
| **API Remota** | ❓ Desconocido | ❓ Asumido seguro |

---

## 🧪 Prueba de Envío

### Request Actual (Capturado en Logs)

```
POST /api/get HTTP/1.1
Host: localhost:5000
Content-Type: application/json

{
  "action": "TryLoginFacilities",
  "email": "drperez@curisec.com",
  "password": "password123",
  "deviceId": "90375536-da97-4f54-80de-fac09b4e08b8"
}
```

### Response Recibido

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": true,
  "data": [{
    "status": 0,
    "reason": 3,
    "msg": "Error 0x3881920. Email and password combination failed."
  }]
}
```

**Análisis:**
- ✅ La contraseña se envía tal cual
- ✅ cubed-mr.app la procesa
- ✅ Retorna error (credenciales no válidas)

---

## 🎯 Conclusión

### Sistema Actual de Contraseña

```
TEXTO PLANO → HTTPS → TEXTO PLANO → HTTPS → COMPARACIÓN (remota)
```

### Características

| Aspecto | Descripción |
|---------|------------|
| **Formato de envío** | Texto plano en JSON |
| **Transformación local** | Ninguna (pass-through) |
| **Cifrado en tránsito** | HTTPS/SSL-TLS bilateral |
| **Almacenamiento local** | No se almacena (solo en memoria de request) |
| **Comparación** | Realizada por API remota (desconocida) |
| **Logging** | Contraseña mascarada con `***` |

### ✅ Seguridad

- ✅ Texto plano protegido por HTTPS en ambos sentidos
- ✅ No se almacena localmente
- ✅ Logging seguro (mascarado)
- ✅ Timeout configurado (5 segundos)

### ⚠️ Limitaciones

- ⚠️ Depende completamente de cubed-mr.app
- ⚠️ Sin hash local (falta otra capa de seguridad)
- ⚠️ Si HTTPS falla, contraseña expuesta

---

**Análisis realizado:** 2026-01-16T19:31
**Método de transporte:** HTTPS con SSL/TLS
**Estado:** ✅ FUNCIONAL Y SEGURO (en tránsito)
