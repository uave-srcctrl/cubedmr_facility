# 📝 Cambios de Autenticación - TryLogin y CloseSession

## 🎯 Resumen de Cambios

Se han actualizado todos los endpoints de autenticación para usar:
- **`TryLogin`** en lugar de `TryLoginFacilities` (login)
- **`CloseSession`** en lugar de `TryLogoutFacilities` (logout)

---

## 📋 Archivos Modificados

### 1. **server/routes.ts** (Backend Express)

**Cambio 1 - Login:**
```typescript
// ANTES:
const remoteEntity = requestedEntity === "TryLogin" ? "TryLoginFacilities" : requestedEntity;

// DESPUÉS:
const remoteEntity = requestedEntity === "TryLoginFacilities" ? "TryLogin" : requestedEntity;
```

**Cambio 2 - Logout:**
```typescript
// ANTES:
const logoutPayload = {
  entity: "TryLogoutFacilities",
  email,
  deviceId: deviceId || "web-client",
};

// DESPUÉS:
const logoutPayload = {
  entity: "CloseSession",
  email,
  deviceId: deviceId || "web-client",
};
```

**Impacto:**
- ✅ El servidor Express ahora traduce `TryLoginFacilities` (del cliente) a `TryLogin` (para el API remoto)
- ✅ El servidor Express envía `CloseSession` en lugar de `TryLogoutFacilities` al logout

---

### 2. **client/src/pages/login.tsx** (Frontend React)

**Cambio - Entity Name:**
```typescript
// ANTES:
const entity = "TryLoginFacilities";

// DESPUÉS:
const entity = "TryLogin";
```

**Impacto:**
- ✅ El cliente ahora envía `TryLogin` directamente al servidor Express
- ✅ El servidor Express mantiene compatibilidad hacia atrás

---

### 3. **API_AUTHENTICATION_ENDPOINTS.md** (Documentación)

Actualizado todo con:
- Reemplazar `TryLoginFacilities` por `TryLogin`
- Reemplazar `TryLogoutFacilities` por `CloseSession`
- Actualizar ejemplos de curl y Node.js

---

## 🔄 Flujo de Autenticación Actualizado

### Login
```
Cliente React
  ↓ POST /api/get { entity: "TryLogin", ... }
  ↓
Express Server
  ↓ Identifica que ya es TryLogin, lo mantiene así
  ↓
Remote API (cubed-mr.app)
  ↓ POST /api/get { entity: "TryLogin", ... }
  ↓
SQL Server
  ✅ Autentica el usuario
  ↓
Retorna token y datos del facility
```

### Logout
```
Cliente React
  ↓ POST /api/logout { email, deviceId, ... }
  ↓
Express Server
  ↓ Transforma a { entity: "CloseSession", email, deviceId }
  ↓
Remote API (cubed-mr.app)
  ↓ POST /api/get { entity: "CloseSession", ... }
  ↓
SQL Server
  ✅ Cierra la sesión
  ↓
Retorna confirmación
```

---

## ✅ Testing

### Con curl - Login
```bash
curl -X POST https://cubed-mr.app/api/get \
  -H "Content-Type: application/json" \
  -d '{
    "entity": "TryLogin",
    "email": "facility@example.com",
    "password": "password",
    "deviceId": "web-test"
  }'
```

### Con curl - Logout
```bash
curl -X POST https://cubed-mr.app/api/get \
  -H "Content-Type: application/json" \
  -d '{
    "entity": "CloseSession",
    "email": "facility@example.com",
    "deviceId": "web-test"
  }'
```

---

## 🔐 Compatibilidad

| Versión | Cliente | Servidor | API Remoto |
|---------|---------|----------|------------|
| **Antigua** | `TryLoginFacilities` | Transforma a `TryLoginFacilities` | `TryLoginFacilities` ❌ |
| **Nueva** | `TryLogin` | Transforma a `TryLogin` | `TryLogin` ✅ |

**Compatibilidad hacia atrás:**
- ✅ El servidor Express sigue aceptando `TryLoginFacilities` del cliente si es necesario
- ✅ El servidor Express lo convierte a `TryLogin` para el API remoto

---

## 📚 Documentación Relacionada

- [API_AUTHENTICATION_ENDPOINTS.md](API_AUTHENTICATION_ENDPOINTS.md) - Endpoints detallados
- [server/routes.ts](server/routes.ts#L77) - Código del proxy Express
- [client/src/pages/login.tsx](../client/src/pages/login.tsx#L56) - Código del cliente

---

## 🚀 Próximos Pasos

1. ✅ Código actualizado
2. ⏭️ Probar login con credenciales válidas
3. ⏭️ Probar logout desde el dashboard
4. ⏭️ Verificar en la BD remota que las sesiones se cierren correctamente
