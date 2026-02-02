# ⚡ Quick Reference: Logs de getFacilities()

## 🎯 TL;DR

**¿Quieres ver el resultado de getFacilities()?**

1. Presiona `F12` en el navegador
2. Haz login
3. Abre la tab **Console**
4. Verás logs automáticamente

---

## 📊 Qué Verás

```
[useAuth] 🚀 getFacilities() INICIADO
↓
[useAuth] 📤 Payload enviado...
↓
[useAuth] ⏱️  Respuesta en XXX ms
↓
[useAuth] ✅ Facilities Mapeadas: (count)
├─ [1] Facility Name (ID) - Status/PUSH/Wounds
├─ [2] Facility Name (ID) - Status/PUSH/Wounds
└─ [3] Facility Name (ID) - Status/PUSH/Wounds
↓
[FacilitySelectorPage] 📥 RESULTADO
├─ Total facilities: N
└─ ✅ Mapeadas exitosamente
```

---

## 🔍 Buscar en Console

```
Filtrar por:  "getFacilities"    ← Muestra todo
Filtrar por:  "FacilitySelectorPage"  ← Solo Page
Filtrar por:  "🚀"              ← Inicio
Filtrar por:  "✅"              ← Éxito
Filtrar por:  "❌"              ← Error
```

---

## 📋 Campos Mostrados por Facility

```
ID              → Identificador único
Name            → Nombre de la facility
acuity_level    → Crítico/Alerta/Monitoreo/Bajo Riesgo
total_wounds    → Total de encuentros
active_wounds   → Heridas activas ahora
push_score      → Score promedio (escala 0-20)
```

---

## ✅ ¿Qué significa "OK"?

- ✅ HTTP Status: 200
- ✅ "COMPLETADO EXITOSAMENTE"
- ✅ Facilities > 0
- ✅ Todos los campos presentes

---

## ❌ ¿Qué significa "Error"?

| Error | Causa |
|-------|-------|
| Status 500 | Error en servidor |
| Status 401 | Token inválido |
| 0 facilities | Sin datos para este usuario |
| "No token" | No se hizo login |
| Timeout | Servidor no responde |

---

## 🖥️ Ubicación en Código

| Qué | Dónde | Línea |
|-----|-------|-------|
| Hook logs | use-auth.ts | 367 |
| Page logs | facility-selector.tsx | 34 |

---

## 🚀 Test Rápido

```bash
1. npm start          # Inicia app
2. F12               # DevTools
3. Login             # drperez@curisec.com
4. Console tab       # Click aquí
5. Ver logs          # Debería ver 10+ logs
```

---

## 💡 Tips

- **Copiar datos:** Right-click → "Store as global"
- **Buscar:** Ctrl+F en Console
- **Limpiar:** Ctrl+L
- **Expandir objetos:** Click en los triangulitos

---

## 📚 Documentación Completa

Para más detalles, ver:
- [COMO_VER_LOGS_GETFACILITIES.md](./COMO_VER_LOGS_GETFACILITIES.md) - Guía completa
- [RESUMEN_LOGGING_GETFACILITIES.md](./RESUMEN_LOGGING_GETFACILITIES.md) - Información detallada

