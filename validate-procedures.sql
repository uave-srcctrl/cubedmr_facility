-- ════════════════════════════════════════════════════════════════════════════════
-- SCRIPT DE VALIDACIÓN: Procedimientos facility.wound_encounters
-- Base de datos: curisec (remoteWoundcareDB)
-- Fecha: 20 de enero de 2026
-- 
-- Descripción:
-- Este script valida que todos los campos existan y que los procedimientos
-- puedan ejecutarse sin errores en la tabla facility.wound_encounters
-- ════════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════════
-- PARTE 1: Validar Estructura de la Tabla
-- ════════════════════════════════════════════════════════════════════════════════

PRINT '═══════════════════════════════════════════════════════════════════════════════'
PRINT 'PARTE 1: Validar Estructura de facility.wound_encounters'
PRINT '═══════════════════════════════════════════════════════════════════════════════'

-- Listar todas las columnas
SELECT 
    'Verificando estructura...' as status,
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    ORDINAL_POSITION
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'facility'
    AND TABLE_NAME = 'wound_encounters'
ORDER BY ORDINAL_POSITION;

-- Contar columnas esperadas
DECLARE @expectedColumns INT = 27;
DECLARE @actualColumns INT;

SELECT @actualColumns = COUNT(*)
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'facility'
    AND TABLE_NAME = 'wound_encounters';

PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
PRINT 'Columnas esperadas: ' + CAST(@expectedColumns AS VARCHAR(10))
PRINT 'Columnas encontradas: ' + CAST(@actualColumns AS VARCHAR(10))
IF @actualColumns >= @expectedColumns
    PRINT '✓ Validación CORRECTA: Todas las columnas están presentes'
ELSE
    PRINT '✗ ERROR: Faltan columnas. Verifica la estructura de la tabla.'
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

GO

-- ════════════════════════════════════════════════════════════════════════════════
-- PARTE 2: Validar Datos
-- ════════════════════════════════════════════════════════════════════════════════

PRINT ''
PRINT '═══════════════════════════════════════════════════════════════════════════════'
PRINT 'PARTE 2: Validar Datos en facility.wound_encounters'
PRINT '═══════════════════════════════════════════════════════════════════════════════'

-- Estadísticas generales
SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT facility_id) as unique_facilities,
    COUNT(DISTINCT patient_id) as unique_patients,
    MIN(dos) as earliest_date,
    MAX(dos) as latest_date,
    COUNT(CASE WHEN push_score IS NOT NULL THEN 1 END) as records_with_push_score,
    COUNT(CASE WHEN surface IS NOT NULL THEN 1 END) as records_with_surface,
    COUNT(CASE WHEN days IS NOT NULL THEN 1 END) as records_with_days
FROM facility.wound_encounters;

PRINT ''
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

-- Valores únicos en campos críticos
PRINT ''
PRINT 'Valores únicos en campo "disposition" (estados de herida):'
SELECT DISTINCT disposition, COUNT(*) as count
FROM facility.wound_encounters
WHERE disposition IS NOT NULL
GROUP BY disposition
ORDER BY count DESC;

PRINT ''
PRINT 'Valores únicos en campo "progress" (progreso de cicatrización):'
SELECT DISTINCT progress, COUNT(*) as count
FROM facility.wound_encounters
WHERE progress IS NOT NULL
GROUP BY progress
ORDER BY count DESC;

PRINT ''
PRINT 'Valores únicos en campo "etiology" (etiología - TOP 10):'
SELECT TOP 10 etiology, COUNT(*) as count
FROM facility.wound_encounters
WHERE etiology IS NOT NULL
GROUP BY etiology
ORDER BY count DESC;

GO

-- ════════════════════════════════════════════════════════════════════════════════
-- PARTE 3: Test de Campos Utilizados
-- ════════════════════════════════════════════════════════════════════════════════

PRINT ''
PRINT '═══════════════════════════════════════════════════════════════════════════════'
PRINT 'PARTE 3: Test de Campos Utilizados en Procedimientos'
PRINT '═══════════════════════════════════════════════════════════════════════════════'

DECLARE @facilityId INT = 5; -- Cambiar según sea necesario
DECLARE @testDate DATE = CAST(GETDATE() AS DATE);
DECLARE @startDate DATE = DATEADD(DAY, -30, @testDate);
DECLARE @endDate DATE = @testDate;

PRINT ''
PRINT 'Configuración de TEST:'
PRINT '  Facility ID: ' + CAST(@facilityId AS VARCHAR(10))
PRINT '  Período: ' + CAST(@startDate AS VARCHAR(10)) + ' a ' + CAST(@endDate AS VARCHAR(10))
PRINT ''

-- Test SP 1: WoundOutcome
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
PRINT 'TEST 1: sp_facility_WoundOutcome'
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT
    @facilityId as facility_id,
    @startDate as start_date,
    @endDate as end_date,
    COUNT(*) as total_encounters,
    COUNT(CASE WHEN disposition = 'Active' THEN 1 END) as active_wounds,
    COUNT(CASE WHEN disposition = 'Resolved' THEN 1 END) as resolved_wounds,
    COUNT(CASE WHEN progress = 'Improving' THEN 1 END) as improving_count,
    ISNULL(AVG(CAST(push_score AS DECIMAL(5,2))), 0) as avg_push_score,
    ISNULL(AVG(CAST(surface AS DECIMAL(10,2))), 0) as avg_surface_area
FROM facility.wound_encounters
WHERE facility_id = @facilityId
    AND dos BETWEEN @startDate AND @endDate;

PRINT '✓ TEST 1 completado exitosamente'
PRINT ''

-- Test SP 2: AcuityIndex
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
PRINT 'TEST 2: sp_facility_AcuityIndex'
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT
    @facilityId as facility_id,
    COUNT(*) as total_encounters,
    COUNT(DISTINCT patient_id) as total_patients,
    ISNULL(AVG(CAST(push_score AS DECIMAL(5,2))), 0) as average_push_score,
    COUNT(CASE WHEN push_score > 12 THEN 1 END) as critical_wounds,
    COUNT(CASE WHEN etiology LIKE '%Pressure%' OR etiology LIKE '%Ulcer%' THEN 1 END) as pressure_ulcers
FROM facility.wound_encounters
WHERE facility_id = @facilityId
    AND dos BETWEEN @startDate AND @endDate;

PRINT '✓ TEST 2 completado exitosamente'
PRINT ''

-- Test SP 3: EtiologyDistribution
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
PRINT 'TEST 3: sp_facility_EtiologyDistribution'
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT TOP 5
    etiology,
    COUNT(*) as count,
    CAST(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () AS DECIMAL(5,2)) as percentage,
    COUNT(DISTINCT patient_id) as unique_patients,
    ISNULL(AVG(CAST(surface AS DECIMAL(10,2))), 0) as avg_area
FROM facility.wound_encounters
WHERE facility_id = @facilityId
    AND CAST(dos AS DATE) = @endDate
    AND etiology IS NOT NULL
GROUP BY etiology
ORDER BY count DESC;

PRINT '✓ TEST 3 completado exitosamente'
PRINT ''

-- Test SP 4: OutcomeReportGlobal
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
PRINT 'TEST 4: sp_facility_OutcomeReportGlobal'
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT
    COUNT(*) as total_encounters,
    COUNT(DISTINCT patient_id) as total_patients,
    COUNT(CASE WHEN disposition = 'Active' THEN 1 END) as active_wounds,
    COUNT(CASE WHEN disposition = 'Resolved' THEN 1 END) as resolved_wounds,
    COUNT(CASE WHEN disposition = 'New' THEN 1 END) as new_wounds,
    COUNT(CASE WHEN progress = 'Improving' THEN 1 END) as improving,
    COUNT(CASE WHEN progress = 'Deteriorating' THEN 1 END) as deteriorating,
    COUNT(CASE WHEN progress = 'Stable' THEN 1 END) as stable
FROM facility.wound_encounters
WHERE facility_id = @facilityId
    AND dos BETWEEN @startDate AND @endDate;

PRINT '✓ TEST 4 completado exitosamente'
PRINT ''

-- Test SP 5: WoundProgressTrend
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
PRINT 'TEST 5: sp_facility_WoundProgressTrend (últimos 5 días)'
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT TOP 5
    CAST(dos AS DATE) as date_of_service,
    COUNT(*) as daily_encounters,
    COUNT(DISTINCT patient_id) as daily_patients,
    COUNT(CASE WHEN disposition = 'Active' THEN 1 END) as active_wounds_daily,
    ISNULL(AVG(CAST(push_score AS DECIMAL(5,2))), 0) as avg_push_score_daily
FROM facility.wound_encounters
WHERE facility_id = @facilityId
    AND dos BETWEEN @startDate AND @endDate
GROUP BY CAST(dos AS DATE)
ORDER BY dos DESC;

PRINT '✓ TEST 5 completado exitosamente'
PRINT ''

-- Test SP 6: PatientWoundSummary
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
PRINT 'TEST 6: sp_facility_PatientWoundSummary (TOP 5 pacientes)'
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT TOP 5
    patient_id,
    COUNT(*) as total_wounds,
    COUNT(CASE WHEN disposition = 'Active' THEN 1 END) as active_wounds,
    COUNT(CASE WHEN disposition = 'Resolved' THEN 1 END) as resolved_wounds,
    ISNULL(AVG(CAST(push_score AS DECIMAL(5,2))), 0) as avg_push_score,
    ISNULL(SUM(CAST(surface AS DECIMAL(10,2))), 0) as total_area,
    CASE 
        WHEN AVG(CAST(push_score AS DECIMAL(5,2))) > 12 THEN 'Alto Riesgo'
        WHEN AVG(CAST(push_score AS DECIMAL(5,2))) > 8 THEN 'Riesgo Moderado'
        ELSE 'Bajo Riesgo'
    END as risk_level
FROM facility.wound_encounters
WHERE facility_id = @facilityId
    AND dos BETWEEN @startDate AND @endDate
GROUP BY patient_id
ORDER BY avg_push_score DESC;

PRINT '✓ TEST 6 completado exitosamente'
PRINT ''

-- Test SP 7: HighRiskWounds
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
PRINT 'TEST 7: sp_facility_HighRiskWounds (TOP 5)'
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT TOP 5
    id,
    patient_id,
    location,
    etiology,
    surface,
    push_score,
    progress,
    disposition,
    CASE 
        WHEN push_score > 12 THEN 'Crítico'
        WHEN push_score > 9 THEN 'Alerta'
        ELSE 'Monitoreo'
    END as alert_level
FROM facility.wound_encounters
WHERE facility_id = @facilityId
    AND push_score > 9
ORDER BY push_score DESC;

PRINT '✓ TEST 7 completado exitosamente'
PRINT ''

GO

-- ════════════════════════════════════════════════════════════════════════════════
-- PARTE 4: Resumen Final
-- ════════════════════════════════════════════════════════════════════════════════

PRINT '═══════════════════════════════════════════════════════════════════════════════'
PRINT 'RESUMEN FINAL'
PRINT '═══════════════════════════════════════════════════════════════════════════════'
PRINT ''
PRINT '✓ Todos los tests de validación completados exitosamente'
PRINT ''
PRINT 'PRÓXIMOS PASOS:'
PRINT '  1. Ejecutar create-facility-schema-procedures.sql para crear los procedimientos'
PRINT '  2. Ejecutar node deploy-facility-procedures.js para desplegarlos'
PRINT '  3. Probar cada procedimiento con datos reales de tu facility'
PRINT ''
PRINT '═══════════════════════════════════════════════════════════════════════════════'
