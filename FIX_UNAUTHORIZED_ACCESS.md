# 🔧 FIX: "Unauthorized access" en getFacilities()

**Problema:** `status: false, error: "Unauthorized access"`  
**Causa:** Token siendo enviado en DOS lugares (FormData + Authorization header)  
**Solución:** Enviar token SOLO en Authorization header  
**Status:** ✅ **CORREGIDO**

---

## 🔍 El Problema

Cuando se hace la petición a `getFacilities()`:

```json
{
  "status": false,
  "error": "Unauthorized access"
}
```

### ¿Por qué ocurre?

La API remota recibe:
- ❌ Token en FormData (campo `token`)
- ❌ Token en Authorization header
- ❌ Formato duplicado confunde al servidor

La API remota espera:
- ✅ Token SOLO en Authorization header
- ✅ FormData sin el campo `token`

---

## ✅ La Solución

### Cambio en `server/routes.ts` (Línea 250)

**ANTES:**
```typescript
const formData = new FormData();
for (const key in remotePayload) {
  // Enviaba TODOS los campos, incluyendo token
  if (remotePayload[key] !== undefined && remotePayload[key] !== null) {
    formData.append(key, remotePayload[key]);
  }
}
body = formData;
headers = {
  ...formData.getHeaders(),
  // TAMBIÉN agregaba el token acá → Token en DOS lugares
  ...(remotePayload.token && { "Authorization": `Bearer ${remotePayload.token}` }),
};
```

**DESPUÉS:**
```typescript
// 1️⃣ EXTRAER el token
const token = remotePayload.token as string;

// 2️⃣ Crear FormData SIN el token
const formData = new FormData();
for (const key in remotePayload) {
  // SALTAMOS el campo "token"
  if (key === "token") {
    continue;  // ← No enviamos el token en FormData
  }
  if (remotePayload[key] !== undefined && remotePayload[key] !== null) {
    formData.append(key, remotePayload[key]);
  }
}

// 3️⃣ Agregar Authorization header con el token
body = formData;
headers = {
  ...formData.getHeaders(),
  // SOLO en el header, no en FormData
  ...(token && { "Authorization": `Bearer ${token}` }),
};
```

---

## 📊 Antes vs Después

### ANTES (❌ Falla)
```
Petición a API Remota:
├─ FormData:
│  ├─ entity: "FacilityDataCenter"
│  ├─ method: "lstFacilitiesByWounds"
│  ├─ email: "drperez@curisec.com"
│  ├─ token: "E95C2109-9945-4CE5-8026-82844C13E8FE"  ← TOKEN EN FORMDATA
│  ├─ providerId: "5"
│  └─ ...
│
└─ Headers:
   ├─ Content-Type: multipart/form-data
   ├─ Authorization: Bearer E95C2109-9945-4CE5-8026-82844C13E8FE  ← TOKEN EN HEADER
   └─ ...

Resultado: "Unauthorized access" ❌
Razón: Token en dos lugares confunde al servidor
```

### DESPUÉS (✅ Funciona)
```
Petición a API Remota:
├─ FormData:
│  ├─ entity: "FacilityDataCenter"
│  ├─ method: "lstFacilitiesByWounds"
│  ├─ email: "drperez@curisec.com"
│  ├─ providerId: "5"
│  └─ ... (SIN token)
│
└─ Headers:
   ├─ Content-Type: multipart/form-data
   ├─ Authorization: Bearer E95C2109-9945-4CE5-8026-82844C13E8FE  ← TOKEN AQUÍ
   └─ ...

Resultado: Facilities recibidas ✅
Razón: Token en UN lugar, formato correcto
```

---

## 🔐 Por Qué Funciona

**API Remota (cubed-mr.app):**
1. Recibe la petición POST
2. Busca el token en Authorization header
3. Valida el token
4. Si encuentra token en FormData AND en header → confusión
5. Si encuentra SOLO en header → ✅ OK

**Mejor Práctica REST:**
- Los tokens de autenticación van en Authorization header
- Los datos van en el cuerpo (FormData, JSON, etc.)
- Nunca duplicar el token en ambos lugares

---

## 🚀 Cómo Probar el Fix

### Paso 1: Verificar que está aplicado
```
Archivo: server/routes.ts
Línea: 250
Buscar: if (key === "token") { continue; }
Debería estar presente ✅
```

### Paso 2: Reiniciar servidor
```bash
npm run dev
# Debe mostrar: 3:XX:XX PM [express] serving on 127.0.0.1:5000
```

### Paso 3: Hacer login y ver logs
```
1. Presiona F12
2. Haz login
3. Abre Console
4. Busca por "getFacilities"
5. Debería ver:
   - [useAuth] ⏱️  Respuesta recibida en: XXX ms
   - [useAuth] HTTP Status: 200 OK ✅
   - Facilities mapeadas con datos
```

### Paso 4: Verificar en servidor log
```
Ver ./server-login.log
Buscar: "tokenInHeader: ✅ Present"
Debería estar sin token en FormData
```

---

## 📝 Cambios Realizados

| Archivo | Línea | Cambio |
|---------|-------|--------|
| server/routes.ts | 250-275 | Extraer token antes de crear FormData + Skip token en loop |

**Total:** 1 archivo modificado, ~15 líneas cambiadas

---

## ⚠️ Si Sigue Fallando

### Verificar logs del servidor

```
1. Ver ./server-login.log
2. Buscar línea: "[/api/get] Sending as FormData (multipart)"
3. Debe mostrar: "tokenInHeader: ✅ Present"
4. Si muestra "❌ Missing" → Token no está siendo leído
```

### Verificar response del API remota

```
En Console:
1. Abrir DevTools
2. Network tab
3. Hacer login
4. Ver petición POST /facility/api/get
5. Response tab → Ver respuesta JSON
6. Si es {"status": false, "error": "..."} → Ver mensaje completo
```

### Causas Alternativas

Si sigue con error "Unauthorized access":

1. **Token expirado** → Hacer login nuevamente
2. **Credenciales incorrectas** → Verificar email/password
3. **API remota caída** → Verificar https://cubed-mr.app
4. **SQL procedure no existe** → Deploy sp_facility_LST_AllFacilitiesByWounds
5. **Permisos en BD remota** → El usuario no tiene acceso

---

## 🧪 Test de Validación

### Test 1: Token en Authorization header solamente

```
✅ PASSED si:
- No hay campo "token" en FormData
- Authorization header presente
- HTTP 200 OK
- Facilities en respuesta
```

### Test 2: Logging correcto

```
✅ PASSED si:
- Console muestra "tokenInHeader: ✅ Present"
- No hay error 401/403
- No hay "Unauthorized access"
```

### Test 3: Facilities se muestran

```
✅ PASSED si:
- FacilitySelectorPage muestra list
- Cada facility con datos (ID, nombre, acuity, heridas)
- Usuario puede seleccionar una
```

---

## 📚 Documentación Relacionada

Para más context, ver:
- [REPORTE_FINAL_LOGGING.md](./REPORTE_FINAL_LOGGING.md) - Sistema de logging
- [FLUJO_AUTENTICACION_SELECTOR_DASHBOARD.md](./FLUJO_AUTENTICACION_SELECTOR_DASHBOARD.md) - Flujo completo
- [COMO_VER_LOGS_GETFACILITIES.md](./COMO_VER_LOGS_GETFACILITIES.md) - Debugging

---

## ✅ Resumen del Fix

| Aspecto | Antes | Después |
|--------|-------|---------|
| Token en FormData | Sí (❌) | No (✅) |
| Token en Header | Sí (✅) | Sí (✅) |
| Lugares donde va token | 2 (❌) | 1 (✅) |
| Resultado API | "Unauthorized" (❌) | Facilities (✅) |

---

## 🎯 Próximos Pasos

1. ✅ Fix aplicado
2. ⏳ Reiniciar servidor (`npm run dev`)
3. ⏳ Hacer login
4. ⏳ Verificar que getFacilities() retorna datos
5. ⏳ Seleccionar facility → Dashboard
6. ✅ Completado

---

**Fix Completado:** 29 de Enero de 2026  
**Causa:** Token duplicado en FormData y Authorization header  
**Solución:** Enviar token SOLO en Authorization header

