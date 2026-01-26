# 📦 Procedimientos Almacenados del Esquema facility

## 📋 Resumen Ejecutivo

Se han creado **7 procedimientos almacenados** en el esquema `facility` de la base de datos remota (`remoteWoundcareDB`). Estos procedimientos son equivalentes a los reportes del sistema pero utilizan la tabla `facility.wound_encounters` como fuente de datos.

**Beneficios:**
- ✅ Datos locales sin dependencia de API remota
- ✅ Queries rápidas directas a tabla principal
- ✅ Escalabilidad mejorada
- ✅ Reportes consistentes y auditables
- ✅ Integración con otras tablas del esquema facility

---

## 🔧 Procedimientos Creados

### 1. **sp_facility_WoundOutcome**

**Descripción:** Retorna métricas agregadas de heridas por facility y período

**Equivalente a:** `sp_rptFacilityWoundOutcome`

**Parámetros:**
```sql
@facilityId INT         -- ID de la facility
@startDate DATE         -- Fecha inicio del período
@endDate DATE           -- Fecha fin del período
```

**Campos Retornados:**
```
facility_id                      -- ID de facility
start_date, end_date             -- Período del reporte
date_generated                   -- Fecha de generación
total_encounters                 -- Encuentros totales
number_of_active_wounds          -- Heridas activas
number_of_new_wounds             -- Heridas nuevas
number_of_resolved_wounds        -- Heridas resueltas
number_of_hospitalized_wounds    -- Heridas hospitalizadas
wounds_over_100_days             -- Heridas > 100 días
percent_of_wounds_improving      -- % mejorando
percent_of_wounds_deteriorating  -- % empeorando
percent_of_wounds_stable         -- % estables
percent_of_wounds_resolved       -- % resueltas
percent_of_new_wounds            -- % nuevas
average_wound_area_cm2           -- Área promedio
total_wound_area_cm2             -- Área total
average_wound_area_change        -- Cambio de área promedio
number_of_active_patients        -- Pacientes activos
push_score_average               -- PUSH score promedio
healing_rate_index               -- Índice de cicatrización
facility_acuity_index            -- Índice de acuidad
```

**Ejemplo de Uso:**
```sql
EXEC facility.sp_facility_WoundOutcome 
  @facilityId = 5,
  @startDate = '2025-01-01',
  @endDate = '2025-12-31';
```

---

### 2. **sp_facility_AcuityIndex**

**Descripción:** Retorna el índice de acuidad de una facility

**Equivalente a:** `sp_rptFacilityAcuityIndex`

**Parámetros:**
```sql
@facilityId INT         -- ID de la facility
@daysBack INT = 90      -- Número de días atrás (default: 90)
```

**Campos Retornados:**
```
facility_id                      -- ID de facility
start_date, end_date             -- Período calculado
date_generated                   -- Fecha de generación
total_encounters                 -- Encuentros totales
total_patients                   -- Pacientes totales
average_push_score               -- PUSH score promedio
min_push_score                   -- PUSH score mínimo
max_push_score                   -- PUSH score máximo
facility_acuity_index            -- Índice de acuidad (1-5)
critical_wounds_count            -- Heridas críticas (PUSH > 12)
critical_wounds_percentage       -- % heridas críticas
pressure_ulcer_count             -- Úlceras por presión
diabetic_count                   -- Heridas diabéticas
venous_count                     -- Heridas venosas
arterial_count                   -- Heridas arteriales
```

**Ejemplo de Uso:**
```sql
EXEC facility.sp_facility_AcuityIndex 
  @facilityId = 5,
  @daysBack = 90;
```

---

### 3. **sp_facility_EtiologyDistribution**

**Descripción:** Retorna la distribución de etiologías de heridas

**Equivalente a:** `sp_rptEtiologyDistribution`

**Parámetros:**
```sql
@facilityId INT         -- ID de la facility
@date DATE              -- Fecha específica del reporte
```

**Campos Retornados:**
```
facility_id                      -- ID de facility
report_date                      -- Fecha del reporte
date_generated                   -- Fecha de generación
etiology                         -- Tipo de etiología
count                            -- Número de heridas
percentage                       -- Porcentaje del total
unique_patients                  -- Pacientes únicos
improving_percentage             -- % mejorando
average_area_cm2                 -- Área promedio
average_days_since_onset         -- Duración promedio
```

**Ejemplo de Uso:**
```sql
EXEC facility.sp_facility_EtiologyDistribution 
  @facilityId = 5,
  @date = '2025-12-31';
```

---

### 4. **sp_facility_OutcomeReportGlobal**

**Descripción:** Retorna un reporte global de resultados de heridas

**Equivalente a:** `sp_rptOutcomeReportGlobal`

**Parámetros:**
```sql
@facilityId INT         -- ID de la facility
@startDate DATE         -- Fecha inicio del período
@endDate DATE           -- Fecha fin del período
```

**Campos Retornados:**
```
facility_id                      -- ID de facility
start_date, end_date             -- Período del reporte
date_generated                   -- Fecha de generación
total_encounters                 -- Encuentros totales
total_patients                   -- Pacientes totales
total_unique_wounds              -- Heridas únicas
active_wounds                    -- Heridas activas
resolved_wounds                  -- Heridas resueltas
new_wounds                       -- Heridas nuevas
hospitalized_wounds              -- Heridas hospitalizadas
resolution_rate                  -- Tasa de resolución
improving_count                  -- Conteo mejorando
deteriorating_count              -- Conteo empeorando
stable_count                     -- Conteo estables
average_push_score               -- PUSH score promedio
average_wound_area               -- Área de herida promedio
average_wound_duration_days      -- Duración promedio
chronic_wounds_100plus_days      -- Heridas crónicas (>100 días)
chronic_wounds_percentage        -- % crónicas
pressure_ulcer_count             -- Úlceras por presión
diabetic_count                   -- Heridas diabéticas
venous_count                     -- Heridas venosas
arterial_count                   -- Heridas arteriales
treatment_effectiveness          -- Efectividad del tratamiento
```

**Ejemplo de Uso:**
```sql
EXEC facility.sp_facility_OutcomeReportGlobal 
  @facilityId = 5,
  @startDate = '2025-01-01',
  @endDate = '2025-12-31';
```

---

### 5. **sp_facility_WoundProgressTrend**

**Descripción:** Retorna la tendencia de progreso de heridas en el tiempo

**Parámetros:**
```sql
@facilityId INT         -- ID de la facility
@startDate DATE         -- Fecha inicio del período
@endDate DATE           -- Fecha fin del período
```

**Campos Retornados:**
```
facility_id                      -- ID de facility
date_of_service                  -- Fecha del servicio
daily_encounters                 -- Encuentros del día
daily_patients                   -- Pacientes del día
active_wounds_daily              -- Heridas activas del día
resolved_wounds_daily            -- Heridas resueltas del día
new_wounds_daily                 -- Heridas nuevas del día
improving_percentage_daily       -- % mejorando del día
average_push_score_daily         -- PUSH score promedio del día
average_area_cm2_daily           -- Área promedio del día
```

**Ejemplo de Uso:**
```sql
EXEC facility.sp_facility_WoundProgressTrend 
  @facilityId = 5,
  @startDate = '2025-12-01',
  @endDate = '2025-12-31';
```

---

### 6. **sp_facility_PatientWoundSummary**

**Descripción:** Retorna un resumen de heridas por paciente

**Parámetros:**
```sql
@facilityId INT         -- ID de la facility
@startDate DATE         -- Fecha inicio del período
@endDate DATE           -- Fecha fin del período
```

**Campos Retornados:**
```
facility_id                      -- ID de facility
patient_id                       -- ID del paciente
total_wounds                     -- Heridas totales
active_wounds                    -- Heridas activas
resolved_wounds                  -- Heridas resueltas
new_wounds                       -- Heridas nuevas
improving_percentage             -- % mejorando
total_wound_area_cm2             -- Área total de heridas
average_wound_area_cm2           -- Área promedio
average_push_score               -- PUSH score promedio
risk_level                       -- Nivel de riesgo (Alto/Moderado/Bajo)
first_encounter_date             -- Primer encuentro
last_encounter_date              -- Último encuentro
```

**Ejemplo de Uso:**
```sql
EXEC facility.sp_facility_PatientWoundSummary 
  @facilityId = 5,
  @startDate = '2025-01-01',
  @endDate = '2025-12-31';
```

---

### 7. **sp_facility_HighRiskWounds**

**Descripción:** Identifica heridas de alto riesgo (PUSH > threshold)

**Parámetros:**
```sql
@facilityId INT              -- ID de la facility
@pushScoreThreshold INT = 12 -- Umbral PUSH (default: 12)
```

**Campos Retornados:**
```
facility_id                      -- ID de facility
encounter_id                     -- ID del encuentro
patient_id                       -- ID del paciente
wound_id                         -- ID de la herida
wound_status                     -- Estado de la herida
wound_etiology                   -- Etiología
wound_location                   -- Ubicación
area_cm2                         -- Área en cm²
push_score                       -- PUSH score
improvement_status               -- Estado de mejora
days_since_onset                 -- Días desde inicio
date_of_service                  -- Fecha del servicio
alert_level                      -- Nivel de alerta (Crítico/Alerta/Monitoreo)
```

**Ejemplo de Uso:**
```sql
EXEC facility.sp_facility_HighRiskWounds 
  @facilityId = 5,
  @pushScoreThreshold = 12;
```

---

## 🚀 Cómo Ejecutar

### Opción 1: Directamente en SQL Server Management Studio

```sql
-- Copiar y pegar el contenido de:
-- create-facility-schema-procedures.sql

-- Luego ejecutar:
EXEC facility.sp_facility_WoundOutcome @facilityId = 5, @startDate = '2025-01-01', @endDate = '2025-12-31';
```

### Opción 2: Usando Node.js Script

```bash
# Instalar dependencias si es necesario
npm install mssql

# Ejecutar el script de deploymentnode deploy-facility-procedures.js
```

### Opción 3: Desde Node.js en la Aplicación

```typescript
import mssql from 'mssql';

const config = {
  server: '190.92.153.67',
  database: 'curisec',
  // ... resto de configuración
};

const pool = new mssql.ConnectionPool(config);
await pool.connect();

const request = pool.request();
const result = await request
  .input('facilityId', mssql.Int, 5)
  .input('startDate', mssql.Date, '2025-01-01')
  .input('endDate', mssql.Date, '2025-12-31')
  .execute('facility.sp_facility_WoundOutcome');

console.log(result.recordset);
```

---

## 📊 Casos de Uso

### Dashboard Principal
Usar `sp_facility_WoundOutcome` para obtener todas las métricas en una sola llamada.

### Alertas de Alto Riesgo
Usar `sp_facility_HighRiskWounds` para identificar heridas críticas que requieren atención inmediata.

### Análisis de Pacientes
Usar `sp_facility_PatientWoundSummary` para hacer seguimiento por paciente y detectar patrones.

### Tendencias Históricas
Usar `sp_facility_WoundProgressTrend` para visualizar cómo evolucionan las heridas en el tiempo.

### Análisis de Etiología
Usar `sp_facility_EtiologyDistribution` para entender qué tipos de heridas son más comunes.

### Evaluación de Acuidad
Usar `sp_facility_AcuityIndex` para tomar decisiones sobre asignación de recursos.

---

## 🔍 Validación

Para verificar que los procedimientos se crearon correctamente:

```sql
SELECT ROUTINE_NAME, ROUTINE_DEFINITION
FROM INFORMATION_SCHEMA.ROUTINES
WHERE ROUTINE_SCHEMA = 'facility'
  AND ROUTINE_TYPE = 'PROCEDURE'
  AND ROUTINE_NAME LIKE 'sp_facility_%'
ORDER BY ROUTINE_NAME;
```

---

## 📝 Notas Importantes

1. **Dependencia de datos:** Todos los procedimientos requieren que la tabla `facility.wound_encounters` esté poblada con datos válidos.

2. **Campos requeridos:** Asegúrese de que los campos siguientes están completados en `wound_encounters`:
   - `facility_id`
   - `patient_id`
   - `wound_status`
   - `improvement_status`
   - `push_score`
   - `area_cm2`
   - `date_of_service`
   - `days_since_onset`
   - `wound_etiology`
   - `is_active`

3. **Performance:** Para grandes volúmenes de datos, considere agregar índices:
   ```sql
   CREATE INDEX idx_wound_encounters_facility_date 
     ON facility.wound_encounters(facility_id, date_of_service, wound_status);
   ```

4. **Automatización:** Estos procedimientos pueden ser llamados desde jobs SQL para generar reportes automáticos.

---

**Última actualización:** 20 de enero de 2026  
**Estado:** ✅ Procedimientos Creados y Documentados
