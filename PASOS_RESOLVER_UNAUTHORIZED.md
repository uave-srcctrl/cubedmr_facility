# 🔧 PASOS PARA RESOLVER: "Unauthorized access"

## 🚀 Paso 1: Reiniciar Servidor

El fix está en el código, pero el servidor viejo sigue corriendo. **DEBE ser reiniciado.**

```bash
# En terminal del servidor:
# 1. Presionar Ctrl+C para detener
# 2. Ejecutar:
npm run dev
# 3. Esperar a ver:
# "[express] serving on 127.0.0.1:5000"
```

---

## 🔍 Paso 2: Verificar el Fix Está Aplicado

El servidor nuevo debe mostrar en los logs:

```
[/api/get] Sending as FormData (multipart) for Facility list with Authorization header
{
  entity: 'FacilityDataCenter',
  method: 'lstFacilitiesByWounds',
  tokenInHeader: '✅ Present',
  tokenInFormData: '❌ Excluded',
  ...
}
```

Si ves `tokenInFormData: '❌ Excluded'` → ✅ Fix está aplicado

---

## 🧪 Paso 3: Hacer Login Nuevamente

1. Abre http://localhost:5000 en navegador
2. Haz login con `drperez@curisec.com`
3. Espera a que cargue
4. Abre DevTools (F12)
5. Ve a Console tab

---

## 📊 Paso 4: Ver Logs Completos

Busca en Console por `getFacilities` y **screenshot/copia TODA la salida**:

```
[useAuth] 🚀 getFacilities() INICIADO
[useAuth] 🔑 Email: ...
[useAuth] 🔑 Token: ✅ Presente (...)
[useAuth] 👤 Usuario es Provider con ID: 5
[useAuth] 📤 Payload de Petición:
  URL: http://localhost:5000/facility/api/get
  Entity: FacilityDataCenter
  Method: lstFacilitiesByWounds
  Email: drperez@curisec.com
  ProviderId: 5
  Token: ***...
[useAuth] ⏱️  Enviando petición al servidor...
[useAuth] ⏱️  Respuesta recibida en: XXX ms
[useAuth] HTTP Status: ...
[useAuth] 📥 Respuesta Completa del Servidor:
  Status: ...
  Has data? ...
```

---

## ✅ Si Ahora Ves Status: 200

**Significa que el fix funcionó.**

Luego verás:
- Facilities mapeadas
- Datos con acuity_level
- Sin error "Unauthorized access"

---

## ❌ Si Aún Ves "Unauthorized access"

Significa que hay otro problema. Necesitamos investigar:

### 1️⃣ Ver logs del servidor

```
En la terminal donde corre npm run dev:

Buscar línea:
[/api/get] Sending as FormData (multipart)...

Ver qué está mostrando:
- tokenInHeader: ✅ o ❌
- tokenInFormData: Debería ser ❌ Excluded
```

### 2️⃣ Verificar Network tab

```
DevTools → Network tab
Hacer login
Ver petición POST /facility/api/get
Click en ella
Ver Request headers:
  - Authorization: Bearer ...
  - Content-Type: multipart/form-data

Ver Response:
  - Status: 200, 401, 403, 500?
  - Body: {"status": false, "error": "..."}
```

### 3️⃣ Posibles Causas Si Sigue Fallando

| Causa | Evidencia | Solución |
|-------|-----------|----------|
| Token inválido/expirado | Status 401 | Hacer login nuevamente |
| Token formato incorrecto | "Unauthorized" | Ver formato en Flutter |
| API remota requiere campo extra | Status 400 | Agregar el campo faltante |
| SQL procedure no existe | Status 500 | Deploy procedure en BD remota |
| BD remota sin acceso | Status 403 | Verificar permisos en BD |

---

## 📝 Información que Necesitamos

Si sigue sin funcionar después de reiniciar, dime:

1. **¿Ves en Console?**
   ```
   [/api/get] Sending as FormData...
   tokenInHeader: ✅ Present
   tokenInFormData: ❌ Excluded
   ```

2. **¿HTTP Status es?**
   - 200? → OK, pero data es null
   - 401? → Token inválido
   - 403? → Sin permiso
   - 500? → Error en servidor
   - Otro? → ¿Cuál?

3. **¿Qué dice exactamente el error?**
   ```
   {status: false, error: "..."}
   ```

4. **¿Qué ves en Network tab?**
   - Request headers (Authorization)
   - Response body (JSON completo)

---

## 🎯 Resumen de Pasos

```
1. [CRÍTICO] Reiniciar servidor (npm run dev)
2. Esperar a que muestre "serving on 127.0.0.1:5000"
3. Haz login nuevamente
4. Ver logs en Console
5. Buscar "tokenInHeader: ✅ Present"
6. Si dice 200 OK → Funciona
7. Si no → Copia TODOS los logs y el error exacto
```

---

**El 95% de las veces, el problema es que el servidor viejo sigue corriendo.**
**Reinicia con: Ctrl+C + npm run dev**

