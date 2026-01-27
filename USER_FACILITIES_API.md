# 📋 Endpoint: GET /api/user/facilities

## Descripción

Endpoint que devuelve la lista de **facilities a los que un usuario tiene acceso**.

Dado un email de usuario (facility), retorna:
- Array de IDs de facilities accesibles
- Información de la entidad
- Estado del cache

---

## 🔌 Endpoints

### GET /api/user/facilities

**URL Query Parameters:**
```
GET /api/user/facilities?email=facility@example.com
```

**Headers:**
```
Content-Type: application/json
```

**Response (200 OK):**
```json
{
  "status": true,
  "email": "facility1@wounddatacenter.com",
  "facilities": [1, 2, 3, 5],
  "entityId": "123",
  "entityName": "Main Facility Group",
  "cached": true
}
```

---

### POST /api/user/facilities

**Request Body:**
```json
{
  "email": "facility@example.com"
}
```

**Response (200 OK):**
```json
{
  "status": true,
  "email": "facility@example.com",
  "facilities": [1, 2, 3],
  "entityId": "456",
  "entityName": "Healthcare Network",
  "cached": true
}
```

---

## 📊 Flujo de Datos

```
1. Usuario hace LOGIN (/api/get)
   ↓
2. Sistema caching guarda: email → {facilities, entityId, entityName}
   ↓
3. Usuario solicita GET /api/user/facilities?email=...
   ↓
4. Endpoint retorna array de facilities desde cache
```

---

## 💻 Uso en Frontend (React)

### Hook personalizado

```typescript
import { useUserFacilities, useHasFacilityAccess } from "@/hooks/use-user-facilities";

function MyComponent() {
  // Obtener lista de facilities
  const { data, isLoading, error } = useUserFacilities();
  
  if (data?.facilities) {
    console.log("Facilities:", data.facilities);
  }
  
  // Verificar acceso a facility específica
  const hasAccess = useHasFacilityAccess("5");
  if (hasAccess) {
    console.log("User can access facility 5");
  }
}
```

### Componente listo para usar

```tsx
import { UserFacilitiesList, FacilityAccessOverview } from "@/components/user-facilities";

export function Dashboard() {
  return (
    <div>
      <FacilityAccessOverview />
      <UserFacilitiesList />
    </div>
  );
}
```

---

## 🧪 Test desde Terminal

### Test 1: Con GET y query params

```bash
curl -X GET "http://localhost:5000/api/user/facilities?email=facility1@wounddatacenter.com" \
  -H "Content-Type: application/json"
```

### Test 2: Con POST

```bash
curl -X POST "http://localhost:5000/api/user/facilities" \
  -H "Content-Type: application/json" \
  -d '{"email":"facility1@wounddatacenter.com"}'
```

### Test 3: Script completo

```bash
node /var/www/facility/test/test-user-facilities.js
```

---

## 🔄 Flujo Completo (Login → Get Facilities)

```bash
# 1. Login
curl -X POST "http://localhost:5000/api/get" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "TryLoginFacilities",
    "email": "facility1@wounddatacenter.com",
    "password": "12345678",
    "deviceId": "web-test-device"
  }'

# Respuesta: {status: 1, data: [{token: "...", facilities: [1,2,3], ...}]}

# 2. Obtener facilities del usuario
curl -X GET "http://localhost:5000/api/user/facilities?email=facility1@wounddatacenter.com"

# Respuesta: {status: true, facilities: [1,2,3], entityId: "123", ...}
```

---

## 📦 Estructura de Respuesta

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `status` | boolean | Indica si la solicitud fue exitosa |
| `email` | string | Email del usuario consultado |
| `facilities` | array | Array de IDs de facilities accesibles |
| `entityId` | string/number | ID de la entidad (facility group) |
| `entityName` | string | Nombre de la entidad |
| `cached` | boolean | Indica si los datos vinieron del cache |
| `message` | string | Mensaje adicional (si aplica) |

---

## ⚡ Casos de Uso

### 1. Validar acceso a facility
```typescript
const hasAccess = useHasFacilityAccess(facilityId);
if (!hasAccess) {
  // Redirigir o mostrar error
}
```

### 2. Mostrar selector de facilities
```typescript
const { data } = useUserFacilities();
const options = data?.facilities?.map(id => ({
  value: id,
  label: `Facility ${id}`
}));
```

### 3. Verificar permisos en rutas protegidas
```typescript
function ProtectedRoute({ facilityId }) {
  const hasAccess = useHasFacilityAccess(facilityId);
  
  return hasAccess ? <Dashboard /> : <AccessDenied />;
}
```

---

## 🔒 Seguridad

- ✅ Datos almacenados en cache en memoria del servidor
- ✅ Cache se actualiza en cada login
- ✅ No requiere token adicional (usa email como key)
- ⚠️ Cache en memoria se pierde si el servidor reinicia
- 💡 Considerar migrar a Redis/database en producción

---

## 📝 Notas Técnicas

### Ubicación del código:
- **Backend:** [`facility/server/routes.ts`](facility/server/routes.ts#L207-L295)
- **Frontend Hook:** [`facility/client/src/hooks/use-user-facilities.ts`](facility/client/src/hooks/use-user-facilities.ts)
- **Componentes:** [`facility/client/src/components/user-facilities.tsx`](facility/client/src/components/user-facilities.tsx)
- **Config:** [`facility/client/src/lib/api-config.ts`](facility/client/src/lib/api-config.ts#L23)
- **Tests:** [`facility/test/test-user-facilities.js`](facility/test/test-user-facilities.js)

### Implementación del Cache:

```typescript
// En server/routes.ts línea 11-16
const userFacilitiesCache = new Map<string, {
  facilities: string[] | number[];
  entityId: string | number;
  entityName: string;
  timestamp: number;
}>();

// Se actualiza en POST /api/get línea 135-145
if (data.status === 1 || data.status === true) {
  userFacilitiesCache.set(email, {
    facilities: data.data?.[0]?.facilities || [],
    entityId: data.data?.[0]?.entityId || "",
    entityName: data.data?.[0]?.entityName || "",
    timestamp: Date.now(),
  });
}
```

---

## ✅ Testing Checklist

- [ ] Login con facility1@wounddatacenter.com
- [ ] GET /api/user/facilities?email=facility1@wounddatacenter.com devuelve facilities [1,2,3]
- [ ] POST /api/user/facilities con email en body funciona
- [ ] Sin email devuelve error 400
- [ ] useUserFacilities() hook funciona en React
- [ ] useHasFacilityAccess() retorna true/false correctamente
- [ ] UserFacilitiesList componente se renderiza correctamente
- [ ] Cache se actualiza después de login
