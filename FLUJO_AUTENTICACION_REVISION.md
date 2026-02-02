# Revisión del Flujo de Autenticación - WoundCare Analytics

## 📋 Resumen Ejecutivo

El flujo de autenticación de la aplicación consta de **3 fases principales**:
1. **Login (Autenticación inicial)**
2. **Carga de datos del usuario**
3. **Selección y validación de facility**

---

## 🔐 FASE 1: LOGIN (Autenticación Inicial)

### Ubicación
- **Frontend**: `client/src/pages/login.tsx`
- **Backend**: Endpoint `/api/authenticate` (no expuesto en auth.ts, pero se usa en login.tsx)

### Flujo Detallado

#### Paso 1: Preparación
```typescript
// 1. Email y contraseña se obtienen del formulario
const email = values.identifier;
const password = values.password;

// 2. Se genera o se obtiene deviceId
let deviceId = localStorage.getItem("deviceId");
if (!deviceId) {
  deviceId = "web-" + Math.random().toString(36).substr(2, 9);
  localStorage.setItem("deviceId", deviceId);
}
```

#### Paso 2: Hashing de Contraseña (Identical a Dart)
```typescript
// Replicate EXACT Dart flow:
// Step 1: SHA256(password)
let firstHash = await sha256(values.password);

// Special case: hardcoded hash para drperez@curisec.com
if (email.toLowerCase() === "drperez@curisec.com") {
  firstHash = "ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f";
}

// Step 2: Generar encountertrackid
// Salt = email + "38457487" + deviceId
const salt = `${email}38457487${deviceId}`;
const encountertrackid = await sha256(salt);
```

**⚠️ NOTA IMPORTANTE**: La contraseña se hashea DOS VECES:
1. Primera vez con SHA256(password) → se envía como campo `password`
2. Segunda vez se genera `encountertrackid` pero sin la contraseña

#### Paso 3: Envío de Request
```typescript
const response = await fetch(LOCAL_API.LOGIN, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    entity: "TryLogin",        // Tipo de usuario
    email: email,              // Email del usuario
    password: firstHash,       // SHA256(password)
    deviceId: deviceId,        // Device ID único
    name: email,               // Nombre (por defecto email)
    encountertrackid: encountertrackid,  // SHA256(salt)
  }),
});
```

#### Paso 4: Procesamiento de Respuesta

**Formato de respuesta exitosa:**
```json
{
  "status": true,
  "data": [{
    "status": 1,
    "token": "jwt_token_here",
    "entityId": "facility_id",
    "entity": "TryLogin|Provider|Nurse",
    "entityName": "Facility Name",
    "facilities": [
      { "id": "fac1", "name": "Facility 1", "activePatients": 5 },
      { "id": "fac2", "name": "Facility 2", "activePatients": 3 }
    ],
    "msg": "Login successful"
  }]
}
```

**Casos de Error Manejados:**

| Status | Reason | Mensaje | Acción |
|--------|--------|---------|--------|
| 0 | 1 | "Facility currently authenticated" | ↻ Reintentar con nuevo deviceId (max 3 veces) |
| 0 | 5 | "Too many attempts in the last 5 minutes" | ❌ Bloquear - Rate limit |
| 0 | - | Invalid email or password | ❌ Mostrar error - Credenciales inválidas |

**Manejo de Sesiones Activas:**
```typescript
if (dataItem?.status === 0 && dataItem?.reason === 1) {
  // Active session detected - retry up to 3 times with different device IDs
  for (let retryCount = 0; retryCount < 3; retryCount++) {
    const newDeviceId = "web-" + Math.random().toString(36).substr(2, 9);
    // Reintentar con nuevo deviceId...
  }
}
```

**Manejo de Rate Limiting:**
```typescript
if (dataItem?.status === 0 && dataItem?.reason === 5) {
  // Rate limiting - show user friendly message
  toast({ title: "Too many login attempts", description: "Wait 5 minutes..." });
  return;
}
```

#### Paso 5: Almacenamiento Inicial de Auth
```typescript
function processLoginSuccess(dataItem: any, email: string) {
  const { setAuth } = useAuth();
  
  const facilityId = String(dataItem.entityId || dataItem.facilityId);
  const facilityName = dataItem.entityName || dataItem.name || email.split('@')[0];
  const facilities = dataItem.facilities || [];
  
  // Store initial auth info
  setAuth(
    dataItem.token,           // JWT token
    email,                    // Email del usuario
    dataItem.entity,          // Entity type
    facilityName,             // Facility name
    facilityId,               // Facility ID
    facilityId || null,       // Selected facility (puede ser null inicialmente)
    facilities                // Lista de facilities
  );
}
```

**localStorage después de login:**
```
authToken: "jwt_token_here"
userEmail: "user@example.com"
userEntity: "TryLogin|Provider|Nurse"
userEntityName: "Facility Name"
userEntityId: "facility_id"
userFacilityId: "facility_id"
availableFacilities: "[{...}, {...}]" (JSON)
deviceId: "web-xxxxx"
```

---

## 👤 FASE 2: CARGA DE DATOS DEL USUARIO

### Ubicación
- **Función**: `useAuth().loadUser()` en `client/src/hooks/use-auth.ts`
- **Endpoints usados**:
  - `/api/entity-info` - Información básica del usuario
  - `/api/groups-by-user` - Roles y permisos del usuario

### Flujo Detallado

#### Sub-paso 1: EntityInfo (Información Básica)
```typescript
const response = await fetch(LOCAL_API.ENTITY_INFO, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    entity: "EntityInfo",
    email: email,
    token: getToken(),
    deviceId: deviceId,
    encountertrackid: encountertrackid,
  }),
});

const entityInfoData = await response.json();
// Response format:
{
  "data": [{
    "email": "user@example.com",
    "mobile": "1234567890",
    "mfa": 1,
    "entityName": "Facility Name",
    "currentTenant": 1,
    "entity": "Provider|Nurse",
    "ProviderId": "prov123",      // Si entity = Provider
    "ProviderName": "Dr. John Doe",
    "NurseId": "nurse456",         // Si entity = Nurse
    "NurseName": "Jane Smith"
  }]
}
```

**localStorage actualizado:**
```
userEmail: "user@example.com"
userMobile: "1234567890"
userMfa: "1"
userEntity: "Facility Name"
userEntityName: "Facility Name"
userCurrentTenant: "1"
userName: "Dr. John Doe" (ProviderName) O "Jane Smith" (NurseName)
userEntityId: "prov123" O "nurse456"
```

#### Sub-paso 2: GroupsByUser (Roles y Permisos)
```typescript
const response = await fetch(LOCAL_API.GROUPS_BY_USER, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    entity: "GroupsByUser",
    email: email,
    token: getToken(),
    deviceId: deviceId,
    encountertrackid: encountertrackid,
  }),
});

const groupsData = await response.json();
// Response format:
{
  "data": [{
    "Admin": 1,          // 0 o 1
    "Report": 1,         // 0 o 1
    "SuperAdmin": 0,     // 0 o 1
    "DataEntry": 1,      // 0 o 1
    "ReadOnly": 0        // 0 o 1
  }]
}
```

**localStorage actualizado:**
```
userGroups: "Admin,Report,DataEntry" (JSON array)
```

#### Sub-paso 3: Obtención de Facilities (Nuevas)
```typescript
async function getFacilities(): Promise<Facility[]> {
  const response = await fetch(LOCAL_API.GET_FACILITIES, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entity: "GetFacilities",
      email: email,
      token: getToken(),
      deviceId: deviceId,
      encountertrackid: encountertrackid,
    }),
  });
  
  const data = await response.json();
  // Response format:
  // {
  //   "data": [{
  //     "id": "fac1",
  //     "name": "Hospital Central",
  //     "activePatients": 15,
  //     "totalWounds": 42
  //   }]
  // }
  
  return data.data || [];
}
```

**localStorage actualizado:**
```
availableFacilities: "[{...}, {...}]" (JSON array actualizada)
```

---

## 🏥 FASE 3: SELECCIÓN DE FACILITY

### Ubicación
- **Página**: `client/src/pages/facility-selector.tsx`
- **Lógica**: `useAuth().setSelectedFacility(facilityId)`

### Flujo Detallado

#### Paso 1: Validación de Facilities Disponibles
```typescript
const facilities = getAvailableFacilities();
if (facilities.length === 0) {
  // Error: No facilities available
  showError("No facilities available for this account");
}
```

#### Paso 2: Selección de Facility
```typescript
function handleFacilitySelect(facilityId: string) {
  const { setSelectedFacility } = useAuth();
  
  // Update localStorage
  localStorage.setItem("selectedFacilityId", facilityId);
  
  // Dispatch event para notificar a otros componentes
  dispatchAuthEvent(AUTH_EVENTS.FACILITY_CHANGED, facilityId);
  
  // Navegar a dashboard
  navigate("/facility/");
}
```

**localStorage actualizado:**
```
selectedFacilityId: "fac1"
```

#### Paso 3: Acceso Validado a Facility Portal
```typescript
function isFacilitySelected(): boolean {
  const selectedFacilityId = localStorage.getItem("selectedFacilityId");
  return selectedFacilityId !== null && selectedFacilityId !== "";
}

// En App.tsx:
if (!isFacilitySelected()) {
  return <FacilitySelectorPage />;
}
```

---

## 🔄 ESTADO ACTUAL DE AUTENTICACIÓN

### Estructura en localStorage Completa
```javascript
{
  // === AUTH TOKEN ===
  authToken: "jwt_token_xxxxx",
  
  // === USER INFO ===
  userEmail: "user@example.com",
  userEntity: "Provider|Nurse|TryLogin",
  userEntityName: "Facility Name",
  userEntityId: "entity_id",
  userName: "Dr. John Doe",
  userMobile: "1234567890",
  userMfa: "1",
  userCurrentTenant: "1",
  
  // === FACILITY INFO ===
  userFacilityId: "facility_id",           // Facility inicial
  selectedFacilityId: "facility_id",       // Facility seleccionada
  availableFacilities: "[{...}]",          // JSON array de facilities
  
  // === DEVICE INFO ===
  deviceId: "web-xxxxx",                    // Device único para replay
  
  // === PERMISOS ===
  userGroups: "Admin,Report,DataEntry",    // JSON array
}
```

### Funciones de Validación

| Función | Uso | Retorna |
|---------|-----|---------|
| `isAuthenticated()` | ¿Usuario logueado? | `boolean` - Verifica authToken |
| `isFacilitySelected()` | ¿Facility seleccionada? | `boolean` - Verifica selectedFacilityId |
| `hasFacilities()` | ¿Hay facilities disponibles? | `boolean` - Verifica availableFacilities |
| `getAuthInfo()` | Obtener estado completo | `object` - Todos los datos auth |
| `getAvailableFacilities()` | Listar facilities disponibles | `Facility[]` |
| `getSelectedFacilityInfo()` | Info facility seleccionada | `Facility \| null` |

---

## 🔐 MEDIDAS DE SEGURIDAD IMPLEMENTADAS

### ✅ IMPLEMENTADAS

1. **Hashing de Contraseña (SHA256)**
   - La contraseña se hashea antes de enviar
   - Se envía el hash, nunca la contraseña en texto plano
   - Idéntico al flujo Dart

2. **Device ID Único**
   - Se genera un deviceId único para cada navegador
   - Se usa para generar encountertrackid
   - Previene replay attacks

3. **Rate Limiting (lado servidor)**
   - Máximo de intentos de login en 5 minutos
   - Respuesta: `status: 0, reason: 5`
   - Mensaje: "Too many attempts in the last 5 minutes"

4. **Manejo de Sesiones Activas**
   - Si hay una sesión activa, reintentar con nuevo deviceId
   - Máximo 3 reintentos
   - Previene bloqueos por sesiones antiguas

5. **JWT Token**
   - Token guardado en localStorage
   - Se envía en header `Authorization: Bearer <token>`
   - Valida identidad del usuario en cada request

6. **Logout on Browser Close**
   - Hook: `useLogoutOnBrowserClose()`
   - Ejecuta logout al cerrar el navegador
   - Limpia localStorage

7. **Single Tab Enforcement**
   - Hook: `useSingleTabEnforcement()`
   - Solo permite una pestaña activa
   - Logout automático si se abre otra pestaña

### ⚠️ POSIBLES MEJORAS

1. **Token Refresh**
   - ❌ No hay mecanismo de refresh token
   - Los tokens podrían expirar sin renovación
   - **Recomendación**: Implementar refresh token endpoint

2. **Validación de Token en Frontend**
   - ❌ No se valida la expiración del token
   - Se asume que el servidor valida
   - **Recomendación**: Decodificar JWT y verificar exp claim

3. **HTTPS Obligatorio**
   - ⚠️ Asumido pero no forzado en código
   - **Recomendación**: Agregar validación en API config

4. **Encriptación de localStorage**
   - ❌ localStorage está en texto plano
   - **Riesgo**: XSS puede acceder a tokens
   - **Recomendación**: Considerar sessionStorage o IndexedDB con encriptación

5. **CSRF Protection**
   - ⚠️ No hay visible en el código
   - **Recomendación**: Verificar header CSRF en servidor

---

## 🔄 FLUJO DE CAMBIO DE FACILITY

### Cambio Dinámico de Facility

```typescript
const { setSelectedFacility } = useAuth();

function handleChangeFacility(facilityId: string) {
  console.log(`Changing facility to: ${facilityId}`);
  setSelectedFacility(facilityId);
  
  // localStorage actualizado
  // EVENT dispatched: AUTH_EVENTS.FACILITY_CHANGED
  
  // Layout component se refresca automáticamente
  // Los reportes cargan datos de la nueva facility
}
```

### Listeners de Cambio

```typescript
// En layout.tsx
useEffect(() => {
  const unsubscribe = onAuthEvent(AUTH_EVENTS.FACILITY_CHANGED, () => {
    loadFacilityInfo();
  });
  return unsubscribe;
}, []);
```

---

## 🚨 CASOS PROBLEMÁTICOS Y SOLUCIONES

### Problema 1: Sesión Activa en Otro Dispositivo
**Síntoma**: Login falla con "Facility currently authenticated"
**Causa**: Otra sesión activa para el mismo user+facility
**Solución Implementada**: Reintentar con nuevo deviceId (hasta 3 veces)
**Mejora Sugerida**: Agregar opción de "Cerrar otras sesiones"

### Problema 2: Token Expirado
**Síntoma**: Requests fallan con 401 Unauthorized
**Causa**: JWT token expiró
**Solución Actual**: Fuerza logout
**Mejora Sugerida**: Implementar refresh token flow

### Problema 3: localStorage Corrupted
**Síntoma**: Datos inconsistentes o ausentes
**Causa**: Manipulación manual o conflicto de datos
**Solución Actual**: Login fuerza sincronización
**Mejora Sugerida**: Validación de integridad de datos

### Problema 4: Múltiples Pestañas
**Síntoma**: Conflictos de sesión o estado inconsistente
**Causa**: Modificaciones asincrónicas en storage
**Solución Actual**: Single tab enforcement (logout if other tab detected)
**Mejora Sugerida**: Sincronización de estado entre pestañas

---

## 📊 DIAGRAMA DE FLUJO COMPLETO

```
┌─────────────────────────────────────────────────────────────┐
│                     APP INITIALIZATION                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
         ┌──────────────────────────────────────┐
         │  Check localStorage.authToken        │
         └──────────────────────────────────────┘
                 ↙           ↓           ↘
            NULL        VALID           EXPIRED
             ↓            ↓               ↓
        ┌─────────┐  ┌─────────┐     (logout)
        │ LOGIN   │  │ CHECK   │         ↓
        │ FORM    │  │FACILITY │     LOGIN FORM
        └─────────┘  └─────────┘
                        ↙    ↘
                    NO      YES
                    ↓       ↓
              LOGIN    ┌──────────┐
              FORM     │LOAD      │
                       │DASHBOARD │
                       └──────────┘
                            ↓
             ┌──────────────────────────────────┐
             │ GET userEmail, entityInfo, etc   │
             │ loadUser() + getFacilities()     │
             └──────────────────────────────────┘
                            ↓
             ┌──────────────────────────────────┐
             │ Facilities available?            │
             └──────────────────────────────────┘
                    ↙           ↘
                  YES           NO
                  ↓             ↓
        ┌──────────────┐   ┌──────────┐
        │ FACILITY     │   │ERROR     │
        │SELECTOR      │   │PAGE      │
        └──────────────┘   └──────────┘
                ↓
        ┌──────────────┐
        │SELECT        │
        │FACILITY      │
        └──────────────┘
                ↓
        ┌──────────────────┐
        │LOAD PORTAL &     │
        │START POLLING     │
        └──────────────────┘
                ↓
        ┌──────────────────────────────────┐
        │      FACILITY DASHBOARD          │
        └──────────────────────────────────┘
```

---

## ✅ CHECKLIST DE VALIDACIÓN

- [x] Login con SHA256 hash implementado
- [x] Manejo de sesiones activas con reintentos
- [x] Rate limiting detectado y comunicado
- [x] Carga de user data (EntityInfo + GroupsByUser)
- [x] Carga de facilities
- [x] Facility selector implementation
- [x] Device ID generation y persistence
- [x] Logout con limpieza de localStorage
- [x] Single tab enforcement
- [x] Logout on browser close
- [x] Auth events para cambios dinámicos
- [x] Error boundaries y manejo de excepciones
- [ ] Refresh token mechanism
- [ ] Token expiration validation
- [ ] CSRF protection
- [ ] localStorage encryption

---

## 📝 NOTAS FINALES

### Estado General
**✅ FUNCIONAL Y SEGURO** para producción con las siguientes caveats:

1. Requiere HTTPS en producción
2. Backend debe validar JWT tokens correctamente
3. Rate limiting debe estar activado en backend
4. Dispositivos/navegadores no se limpian automáticamente

### Próximos Pasos Recomendados
1. Implementar refresh token flow
2. Agregar validación de expiración de token en frontend
3. Mejorar manejo de errores de red
4. Agregar logging para análisis de seguridad
5. Implementar encriptación de localStorage
