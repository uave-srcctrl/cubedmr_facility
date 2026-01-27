# Análisis: Facility Data Report y su Relación con wound_encounters

## 📌 Definición: ¿Qué es Facility Data Report?

**Facility Data Report** (Reporte de Datos de Facility) es un reporte integral que proporciona métricas y estadísticas sobre las heridas (wounds) de una facility específica durante un período de tiempo determinado.

### Ubicación en la Aplicación
- **Componente React**: [client/src/pages/facility-wound-report.tsx](client/src/pages/facility-wound-report.tsx)
- **Endpoint Local**: `GET/POST /api/facility-wound-report`
- **Endpoint Remoto**: `POST https://cubed-mr.app/api/reports/facility-wound-outcome/{facilityId}/{startDate}/{endDate}`

---

## 📊 Campos Principales del Facility Data Report

| Campo | Descripción | Tipo | Propósito |
|-------|-------------|------|----------|
| Number of Active Wounds | Cantidad de heridas activas | INT | KPI principal |
| Percent of Wounds Improving | % de heridas mejorando | DECIMAL | Tasa de mejoría |
| Percent of Wounds Deteriorating | % de heridas empeorando | DECIMAL | Tasa de deterioro |
| Percent of Wounds Stable | % de heridas estables | DECIMAL | Tasa de estabilidad |
| Number of New Wounds | Cantidad de heridas nuevas | INT | Nuevas admisiones |
| Percent of Wounds Resolved | % de heridas resueltas | DECIMAL | Tasa de resolución |
| Facility Acuity Index | Índice de acuidad | DECIMAL | Complejidad de casos |
| Date of Service | Fecha del reporte | DATE | Período del reporte |

---

## 🔗 Relación con `facility.wound_encounters`

### ¿Qué es `facility.wound_encounters`?

`wound_encounters` es la tabla en la base de datos remota (SQL Server en cubed-mr.app) que almacena todos los encuentros (registros) de heridas individuales. Es la tabla fuente primaria de todos los datos de heridas.

### Estructura Probable de `wound_encounters`

```sql
CREATE TABLE facility.wound_encounters (
  encounter_id      INT PRIMARY KEY,
  facility_id       INT,              -- FK a facility
  patient_id        INT,              -- FK a patient
  wound_id          INT,
  date_of_service   DATE,
  admission_date    DATE,
  discharge_date    DATE,
  wound_status      VARCHAR(50),      -- "New", "Active", "Resolved", etc.
  etiology          VARCHAR(100),     -- Causa de la herida
  location          VARCHAR(100),     -- Ubicación
  area_cm2          DECIMAL(10,2),    -- Área en cm²
  improvement       VARCHAR(50),      -- "Improving", "Stable", "Deteriorating"
  acuity_level      INT,              -- Nivel de acuidad (1-5)
  is_active         BIT,
  created_date      DATETIME,
  last_modified     DATETIME
);
```

---

## 🔄 Flujo de Datos: wound_encounters → Facility Data Report

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Base de Datos Remota (cubed-mr.app)                      │
│    ├─ facility.wound_encounters (tabla primaria)            │
│    └─ Otros datos de facility, patient, etc.                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ SQL Query
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Stored Procedure: sp_rptFacilityWoundOutcome            │
│                                                              │
│    Parámetros:                                              │
│    - @facilityId: ID de la facility                         │
│    - @startDate: Fecha inicio del período                   │
│    - @endDate: Fecha fin del período                        │
│                                                              │
│    Lógica:                                                  │
│    SELECT COUNT(*) as "Number of Active Wounds"            │
│    FROM wound_encounters                                   │
│    WHERE facility_id = @facilityId                         │
│    AND wound_status = 'Active'                             │
│    AND date_of_service BETWEEN @startDate AND @endDate     │
│                                                              │
│    (Similar para otros campos)                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTP Response (JSON)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. API Endpoint: /api/reports/facility-wound-outcome       │
│    Retorna JSON con datos agregados                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTP Request
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Node.js Server (Local)                                   │
│    Ruta: POST /api/facility-wound-report                    │
│    - Recibe parámetros: facilityId, startDate, endDate     │
│    - Hace proxy al endpoint remoto                          │
│    - Retorna respuesta al cliente                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTP Response
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Cliente React (Browser)                                  │
│    Componente: FacilityWoundReport                          │
│    - Recibe datos JSON                                      │
│    - Normaliza nombres de campos                            │
│    - Renderiza gráficos y tarjetas                          │
│    - Muestra DataSourceBadge ("Backend" o "Mock")           │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Ejemplo de Transformación: wound_encounters → Report

### Datos en `wound_encounters` (5 registros)
```sql
encounter_id | facility_id | date_of_service | wound_status | improvement
-------------|-------------|-----------------|--------------|-------------
1001         | 5           | 2025-12-01      | Active       | Improving
1002         | 5           | 2025-12-02      | Active       | Stable
1003         | 5           | 2025-12-03      | New          | Improving
1004         | 5           | 2025-12-04      | Resolved     | -
1005         | 5           | 2025-12-05      | Active       | Deteriorating
```

### Transformación por SP
```sql
-- Query en sp_rptFacilityWoundOutcome
SELECT 
  COUNT(CASE WHEN wound_status = 'Active' THEN 1 END) 
    as "Number of Active Wounds",           -- Result: 3
    
  CAST(
    COUNT(CASE WHEN improvement = 'Improving' THEN 1 END) * 100.0 / 
    NULLIF(COUNT(*), 0)
  AS DECIMAL(5,2)) 
    as "Percent of Wounds Improving",       -- Result: 40%
    
  CAST(
    COUNT(CASE WHEN wound_status = 'Resolved' THEN 1 END) * 100.0 / 
    NULLIF(COUNT(*), 0)
  AS DECIMAL(5,2)) 
    as "Percent of Wounds Resolved",        -- Result: 20%
    
  COUNT(CASE WHEN wound_status = 'New' THEN 1 END) 
    as "Number of New Wounds",              -- Result: 1
    
  MAX(date_of_service) 
    as "Date of Service"                    -- Result: 2025-12-05
    
FROM facility.wound_encounters
WHERE facility_id = 5
  AND date_of_service BETWEEN '2025-12-01' AND '2025-12-05';
```

### Resultado JSON (Facility Data Report)
```json
{
  "status": true,
  "data": [{
    "Number of Active Wounds": 3,
    "Percent of Wounds Improving": 40.00,
    "Percent of Wounds Deteriorating": 20.00,
    "Percent of Wounds Stable": 20.00,
    "Number of New Wounds": 1,
    "Percent of Wounds Resolved": 20.00,
    "Facility Acuity Index": 2.4,
    "Date of Service": "2025-12-05"
  }],
  "dataSource": "backend"
}
```

---

## 🎯 Relación Conceptual

### Jerarquía de Datos
```
wound_encounters (tabla base)
        ↓
        ├─ Encounter 1: Status=Active, Improvement=Improving
        ├─ Encounter 2: Status=Active, Improvement=Stable
        ├─ Encounter 3: Status=New, Improvement=Improving
        ├─ Encounter 4: Status=Resolved
        └─ Encounter 5: Status=Active, Improvement=Deteriorating
        
        ↓ Agregación (por SP)
        
Facility Data Report (resumen)
        ├─ 3 Active Wounds
        ├─ 40% Improving
        ├─ 20% Stable
        ├─ 20% Deteriorating
        ├─ 20% Resolved
        └─ 1 New Wound
```

---

## 💾 Implementación en Node.js

### Ruta Handler en `server/routes.ts`
```typescript
async function facilityWoundReportHandler(req: Request, res: Response) {
  try {
    // Extraer parámetros
    const facilityId = req.headers['x-facility-id'] || req.query.facilityId;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    // Construir URL del backend remoto
    const backendUrl = 
      `https://cubed-mr.app/api/reports/facility-wound-outcome/${facilityId}/${startDate}/${endDate}`;

    // Hacer proxy request
    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${req.headers.authorization}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await backendResponse.json();
    
    // Retornar al cliente
    res.json({
      status: data.status,
      data: data.data,
      dataSource: 'backend'
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      error: error.message,
      dataSource: 'error'
    });
  }
}
```

---

## 🎨 Visualización en Cliente

### Componente React: FacilityWoundReport
```tsx
export default function FacilityWoundReport() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['facilityWoundReport', startDate, endDate, facilityId],
    queryFn: async () => {
      const url = `/facility/api/facility-wound-report?startDate=${startDate}&endDate=${endDate}`;
      const response = await fetch(url, {
        headers: { 'X-Facility-Id': facilityId }
      });
      const result = await response.json();
      return result.data[0]; // Tomar primer registro del array
    }
  });

  return (
    <div className="space-y-6">
      {/* Tarjetas de KPIs */}
      <StatCard 
        title="Active Wounds" 
        value={data['Number of Active Wounds']}
      />
      <StatCard 
        title="% Improving" 
        value={`${data['Percent of Wounds Improving']}%`}
      />
      {/* ... más tarjetas ... */}
      
      {/* Badge mostrando fuente de datos */}
      <DataSourceBadge source={dataSource} />
    </div>
  );
}
```

---

## 🔍 Diferencia: wound_encounters vs Facility Data Report

| Aspecto | wound_encounters | Facility Data Report |
|--------|-----------------|----------------------|
| **Nivel** | Granular (registro por registro) | Agregado (resumen) |
| **Almacenamiento** | Tabla SQL (persistente) | JSON (cálculo dinámico) |
| **Rows** | Miles/Millones de registros | 1 resumen por período |
| **Tiempo de Query** | Lento si es sin índices | Rápido (ya agregado) |
| **Uso** | Análisis detallados, auditoría | Dashboards, reportes ejecutivos |
| **Actualización** | Real-time (cada vez que se registra un encuentro) | Bajo demanda (cuando se solicita) |
| **Período** | Registra cada encuentro | Resumen para rango de fechas |

---

## 🚀 Optimizaciones Posibles

### 1. Caching del Report
```typescript
// Guardar en Redis por 1 hora
const cacheKey = `facility_report_${facilityId}_${startDate}_${endDate}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const data = await fetchFromBackend(...);
await redis.setex(cacheKey, 3600, JSON.stringify(data));
return data;
```

### 2. Índices en wound_encounters
```sql
-- Para queries rápidas en SP
CREATE INDEX idx_wound_encounters_facility_date 
  ON facility.wound_encounters(facility_id, date_of_service);

CREATE INDEX idx_wound_encounters_status 
  ON facility.wound_encounters(wound_status);
```

### 3. Materializada View
```sql
CREATE MATERIALIZED VIEW vw_facility_wound_summary AS
SELECT 
  facility_id,
  CAST(date_of_service AS DATE) as report_date,
  COUNT(*) as total_wounds,
  ... (todos los campos agregados)
FROM facility.wound_encounters
GROUP BY facility_id, CAST(date_of_service AS DATE);
```

---

## 📈 Flujo de Datos en la UI

```
┌─────────────────────────────────────────────────────┐
│ Usuario selecciona:                                 │
│ - Facility: Dr. Perez                               │
│ - Período: 2025-01-01 a 2025-12-31                 │
│ - Click: "Load Report"                              │
└────────────────┬──────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ Componente FacilityWoundReport                       │
│ Envía: GET /facility/api/facility-wound-report      │
└────────────────┬──────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ Node.js Server (routes.ts)                          │
│ Proxy a: cubed-mr.app/api/reports/...              │
└────────────────┬──────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ SQL Server (remoteWoundcareDB)                       │
│ Ejecuta: sp_rptFacilityWoundOutcome                 │
│ Lee: facility.wound_encounters                      │
│ Retorna: JSON agregado                              │
└────────────────┬──────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ UI Actualizada                                       │
│ - Muestra KPIs                                      │
│ - Renderiza gráficos                                │
│ - Badge: "Data from Backend"                        │
└─────────────────────────────────────────────────────┘
```

---

## ✅ Conclusión

**Facility Data Report** es un resumen ejecutivo de datos que se genera bajo demanda a partir de todos los registros individuales almacenados en **wound_encounters**. La relación es de **agregación: muchos registros → un resumen**.

El SP `sp_rptFacilityWoundOutcome` realiza la transformación usando SUM, COUNT, CAST y GROUP BY sobre wound_encounters, produciendo un JSON con métricas agregadas que se visualizan en el dashboard.

---

Última actualización: 19 de enero de 2026
