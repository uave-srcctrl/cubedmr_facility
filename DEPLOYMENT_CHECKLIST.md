# 🎯 CHECKLIST: Desplegar Procedimientos facility.wound_encounters

## Estado Actual: ✅ LISTO PARA DESPLEGAR

---

## 📋 Archivos Actualizados

```
✅ create-facility-schema-procedures.sql
   ├─ SP 1: sp_facility_WoundOutcome
   ├─ SP 2: sp_facility_AcuityIndex
   ├─ SP 3: sp_facility_EtiologyDistribution
   ├─ SP 4: sp_facility_OutcomeReportGlobal
   ├─ SP 5: sp_facility_WoundProgressTrend
   ├─ SP 6: sp_facility_PatientWoundSummary
   └─ SP 7: sp_facility_HighRiskWounds

✅ FIELD_MAPPING_REFERENCE.md
   └─ Mapeo detallado campo anterior → campo real

✅ validate-procedures.sql
   └─ Script para validar que todo funciona

✅ UPDATE_SUMMARY.md
   └─ Resumen de cambios realizados

✅ INTEGRATION_GUIDE.md
   └─ Cómo integrar en React (creado previamente)
```

---

## 🔄 Cambios Realizados

### Mapeos de Campos Principales

| Concepto | Anterior | Actual | Estado |
|----------|----------|--------|--------|
| **Fecha de Servicio** | `date_of_service` | `dos` | ✅ Actualizado |
| **Área de Herida** | `area_cm2` | `surface` | ✅ Actualizado |
| **Estado de Herida** | `wound_status` | `disposition` | ✅ Actualizado |
| **Progreso** | `improvement_status` | `progress` | ✅ Actualizado |
| **Días de Evolución** | `days_since_onset` | `days` | ✅ Actualizado |
| **Etiología** | `wound_etiology` | `etiology` | ✅ Actualizado |
| **Ubicación** | `wound_location` | `location` | ✅ Actualizado |
| **Filtro Activos** | `is_active = 1` | [REMOVIDO] | ✅ Actualizado |

---

## 🚀 Pasos para Desplegar

### Paso 1: Validar Estructura (Opcional pero Recomendado)
```bash
# En SQL Server Management Studio o Azure Data Studio
EXEC curisec;
USE curisec;

-- Ejecutar script de validación
:r D:\path\to\validate-procedures.sql

# O en terminal
sqlcmd -S 190.92.153.67 -U curisec -P curisec123 -d curisec -i validate-procedures.sql
```

**Resultado esperado**: 7 tests completados exitosamente ✓

---

### Paso 2: Crear Procedimientos
```bash
# Opción A: Node.js (Recomendado)
cd /home/alainosmar/workspace/wounddatacenter
node deploy-facility-procedures.js

# Opción B: SQL Server Management Studio
# Copiar contenido de create-facility-schema-procedures.sql
# Ejecutar en: remoteWoundcareDB > facility schema

# Opción C: Terminal con sqlcmd
sqlcmd -S 190.92.153.67 -U curisec -P curisec123 -d curisec -i create-facility-schema-procedures.sql
```

**Resultado esperado**: 
```
Successfully created procedure: facility.sp_facility_WoundOutcome
Successfully created procedure: facility.sp_facility_AcuityIndex
Successfully created procedure: facility.sp_facility_EtiologyDistribution
Successfully created procedure: facility.sp_facility_OutcomeReportGlobal
Successfully created procedure: facility.sp_facility_WoundProgressTrend
Successfully created procedure: facility.sp_facility_PatientWoundSummary
Successfully created procedure: facility.sp_facility_HighRiskWounds
```

---

### Paso 3: Verificar Procedimientos Creados
```sql
-- En SQL Server
SELECT 
    ROUTINE_NAME,
    ROUTINE_SCHEMA,
    ROUTINE_TYPE,
    CREATED
FROM INFORMATION_SCHEMA.ROUTINES
WHERE ROUTINE_SCHEMA = 'facility'
    AND ROUTINE_NAME LIKE 'sp_facility_%'
ORDER BY ROUTINE_NAME;

-- Resultado esperado: 7 procedimientos listados
```

---

### Paso 4: Probar Cada Procedimiento

#### Test Procedimiento 1: WoundOutcome
```sql
EXEC facility.sp_facility_WoundOutcome 
  @facilityId = 5,
  @startDate = '2025-01-01',
  @endDate = '2025-12-31';
-- Esperado: Fila con métricas agregadas
```

#### Test Procedimiento 2: AcuityIndex
```sql
EXEC facility.sp_facility_AcuityIndex 
  @facilityId = 5,
  @daysBack = 90;
-- Esperado: Fila con índice de acuidad
```

#### Test Procedimiento 3: EtiologyDistribution
```sql
EXEC facility.sp_facility_EtiologyDistribution 
  @facilityId = 5,
  @date = '2025-12-31';
-- Esperado: Múltiples filas con distribución por etiología
```

#### Test Procedimiento 4: OutcomeReportGlobal
```sql
EXEC facility.sp_facility_OutcomeReportGlobal 
  @facilityId = 5,
  @startDate = '2025-01-01',
  @endDate = '2025-12-31';
-- Esperado: Fila con reporte global
```

#### Test Procedimiento 5: WoundProgressTrend
```sql
EXEC facility.sp_facility_WoundProgressTrend 
  @facilityId = 5,
  @startDate = '2025-12-01',
  @endDate = '2025-12-31';
-- Esperado: Múltiples filas con tendencia diaria
```

#### Test Procedimiento 6: PatientWoundSummary
```sql
EXEC facility.sp_facility_PatientWoundSummary 
  @facilityId = 5,
  @startDate = '2025-01-01',
  @endDate = '2025-12-31';
-- Esperado: Múltiples filas con resumen por paciente
```

#### Test Procedimiento 7: HighRiskWounds
```sql
EXEC facility.sp_facility_HighRiskWounds 
  @facilityId = 5,
  @pushScoreThreshold = 12;
-- Esperado: Múltiples filas con heridas de alto riesgo
```

---

## 📝 Consideraciones Importantes

### ⚠️ Cambio Crítico: Remoción de `is_active = 1`

**Antes**: Procedimientos retornaban solo registros activos
```sql
WHERE facility_id = @facilityId
  AND dos BETWEEN @startDate AND @endDate
  AND is_active = 1;  -- REMOVIDO
```

**Después**: Procedimientos retornan TODOS los registros
```sql
WHERE facility_id = @facilityId
  AND dos BETWEEN @startDate AND @endDate;
```

**Impacto**: 
- ❌ Resultados incluirán registros históricos/resueltos
- ✅ Datos más completos y representativos
- ℹ️ Si necesitas solo activos, filtrar en aplicación:
  ```sql
  AND disposition IN ('Active', 'New')
  ```

### 🔍 Cambio en Búsqueda de Etiologías

**Antes**: Búsqueda exacta
```sql
WHERE wound_etiology = 'Pressure Ulcer'
```

**Después**: Búsqueda flexible con LIKE
```sql
WHERE etiology LIKE '%Pressure%' OR etiology LIKE '%Ulcer%'
```

**Ventaja**: Captura variaciones en nomenclatura

---

## ✅ Post-Despliegue

### 1. Integración en Node.js
Si deseas exponer estos procedimientos como endpoints REST:

Ver [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) para:
- Crear rutas Express
- Implementar autenticación
- Configurar pool de conexiones
- Manejo de errores

### 2. Actualización en React
Actualizar componentes que consumen estos datos para:
- Usar los nuevos nombres de campos
- Manejar mayor volumen de datos
- Implementar paginación si es necesario

Ver [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) para:
- Custom React Hooks
- Ejemplo de Dashboard
- Configuración de React Query

### 3. Monitoreo
```sql
-- Ver procedimientos creados
SELECT * FROM sys.procedures 
WHERE schema_id = SCHEMA_ID('facility');

-- Ver última ejecución
SELECT 
    name,
    create_date,
    modify_date
FROM sys.procedures 
WHERE name LIKE 'sp_facility_%';
```

---

## 🆘 Troubleshooting

### Error: "Invalid column name 'dos'"
**Causa**: La tabla `facility.wound_encounters` podría tener estructura diferente

**Solución**:
```sql
-- Verificar nombres exactos
SELECT COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'facility'
  AND TABLE_NAME = 'wound_encounters';
```

### Error: "Procedure already exists"
**Causa**: Los procedimientos ya fueron creados anteriormente

**Solución**:
```sql
-- Eliminar y recrear
DROP PROCEDURE IF EXISTS facility.sp_facility_WoundOutcome;
GO
-- Luego ejecutar create-facility-schema-procedures.sql
```

### Resultados vacíos
**Causa**: Posiblemente no hay datos para la facility/fecha especificada

**Solución**:
```sql
-- Verificar datos disponibles
SELECT 
    DISTINCT facility_id,
    MIN(dos) as earliest_date,
    MAX(dos) as latest_date,
    COUNT(*) as total_records
FROM facility.wound_encounters
GROUP BY facility_id
ORDER BY facility_id;
```

---

## 📞 Soporte

Si encuentras problemas:

1. Revisar [FIELD_MAPPING_REFERENCE.md](FIELD_MAPPING_REFERENCE.md)
2. Ejecutar [validate-procedures.sql](validate-procedures.sql)
3. Revisar [UPDATE_SUMMARY.md](UPDATE_SUMMARY.md)
4. Consultar [FACILITY_SCHEMA_PROCEDURES_GUIDE.md](FACILITY_SCHEMA_PROCEDURES_GUIDE.md)

---

## 📅 Timeline Sugerido

- **Hoy**: ✅ Campos mapeados y actualizados
- **Mañana**: Ejecutar paso 1-3 (validar y crear)
- **Siguiente**: Probar procedimientos (paso 4)
- **Integración**: Conectar con React/Node.js

---

**Última actualización:** 20 de enero de 2026  
**Estado:** ✅ 100% Listo para desplegar  
**Siguiente acción:** Ejecutar `node deploy-facility-procedures.js`
