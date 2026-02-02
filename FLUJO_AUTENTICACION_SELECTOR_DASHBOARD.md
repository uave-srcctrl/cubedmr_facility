# Flujo Completo: Autenticación → Selección de Facility → Dashboard

## Cambios Realizados

### 1. Componente FacilitySelectorPage (client/src/pages/facility-selector.tsx)

**Antes:**
- Usaba `getAvailableFacilities()` (función local síncrona)
- Tenía fallback a facility 5 cuando no había facilities
- No hacía petición real al servidor

**Ahora:**
- ✅ Llama a `getFacilities()` (función async que hace petición al servidor)
- ✅ NO hace fallback - muestra error si no hay facilities
- ✅ Espera respuesta del servidor local
- ✅ Mapea datos de heridas para mostrar en el selector

**Código:**
```typescript
// Llamada al servidor
const fetchedFacilities = await getFacilities();

// Sin fallback - error si está vacío
if (!fetchedFacilities || fetchedFacilities.length === 0) {
  setError("No facilities available. Please contact your administrator.");
  return;
}
```

---

### 2. Componente FacilitySelector (client/src/components/facility-selector.tsx)

**Antes:**
- Mostraba solo nombre y ubicación
- No incluía datos de heridas

**Ahora:**
- ✅ Muestra nombre y nivel de acuidad (Crítico, Alerta, etc.)
- ✅ Muestra total de encuentros de heridas
- ✅ Muestra heridas activas
- ✅ Muestra PUSH score promedio
- ✅ Color-coded acuity levels (rojo=Crítico, naranja=Alerta, etc.)

**Datos Mostrados:**
```json
{
  "name": "Facility 5",
  "total_wound_encounters": 145,
  "active_wounds": 28,
  "average_push_score": "8.45",
  "acuity_level": "Alerta"
}
```

---

## Flujo Completo

### 1️⃣ Autenticación (Login.tsx)
```
Usuario ingresa email/contraseña
    ↓
POST /facility/api/get { entity: "TryLogin", ... }
    ↓
Servidor valida contra API remota
    ↓
Token devuelto al cliente
    ↓
Se guarda en localStorage
    ↓
✅ Estado `isAuthenticated = true`
```

### 2️⃣ Redirección a Selector de Facilities (Router.tsx)
```
Router detecta: isAuthenticated = true, facilitySelected = false
    ↓
Renderiza: FacilitySelectorPage
```

### 3️⃣ Carga de Facilities (FacilitySelectorPage.tsx)
```
useEffect → Llama a getFacilities()
    ↓
getFacilities() hace petición al servidor:
POST /facility/api/get {
  entity: "FacilityDataCenter",
  method: "lstFacilitiesByWounds",
  email: "drperez@curisec.com",
  token: "E95C2109...",
  providerId: "5"  // Auto-detectado desde user groups
}
    ↓
Servidor (routes.ts) reconoce FacilityDataCenter
    ↓
Convierte a FormData + Authorization header
    ↓
Envía a: https://cubed-mr.app/api/get
    ↓
API remota ejecuta: sp_facility_LST_AllFacilitiesByWounds
    ↓
Devuelve array de facilities con heridas
    ↓
setFacilities([...])  // Se guardan en estado
```

### 4️⃣ Visualización del Selector
```
FacilitySelector renderiza:
  - Grid con cards de facilities
  - Cada card muestra:
    * Nombre
    * Acuity level (color-coded)
    * Total wound encounters
    * Active wounds
    * PUSH score promedio
  - Radio button para seleccionar
```

### 5️⃣ Selección de Facility
```
Usuario hace click en una facility
    ↓
setSelectedFacility(facilityId)
    ↓
Guarda en localStorage: facilityId
    ↓
Router detecta: facilitySelected = true
    ↓
Navega a: /facility/
```

### 6️⃣ Dashboard Cargado
```
Dashboard.tsx renderiza
    ↓
getSelectedFacility() devuelve ID seleccionado
    ↓
Usa ese ID para cargar datos específicos
    ↓
FacilityInfoBanner muestra info de facility seleccionada
    ↓
Gráficos y reportes usan facilityId del selector
```

---

## Flujo de Datos

### API Request (getFacilities):

**POST /facility/api/get**
```json
{
  "entity": "FacilityDataCenter",
  "method": "lstFacilitiesByWounds",
  "email": "drperez@curisec.com",
  "token": "E95C2109-9945-4CE5-8026-82844C13E8FE",
  "providerId": "5"
}
```

### API Response:

```json
{
  "status": true,
  "data": [
    {
      "id": 5,
      "facility_id": 5,
      "name": "Facility 5",
      "facility_name": "Facility 5",
      "total_wound_encounters": 145,
      "total_active_patients": 32,
      "patients_seen_today": 8,
      "active_wounds": 28,
      "new_wounds": 5,
      "resolved_wounds": 112,
      "hospitalized_wounds": 2,
      "improving_wounds": 18,
      "deteriorating_wounds": 3,
      "stable_wounds": 7,
      "critical_wounds": 1,
      "alert_wounds": 4,
      "chronic_wounds": 23,
      "average_push_score": "8.45",
      "average_wound_area_cm2": "12.34",
      "average_days_since_onset": "45",
      "percent_improving": "64.29",
      "percent_resolved": "77.93",
      "top_etiologies": "Pressure,Venous,Traumatic",
      "acuity_level": "Alerta",
      "last_encounter_date": "2024-01-15T09:30:00",
      "first_encounter_date": "2023-06-20T14:15:00",
      "report_date": "2024-01-15T00:00:00"
    },
    {
      "id": 6,
      "facility_id": 6,
      "name": "Facility 6",
      ...
    }
  ]
}
```

---

## Validación y Manejo de Errores

### ✅ Si facilities se cargan correctamente:
```
✓ List se muestra con todas las facilities
✓ Usuario puede seleccionar una
✓ Dashboard carga con datos de esa facility
```

### ❌ Si no hay facilities:
```
✗ Se muestra: "No facilities available. Please contact your administrator."
✗ NO hace fallback a facility 5
✗ Usuario debe contactar al administrador
```

### ❌ Si el servidor no responde:
```
✗ Se muestra: "Failed to load facilities from server. Please try again."
✗ Usuario puede intentar recargar la página
```

### ⚠️ Si facilities están vacías pero request es 200:
```
⚠ Se muestra: "No facilities available..."
⚠ NO hace fallback
```

---

## Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `client/src/pages/facility-selector.tsx` | Usa `getFacilities()` async, sin fallback |
| `client/src/components/facility-selector.tsx` | Muestra datos de heridas, color-coded acuity |
| `server/routes.ts` | Ya tiene soporte para FacilityDataCenter |

---

## Estado Actual

### ✅ Completado:
- [x] Server endpoint FacilityDataCenter implementado
- [x] FacilitySelectorPage hace petición al servidor
- [x] Sin fallback (error si vacío)
- [x] UI mejorado con datos de heridas
- [x] Dashboard usa facilityId seleccionado

### ⏳ Requiere Configuración Externa:
- [ ] API remota (cubed-mr.app) configurada para FacilityDataCenter
- [ ] SQL procedure deployado en base de datos remota

---

## Testing

### Para probar el flujo completo:

1. **Iniciar servidor:**
   ```bash
   npm run dev
   ```

2. **Iniciar cliente:**
   ```bash
   cd client && npm start
   ```

3. **Flujo manual:**
   - Login con: drperez@curisec.com / password
   - Debe redirigir a FacilitySelectorPage
   - Debe cargar lista de facilities
   - Seleccionar una facility
   - Debe mostrar dashboard de esa facility

4. **Verificar en consola:**
   - `[FacilitySelectorPage] Loading facilities from server...`
   - `[FacilitySelectorPage] Received facilities: [...]`
   - `[FacilitySelectorPage] Successfully selected facility: {id}`
   - `[Dashboard] Selected facility ID: {id}`

---

## Consideraciones

### Por qué NO hay fallback:
- ✓ Fuerza a configurar facilities correctamente
- ✓ No esconde errores de configuración
- ✓ User obtiene feedback claro
- ✓ Admin sabe que hay un problema

### Ventajas del nuevo flujo:
- ✓ Datos reales del servidor (no hardcoded)
- ✓ Muestra estadísticas de cada facility
- ✓ UI más informativo para user
- ✓ Escalable si hay muchas facilities
- ✓ Información de acuity ayuda a priorizar

### Próximos pasos:
1. Verificar que API remota esté configurada
2. Desplegar SQL procedure en base de datos
3. Hacer prueba end-to-end
4. Ajustar según datos reales

