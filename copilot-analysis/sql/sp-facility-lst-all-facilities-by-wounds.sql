-- ════════════════════════════════════════════════════════════════════════════════
-- STORED PROCEDURE: sp_facility_LST_AllFacilitiesByWounds
-- SCHEMA: facility
-- DATABASE: remoteWoundcareDB (curisec)
-- DATE: January 28, 2026
--
-- DESCRIPCIÓN:
-- Stored procedure que lista todas las facilities con estadísticas de heridas
-- Basado en la tabla facility.wound_encounters
-- Similar a sp_LST_AllFacilitiesByProvider pero con métricas de heridas
--
-- PARÁMETROS:
--   @providerId (INT, OPCIONAL) - Filtrar por provider_id si se proporciona
--   @includeZeroWounds (BIT, DEFAULT 1) - Incluir facilities sin heridas
--
-- RETORNA:
--   Listado de facilities con estadísticas de heridas basadas en wound_encounters
--
-- EXAMPLE USAGE:
--   EXEC facility.sp_facility_LST_AllFacilitiesByWounds;
--   EXEC facility.sp_facility_LST_AllFacilitiesByWounds @providerId = 101;
--   EXEC facility.sp_facility_LST_AllFacilitiesByWounds @includeZeroWounds = 0;
-- ════════════════════════════════════════════════════════════════════════════════

CREATE PROCEDURE facility.sp_facility_LST_AllFacilitiesByWounds
  @providerId INT = NULL,
  @includeZeroWounds BIT = 1
AS
BEGIN
  SET NOCOUNT ON;
  
  SELECT
    -- Información Identificadora
    we.facility_id as id,
    we.facility_id,
    
    -- Nombre y Ubicación (si están disponibles en wound_encounters)
    'Facility ' + CAST(we.facility_id AS VARCHAR(10)) as name,
    'Facility ' + CAST(we.facility_id AS VARCHAR(10)) as facility_name,
    
    -- Estadísticas Generales de Heridas
    COUNT(*) as total_wound_encounters,
    COUNT(DISTINCT we.patient_id) as total_active_patients,
    COUNT(DISTINCT CASE WHEN we.dos = CAST(GETDATE() AS DATE) THEN we.patient_id END) as patients_seen_today,
    
    -- Conteos por Disposición
    COUNT(CASE WHEN we.disposition = 'Active' THEN 1 END) as active_wounds,
    COUNT(CASE WHEN we.disposition = 'New' THEN 1 END) as new_wounds,
    COUNT(CASE WHEN we.disposition = 'Resolved' THEN 1 END) as resolved_wounds,
    COUNT(CASE WHEN we.disposition = 'Hospitalized' THEN 1 END) as hospitalized_wounds,
    
    -- Conteos por Progreso
    COUNT(CASE WHEN we.progress = 'Improving' THEN 1 END) as improving_wounds,
    COUNT(CASE WHEN we.progress = 'Deteriorating' THEN 1 END) as deteriorating_wounds,
    COUNT(CASE WHEN we.progress = 'Stable' THEN 1 END) as stable_wounds,
    
    -- Heridas de Alto Riesgo
    COUNT(CASE WHEN we.push_score > 12 THEN 1 END) as critical_wounds,
    COUNT(CASE WHEN we.push_score BETWEEN 8 AND 12 THEN 1 END) as alert_wounds,
    
    -- Heridas Crónicas (más de 100 días)
    COUNT(CASE WHEN we.days > 100 THEN 1 END) as chronic_wounds,
    
    -- Promedio de PUSH Score
    ISNULL(CAST(AVG(CAST(we.push_score AS DECIMAL(5,2))) AS DECIMAL(5,2)), 0) as average_push_score,
    
    -- Área Promedio
    ISNULL(CAST(AVG(CAST(we.surface AS DECIMAL(10,2))) AS DECIMAL(10,2)), 0) as average_wound_area_cm2,
    
    -- Promedio de Días desde Inicio
    ISNULL(CAST(AVG(CAST(we.days AS DECIMAL(10,2))) AS DECIMAL(10,2)), 0) as average_days_since_onset,
    
    -- Porcentajes
    ISNULL(
      CAST(
        COUNT(CASE WHEN we.progress = 'Improving' THEN 1 END) * 100.0 / 
        NULLIF(COUNT(*), 0)
      AS DECIMAL(5,2))
    , 0) as percent_improving,
    
    ISNULL(
      CAST(
        COUNT(CASE WHEN we.disposition = 'Resolved' THEN 1 END) * 100.0 / 
        NULLIF(COUNT(*), 0)
      AS DECIMAL(5,2))
    , 0) as percent_resolved,
    
    -- Etiologías Principales (comma-separated)
    STUFF(
      (SELECT ', ' + CAST(COUNT(*) AS VARCHAR(10)) + ' ' + etiology
       FROM facility.wound_encounters we2
       WHERE we2.facility_id = we.facility_id
       GROUP BY etiology
       ORDER BY COUNT(*) DESC
       FOR XML PATH('')),
      1, 2, ''
    ) as top_etiologies,
    
    -- Índice de Acuidad
    CASE 
      WHEN AVG(CAST(we.push_score AS DECIMAL(5,2))) >= 12 THEN 'Crítico'
      WHEN AVG(CAST(we.push_score AS DECIMAL(5,2))) >= 8 THEN 'Alerta'
      WHEN AVG(CAST(we.push_score AS DECIMAL(5,2))) >= 4 THEN 'Monitoreo'
      ELSE 'Bajo Riesgo'
    END as acuity_level,
    
    -- Proveedor
    we.provider_id,
    MAX(we.provider_id) as primary_provider_id,
    
    -- Timestamps
    MAX(we.dos) as last_encounter_date,
    MIN(we.dos) as first_encounter_date,
    CAST(GETDATE() AS DATE) as report_date
    
  FROM facility.wound_encounters we
  
  WHERE
    -- Filtro opcional por provider
    (@providerId IS NULL OR we.provider_id = @providerId)
    
  GROUP BY
    we.facility_id,
    we.provider_id
    
  -- Filtro: incluir o excluir facilities sin heridas
  HAVING
    @includeZeroWounds = 1 OR COUNT(*) > 0
    
  ORDER BY
    -- Ordenar por facilities con más heridas primero
    COUNT(*) DESC,
    we.facility_id ASC;
    
END;
GO

-- ════════════════════════════════════════════════════════════════════════════════
-- PRUEBAS DE VALIDACIÓN
-- ════════════════════════════════════════════════════════════════════════════════

/*
-- Test 1: Listar todas las facilities con heridas
EXEC facility.sp_facility_LST_AllFacilitiesByWounds;

-- Test 2: Listar facilities de un proveedor específico
EXEC facility.sp_facility_LST_AllFacilitiesByWounds @providerId = 101;

-- Test 3: Excluir facilities sin heridas
EXEC facility.sp_facility_LST_AllFacilitiesByWounds @includeZeroWounds = 0;

-- Test 4: Específico: Provider 101, solo con heridas
EXEC facility.sp_facility_LST_AllFacilitiesByWounds 
  @providerId = 101, 
  @includeZeroWounds = 0;
*/

-- ════════════════════════════════════════════════════════════════════════════════
-- DOCUMENTACIÓN
-- ════════════════════════════════════════════════════════════════════════════════

/*

PROCEDIMIENTO: facility.sp_facility_LST_AllFacilitiesByWounds
═══════════════════════════════════════════════════════════

DESCRIPCIÓN:
───────────
Lista todas las facilities con estadísticas detalladas de heridas basadas en la tabla
facility.wound_encounters. Este procedimiento es equivalente a sp_LST_AllFacilitiesByProvider
pero enfocado en métricas de heridas.

PARÁMETROS:
──────────
1. @providerId (INT, OPCIONAL)
   - Filtrar facilities por provider_id
   - Si es NULL, retorna todas las facilities de todos los providers
   - Default: NULL

2. @includeZeroWounds (BIT, DEFAULT 1)
   - Si = 1: Incluye facilities sin heridas en wound_encounters
   - Si = 0: Solo facilities con al menos una herida
   - Default: 1

CAMPOS RETORNADOS:
─────────────────
1. id / facility_id
   - ID de la facility

2. name / facility_name
   - Nombre de la facility (generado automáticamente como "Facility {id}")

3. Conteos Generales
   - total_wound_encounters: Total de encuentros de heridas
   - total_active_patients: Total de pacientes únicos con heridas
   - patients_seen_today: Pacientes vistos hoy

4. Conteos por Disposición
   - active_wounds: Heridas activas
   - new_wounds: Heridas nuevas
   - resolved_wounds: Heridas resueltas
   - hospitalized_wounds: Heridas hospitalizadas

5. Conteos por Progreso
   - improving_wounds: Heridas mejorando
   - deteriorating_wounds: Heridas empeorando
   - stable_wounds: Heridas estables

6. Heridas de Riesgo
   - critical_wounds: Heridas críticas (PUSH > 12)
   - alert_wounds: Heridas en alerta (PUSH 8-12)

7. Heridas Crónicas
   - chronic_wounds: Heridas con más de 100 días

8. Promedios
   - average_push_score: PUSH score promedio
   - average_wound_area_cm2: Área promedio en cm²
   - average_days_since_onset: Promedio de días desde inicio

9. Porcentajes
   - percent_improving: % de heridas mejorando
   - percent_resolved: % de heridas resueltas

10. Análisis de Etiología
    - top_etiologies: Etiologías principales (comma-separated con conteos)

11. Evaluación
    - acuity_level: Nivel de acuidad (Crítico, Alerta, Monitoreo, Bajo Riesgo)
    - provider_id / primary_provider_id: ID del proveedor

12. Timestamps
    - last_encounter_date: Fecha del último encuentro
    - first_encounter_date: Fecha del primer encuentro
    - report_date: Fecha de generación del reporte

CASOS DE USO:
────────────
1. Dashboard de Facilities
   - Mostrar resumen de todas las facilities con heridas
   - Highlighting facilities críticas

2. Filtrado por Provider
   - Ver solo facilities asignadas a un provider específico
   - Evaluar carga de trabajo del provider

3. Análisis de Riesgo
   - Identificar facilities con heridas críticas
   - Seguimiento de heridas crónicas

4. Comparativa entre Facilities
   - PUSH scores promedio
   - Tasas de mejora
   - Distribución de etiologías

RENDIMIENTO:
───────────
- Índices recomendados:
  CREATE INDEX IX_wound_encounters_facility_id 
    ON facility.wound_encounters(facility_id);
  CREATE INDEX IX_wound_encounters_provider_id 
    ON facility.wound_encounters(provider_id);
  CREATE INDEX IX_wound_encounters_dos 
    ON facility.wound_encounters(dos);

DIFERENCIAS vs sp_LST_AllFacilitiesByProvider:
──────────────────────────────────────────────
✓ Usa tabla facility.wound_encounters como fuente
✓ Incluye métricas específicas de heridas (PUSH score, disposición, progreso)
✓ Retorna estadísticas agregadas por facility
✓ Proporciona insights sobre riesgo y acuidad

*/
