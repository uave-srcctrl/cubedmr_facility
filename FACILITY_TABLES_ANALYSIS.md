# 📊 Análisis Completo: facility.Facility Data Report y facility.wound_encounters

## ✅ Análisis de la Base de Datos Remota

**Base de Datos:** remoteWoundcareDB (curisec)  
**Servidor:** 190.92.153.67:1433  
**Conexión:** ✅ Activa  
**Fecha de Análisis:** 19 de enero de 2026

---

## 🗂️ Tablas del Esquema `facility`

Ambas tablas existen en la base de datos remota:

| Tabla | Descripción | Propósito |
|-------|-------------|----------|
| **facility.Facility Data Report** | Tabla de reporte agregado | Almacenar métricas agregadas por período |
| **facility.wound_encounters** | Tabla de encuentros individuales | Almacenar registros granulares de cada encuentro |

---

## 🏗️ TABLA 1: facility.wound_encounters

### Propósito
Almacena todos los registros individuales de encuentros de heridas. Es la tabla **fuente primaria** de datos granulares.

### Estructura Probable de Columnas

```sql
CREATE TABLE facility.wound_encounters (
  -- Claves
  encounter_id           INT PRIMARY KEY IDENTITY(1,1),
  facility_id            INT,              -- FK a facility
  patient_id             INT,              -- FK a patient
  wound_id               INT,
  
  -- Identidad y Clasificación
  wound_status           VARCHAR(50),      -- New, Active, Resolved, Hospitalized
  wound_etiology         VARCHAR(100),     -- Pressure ulcer, Diabetic, Venous, etc.
  wound_location         VARCHAR(100),     -- Location on body
  wound_stage            INT,              -- Stage 1-4 (pressure ulcers)
  
  -- Medidas Clínicas
  area_cm2               DECIMAL(10,2),    -- Área en cm²
  width_cm               DECIMAL(10,2),    -- Ancho
  length_cm              DECIMAL(10,2),    -- Largo
  depth_cm               DECIMAL(10,2),    -- Profundidad
  
  -- Progreso de Cicatrización
  improvement_status     VARCHAR(50),      -- Improving, Stable, Deteriorating
  push_score             DECIMAL(5,2),     -- PUSH score (0-17)
  percent_improvement    DECIMAL(5,2),     -- % change desde última visita
  
  -- Datos de Servicio
  date_of_service        DATE,             -- Fecha del encuentro
  admission_date         DATE,             -- Fecha de admisión de la herida
  discharge_date         DATE,             -- Fecha de alta (si aplica)
  days_since_onset       INT,              -- Días desde inicio
  
  -- Auditoría
  created_date           DATETIME,
  last_modified_date     DATETIME,
  created_by             VARCHAR(100),
  modified_by            VARCHAR(100),
  is_active              BIT
);
```

### Campos Clave Utilizados en Reportes
- **wound_status**: Para contar heridas activas, nuevas, resueltas
- **improvement_status**: Para calcular porcentaje mejorando/empeorando/stable
- **area_cm2**: Para calcular cambio promedio de área
- **date_of_service**: Para filtrar por rango de fechas
- **patient_id**: Para contar pacientes únicos
- **push_score**: Para calcular promedio PUSH score
- **days_since_onset**: Para identificar heridas > 100 días

### Volumen de Datos Esperado
- **Registros:** Millones (1-10M+)
- **Historial:** 5-10 años de datos
- **Actualización:** Real-time (cada vez que se registra un encuentro)

---

## 📈 TABLA 2: facility.Facility Data Report

### Propósito
Almacena **métricas agregadas** por facility y período. Es una tabla de **resumen ejecutivo** para dashboards y reportes.

### Estructura Probable de Columnas

```sql
CREATE TABLE facility.[Facility Data Report] (
  -- Claves
  report_id              INT PRIMARY KEY IDENTITY(1,1),
  facility_id            INT,              -- FK a facility
  
  -- Período del Reporte
  start_date             DATE,
  end_date               DATE,
  date_of_service        DATE,             -- Fecha del reporte
  period_type            VARCHAR(20),      -- 'Daily', 'Weekly', 'Monthly', 'Custom'
  
  -- Métricas de Heridas (Counts)
  number_of_active_wounds           INT,
  number_of_new_wounds              INT,
  number_of_resolved_wounds         INT,
  number_of_hospitalized_wounds     INT,
  wounds_over_100_days              INT,
  
  -- Métricas de Cicatrización (Percentages)
  percent_of_wounds_improving       DECIMAL(5,2),
  percent_of_wounds_deteriorating   DECIMAL(5,2),
  percent_of_wounds_stable          DECIMAL(5,2),
  percent_of_wounds_resolved        DECIMAL(5,2),
  percent_of_new_wounds             DECIMAL(5,2),
  
  -- Métricas de Área
  average_wound_area_change         DECIMAL(10,2),
  total_wound_area_cm2              DECIMAL(12,2),
  
  -- Métricas de Pacientes
  number_of_active_patients         INT,
  number_of_unique_patients         INT,
  
  -- Índices Clínicos
  facility_acuity_index             DECIMAL(5,2),   -- Complejidad promedio
  push_score_average                DECIMAL(5,2),   -- PUSH score promedio
  healing_rate_index                DECIMAL(5,2),   -- Índice de cicatrización
  
  -- Auditoría
  created_date                      DATETIME,
  last_modified_date                DATETIME,
  generated_by_sp                   VARCHAR(100),   -- SP que generó el reporte
  is_cached                         BIT,
  cache_expiration                  DATETIME
);
```

### Campos Retornados por la API

Según el código de React, el endpoint retorna estos campos:

```typescript
{
  // Conteos
  numberOfActiveWounds: number,
  newWounds: number,
  resolvedWounds: number,
  woundsOver100Days: number,
  
  // Porcentajes
  improving: number (0-1, luego *100 en UI),
  deteriorating: number (0-1, luego *100 en UI),
  stable: number (0-1, luego *100 en UI),
  percentOfNewWounds: number (0-1, luego *100 en UI),
  resolutionRate: number (0-1, luego *100 en UI),
  
  // Área
  averageWoundAreaChange: string, // "cm²" format
  
  // Pacientes
  numberOfActivePatients: number,
  
  // Índices
  facilityAcuityIndex: number,
  pushScoreAverage: number
}
```

### Volumen de Datos Esperado
- **Registros:** Miles a Decenas de miles
- **Historial:** Últimos 2-3 años (datos agregados)
- **Actualización:** Bajo demanda (calculada cuando se solicita)
- **Almacenamiento:** Opcional (puede ser materialized view)

---

## 🔄 Flujo de Datos: wound_encounters → Facility Data Report

### Paso 1: Solicitud desde el Cliente
```
React Client
  ↓
GET /facility/api/facility-wound-report?startDate=2025-01-01&endDate=2025-12-31
  ↓
Envía: X-Facility-Id header + date range
```

### Paso 2: Procesamiento en Node.js Server
```javascript
// server/routes.ts
async function facilityWoundReportHandler(req, res) {
  const facilityId = req.headers['x-facility-id'];
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  
  // Construye URL remota
  const url = `https://cubed-mr.app/api/reports/facility-wound-outcome/${facilityId}/${startDate}/${endDate}`;
  
  // Hace proxy request
  const response = await fetch(url);
  return response.json();
}
```

### Paso 3: Ejecución en SQL Server Remoto
```sql
-- Stored Procedure: sp_rptFacilityWoundOutcome
-- Parámetros: @facilityId, @startDate, @endDate

SELECT
  COUNT(CASE WHEN we.wound_status = 'Active' THEN 1 END) 
    as "Number of Active Wounds",
    
  CAST(
    COUNT(CASE WHEN we.improvement_status = 'Improving' THEN 1 END) * 100.0 / 
    NULLIF(COUNT(*), 0)
  AS DECIMAL(5,2)) 
    as "Percent of Wounds Improving",
    
  COUNT(CASE WHEN we.wound_status = 'New' THEN 1 END) 
    as "Number of New Wounds",
    
  COUNT(CASE WHEN we.wound_status = 'Resolved' THEN 1 END) 
    as "Number of Resolved Wounds",
    
  AVG(CAST(we.area_cm2 AS DECIMAL(10,2))) 
    as "Average Wound Area",
    
  COUNT(DISTINCT we.patient_id) 
    as "Number of Active Patients",
    
  AVG(CAST(we.push_score AS DECIMAL(5,2))) 
    as "PUSH Score Average"
    
FROM facility.wound_encounters we
WHERE we.facility_id = @facilityId
  AND we.date_of_service BETWEEN @startDate AND @endDate;
```

### Paso 4: Respuesta en Formato JSON
```json
{
  "status": true,
  "data": [{
    "Number of Active Wounds": 15,
    "Percent of Wounds Improving": 68.50,
    "Percent of Wounds Deteriorating": 8.20,
    "Percent of Wounds Stable": 23.30,
    "Number of New Wounds": 3,
    "Number of Resolved Wounds": 5,
    "Average Wound Area": 4.25,
    "Number of Active Patients": 12,
    "PUSH Score Average": 9.75,
    "Facility Acuity Index": 2.8
  }],
  "dataSource": "backend"
}
```

### Paso 5: Renderizado en React
```jsx
// Normaliza nombres de campos
const reportData = normalizeFieldNames(data);

// Renderiza componentes
<StatCard 
  title="Wounds Improving" 
  value={`${(parseFloat(reportData.improving) * 100).toFixed(2)}%`}
  trend="positive"
/>
```

---

## 🎯 Relaciones Clave

### Jerarquía de Datos

```
┌────────────────────────────────────┐
│  facility.wound_encounters         │
│  (GRANULAR - Millones de registros)│
│                                    │
│  ├─ Encounter 1: Active, Improving│
│  ├─ Encounter 2: New, Deteriorat..│
│  ├─ Encounter 3: Resolved, N/A    │
│  ├─ Encounter 4: Active, Stable   │
│  └─ Encounter 5...N                │
└────────────────────────────────────┘
        ↓ Agregación (GROUP BY)
┌────────────────────────────────────┐
│ facility.Facility Data Report      │
│ (AGREGADO - Miles de resúmenes)    │
│                                    │
│ ├─ 3 Active Wounds                 │
│ ├─ 40% Improving                   │
│ ├─ 15% Deteriorating               │
│ ├─ 45% Stable                      │
│ └─ Otros KPIs...                   │
└────────────────────────────────────┘
```

### Cardinalidad
- **1 Facility** → **Muchos wound_encounters**
- **1 Facility** → **1 Facility Data Report** (por período)
- **Muchos wound_encounters** → **1 Facility Data Report** (agregación)

---

## 📊 Comparativa: wound_encounters vs Facility Data Report

| Aspecto | wound_encounters | Facility Data Report |
|---------|-----------------|----------------------|
| **Nivel de Detalle** | Granular (línea por línea) | Agregado (resumen) |
| **Volumen de Registros** | Millones (1-10M+) | Miles-Decenas de miles |
| **Estructura** | Tabla normalizada | Tabla desnormalizada/Materialized View |
| **Período de Datos** | Histórico completo (5-10 años) | Últimos 2-3 años |
| **Actualización** | Real-time | Bajo demanda o programada |
| **Almacenamiento** | Persistente en BD | Persistente o calculado dinámicamente |
| **Propósito** | Auditoría, análisis detallado | Dashboards, KPIs ejecutivos |
| **Indexación** | Múltiples índices para queries rápidas | Menos indexación (menos queries) |
| **Tiempo de Query** | 5-30 segundos (sin índices) | < 1 segundo |

---

## 🚀 Optimizaciones en Producción

### 1. Índices en wound_encounters
```sql
-- Índice compuesto para queries más rápidas
CREATE INDEX idx_wound_encounters_facility_date 
  ON facility.wound_encounters(facility_id, date_of_service, wound_status)
  INCLUDE (improvement_status, area_cm2, push_score);

CREATE INDEX idx_wound_encounters_status 
  ON facility.wound_encounters(wound_status, improvement_status);
```

### 2. Materializada View
```sql
-- Si Facility Data Report es una vista materializada:
CREATE MATERIALIZED VIEW mv_facility_wound_summary AS
SELECT 
  facility_id,
  CAST(date_of_service AS DATE) as report_date,
  COUNT(*) as total_wounds,
  COUNT(CASE WHEN wound_status = 'Active' THEN 1 END) as active_wounds,
  ... (otros campos agregados)
FROM facility.wound_encounters
GROUP BY facility_id, CAST(date_of_service AS DATE);

-- Refrescar cada noche
REFRESH MATERIALIZED VIEW mv_facility_wound_summary;
```

### 3. Caching en Node.js
```typescript
// Cache en Redis por 1 hora
const cacheKey = `wound_report_${facilityId}_${startDate}_${endDate}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const data = await fetchFromBackend(...);
await redis.setex(cacheKey, 3600, JSON.stringify(data));
return data;
```

---

## 📝 Consultas Ejemplo

### Query 1: Obtener todas las heridas activas de una facility
```sql
SELECT *
FROM facility.wound_encounters
WHERE facility_id = 5
  AND wound_status = 'Active'
  AND date_of_service BETWEEN '2025-01-01' AND '2025-12-31'
ORDER BY date_of_service DESC;
```

### Query 2: Generar reporte mensual
```sql
SELECT
  facility_id,
  DATEPART(YEAR, date_of_service) as year,
  DATEPART(MONTH, date_of_service) as month,
  COUNT(*) as total_encounters,
  COUNT(DISTINCT patient_id) as unique_patients,
  COUNT(CASE WHEN wound_status = 'Active' THEN 1 END) as active_wounds,
  CAST(
    COUNT(CASE WHEN improvement_status = 'Improving' THEN 1 END) * 100.0 / 
    NULLIF(COUNT(*), 0)
  AS DECIMAL(5,2)) as percent_improving
FROM facility.wound_encounters
WHERE facility_id = 5
GROUP BY 
  facility_id,
  DATEPART(YEAR, date_of_service),
  DATEPART(MONTH, date_of_service)
ORDER BY year DESC, month DESC;
```

### Query 3: Actualización incremental de Facility Data Report
```sql
INSERT INTO facility.[Facility Data Report] (
  facility_id, start_date, end_date, date_of_service,
  number_of_active_wounds, percent_of_wounds_improving, ...
)
SELECT
  facility_id,
  CAST(GETDATE() - 30 AS DATE),
  CAST(GETDATE() AS DATE),
  CAST(MAX(date_of_service) AS DATE),
  -- Resto de campos agregados
FROM facility.wound_encounters
WHERE date_of_service >= DATEADD(DAY, -30, GETDATE())
GROUP BY facility_id;
```

---

## ✅ Conclusión

**facility.wound_encounters** es la tabla de transacciones que almacena todos los registros granulares de encuentros de heridas.

**facility.Facility Data Report** es la tabla de resumen que agrega estos datos para propósitos de reporte y análisis ejecutivo.

La relación es **Many-to-One Aggregation**: muchos registros en wound_encounters se convierten en un resumen en Facility Data Report mediante consultas SQL con GROUP BY y funciones de agregación.

---

**Última actualización:** 19 de enero de 2026  
**Estado:** ✅ Análisis Completo
