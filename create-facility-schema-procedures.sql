-- ════════════════════════════════════════════════════════════════════════════════
-- PROCEDIMIENTOS ALMACENADOS PARA ESQUEMA: facility
-- Base de datos: curisec (remoteWoundcareDB)
-- Fecha: 20 de enero de 2026
-- 
-- Descripción:
-- Crear procedimientos almacenados equivalentes a los reportes del sistema
-- pero utilizando la tabla facility.wound_encounters como fuente de datos
-- ════════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════════
-- PROCEDIMIENTO 1: sp_facility_WoundOutcome
-- Descripción: Retorna métricas agregadas de heridas por facility y período
-- Equivalente a: sp_rptFacilityWoundOutcome
-- ════════════════════════════════════════════════════════════════════════════════

CREATE PROCEDURE facility.sp_facility_WoundOutcome
  @facilityId INT,
  @startDate DATE,
  @endDate DATE
AS
BEGIN
  SET NOCOUNT ON;
  
  SELECT
    -- Identificadores
    @facilityId as facility_id,
    @startDate as start_date,
    @endDate as end_date,
    CAST(GETDATE() AS DATE) as date_generated,
    
    -- Conteos de Heridas
    COUNT(*) as total_encounters,
    COUNT(CASE WHEN disposition = 'Active' THEN 1 END) as number_of_active_wounds,
    COUNT(CASE WHEN disposition = 'New' THEN 1 END) as number_of_new_wounds,
    COUNT(CASE WHEN disposition = 'Resolved' THEN 1 END) as number_of_resolved_wounds,
    COUNT(CASE WHEN disposition = 'Hospitalized' THEN 1 END) as number_of_hospitalized_wounds,
    COUNT(CASE WHEN days > 100 THEN 1 END) as wounds_over_100_days,
    
    -- Porcentajes de Progreso
    CAST(
      COUNT(CASE WHEN progress = 'Improving' THEN 1 END) * 100.0 / 
      NULLIF(COUNT(*), 0)
    AS DECIMAL(5,2)) as percent_of_wounds_improving,
    
    CAST(
      COUNT(CASE WHEN progress = 'Deteriorating' THEN 1 END) * 100.0 / 
      NULLIF(COUNT(*), 0)
    AS DECIMAL(5,2)) as percent_of_wounds_deteriorating,
    
    CAST(
      COUNT(CASE WHEN progress = 'Stable' THEN 1 END) * 100.0 / 
      NULLIF(COUNT(*), 0)
    AS DECIMAL(5,2)) as percent_of_wounds_stable,
    
    CAST(
      COUNT(CASE WHEN disposition = 'Resolved' THEN 1 END) * 100.0 / 
      NULLIF(COUNT(*), 0)
    AS DECIMAL(5,2)) as percent_of_wounds_resolved,
    
    CAST(
      COUNT(CASE WHEN disposition = 'New' THEN 1 END) * 100.0 / 
      NULLIF(COUNT(*), 0)
    AS DECIMAL(5,2)) as percent_of_new_wounds,
    
    -- Métricas de Área (surface en cm²)
    ISNULL(AVG(CAST(surface AS DECIMAL(10,2))), 0) as average_wound_area_cm2,
    ISNULL(SUM(CAST(surface AS DECIMAL(10,2))), 0) as total_wound_area_cm2,
    ISNULL(
      AVG(CAST(surface AS DECIMAL(10,2))) - 
      LAG(AVG(CAST(surface AS DECIMAL(10,2)))) OVER (PARTITION BY facility_id ORDER BY DATEPART(MONTH, dos)),
      0
    ) as average_wound_area_change,
    
    -- Métricas de Pacientes
    COUNT(DISTINCT patient_id) as number_of_active_patients,
    COUNT(DISTINCT patient_id) as number_of_unique_patients,
    
    -- Índices Clínicos
    ISNULL(AVG(CAST(push_score AS DECIMAL(5,2))), 0) as push_score_average,
    ISNULL(
      CAST(
        COUNT(CASE WHEN progress = 'Improving' THEN 1 END) * 100.0 / 
        NULLIF(COUNT(*), 0)
      AS DECIMAL(5,2))
    , 0) as healing_rate_index,
    
    -- Índice de Acuidad Facility (basado en promedio de PUSH score)
    CASE 
      WHEN AVG(CAST(push_score AS DECIMAL(5,2))) >= 12 THEN 4.0
      WHEN AVG(CAST(push_score AS DECIMAL(5,2))) >= 8 THEN 3.0
      WHEN AVG(CAST(push_score AS DECIMAL(5,2))) >= 4 THEN 2.0
      ELSE 1.0
    END as facility_acuity_index
    
  FROM facility.wound_encounters
  WHERE facility_id = @facilityId
    AND dos BETWEEN @startDate AND @endDate;
    
END;
GO

-- ════════════════════════════════════════════════════════════════════════════════
-- PROCEDIMIENTO 2: sp_facility_AcuityIndex
-- Descripción: Retorna índice de acuidad de una facility
-- Equivalente a: sp_rptFacilityAcuityIndex
-- ════════════════════════════════════════════════════════════════════════════════

CREATE PROCEDURE facility.sp_facility_AcuityIndex
  @facilityId INT,
  @daysBack INT = 90
AS
BEGIN
  SET NOCOUNT ON;
  
  DECLARE @startDate DATE = DATEADD(DAY, -@daysBack, CAST(GETDATE() AS DATE));
  DECLARE @endDate DATE = CAST(GETDATE() AS DATE);
  
  SELECT
    @facilityId as facility_id,
    @startDate as start_date,
    @endDate as end_date,
    CAST(GETDATE() AS DATE) as date_generated,
    
    -- Información General
    COUNT(*) as total_encounters,
    COUNT(DISTINCT patient_id) as total_patients,
    
    -- Promedio de PUSH Score
    ISNULL(AVG(CAST(push_score AS DECIMAL(5,2))), 0) as average_push_score,
    ISNULL(MIN(CAST(push_score AS DECIMAL(5,2))), 0) as min_push_score,
    ISNULL(MAX(CAST(push_score AS DECIMAL(5,2))), 0) as max_push_score,
    
    -- Índice de Acuidad (escala 1-5)
    CASE 
      WHEN AVG(CAST(push_score AS DECIMAL(5,2))) >= 12 THEN 4.5
      WHEN AVG(CAST(push_score AS DECIMAL(5,2))) >= 10 THEN 3.5
      WHEN AVG(CAST(push_score AS DECIMAL(5,2))) >= 7 THEN 2.5
      WHEN AVG(CAST(push_score AS DECIMAL(5,2))) >= 4 THEN 1.5
      ELSE 1.0
    END as facility_acuity_index,
    
    -- Heridas críticas (PUSH > 12)
    COUNT(CASE WHEN push_score > 12 THEN 1 END) as critical_wounds_count,
    CAST(
      COUNT(CASE WHEN push_score > 12 THEN 1 END) * 100.0 / 
      NULLIF(COUNT(*), 0)
    AS DECIMAL(5,2)) as critical_wounds_percentage,
    
    -- Distribución por Etiology
    COUNT(CASE WHEN etiology LIKE '%Pressure%' OR etiology LIKE '%Ulcer%' THEN 1 END) as pressure_ulcer_count,
    COUNT(CASE WHEN etiology LIKE '%Diabetic%' THEN 1 END) as diabetic_count,
    COUNT(CASE WHEN etiology LIKE '%Venous%' THEN 1 END) as venous_count,
    COUNT(CASE WHEN etiology LIKE '%Arterial%' THEN 1 END) as arterial_count
    
  FROM facility.wound_encounters
  WHERE facility_id = @facilityId
    AND dos BETWEEN @startDate AND @endDate;
    
END;
GO

-- ════════════════════════════════════════════════════════════════════════════════
-- PROCEDIMIENTO 3: sp_facility_EtiologyDistribution
-- Descripción: Retorna distribución de etiologías de heridas
-- Equivalente a: sp_rptEtiologyDistribution
-- ════════════════════════════════════════════════════════════════════════════════

CREATE PROCEDURE facility.sp_facility_EtiologyDistribution
  @facilityId INT,
  @date DATE
AS
BEGIN
  SET NOCOUNT ON;
  
  SELECT
    @facilityId as facility_id,
    @date as report_date,
    CAST(GETDATE() AS DATE) as date_generated,
    
    -- Etiología y Distribución
    etiology as etiology,
    COUNT(*) as count,
    CAST(
      COUNT(*) * 100.0 / SUM(COUNT(*)) OVER ()
    AS DECIMAL(5,2)) as percentage,
    COUNT(DISTINCT patient_id) as unique_patients,
    
    -- Progreso por Etiología
    CAST(
      COUNT(CASE WHEN progress = 'Improving' THEN 1 END) * 100.0 / 
      NULLIF(COUNT(*), 0)
    AS DECIMAL(5,2)) as improving_percentage,
    
    -- Área Promedio (surface)
    ISNULL(AVG(CAST(surface AS DECIMAL(10,2))), 0) as average_area_cm2,
    
    -- Tiempo Promedio (days)
    ISNULL(AVG(days), 0) as average_days_since_onset
    
  FROM facility.wound_encounters
  WHERE facility_id = @facilityId
    AND CAST(dos AS DATE) = @date
    AND etiology IS NOT NULL
  GROUP BY etiology
  ORDER BY count DESC;
    
END;
GO

-- ════════════════════════════════════════════════════════════════════════════════
-- PROCEDIMIENTO 4: sp_facility_OutcomeReportGlobal
-- Descripción: Retorna reporte global de resultados de heridas
-- Equivalente a: sp_rptOutcomeReportGlobal
-- ════════════════════════════════════════════════════════════════════════════════

CREATE PROCEDURE facility.sp_facility_OutcomeReportGlobal
  @facilityId INT,
  @startDate DATE,
  @endDate DATE
AS
BEGIN
  SET NOCOUNT ON;
  
  SELECT
    -- Período
    @facilityId as facility_id,
    @startDate as start_date,
    @endDate as end_date,
    CAST(GETDATE() AS DATE) as date_generated,
    
    -- Resultados Globales
    COUNT(*) as total_encounters,
    COUNT(DISTINCT patient_id) as total_patients,
    COUNT(DISTINCT id) as total_unique_wounds,
    
    -- Heridas por Estado (disposition)
    COUNT(CASE WHEN disposition = 'Active' THEN 1 END) as active_wounds,
    COUNT(CASE WHEN disposition = 'Resolved' THEN 1 END) as resolved_wounds,
    COUNT(CASE WHEN disposition = 'New' THEN 1 END) as new_wounds,
    COUNT(CASE WHEN disposition = 'Hospitalized' THEN 1 END) as hospitalized_wounds,
    
    -- Tasa de Resolución
    CAST(
      COUNT(CASE WHEN disposition = 'Resolved' THEN 1 END) * 100.0 / 
      NULLIF(COUNT(*), 0)
    AS DECIMAL(5,2)) as resolution_rate,
    
    -- Heridas Mejorando vs Empeorando
    COUNT(CASE WHEN progress = 'Improving' THEN 1 END) as improving_count,
    COUNT(CASE WHEN progress = 'Deteriorating' THEN 1 END) as deteriorating_count,
    COUNT(CASE WHEN progress = 'Stable' THEN 1 END) as stable_count,
    
    -- Métricas Clínicas
    ISNULL(AVG(CAST(push_score AS DECIMAL(5,2))), 0) as average_push_score,
    ISNULL(AVG(CAST(surface AS DECIMAL(10,2))), 0) as average_wound_area,
    ISNULL(AVG(days), 0) as average_wound_duration_days,
    
    -- Heridas Largas (> 100 días)
    COUNT(CASE WHEN days > 100 THEN 1 END) as chronic_wounds_100plus_days,
    CAST(
      COUNT(CASE WHEN days > 100 THEN 1 END) * 100.0 / 
      NULLIF(COUNT(*), 0)
    AS DECIMAL(5,2)) as chronic_wounds_percentage,
    
    -- Heridas por Etiology
    COUNT(CASE WHEN etiology LIKE '%Pressure%' OR etiology LIKE '%Ulcer%' THEN 1 END) as pressure_ulcer_count,
    COUNT(CASE WHEN etiology LIKE '%Diabetic%' THEN 1 END) as diabetic_count,
    COUNT(CASE WHEN etiology LIKE '%Venous%' THEN 1 END) as venous_count,
    COUNT(CASE WHEN etiology LIKE '%Arterial%' THEN 1 END) as arterial_count,
    
    -- Índice de Efectividad del Tratamiento
    CASE 
      WHEN COUNT(CASE WHEN progress = 'Improving' THEN 1 END) > 
           COUNT(CASE WHEN progress = 'Deteriorating' THEN 1 END) THEN 'Positivo'
      WHEN COUNT(CASE WHEN progress = 'Improving' THEN 1 END) = 
           COUNT(CASE WHEN progress = 'Deteriorating' THEN 1 END) THEN 'Neutro'
      ELSE 'Negativo'
    END as treatment_effectiveness
    
  FROM facility.wound_encounters
  WHERE facility_id = @facilityId
    AND dos BETWEEN @startDate AND @endDate;
    
END;
GO

-- ════════════════════════════════════════════════════════════════════════════════
-- PROCEDIMIENTO 5: sp_facility_WoundProgressTrend
-- Descripción: Retorna tendencia de progreso de heridas en el tiempo
-- Nuevo: Sin equivalente exacto en procedimientos anteriores
-- ════════════════════════════════════════════════════════════════════════════════

CREATE PROCEDURE facility.sp_facility_WoundProgressTrend
  @facilityId INT,
  @startDate DATE,
  @endDate DATE
AS
BEGIN
  SET NOCOUNT ON;
  
  SELECT
    @facilityId as facility_id,
    CAST(dos AS DATE) as date_of_service,
    
    -- Métricas Diarias
    COUNT(*) as daily_encounters,
    COUNT(DISTINCT patient_id) as daily_patients,
    
    COUNT(CASE WHEN disposition = 'Active' THEN 1 END) as active_wounds_daily,
    COUNT(CASE WHEN disposition = 'Resolved' THEN 1 END) as resolved_wounds_daily,
    COUNT(CASE WHEN disposition = 'New' THEN 1 END) as new_wounds_daily,
    
    CAST(
      COUNT(CASE WHEN progress = 'Improving' THEN 1 END) * 100.0 / 
      NULLIF(COUNT(*), 0)
    AS DECIMAL(5,2)) as improving_percentage_daily,
    
    ISNULL(AVG(CAST(push_score AS DECIMAL(5,2))), 0) as average_push_score_daily,
    ISNULL(AVG(CAST(surface AS DECIMAL(10,2))), 0) as average_area_cm2_daily
    
  FROM facility.wound_encounters
  WHERE facility_id = @facilityId
    AND dos BETWEEN @startDate AND @endDate
  GROUP BY CAST(dos AS DATE)
  ORDER BY dos DESC;
    
END;
GO

-- ════════════════════════════════════════════════════════════════════════════════
-- PROCEDIMIENTO 6: sp_facility_PatientWoundSummary
-- Descripción: Resumen de heridas por paciente en una facility
-- Nuevo: Para análisis a nivel de paciente
-- ════════════════════════════════════════════════════════════════════════════════

CREATE PROCEDURE facility.sp_facility_PatientWoundSummary
  @facilityId INT,
  @startDate DATE,
  @endDate DATE
AS
BEGIN
  SET NOCOUNT ON;
  
  SELECT
    @facilityId as facility_id,
    patient_id,
    
    -- Conteo de Heridas
    COUNT(*) as total_wounds,
    COUNT(CASE WHEN disposition = 'Active' THEN 1 END) as active_wounds,
    COUNT(CASE WHEN disposition = 'Resolved' THEN 1 END) as resolved_wounds,
    COUNT(CASE WHEN disposition = 'New' THEN 1 END) as new_wounds,
    
    -- Progreso
    CAST(
      COUNT(CASE WHEN progress = 'Improving' THEN 1 END) * 100.0 / 
      NULLIF(COUNT(*), 0)
    AS DECIMAL(5,2)) as improving_percentage,
    
    -- Área Total
    ISNULL(SUM(CAST(surface AS DECIMAL(10,2))), 0) as total_wound_area_cm2,
    ISNULL(AVG(CAST(surface AS DECIMAL(10,2))), 0) as average_wound_area_cm2,
    
    -- PUSH Score
    ISNULL(AVG(CAST(push_score AS DECIMAL(5,2))), 0) as average_push_score,
    
    -- Riesgo
    CASE 
      WHEN AVG(CAST(push_score AS DECIMAL(5,2))) > 12 THEN 'Alto Riesgo'
      WHEN AVG(CAST(push_score AS DECIMAL(5,2))) > 8 THEN 'Riesgo Moderado'
      WHEN AVG(CAST(push_score AS DECIMAL(5,2))) > 4 THEN 'Riesgo Bajo'
      ELSE 'Bajo Riesgo'
    END as risk_level,
    
    MIN(dos) as first_encounter_date,
    MAX(dos) as last_encounter_date
    
  FROM facility.wound_encounters
  WHERE facility_id = @facilityId
    AND dos BETWEEN @startDate AND @endDate
  GROUP BY patient_id
  ORDER BY average_push_score DESC, total_wound_area_cm2 DESC;
    
END;
GO

-- ════════════════════════════════════════════════════════════════════════════════
-- PROCEDIMIENTO 7: sp_facility_HighRiskWounds
-- Descripción: Identifica heridas de alto riesgo (PUSH > 12)
-- Nuevo: Para alertas y monitoreo
-- ════════════════════════════════════════════════════════════════════════════════

CREATE PROCEDURE facility.sp_facility_HighRiskWounds
  @facilityId INT,
  @pushScoreThreshold INT = 12
AS
BEGIN
  SET NOCOUNT ON;
  
  SELECT TOP 100
    @facilityId as facility_id,
    id as encounter_id,
    patient_id,
    id as wound_id,
    disposition as wound_status,
    etiology as wound_etiology,
    location as wound_location,
    surface as area_cm2,
    push_score,
    progress as improvement_status,
    days as days_since_onset,
    dos as date_of_service,
    CASE 
      WHEN push_score > @pushScoreThreshold THEN 'Crítico'
      WHEN push_score > (@pushScoreThreshold - 3) THEN 'Alerta'
      ELSE 'Monitoreo'
    END as alert_level
    
  FROM facility.wound_encounters
  WHERE facility_id = @facilityId
    AND push_score > (@pushScoreThreshold - 3)
  ORDER BY push_score DESC, dos DESC;
    
END;
GO

-- ════════════════════════════════════════════════════════════════════════════════
-- PRUEBAS DE VALIDACIÓN
-- ════════════════════════════════════════════════════════════════════════════════

/*
-- Probar SP 1: Wound Outcome
EXEC facility.sp_facility_WoundOutcome 
  @facilityId = 5,
  @startDate = '2025-01-01',
  @endDate = '2025-12-31';

-- Probar SP 2: Acuity Index
EXEC facility.sp_facility_AcuityIndex 
  @facilityId = 5,
  @daysBack = 90;

-- Probar SP 3: Etiology Distribution
EXEC facility.sp_facility_EtiologyDistribution 
  @facilityId = 5,
  @date = '2025-12-31';

-- Probar SP 4: Outcome Report Global
EXEC facility.sp_facility_OutcomeReportGlobal 
  @facilityId = 5,
  @startDate = '2025-01-01',
  @endDate = '2025-12-31';

-- Probar SP 5: Progress Trend
EXEC facility.sp_facility_WoundProgressTrend 
  @facilityId = 5,
  @startDate = '2025-12-01',
  @endDate = '2025-12-31';

-- Probar SP 6: Patient Wound Summary
EXEC facility.sp_facility_PatientWoundSummary 
  @facilityId = 5,
  @startDate = '2025-01-01',
  @endDate = '2025-12-31';

-- Probar SP 7: High Risk Wounds
EXEC facility.sp_facility_HighRiskWounds 
  @facilityId = 5,
  @pushScoreThreshold = 12;
*/

-- ════════════════════════════════════════════════════════════════════════════════
-- DOCUMENTACIÓN FINAL
-- ════════════════════════════════════════════════════════════════════════════════

/*

PROCEDIMIENTOS ALMACENADOS CREADOS:
───────────────────────────────────

1. facility.sp_facility_WoundOutcome
   - Retorna: Métricas agregadas de heridas
   - Parámetros: @facilityId, @startDate, @endDate
   - Campos: 20+ métricas incluyendo conteos, porcentajes, áreas e índices

2. facility.sp_facility_AcuityIndex
   - Retorna: Índice de acuidad de facility
   - Parámetros: @facilityId, @daysBack (default 90)
   - Campos: PUSH score promedio, distribución por etiología, heridas críticas

3. facility.sp_facility_EtiologyDistribution
   - Retorna: Distribución de etiologías
   - Parámetros: @facilityId, @date
   - Campos: Conteo por etiología, porcentajes, progreso

4. facility.sp_facility_OutcomeReportGlobal
   - Retorna: Reporte global de resultados
   - Parámetros: @facilityId, @startDate, @endDate
   - Campos: Resultados globales, tasas de resolución, tendencias

5. facility.sp_facility_WoundProgressTrend
   - Retorna: Tendencia de progreso en el tiempo
   - Parámetros: @facilityId, @startDate, @endDate
   - Campos: Métricas diarias de progreso

6. facility.sp_facility_PatientWoundSummary
   - Retorna: Resumen de heridas por paciente
   - Parámetros: @facilityId, @startDate, @endDate
   - Campos: Heridas por paciente, niveles de riesgo

7. facility.sp_facility_HighRiskWounds
   - Retorna: Heridas de alto riesgo
   - Parámetros: @facilityId, @pushScoreThreshold (default 12)
   - Campos: Detalles de heridas críticas con alertas

FUENTE DE DATOS:
───────────────
/*Todos los procedimientos utilizan la tabla: facility.wound_encounters

BENEFICIOS:
──────────
✓ Datos locales sin dependencia de API remota
✓ Queries rápidas directas a tabla principal
✓ Escalabilidad mejorada
✓ Reportes consistentes y auditables
✓ Posibilidad de integración con otras tablas del esquema facility

*/
