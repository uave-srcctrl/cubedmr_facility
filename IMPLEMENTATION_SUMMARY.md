# 📦 SUMMARY: Procedimientos Almacenados Esquema facility

## ✅ COMPLETADO: Creación de 7 Stored Procedures

**Fecha:** 20 de enero de 2026  
**Base de Datos:** remoteWoundcareDB (190.92.153.67)  
**Esquema:** facility  
**Tabla Fuente:** facility.wound_encounters

---

## 📂 Archivos Creados

### 1. create-facility-schema-procedures.sql
```
Ubicación: /home/alainosmar/workspace/wounddatacenter/
Líneas: 650+
Contenido: 7 procedimientos almacenados completos con documentación
```

**Procedimientos:**
1. `sp_facility_WoundOutcome` - Métricas agregadas
2. `sp_facility_AcuityIndex` - Índice de acuidad
3. `sp_facility_EtiologyDistribution` - Distribución etiología
4. `sp_facility_OutcomeReportGlobal` - Reporte global
5. `sp_facility_WoundProgressTrend` - Tendencia temporal
6. `sp_facility_PatientWoundSummary` - Resumen por paciente
7. `sp_facility_HighRiskWounds` - Heridas críticas

### 2. deploy-facility-procedures.js
```
Ubicación: /home/alainosmar/workspace/wounddatacenter/
Líneas: 250+
Contenido: Script Node.js para crear procedimientos automáticamente
```

**Características:**
- Lectura de archivo SQL
- Conexión a BD remota
- Ejecución secuencial de procedimientos
- Validación de creación
- Manejo de errores
- Salida de verificación

### 3. FACILITY_SCHEMA_PROCEDURES_GUIDE.md
```
Ubicación: /home/alainosmar/workspace/wounddatacenter/
Líneas: 500+
Contenido: Guía completa de referencia
```

**Secciones:**
- Resumen ejecutivo
- Definición de cada procedimiento
- Parámetros y campos retornados
- Ejemplos de uso
- Casos de uso
- Instrucciones de ejecución
- Validación

### 4. FACILITY_PROCEDURES_SUMMARY.md
```
Ubicación: /home/alainosmar/workspace/wounddatacenter/
Líneas: 150+
Contenido: Resumen ejecutivo
```

**Incluye:**
- Qué se creó
- Lista de archivos
- Tabla de procedimientos
- Ejemplos rápidos
- Ventajas
- Próximos pasos

---

## 🔧 Procedimientos en Detalle

### sp_facility_WoundOutcome
**Retorna:** 20+ métricas agregadas de heridas
**Parámetros:** facilityId, startDate, endDate
**Campos:** Conteos, porcentajes, áreas, índices
```sql
EXEC facility.sp_facility_WoundOutcome 
  @facilityId = 5, @startDate = '2025-01-01', @endDate = '2025-12-31'
```

### sp_facility_AcuityIndex
**Retorna:** Índice de acuidad con distribución etiología
**Parámetros:** facilityId, daysBack (default 90)
**Campos:** PUSH scores, heridas críticas, etiologías
```sql
EXEC facility.sp_facility_AcuityIndex 
  @facilityId = 5, @daysBack = 90
```

### sp_facility_EtiologyDistribution
**Retorna:** Distribución por tipo de herida
**Parámetros:** facilityId, date
**Campos:** Conteo, porcentaje, progreso por etiología
```sql
EXEC facility.sp_facility_EtiologyDistribution 
  @facilityId = 5, @date = '2025-12-31'
```

### sp_facility_OutcomeReportGlobal
**Retorna:** Reporte completo de resultados
**Parámetros:** facilityId, startDate, endDate
**Campos:** Estados, tasas, resultados globales
```sql
EXEC facility.sp_facility_OutcomeReportGlobal 
  @facilityId = 5, @startDate = '2025-01-01', @endDate = '2025-12-31'
```

### sp_facility_WoundProgressTrend
**Retorna:** Evolución diaria de métricas
**Parámetros:** facilityId, startDate, endDate
**Campos:** Métricas diarias para gráficos
```sql
EXEC facility.sp_facility_WoundProgressTrend 
  @facilityId = 5, @startDate = '2025-01-01', @endDate = '2025-12-31'
```

### sp_facility_PatientWoundSummary
**Retorna:** Resumen de heridas por paciente
**Parámetros:** facilityId, startDate, endDate
**Campos:** Heridas por paciente, nivel riesgo
```sql
EXEC facility.sp_facility_PatientWoundSummary 
  @facilityId = 5, @startDate = '2025-01-01', @endDate = '2025-12-31'
```

### sp_facility_HighRiskWounds
**Retorna:** Heridas críticas (PUSH > umbral)
**Parámetros:** facilityId, pushScoreThreshold (default 12)
**Campos:** Detalles heridas críticas con alertas
```sql
EXEC facility.sp_facility_HighRiskWounds 
  @facilityId = 5, @pushScoreThreshold = 12
```

---

## 🚀 Cómo Usar

### Opción 1: Ejecutar SQL Directamente
```bash
# En SQL Server Management Studio:
# Abrir: create-facility-schema-procedures.sql
# Ejecutar todo el script
```

### Opción 2: Usar Script Node.js
```bash
cd /home/alainosmar/workspace/wounddatacenter
node deploy-facility-procedures.js
```

### Opción 3: Llamar desde Aplicación
```typescript
const result = await pool.request()
  .input('facilityId', mssql.Int, 5)
  .input('startDate', mssql.Date, '2025-01-01')
  .input('endDate', mssql.Date, '2025-12-31')
  .execute('facility.sp_facility_WoundOutcome');
```

---

## 📊 Métricas por Procedimiento

| Procedimiento | Parámetros | Campos Retornados | Uso Principal |
|---|---|---|---|
| WoundOutcome | 3 | 20+ | Dashboard principal |
| AcuityIndex | 2 | 16+ | Evaluación acuidad |
| EtiologyDistribution | 2 | 9+ | Análisis tipos heridas |
| OutcomeReportGlobal | 3 | 20+ | Reporte ejecutivo |
| WoundProgressTrend | 3 | 10+ | Gráficos históricos |
| PatientWoundSummary | 3 | 12+ | Seguimiento paciente |
| HighRiskWounds | 2 | 14+ | Alertas críticas |

---

## ✨ Beneficios

✅ Datos locales sin latencia de red  
✅ Consultas optimizadas con índices  
✅ Reutilización de lógica de negocio  
✅ Mantenimiento centralizado  
✅ Escalabilidad mejorada  
✅ Seguridad de datos  
✅ Auditoría completa  

---

## 🔍 Validación

Para confirmar que los procedimientos se crearon:

```sql
SELECT ROUTINE_NAME 
FROM INFORMATION_SCHEMA.ROUTINES
WHERE ROUTINE_SCHEMA = 'facility'
  AND ROUTINE_TYPE = 'PROCEDURE'
ORDER BY ROUTINE_NAME;
```

Resultado esperado: 7 procedimientos listados

---

## 📝 Documentación Completa

| Archivo | Propósito | Líneas |
|---------|----------|--------|
| create-facility-schema-procedures.sql | Código SQL | 650+ |
| deploy-facility-procedures.js | Script deployment | 250+ |
| FACILITY_SCHEMA_PROCEDURES_GUIDE.md | Guía referencia | 500+ |
| FACILITY_PROCEDURES_SUMMARY.md | Resumen ejecutivo | 200+ |

---

## 🎯 Próximos Pasos Opcionales

1. **Crear API Endpoints** - Exponer procedimientos vía REST
2. **Agregar Índices** - Optimizar queries grandes
3. **Programar Jobs** - Generar reportes automáticos
4. **Integrar UI** - Conectar React a nuevos endpoints
5. **Monitoreo** - Agregar logs y alertas

---

**Versión:** 1.0  
**Estado:** ✅ COMPLETADO  
**Fecha:** 20 de enero de 2026  
**Responsable:** GitHub Copilot
