# 📊 ANÁLISIS VISUAL - API EXTERNA Y SPs

## 🎯 Resumen en Gráfico

### Arquitectura de 3 Capas

```
┌─────────────────────────────────────────────────────────────────────┐
│ CAPA 1: CLIENTE                                                     │
│ ├─ React (woundcareapp)                                            │
│ ├─ Flutter (woundcareapp)                                          │
│ └─ Llamadas: GET/POST /api/*                                       │
└────────────────┬────────────────────────────────────────────────────┘
                 │ HTTP/HTTPS
                 │
┌────────────────▼────────────────────────────────────────────────────┐
│ CAPA 2: API LOCAL (NODE.JS)                                        │
│ ├─ server/routes.ts (1826 líneas)                                  │
│ ├─ Validación                                                       │
│ ├─ Sanitización                                                     │
│ ├─ Autenticación (JWT)                                             │
│ ├─ 3 Handlers de Reportes:                                         │
│ │  1. facilityWoundReportHandler                                  │
│ │  2. facilityAcuityIndexHandler                                  │
│ │  3. etiologyDistributionHandler                                 │
│ └─ Delegación a API Externa                                        │
└────────────────┬────────────────────────────────────────────────────┘
                 │ HTTPS (JWT Token)
                 │
┌────────────────▼────────────────────────────────────────────────────┐
│ CAPA 3: API EXTERNA (cubed-mr.app)                                 │
│ ├─ /api/reports/facility-wound-outcome/{id}/{s}/{e}               │
│ ├─ /api/reports/facility-acuity-index/{id}                        │
│ ├─ /api/reports/etiology-distribution/{id}/{d}                    │
│ ├─ /api/reports/outcome-report-global/{id}/{s}/{e}                │
│ └─ Re-validación + Ejecución de SPs                               │
└────────────────┬────────────────────────────────────────────────────┘
                 │ SQL Queries
                 │
┌────────────────▼────────────────────────────────────────────────────┐
│ CAPA 4: BD EXTERNA (SQL SERVER)                                    │
│ ├─ remoteWoundcareDB.dbo                                           │
│ ├─ 4 SPs de Reportes:                                              │
│ │  1. sp_rptFacilityWoundOutcome                                  │
│ │  2. sp_rptFacilityAcuityIndex                                   │
│ │  3. sp_rptEtiologyDistribution                                  │
│ │  4. sp_rptOutcomeReportGlobal                                   │
│ └─ + 6 SPs de Autenticación/Datos                                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ SPs PARA REPORTES (4)

```
┌─────────────────────────────────────────────────────────────────────┐
│ sp_rptFacilityWoundOutcome                                          │
├─ Parámetros: facilityId, startDate, endDate                        │
├─ Retorna: Métricas de desenlaces (healed, improved, etc.)          │
├─ Dashboard: Facility metrics, KPIs                                  │
└─ Endpoint: /api/facility-wound-report                              │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ sp_rptFacilityAcuityIndex                                           │
├─ Parámetros: facilityId                                            │
├─ Retorna: Acuity score, active wounds, severe wounds               │
├─ Dashboard: Health monitoring, resource planning                   │
└─ Endpoint: /api/facility-acuity-index                              │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ sp_rptEtiologyDistribution                                          │
├─ Parámetros: facilityId, date                                      │
├─ Retorna: Distribution por etiología (PU, Surgical, Vascular, etc.)│
├─ Dashboard: Pie charts, trend analysis                             │
└─ Endpoint: /api/etiology-distribution                              │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ sp_rptOutcomeReportGlobal ⚠️ NO USADO                              │
├─ Parámetros: facilityId (0=global), startDate, endDate             │
├─ Retorna: Agregado global o por facility                           │
├─ Propósito: Executive reports (no implementado)                    │
└─ Endpoint: (Definido pero no delegado)                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📋 FLUJO DE LLAMADA (Ejemplo: Wound Outcome Report)

```
PASO 1: Usuario solicita reporte
─────────────────────────────────
Cliente (React)
  └─ Usuario elige: Facility=5, Período=Dec-Jan
  └─ Click: "Ver Reporte"
  └─ Llama: GET /api/facility-wound-report?facilityId=5&startDate=2025-12-01&endDate=2026-01-20

PASO 2: API Local recibe request
───────────────────────────────
routes.ts: facilityWoundReportHandler()
  ├─ Extrae: facilityId=5, startDate, endDate
  ├─ Valida: ¿Parámetros presentes? ✅
  ├─ Obtiene: JWT token del header
  ├─ Autentica: ¿Token válido? ✅
  └─ Sanitiza: Escapa caracteres especiales

PASO 3: Delegación a API Externa
─────────────────────────────────
fetchWithTimeout(
  url: 'https://cubed-mr.app/api/reports/facility-wound-outcome/5/2025-12-01/2026-01-20',
  headers: { Authorization: 'Bearer <JWT_TOKEN>' }
  timeout: 15000ms
)

PASO 4: API Externa procesa
──────────────────────────
cubed-mr.app/api/reports/
  ├─ Recibe request
  ├─ Valida JWT token
  ├─ Ejecuta: EXEC sp_rptFacilityWoundOutcome
  │         @facilityId = 5,
  │         @startDate = '2025-12-01',
  │         @endDate = '2026-01-20'
  └─ DB: remoteWoundcareDB procesa SP

PASO 5: BD Externa calcula métricas
──────────────────────────────────
remoteWoundcareDB.dbo.sp_rptFacilityWoundOutcome
  ├─ SELECT COUNT(*) as totalWounds
  ├─ SELECT COUNT(*) as healed (disposition='Resolved')
  ├─ SELECT COUNT(*) as improved (progress='Improving')
  ├─ SELECT COUNT(*) as static (progress='Stable')
  ├─ SELECT COUNT(*) as deteriorated (progress='Deteriorating')
  ├─ CALC AVG healing_velocity
  └─ CALC AVG healing_days

PASO 6: API Externa retorna respuesta
──────────────────────────────────
{
  "status": true,
  "data": {
    "totalWounds": 45,
    "healed": 12,
    "improved": 20,
    "static": 10,
    "deteriorated": 3,
    "healingRate": 26.7,
    "avgHealingTime": 45
  }
}

PASO 7: API Local procesa respuesta
───────────────────────────────────
routes.ts: facilityWoundReportHandler()
  ├─ Recibe: { status: true, data: {...} }
  ├─ Wraps: { status: true, data: {...}, source: "backend" }
  ├─ Logs: Información de auditoría
  └─ Retorna al cliente

PASO 8: Cliente renderiza
────────────────────────
React: ReportsComponent
  ├─ Recibe: { status: true, data: {...}, source: "backend" }
  ├─ Renderiza: Gráficos, tablas, métricas
  ├─ Muestra: 
  │  ├─ Total: 45 heridas
  │  ├─ Cicatrizadas: 12 (26.7%)
  │  ├─ Mejorando: 20 (44.4%)
  │  ├─ Estable: 10 (22.2%)
  │  └─ Empeorando: 3 (6.7%)
  └─ Usuario: Ve reporte completo con gráficos
```

---

## 🔐 CAPAS DE SEGURIDAD

```
┌──────────────────────────────────────────────────────────────┐
│ CAPA 1: CLIENTE                                              │
│ ├─ Validación básica                                        │
│ ├─ Tipos de datos                                           │
│ └─ Formato de parámetros                                    │
└──────────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────────┐
│ CAPA 2: API LOCAL (routes.ts)                               │
│ ├─ ✅ Validación completa                                   │
│ │  ├─ Parámetros presentes                                 │
│ │  ├─ Formatos correctos                                   │
│ │  └─ Tipos válidos                                        │
│ ├─ ✅ Sanitización                                          │
│ │  ├─ Escape HTML/XML                                      │
│ │  └─ Prevención XSS                                       │
│ ├─ ✅ Autenticación JWT                                     │
│ │  └─ Token verificado                                     │
│ └─ ✅ Timeout (15s)                                         │
│    └─ Prevención DoS                                        │
└──────────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────────┐
│ CAPA 3: API EXTERNA (cubed-mr.app)                          │
│ ├─ Re-validación de token JWT                              │
│ ├─ Re-validación de parámetros                             │
│ └─ Auditoría y logging                                     │
└──────────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────────┐
│ CAPA 4: BD EXTERNA (SQL Server)                             │
│ ├─ Parámetros tipados (previene SQL injection)             │
│ ├─ Stored Procedure execution                              │
│ ├─ Constraints y validaciones                              │
│ └─ Auditoría de cambios                                    │
└──────────────────────────────────────────────────────────────┘
```

---

## 📊 COMPARATIVA DE SPs

```
REPORT METRICS (sp_rptFacilityWoundOutcome)
───────────────────────────────────────────
Input:    facilityId, startDate, endDate
Output:   totalWounds, healed, improved, static, deteriorated, healingRate
Use Case: Dashboard metrics, facility reports
Response: [45, 12, 20, 10, 3, 26.7%]


ACUITY SCORING (sp_rptFacilityAcuityIndex)
──────────────────────────────────────────
Input:    facilityId
Output:   acuityScore, activeWounds, severeWounds, complexWounds
Use Case: Health monitoring, resource planning
Response: [7.5/10 (Medium), 28 active, 5 severe, 8 complex]
Formula:  (activeWounds×0.3 + severeWounds×0.4 + complexWounds×0.3) / total


ETIOLOGY BREAKDOWN (sp_rptEtiologyDistribution)
───────────────────────────────────────────────
Input:    facilityId, date
Output:   distribution[], totalWounds, percentages
Use Case: Pie charts, trend analysis
Response: [PU: 15 (42.86%), Surgical: 12 (34.29%), Vascular: 5 (14.29%), Traumatic: 3 (8.57%)]


GLOBAL OUTCOMES (sp_rptOutcomeReportGlobal - NOT USED)
──────────────────────────────────────────────────────
Input:    facilityId (0=global), startDate, endDate
Output:   aggregated metrics by facility or global
Use Case: Executive reports, multi-facility comparison
Response: Array of facilities with metrics
Status:   ⚠️ Defined but not delegated from routes.ts
```

---

## 🎯 RESUMEN VISUAL

```
TOTAL SPs: 10
├─ Reportes: 4 (3 usados + 1 no usado)
├─ Autenticación: 2
└─ Datos de Usuario: 4

HANDLERS EN ROUTES.TS: 3
├─ facilityWoundReportHandler
├─ facilityAcuityIndexHandler
└─ etiologyDistributionHandler

ENDPOINTS DELEGADOS: 3
├─ GET/POST /api/facility-wound-report
├─ GET/POST /api/facility-acuity-index
└─ GET/POST /api/etiology-distribution

CAPAS DE SEGURIDAD: 4
├─ Cliente (validación básica)
├─ API Local (validación completa + sanitización + JWT)
├─ API Externa (re-validación)
└─ BD (parámetros tipados + constraints)

TIMEOUT: 15 segundos

AUTENTICACIÓN: JWT Token (Bearer)

RESPONSE FORMAT: { status: boolean, data: object, source: "backend" }
```

---

## ✅ CHECKLIST DE ANÁLISIS

- [x] API Externa identificada: ✅ cubed-mr.app
- [x] SPs de Reportes listados: ✅ 4 encontrados
- [x] Endpoints locales mapeados: ✅ 3 activos
- [x] Parámetros documentados: ✅ Completo
- [x] Flujos de ejecución: ✅ Detallados
- [x] Capas de seguridad: ✅ 4 identificadas
- [x] Datos típicos: ✅ Ejemplos incluidos
- [x] Validaciones: ✅ Multi-capa
- [x] Manejo de errores: ✅ Try-catch + status codes
- [x] Auditoría: ✅ Logging completo

---

## 📌 DOCUMENTOS RELACIONADOS

1. **ANALISIS_API_EXTERNA_Y_SPS_REPORTES.md** - Análisis completo (10 KB)
2. **RESUMEN_API_Y_SPS_REPORTES.md** - Resumen ejecutivo (2 KB)
3. **DETALLES_TECNICOS_SPs_ROUTES.md** - Detalles técnicos de routes.ts (8 KB)
4. **LISTADO_COMPLETO_SPs.md** - Listado completo de 10 SPs (12 KB)
5. **API_ENDPOINTS_SUMMARY.md** - Sumario de endpoints (original)

---

**🎉 ANÁLISIS COMPLETO FINALIZADO 🎉**

Sistema de reportes con 4 SPs principales, arquitectura de 3 capas, 4 capas de seguridad y patrón API Gateway implementado correctamente.
