# ⚡ RESUMEN EJECUTIVO - API EXTERNA Y SPs PARA REPORTES

## 🎯 En Una Página

### API Externa: cubed-mr.app

**Base URL:** `https://cubed-mr.app`
**Proxy Local:** `http://localhost:5000/api/reports/*`
**Patrón:** API Gateway (Validación Local → Delegación Externa)

---

## 🗄️ STORED PROCEDURES PARA REPORTES (4)

| # | Nombre SP | Endpoint | Parámetros | Propósito |
|----|-----------|----------|-----------|-----------|
| 1 | **sp_rptFacilityWoundOutcome** | `/api/reports/facility-wound-outcome/{id}/{start}/{end}` | facilityId, startDate, endDate | Reporte de desenlaces de heridas |
| 2 | **sp_rptFacilityAcuityIndex** | `/api/reports/facility-acuity-index/{id}` | facilityId | Índice de acuidad de facility |
| 3 | **sp_rptEtiologyDistribution** | `/api/reports/etiology-distribution/{id}/{date}` | facilityId, date | Distribución de etiología |
| 4 | **sp_rptOutcomeReportGlobal** | `/api/reports/outcome-report-global/{id}/{start}/{end}` | facilityId, startDate, endDate | Reporte global (no usado) |

---

## 📍 ENDPOINTS LOCALES (Node.js)

```
GET/POST  /api/facility-wound-report           → sp_rptFacilityWoundOutcome
GET/POST  /api/facility-acuity-index           → sp_rptFacilityAcuityIndex
GET/POST  /api/etiology-distribution           → sp_rptEtiologyDistribution
```

---

## 🔄 FLUJO DE EJECUCIÓN (Ejemplo: Wound Outcome Report)

```
Cliente: GET /api/facility-wound-report?facilityId=5&startDate=2025-12-01&endDate=2026-01-20
  ↓
API Local (routes.ts)
  ├─ facilityWoundReportHandler()
  ├─ Valida: parámetros presentes, formato correcto
  ├─ Autentica: JWT token válido
  ├─ Sanitiza: escapa caracteres especiales
  └─ Delega: GET https://cubed-mr.app/api/reports/facility-wound-outcome/5/2025-12-01/2026-01-20
  ↓
API Externa (cubed-mr.app)
  ├─ Valida token JWT
  ├─ EXEC sp_rptFacilityWoundOutcome @facilityId=5, @startDate='2025-12-01', @endDate='2026-01-20'
  ├─ BD Externa (remoteWoundcareDB)
  │  └─ Agrupa, calcula métricas, retorna JSON
  └─ Responde con datos
  ↓
API Local
  ├─ Recibe respuesta
  ├─ Wraps: { status: true, data: {...}, source: "backend" }
  └─ Retorna al cliente
  ↓
Cliente: muestra gráficos y tablas del reporte
```

---

## 📊 DATOS TÍPICOS DE CADA SP

### 1️⃣ sp_rptFacilityWoundOutcome
```json
{
  "totalWounds": 45,
  "healed": 12,
  "improved": 20,
  "static": 10,
  "deteriorated": 3,
  "healingRate": 26.7,
  "avgHealingTime": 45
}
```

### 2️⃣ sp_rptFacilityAcuityIndex
```json
{
  "acuityScore": 7.5,
  "acuityLevel": "Medium",
  "activeWounds": 28,
  "severeWounds": 5,
  "complexWounds": 8,
  "healingVelocity": 0.38
}
```

### 3️⃣ sp_rptEtiologyDistribution
```json
{
  "distribution": [
    {"etiology": "Pressure Ulcer", "count": 15, "percentage": 42.86},
    {"etiology": "Surgical", "count": 12, "percentage": 34.29},
    {"etiology": "Vascular", "count": 5, "percentage": 14.29},
    {"etiology": "Traumatic", "count": 3, "percentage": 8.57}
  ],
  "totalWounds": 35
}
```

---

## 🔐 SEGURIDAD

✅ **Validación Local** - Parámetros, tipos, formatos
✅ **JWT Authentication** - Token enviado en cada request
✅ **Sanitización** - Escape de caracteres especiales
✅ **Parámetros tipados** - SQL Server valida tipos (previene SQL injection)
✅ **Timeout 15s** - Previene cuelgues de conexión
✅ **Prepared statements** - Probable en API Externa
✅ **Auditoría completa** - Logs en API Local

---

## 📋 CASOS DE USO

| Caso | SP Llamado | Propósito |
|------|-----------|----------|
| Ver reporte de heridas | sp_rptFacilityWoundOutcome | Dashboard, Reportes |
| Calcular acuidad facility | sp_rptFacilityAcuityIndex | Health monitoring, KPIs |
| Analizar por etiología | sp_rptEtiologyDistribution | Charts, Trend analysis |
| Reporte global | sp_rptOutcomeReportGlobal | Executive reports (no usado) |

---

## 🔗 CONEXIÓN COMPLETA

```
CLIENTE (React)
    ↓
API LOCAL (Node.js + routes.ts)
    ├─ Validación
    ├─ Sanitización
    └─ Autenticación
    ↓
API EXTERNA (cubed-mr.app)
    ├─ Re-validación
    ├─ Ejecución de SP
    └─ Retorno de datos
    ↓
BD EXTERNA (remoteWoundcareDB)
    └─ Queries agregadas, métricas calculadas
```

---

## ✅ RESUMEN

**4 SPs principales para reportes:**
1. ✅ sp_rptFacilityWoundOutcome - Desenlaces
2. ✅ sp_rptFacilityAcuityIndex - Acuidad
3. ✅ sp_rptEtiologyDistribution - Etiología
4. ✅ sp_rptOutcomeReportGlobal - Global

**Protecciones:**
- ✅ API Gateway pattern
- ✅ Multi-layer validation
- ✅ JWT authentication
- ✅ SQL parameter binding
- ✅ Timeout protection
- ✅ Complete auditing

**Status:** ✅ Sistema seguro y escalable implementado

---

**Para análisis completo:** Ver [ANALISIS_API_EXTERNA_Y_SPS_REPORTES.md](ANALISIS_API_EXTERNA_Y_SPS_REPORTES.md)
