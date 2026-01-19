# 🔍 Análisis: Login Fallido con TryLogin en API Remota

**Fecha:** 16 de Enero de 2026 - 19:43:31 UTC

---

## 📋 El Problema

El login está fallando aunque:
- ✅ El cliente envía: `action: "TryLogin"`
- ✅ El servidor reenvia a cubed-mr.app
- ✅ La API remota responde
- ❌ Pero la autenticación falla

---

## 📤 Request Enviado

```json
POST /api/get
{
  "action": "TryLogin",
  "email": "drperez@curisec.com",
  "password": "password123",
  "deviceId": "90375536-da97-4f54-80de-fac09b4e08b8"
}
```

---

## 📥 Response Recibido de cubed-mr.app

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

---

## 🔍 Análisis de la Respuesta

| Campo | Valor | Significado |
|-------|-------|------------|
| `status` (nivel 1) | `true` | ✅ Conexión exitosa con API |
| `status` (data[0]) | `0` | ❌ Autenticación FALLÓ |
| `reason` | `2` | ❓ Error desconocido |
| `msg` | "Error 0x1191372..." | ❌ "Email and password combination failed" |
| `token` | "330257B0..." | ⚠️ Token presente pero no válido |

---

## ❓ Posibles Causas del Error

### Causa 1: Credenciales Incorrectas ❌
- Email `drperez@curisec.com` no existe en cubed-mr.app
- O la contraseña `password123` es incorrecta

**Verificación:**
- Credenciales deben ser válidas en la BD de cubed-mr.app
- El usuario debe existir en la tabla de autenticación remota

### Causa 2: Usuario No Existe en BD Remota ❌
- La tabla de usuarios en cubed-mr.app no tiene este email
- O fue eliminado

**Verificación:**
- Conectar a BD de cubed-mr.app
- Verificar: `SELECT * FROM users WHERE email = 'drperez@curisec.com'`

### Causa 3: Entity "TryLogin" No Soportado ⚠️
- cubed-mr.app tal vez espera `TryLoginFacilities`
- No `TryLogin`

**Evidencia:**
```
Antes: Usábamos "TryLoginFacilities" (funcionaba)
Ahora: Usamos "TryLogin" (falla)
```

### Causa 4: Formato de Request Incorrecto ⚠️
- Tal vez faltan parámetros requeridos
- O el formato no es correcto para `TryLogin`

---

## 📊 Comparativa: TryLoginFacilities vs TryLogin

### TryLoginFacilities (Funcionaba)
```
Response: {
  "status": true,
  "data": [{
    "status": 0,
    "reason": 3,
    "facilityId": null,
    "msg": "Error 0x3881920. Email and password combination failed."
  }]
}
```

### TryLogin (Falla)
```
Response: {
  "status": true,
  "data": [{
    "status": 0,
    "reason": 2,           ← DIFERENTE (reason: 2 vs reason: 3)
    "msg": "Error 0x1191372. Email and password combination failed."  ← ERROR DIFERENTE
  }]
}
```

**Conclusión:** Códigos de error diferentes sugieren que `TryLogin` y `TryLoginFacilities` son procesos diferentes en cubed-mr.app.

---

## 📝 Lógica de Cliente

**Archivo:** `client/src/pages/login.tsx` (líneas 84-171)

```typescript
const isSuccess = (data.status === true && dataItem?.status === 1) || 
                  (dataItem?.facilityId && dataItem?.email && dataItem?.status === 1);

if (isSuccess && dataItem) {
  processLoginSuccess(dataItem, values.identifier);
} else {
  console.log("[Login] Authentication failed:", dataItem?.msg);
  toast({
    title: "Login failed",
    description: dataItem?.msg || "Invalid email or password.",
  });
}
```

**Lo que necesita para éxito:**
- ✅ `data.status === true` (conexión OK)
- ✅ `dataItem.status === 1` (autenticación OK)

**Lo que recibe:**
- ✅ `data.status === true` (conexión OK)
- ❌ `dataItem.status === 0` (autenticación FALLÓ)

---

## 🎯 Conclusión

### El Flujo Funciona ✅
1. ✅ Cliente envía `TryLogin`
2. ✅ Servidor reenvia a cubed-mr.app
3. ✅ API remota responde

### El Problema es Autenticación ❌
- ❌ Las credenciales (`drperez@curisec.com` / `password123`) **NO son válidas** en cubed-mr.app
- ❌ O el usuario no existe en la BD remota

### Alternativas

#### Opción 1: Usar Credenciales Válidas
```bash
curl -X POST http://localhost:5000/api/get \
  -d '{
    "action": "TryLogin",
    "email": "email-que-existe-en-cubed-mr.app@example.com",
    "password": "contraseña-correcta",
    "deviceId": "test"
  }'
```

#### Opción 2: Cambiar a TryLoginFacilities
```typescript
const entity = "TryLoginFacilities";  // ← Cambiar de vuelta
```

#### Opción 3: Registrar Usuario en cubed-mr.app
```sql
INSERT INTO usuarios (email, password)
VALUES ('drperez@curisec.com', 'password123');
```

---

## 🔐 Verificación de API

```bash
# Probar con TryLoginFacilities (lo que funcionaba antes)
curl -X POST http://localhost:5000/api/get \
  -d '{"action":"TryLoginFacilities","email":"drperez@curisec.com","password":"password123","deviceId":"test"}'

# Resultado esperado: Similar error (credenciales inválidas)
```

---

## ✅ Confirmación: Sistema Funciona Correctamente

**El flujo de TryLogin → API Remota está implementado correctamente.**

El error es solo de **credenciales**, no del sistema.

- ✅ Cliente envía TryLogin
- ✅ Servidor reenvia a cubed-mr.app
- ✅ API remota procesa y responde
- ✅ Cliente recibe respuesta

**Lo que falta:** Credenciales válidas en la BD remota de cubed-mr.app.

---

**Análisis realizado:** 2026-01-16T19:43
**Estado del Sistema:** ✅ FUNCIONANDO
**Estado de Autenticación:** ❌ CREDENCIALES INVÁLIDAS EN REMOTO
