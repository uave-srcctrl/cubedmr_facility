# 📋 Guía: Ver el Log de getFacilities()

## 🎯 Objetivo

Mostrar el resultado completo de la llamada a `getFacilities()` en la consola del navegador para debugging y validación.

---

## 📍 Dónde se Ejecuta

El logging ocurre en **DOS LUGARES**:

### 1. **Hook useAuth** (client/src/hooks/use-auth.ts)
- Función: `getFacilities()`
- Nivel: Bajo nivel, detalles de la petición HTTP
- Log file: Consola del navegador (F12 → Console)

### 2. **Page Component** (client/src/pages/facility-selector.tsx)
- Función: `loadFacilities()` en useEffect
- Nivel: Alto nivel, datos mapeados y listos para UI
- Log file: Consola del navegador (F12 → Console)

---

## 🖥️ Cómo Ver los Logs

### Paso 1: Abrir DevTools
```
Tecla: F12 (Windows/Linux) o Cmd+Option+I (Mac)
O Click derecho en la página → Inspeccionar → Console
```

### Paso 2: Navegar a la Página
1. Login exitosamente
2. Será redirigido automáticamente a FacilitySelectorPage
3. En la consola verá los logs

### Paso 3: Buscar en la Consola
- Filtrar por: `getFacilities`
- Filtrar por: `FacilitySelectorPage`
- Ver mensajes con emoji: 🚀 📤 📥 ✅ ❌

---

## 📊 Ejemplo de Output Esperado

### Cuando getFacilities() está completando exitosamente:

```
================================================================================
[useAuth] 🚀 getFacilities() INICIADO
================================================================================
Timestamp: 2024-01-29T14:30:45.123Z

[useAuth] 🔑 Autenticación:
  Email: drperez@curisec.com
  Token: ✅ Presente (E95C2109-9...)

[useAuth] 👤 Usuario es Provider con ID: 5

[useAuth] 📤 Payload de Petición:
  URL: http://localhost:5000/facility/api/get
  Entity: FacilityDataCenter
  Method: lstFacilitiesByWounds
  Email: drperez@curisec.com
  ProviderId: 5
  PracticeId: (no especificado)
  Token: ***C13E8FE

[useAuth] ⏱️  Enviando petición al servidor...
[useAuth] ⏱️  Respuesta recibida en: 234.56 ms
[useAuth] HTTP Status: 200 OK

[useAuth] 📥 Respuesta Completa del Servidor:
  Status: true
  Has data? ✅ Sí

[useAuth] 📊 Datos Recibidos:
  Total items: 3

[useAuth] ✅ Facilities Mapeadas:
  [1] Facility 5 (ID: 5)
       └─ 🩹 Heridas: 28 activas / 145 total | PUSH: 8.45 | Riesgo: Alerta
  [2] Facility 10 (ID: 10)
       └─ 🩹 Heridas: 12 activas / 67 total | PUSH: 6.23 | Riesgo: Monitoreo
  [3] Facility 15 (ID: 15)
       └─ 🩹 Heridas: 5 activas / 23 total | PUSH: 3.45 | Riesgo: Bajo Riesgo

[useAuth] 💾 Estado:
  ✅ Facilities guardadas en localStorage
  ✅ Total facilities: 3

================================================================================
[useAuth] ✅ getFacilities() COMPLETADO EXITOSAMENTE
================================================================================

================================================================================
[FacilitySelectorPage] 📤 Iniciando petición a getFacilities()...
[FacilitySelectorPage] ⏱️  Timestamp: 2024-01-29T14:30:45.456Z

[FacilitySelectorPage] 📥 RESULTADO DE getFacilities()
================================================================================
Total facilities recibidas: 3
Datos completos: (3) [
  {id: '5', name: 'Facility 5', total_wound_encounters: 145, active_wounds: 28, ...},
  {id: '10', name: 'Facility 10', total_wound_encounters: 67, active_wounds: 12, ...},
  {id: '15', name: 'Facility 15', total_wound_encounters: 23, active_wounds: 5, ...}
]
================================================================================

[FacilitySelectorPage] Facility 1: {
  id: "5",
  name: "Facility 5",
  acuity_level: "Alerta",
  total_wounds: 145,
  active_wounds: 28,
  push_score: "8.45"
}

[FacilitySelectorPage] Facility 2: {
  id: "10",
  name: "Facility 10",
  acuity_level: "Monitoreo",
  total_wounds: 67,
  active_wounds: 12,
  push_score: "6.23"
}

[FacilitySelectorPage] Facility 3: {
  id: "15",
  name: "Facility 15",
  acuity_level: "Bajo Riesgo",
  total_wounds: 23,
  active_wounds: 5,
  push_score: "3.45"
}

[FacilitySelectorPage] ✅ Facilities mapeadas exitosamente: 3 facilities
```

---

## ⚠️ Ejemplo de Output en Caso de Error

### Cuando la API retorna un error (500):

```
================================================================================
[useAuth] 🚀 getFacilities() INICIADO
================================================================================

[useAuth] 📤 Payload de Petición:
  URL: http://localhost:5000/facility/api/get
  Entity: FacilityDataCenter
  ...

[useAuth] ⏱️  Enviando petición al servidor...
[useAuth] HTTP Status: 500 Internal Server Error

[useAuth] ❌ La petición falló con status: 500
[useAuth] Cuerpo del error: {
  "error": "FormData is not defined",
  "message": "Cannot process request",
  "code": 500
}

================================================================================
[useAuth] ❌ ERROR en getFacilities()
================================================================================

[FacilitySelectorPage] 🔴 ERROR al cargar facilities: {
  message: "Failed to load facilities from server",
  ...
}

Resultado UI: "No facilities available. Please contact your administrator."
```

### Cuando no hay token:

```
[useAuth] 🚀 getFacilities() INICIADO

[useAuth] 🔑 Autenticación:
  Email: null
  Token: ❌ Falta

[useAuth] ❌ FALLO: No hay token o email disponible
```

---

## 🔍 Qué Buscar en los Logs

### ✅ Señales de Éxito

1. **HTTP Status 200** → Conexión con servidor OK
2. **Total facilities > 0** → Datos recibidos
3. **Facilities Mapeadas** → Datos procesados correctamente
4. **Riesgo/Acuidad mostrados** → Estadísticas de heridas incluidas
5. **getFacilities() COMPLETADO EXITOSAMENTE** → Flujo completo

### ❌ Señales de Problemas

1. **HTTP Status 500** → Error en el servidor
   - **Acción:** Revisar logs del servidor en `./server-login.log`

2. **HTTP Status 401/403** → Problema de autenticación
   - **Acción:** Verificar que el token sea válido

3. **Total facilities = 0** → Sin datos disponibles
   - **Acción:** Verificar que el usuario tenga facilities asignadas

4. **Error en parsing** → Respuesta no es JSON válido
   - **Acción:** Revisar formato de respuesta del API

5. **FALLO: No hay token o email** → No autenticado
   - **Acción:** Hacer login nuevamente

---

## 📈 Flujo de Debugging

### 1️⃣ **Ver petición HTTP** (Network Tab)
```
DevTools → Network → Filter "get"
Click en la petición POST /facility/api/get
- Request Tab: Ver payload enviado
- Response Tab: Ver datos devueltos
```

### 2️⃣ **Ver logs en Console**
```
DevTools → Console
Filtrar por "getFacilities"
- Ver todos los pasos del proceso
- Identificar dónde falla
```

### 3️⃣ **Ver servidor**
```
Terminal donde corre el servidor
Ver logs en: ./server-login.log
- Buscar: [/api/get] FacilityDataCenter
- Ver detalles de processing
```

### 4️⃣ **Validar localStorage**
```
DevTools → Application → Local Storage
Buscar: selectedFacilityId
Buscar: availableFacilities
- Ver qué se guardó
- Ver estructura de datos
```

---

## 🎬 Pasos para Testing

### Test Scenario: Usuario login → Ve facilities

```
1. Abrir DevTools (F12)
2. Ir a Console tab
3. Login con drperez@curisec.com
4. Esperar a que aparezcan logs de getFacilities
5. Verificar:
   ✓ Total facilities > 0
   ✓ Datos incluyen acuity_level
   ✓ Datos incluyen wound statistics
   ✓ Status de getFacilities() = COMPLETADO EXITOSAMENTE
6. Hacer click en facility
7. Verificar:
   ✓ Console log de selección
   ✓ Navigate a /facility/ ocurre
   ✓ Dashboard carga con facility ID correcto
```

---

## 📚 Archivos Modificados

### 1. **client/src/hooks/use-auth.ts**
- Función: `getFacilities()`
- Línea: 367+
- Cambios:
  - ✅ Log de inicio con timestamp
  - ✅ Log de autenticación (email, token)
  - ✅ Log de payload enviado
  - ✅ Log de tiempo de respuesta
  - ✅ Log de datos recibidos
  - ✅ Log de facilities mapeadas (con estadísticas)
  - ✅ Log de éxito/error

### 2. **client/src/pages/facility-selector.tsx**
- Función: `loadFacilities()` en useEffect
- Línea: 34+
- Cambios:
  - ✅ Log de inicio
  - ✅ Log de resultado de getFacilities()
  - ✅ Log detallado de cada facility (con 6 campos)
  - ✅ Log de éxito o error

---

## 🚀 Ejecución Actual

Los logs están **ACTIVOS** en:
- ✅ Desarrollo (npm start)
- ✅ Staging (si se despliega)
- ⚠️ Producción (revisar configuración de logs)

Para desactivar en producción, comentar los `console.log()` o usar:
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('[useAuth] getFacilities...');
}
```

---

## 💡 Tips Útiles

### Filtrar logs en Console
```
Console → Click en "Default" → Seleccionar "FacilitySelectorPage"
```

### Copiar objeto completo
```
Hacer right-click en el objeto → "Store as global variable"
Luego en consola: JSON.stringify(temp1, null, 2)
```

### Ver performance
```
Los logs muestran tiempo en ms:
[useAuth] ⏱️  Respuesta recibida en: 234.56 ms
- < 500ms: Excelente
- 500-1000ms: Bueno
- > 1000ms: Revisar red/servidor
```

### Ver datos de localStorage
```
DevTools → Application → Storage → Local Storage → [Tu URL]
Buscar: "availableFacilities"
Click para expandir y ver JSON
```

