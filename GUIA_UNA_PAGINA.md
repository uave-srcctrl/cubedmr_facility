# 📄 GUÍA DE UNA PÁGINA: Sistema de Logging getFacilities()

---

## 🎯 ¿QUÉ SE HIZO?

Se agregó **logging detallado** en la función `getFacilities()` para ver en tiempo real:
- ✅ Cuándo inicia
- ✅ Validación de autenticación
- ✅ Payload enviado
- ✅ Duración de la petición
- ✅ Respuesta recibida
- ✅ Facilities mapeadas
- ✅ Confirmación de éxito

---

## 🖥️ CÓMO VER LOS LOGS

### Paso 1: Abrir DevTools
```
Tecla: F12 (Windows/Linux) o Cmd+Option+I (Mac)
```

### Paso 2: Haz Login
```
Email: drperez@curisec.com
Password: [Tu contraseña]
```

### Paso 3: Abre Console Tab
```
DevTools → Console (o ya estará abierta)
```

### Paso 4: Ver Logs Automáticamente
```
Verás algo como:
[useAuth] 🚀 getFacilities() INICIADO
[useAuth] 🔑 Autenticación: Email ✅, Token ✅
...
[useAuth] ✅ Facilities Mapeadas: (3 facilities)
...
[useAuth] ✅ getFacilities() COMPLETADO EXITOSAMENTE
```

---

## 📊 QUÉ VERÁS

### Ejemplo de Output Completo

```
================================================================================
[useAuth] 🚀 getFacilities() INICIADO
================================================================================
Timestamp: 2024-01-29T14:30:45.123Z

[useAuth] 🔑 Autenticación:
  Email: drperez@curisec.com
  Token: ✅ Presente (E95C2109-...)

[useAuth] 👤 Usuario es Provider con ID: 5

[useAuth] 📤 Payload de Petición:
  URL: http://localhost:5000/facility/api/get
  Entity: FacilityDataCenter
  Method: lstFacilitiesByWounds
  ProviderId: 5

[useAuth] ⏱️  Respuesta recibida en: 234.56 ms
[useAuth] HTTP Status: 200 OK

[useAuth] 📊 Datos Recibidos: Total items: 3

[useAuth] ✅ Facilities Mapeadas:
  [1] Facility 5 (ID: 5)
       └─ 🩹 Heridas: 28 activas / 145 total | PUSH: 8.45 | Riesgo: Alerta
  [2] Facility 10 (ID: 10)
       └─ 🩹 Heridas: 12 activas / 67 total | PUSH: 6.23 | Riesgo: Monitoreo
  [3] Facility 15 (ID: 15)
       └─ 🩹 Heridas: 5 activas / 23 total | PUSH: 3.45 | Riesgo: Bajo Riesgo

[useAuth] 💾 Facilities guardadas en localStorage
================================================================================
[useAuth] ✅ getFacilities() COMPLETADO EXITOSAMENTE
================================================================================

[FacilitySelectorPage] 📥 RESULTADO DE getFacilities()
Total facilities recibidas: 3
[FacilitySelectorPage] ✅ Facilities mapeadas exitosamente: 3 facilities
```

---

## ✅ ¿QUÉ SIGNIFICA "OK"?

- [x] HTTP Status: 200
- [x] Total facilities > 0
- [x] Log dice "COMPLETADO EXITOSAMENTE"
- [x] Cada facility muestra: ID, nombre, acuity, heridas, PUSH

**Si ves todo esto → ✅ Funcionando correctamente**

---

## ❌ POSIBLES ERRORES

| Error | Causa | Solución |
|-------|-------|----------|
| "No hay token" | No se hizo login | Haz login primero |
| HTTP 500 | Error en servidor | Ver `./server-login.log` |
| HTTP 401 | Token inválido | Hacer login nuevamente |
| Total facilities: 0 | Sin datos | Verificar base de datos |
| "Error parsing JSON" | Respuesta no es JSON | Revisar API remota |

---

## 🔍 DEBUGGING RÁPIDO

### Si no ves facilities:
1. ¿Tienes token? → Busca "Autenticación" en logs
2. ¿Status es 200? → Busca "HTTP Status" en logs
3. ¿Hay datos? → Busca "Total items" en logs
4. ¿Hay error? → Busca "❌ ERROR" en logs

### Pasos:
```
1. Abre Console (F12)
2. Busca por "getFacilities" en los logs
3. Lee de arriba a abajo
4. Identifica dónde falla
5. Revisa la tabla de errores arriba
```

---

## 📁 ARCHIVOS MODIFICADOS

| Archivo | Línea | Cambio |
|---------|-------|--------|
| use-auth.ts | 367 | Función getFacilities() |
| facility-selector.tsx | 34 | useEffect loadFacilities() |

---

## 📚 DOCUMENTACIÓN

| Documento | Para Qué |
|-----------|----------|
| QUICK_REFERENCE_LOGS.md | TL;DR (2 min) |
| REPORTE_FINAL_LOGGING.md | Resumen (5 min) |
| COMO_VER_LOGS_GETFACILITIES.md | Guía detallada (10 min) |
| INDICE_DOCUMENTACION_LOGGING.md | Índice de todo |

---

## ⏱️ PERFORMANCE

Se muestra el tiempo en milisegundos:
```
[useAuth] ⏱️  Respuesta recibida en: 234.56 ms
```

- **< 500ms** → Excelente ⭐
- **500-1000ms** → Bueno ✅
- **> 1000ms** → Revisar red 🐢

---

## 💾 GUARDAR DATOS DE CONSOLE

### Copiar todo:
```
1. Right-click en un log
2. "Copy as global variable"
3. Luego: JSON.stringify(temp1, null, 2)
```

### Ver en localStorage:
```
DevTools → Application → Local Storage → [Tu URL]
Buscar: "availableFacilities"
Verá el JSON con todas las facilities
```

---

## 🚀 CHECKLIST RÁPIDO

- [ ] Presioné F12
- [ ] Hice login
- [ ] Veo [useAuth] 🚀 getFacilities() INICIADO
- [ ] Veo datos de facilities
- [ ] Veo "COMPLETADO EXITOSAMENTE"
- [ ] ✅ Todo funcionando

---

## 🎯 RESUMEN

**El sistema de logging muestra:**
1. Autenticación validada ✅
2. Payload enviado ✅
3. Duración en ms ✅
4. Status HTTP ✅
5. Facilities recibidas ✅
6. Detalles de cada facility ✅
7. Confirmación de éxito ✅

**Todo automáticamente cuando haces login.**

**Listo para usar en desarrollo, testing y debugging.**

---

**Documento de Referencia Rápida - Imprime esto si lo necesitas**

