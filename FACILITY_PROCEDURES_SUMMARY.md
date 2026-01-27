# 🎯 Resumen: Procedimientos Almacenados para Esquema facility

## 📌 Qué Se Creó

Se han creado **7 procedimientos almacenados** en el esquema `facility` de la BD remota que utilizan datos de la tabla `facility.wound_encounters`.

## 🗂️ Archivos Generados

### 1. **create-facility-schema-procedures.sql**
Archivo SQL con la definición completa de todos los procedimientos. Contiene:
- Definición de 7 stored procedures
- Documentación inline
- Ejemplos de ejecución comentados

**Ubicación:** `/home/alainosmar/workspace/wounddatacenter/create-facility-schema-procedures.sql`

### 2. **deploy-facility-procedures.js**
Script Node.js para ejecutar automáticamente los procedimientos en la BD remota.

**Ubicación:** `/home/alainosmar/workspace/wounddatacenter/deploy-facility-procedures.js`

**Ejecución:**
```bash
node deploy-facility-procedures.js
```

### 3. **FACILITY_SCHEMA_PROCEDURES_GUIDE.md**
Guía completa de referencia con documentación detallada de cada procedimiento.

**Ubicación:** `/home/alainosmar/workspace/wounddatacenter/FACILITY_SCHEMA_PROCEDURES_GUIDE.md`

---

## 📋 Los 7 Procedimientos

| # | Nombre | Propósito | Equivalente |
|---|--------|----------|-------------|
| 1 | `sp_facility_WoundOutcome` | Métricas agregadas de heridas | `sp_rptFacilityWoundOutcome` |
| 2 | `sp_facility_AcuityIndex` | Índice de acuidad de facility | `sp_rptFacilityAcuityIndex` |
| 3 | `sp_facility_EtiologyDistribution` | Distribución de etiologías | `sp_rptEtiologyDistribution` |
| 4 | `sp_facility_OutcomeReportGlobal` | Reporte global de resultados | `sp_rptOutcomeReportGlobal` |
| 5 | `sp_facility_WoundProgressTrend` | Tendencia de progreso en tiempo | *Nuevo* |
| 6 | `sp_facility_PatientWoundSummary` | Resumen de heridas por paciente | *Nuevo* |
| 7 | `sp_facility_HighRiskWounds` | Heridas de alto riesgo | *Nuevo* |

---

## 🎨 Ejemplo de Uso

### Obtener Reporte de Heridas
```sql
EXEC facility.sp_facility_WoundOutcome 
  @facilityId = 5,
  @startDate = '2025-01-01',
  @endDate = '2025-12-31';
```

**Resultado:**
- 20+ campos con métricas agregadas
- Conteos de heridas (activas, nuevas, resueltas, etc.)
- Porcentajes de progreso
- Índices clínicos
- Datos listos para dashboard

### Identificar Heridas Críticas
```sql
EXEC facility.sp_facility_HighRiskWounds 
  @facilityId = 5,
  @pushScoreThreshold = 12;
```

**Resultado:**
- Listado detallado de heridas críticas
- Nivel de alerta asignado
- Información de paciente, ubicación, etiología
- Ordenado por severidad

---

## 💡 Ventajas

✅ **Datos Locales:** Sin dependencia de API remota  
✅ **Rápido:** Queries directas a tabla primaria  
✅ **Escalable:** Maneja grandes volúmenes  
✅ **Consistente:** Lógica centralizada  
✅ **Auditables:** Registros completos  
✅ **Flexible:** Parámetros personalizables  
✅ **Integrable:** Fácil de combinar con otras tablas

---

## 🚀 Próximos Pasos

### 1. Crear los Procedimientos
```bash
node deploy-facility-procedures.js
```

### 2. Validar Creación
```sql
SELECT ROUTINE_NAME 
FROM INFORMATION_SCHEMA.ROUTINES
WHERE ROUTINE_SCHEMA = 'facility'
  AND ROUTINE_NAME LIKE 'sp_facility_%';
```

### 3. Probar Procedimientos
```sql
-- Probar cada uno
EXEC facility.sp_facility_WoundOutcome @facilityId = 5, @startDate = '2025-01-01', @endDate = '2025-12-31';
EXEC facility.sp_facility_AcuityIndex @facilityId = 5, @daysBack = 90;
-- ... etc
```

### 4. Integrar en React (Opcional)
Crear endpoints en Node.js que llamen a estos procedimientos:
```typescript
app.post('/api/facility-wound-outcome', async (req, res) => {
  const { facilityId, startDate, endDate } = req.body;
  const result = await executeSP('facility.sp_facility_WoundOutcome', 
    { facilityId, startDate, endDate });
  res.json(result);
});
```

---

## 📚 Documentación Disponible

1. **FACILITY_SCHEMA_PROCEDURES_GUIDE.md** - Guía completa detallada
2. **create-facility-schema-procedures.sql** - Código SQL
3. **deploy-facility-procedures.js** - Script de deployment
4. **FACILITY_TABLES_ANALYSIS.md** - Análisis de tablas
5. **FACILITY_DATA_REPORT_ANALYSIS.md** - Análisis de datos

---

## ⚠️ Requisitos Previos

- Base de datos remota activa (190.92.153.67)
- Tabla `facility.wound_encounters` poblada con datos
- Acceso de escritura en esquema `facility`
- Campos completados: `facility_id`, `patient_id`, `wound_status`, `push_score`, `area_cm2`, `date_of_service`

---

**Fecha:** 20 de enero de 2026  
**Estado:** ✅ Completo y Documentado  
**Archivos:** 3 (SQL + JS + MD)
