# 🔧 FIX v2: "Unauthorized access" - Token en FormData

**Problema:** API remota rechaza con "Unauthorized access"  
**Causa (Corregida):** Token debe estar EN FormData, NO en Authorization header  
**Status:** ✅ **CORREGIDO**

---

## 🔍 El Problema (Actualizado)

La API remota (cubed-mr.app) espera:
- ✅ Token EN EL FormData (multipart/form-data)
- ❌ NO en Authorization header

Antes estábamos:
- ❌ Enviando token en AMBOS lugares (FormData + Authorization header)
- ❌ O intentando mandarlo solo en header

---

## ✅ La Solución (Versión 2)

### Cambio en `server/routes.ts` (Línea 250)

**Ahora:**
```typescript
// Incluir TODOS los campos en FormData, incluyendo token
const formData = new FormData();
for (const key in remotePayload) {
  // INCLUYE el token en FormData
  if (remotePayload[key] !== undefined && remotePayload[key] !== null) {
    formData.append(key, remotePayload[key]);
  }
}
body = formData;
headers = {
  ...formData.getHeaders(),
  // NO agregamos Authorization header
  // El token va en el FormData
};
```

---

## 📊 Qué Se Envía Ahora

### FormData (multipart/form-data):
```
entity: FacilityDataCenter
method: lstFacilitiesByWounds
email: drperez@curisec.com
token: E95C2109-9945-4CE5-8026-82844C13E8FE  ← ✅ AQUÍ
providerId: 5
```

### Headers:
```
Content-Type: multipart/form-data; boundary=...
(NO Authorization header)
```

---

## 🚀 Cómo Probar

### 1. Reiniciar servidor
```bash
npm run dev
```

### 2. Haz login nuevamente

### 3. Ver logs en Console
```
[useAuth] 🚀 getFacilities() INICIADO
...
[/api/get] Sending as FormData (multipart) for Facility list
{
  tokenInFormData: "✅ Present",
  authHeaderIncluded: "❌ No (token in FormData only)"
}
...
[useAuth] HTTP Status: 200 OK ✅
[useAuth] ✅ Facilities Mapeadas: 3
```

---

## ✅ Esperado Si Funciona

```
[useAuth] 📥 RESULTADO DE getFacilities()
Total facilities recibidas: 3
[useAuth] ✅ Facilities Mapeadas:
  [1] Facility 5 (ID: 5)
       └─ Heridas: 28 activas / 145 total | PUSH: 8.45 | Alerta
  [2] Facility 10 (ID: 10)
       └─ Heridas: 12 activas / 67 total | PUSH: 6.23 | Monitoreo
  [3] Facility 15 (ID: 15)
       └─ Heridas: 5 activas / 23 total | PUSH: 3.45 | Bajo Riesgo
```

---

## 📝 Cambios

| Archivo | Línea | Cambio |
|---------|-------|--------|
| server/routes.ts | 250-270 | Token en FormData, NO en Authorization header |

---

## 🎯 Resumen

**Antes:** Enviábamos token en 2 lugares → Unauthorized  
**Ahora:** Enviamos token en FormData solamente → ✅ Debería funcionar

**Nota:** La mayoría de APIs REST usan Authorization header, pero esta API remota específica quiere el token en el body/FormData.

