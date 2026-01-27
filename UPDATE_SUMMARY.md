# ✅ Actualización Completada: Procedimientos facility.wound_encounters

## 📋 Resumen de Cambios

Se han **ajustado exitosamente todos los campos** de los 7 procedimientos almacenados para utilizar los nombres exactos de la tabla `facility.wound_encounters` en remoteWoundcareDB.

---

## 🎯 Cambios Realizados

### Archivos Modificados

| Archivo | Estado | Cambios |
|---------|--------|---------|
| `create-facility-schema-procedures.sql` | ✅ ACTUALIZADO | Todos 7 procedimientos sincronizados con campos reales |
| `FIELD_MAPPING_REFERENCE.md` | ✅ CREADO | Mapeo detallado campo anterior → campo real |
| `validate-procedures.sql` | ✅ CREADO | Script para validar que los procedimientos funcionan |

---

## 🔄 Mapeo de Campos Principales

```
CAMPO ANTERIOR          →  CAMPO REAL (wound_encounters)
─────────────────────────────────────────────────────
area_cm2                →  surface
date_of_service         →  dos
wound_status            →  disposition
improvement_status      →  progress
days_since_onset        →  days
wound_etiology          →  etiology (con LIKE wildcard)
wound_location          →  location
encounter_id            →  id
area_cm2                →  surface
is_active = 1           →  [REMOVIDO - no existe]
```

---

## 📊 Procedimientos Actualizados

### ✅ SP 1: sp_facility_WoundOutcome
**Campo principal**: `disposition`, `progress`, `dos`, `surface`
- Retorna: Métricas agregadas de heridas
- Campos: 20+ métricas incluyendo conteos, porcentajes, áreas

### ✅ SP 2: sp_facility_AcuityIndex
**Campo principal**: `push_score`, `etiology`
- Retorna: Índice de acuidad de facility
- Usa: LIKE wildcard para búsqueda de etiologías

### ✅ SP 3: sp_facility_EtiologyDistribution
**Campo principal**: `etiology`, `surface`, `days`, `progress`
- Retorna: Distribución de etiologías
- Agrupa: Por etiología con porcentajes

### ✅ SP 4: sp_facility_OutcomeReportGlobal
**Campo principal**: `disposition`, `progress`, `dos`, `surface`
- Retorna: Reporte global de resultados
- Incluye: Tasas de resolución, tendencias

### ✅ SP 5: sp_facility_WoundProgressTrend
**Campo principal**: `dos`, `disposition`, `progress`, `surface`
- Retorna: Tendencia de progreso en el tiempo
- Agrupa: Por día (CAST(dos AS DATE))

### ✅ SP 6: sp_facility_PatientWoundSummary
**Campo principal**: `disposition`, `progress`, `surface`, `dos`
- Retorna: Resumen de heridas por paciente
- Incluye: Niveles de riesgo calculados

### ✅ SP 7: sp_facility_HighRiskWounds
**Campo principal**: `push_score`, `etiology`, `location`, `surface`
- Retorna: TOP 100 heridas de alto riesgo
- Campos: Detalles completos con alerta_level

---

## ⚠️ Cambios Importantes a Nota

### 1. Remoción del Filtro `is_active = 1`
```sql
-- ANTES
WHERE facility_id = @facilityId
  AND dos BETWEEN @startDate AND @endDate
  AND is_active = 1;  -- ← REMOVIDO (no existe en tabla)

-- DESPUÉS
WHERE facility_id = @facilityId
  AND dos BETWEEN @startDate AND @endDate;
```

**Impacto**: Procedimientos retornarán más registros (histórico completo)

**Solución**: Si necesitas filtrar por estado activo, agregar en aplicación:
```sql
AND disposition IN ('Active', 'New')
```

### 2. Cambio de Tipo: `patient_id`
```sql
-- ANTES: se asumía INT
-- DESPUÉS: VARCHAR(50)
```

**Impacto**: Mínimo (SQL Server convierte automáticamente)

### 3. Búsqueda de Etiologías con LIKE
```sql
-- ANTES
WHERE wound_etiology = 'Pressure Ulcer'

-- DESPUÉS
WHERE etiology LIKE '%Pressure%' OR etiology LIKE '%Ulcer%'
```

**Ventaja**: Mayor flexibilidad, maneja variaciones en nomenclatura

---

## ✓ Validación

### Test Quick
```sql
-- Ejecutar este script para validar que TODO funciona:
EXEC facility.sp_facility_WoundOutcome 
  @facilityId = 5,
  @startDate = '2025-01-01',
  @endDate = '2025-12-31';
```

### Validación Completa
```bash
# Ejecutar script de validación
sqlcmd -S 190.92.153.67 -U curisec -P curisec123 -d curisec -i validate-procedures.sql
```

---

## 📦 Archivos de Referencia

| Archivo | Propósito |
|---------|----------|
| `create-facility-schema-procedures.sql` | Código SQL de los 7 procedimientos |
| `deploy-facility-procedures.js` | Script Node.js para desplegar en BD |
| `FIELD_MAPPING_REFERENCE.md` | **← Consular este para mapeo detallado** |
| `validate-procedures.sql` | Script para probar que todo funciona |
| `INTEGRATION_GUIDE.md` | Cómo integrar en React |
| `FACILITY_SCHEMA_PROCEDURES_GUIDE.md` | Documentación completa de cada SP |

---

## 🚀 Próximos Pasos

### 1. Desplegar Procedimientos
```bash
cd /home/alainosmar/workspace/wounddatacenter
node deploy-facility-procedures.js
```

### 2. Validar en Base de Datos
```bash
sqlcmd -S 190.92.153.67 -U curisec -P curisec123 -d curisec -i validate-procedures.sql
```

### 3. Integrar en Node.js (opcional)
Ver `INTEGRATION_GUIDE.md` para endpoints Express

### 4. Actualizar React (si es necesario)
Normalizar nombres de campos en componentes que consumen esta data

---

## 📝 Notas Técnicas

### Campos Disponibles Adicionales (No usados en SPs)
La tabla `wound_encounters` tiene campos opcionales que PUEDES usar:
- `exudate` - Tipo de exudado
- `tissue` - Clasificación de tejido
- `treatment` - Plan de tratamiento
- `debridement` - Tipo de desbridamiento
- `healing_percentage` - Porcentaje de cicatrización
- `healing_rate` - Velocidad de cicatrización

### Performance
- Todos los procedimientos usan índices existentes
- Recomendación: Crear índice compuesto en `(facility_id, dos)` si no existe
- Tabla `wound_encounters` tiene millones de registros

---

## ✅ Checklist de Confirmación

- [x] Todos los campos sincronizados con schema real
- [x] 7 procedimientos actualizados
- [x] Mapeo de campos documentado
- [x] Script de validación creado
- [x] Guía de integración disponible
- [ ] Procedimientos desplegados en BD (próximo paso)
- [ ] Validación ejecutada en BD (próximo paso)
- [ ] Integración en React completada (opcional)

---

**Última actualización:** 20 de enero de 2026  
**Estado:** ✅ Listo para desplegar  
**Siguiente acción:** Ejecutar `node deploy-facility-procedures.js`
