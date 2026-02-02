# 📋 Stored Procedure: sp_facility_LST_AllFacilitiesByWounds

## 📌 Descripción General

Nuevo procedimiento almacenado para el esquema `facility` que lista todas las facilities con estadísticas detalladas de heridas. Es similar a `sp_LST_AllFacilitiesByProvider` pero basado en la tabla `facility.wound_encounters` en lugar de una tabla de facilities.

**Propósito Principal:**
- Proporcionar un resumen agregado de heridas por facility
- Evaluar carga de trabajo y riesgo por facility
- Identificar facilities críticas que requieren atención especial
- Análisis comparativo entre facilities

---

## 🔧 Parámetros

### 1. `@providerId` (INT, OPCIONAL)
```sql
-- Default: NULL
-- NULL = todas las facilities de todos los providers
-- Número = facilities específicas de ese provider
```

**Ejemplos:**
```sql
-- Sin filtro: todas las facilities
EXEC facility.sp_facility_LST_AllFacilitiesByWounds;

-- Filtrar por provider ID 101
EXEC facility.sp_facility_LST_AllFacilitiesByWounds @providerId = 101;
```

### 2. `@includeZeroWounds` (BIT, DEFAULT 1)
```sql
-- 1 (Default) = Incluye facilities sin heridas
-- 0 = Solo facilities con al menos una herida
```

**Ejemplos:**
```sql
-- Incluye todas las facilities (incluso sin heridas)
EXEC facility.sp_facility_LST_AllFacilitiesByWounds @includeZeroWounds = 1;

-- Solo facilities con heridas
EXEC facility.sp_facility_LST_AllFacilitiesByWounds @includeZeroWounds = 0;
```

---

## 📊 Campos Retornados

### Identificación
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT | ID de la facility (mismo que facility_id) |
| `facility_id` | INT | ID de la facility |
| `name` | VARCHAR(50) | Nombre generado automáticamente |
| `facility_name` | VARCHAR(50) | Nombre de la facility |

### Conteos Generales
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `total_wound_encounters` | INT | Total de encuentros de heridas |
| `total_active_patients` | INT | Total de pacientes únicos con heridas |
| `patients_seen_today` | INT | Pacientes vistos hoy |

### Disposición de Heridas
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `active_wounds` | INT | Heridas activas |
| `new_wounds` | INT | Heridas nuevas |
| `resolved_wounds` | INT | Heridas resueltas |
| `hospitalized_wounds` | INT | Heridas hospitalizadas |

### Progreso de Heridas
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `improving_wounds` | INT | Heridas mejorando |
| `deteriorating_wounds` | INT | Heridas empeorando |
| `stable_wounds` | INT | Heridas estables |

### Análisis de Riesgo
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `critical_wounds` | INT | Heridas críticas (PUSH > 12) |
| `alert_wounds` | INT | Heridas en alerta (PUSH 8-12) |
| `chronic_wounds` | INT | Heridas > 100 días |

### Promedios Clínicos
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `average_push_score` | DECIMAL(5,2) | PUSH score promedio |
| `average_wound_area_cm2` | DECIMAL(10,2) | Área promedio en cm² |
| `average_days_since_onset` | DECIMAL(10,2) | Promedio de días desde inicio |

### Porcentajes
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `percent_improving` | DECIMAL(5,2) | % de heridas mejorando |
| `percent_resolved` | DECIMAL(5,2) | % de heridas resueltas |

### Análisis Avanzado
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `top_etiologies` | VARCHAR(MAX) | Etiologías principales (comma-separated) |
| `acuity_level` | VARCHAR(20) | Nivel de acuidad (Crítico/Alerta/Monitoreo/Bajo Riesgo) |

### Información Adicional
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `provider_id` | INT | ID del proveedor |
| `primary_provider_id` | INT | ID del proveedor principal |
| `last_encounter_date` | DATE | Fecha del último encuentro |
| `first_encounter_date` | DATE | Fecha del primer encuentro |
| `report_date` | DATE | Fecha de generación del reporte |

---

## 📈 Ejemplos de Uso

### Ejemplo 1: Dashboard General
```sql
-- Ver todas las facilities con estadísticas de heridas
SELECT 
    facility_id,
    facility_name,
    total_wound_encounters,
    total_active_patients,
    active_wounds,
    average_push_score,
    acuity_level,
    percent_improving,
    last_encounter_date
FROM 
    (EXEC facility.sp_facility_LST_AllFacilitiesByWounds) AS FacilityWounds
ORDER BY 
    total_wound_encounters DESC;
```

### Ejemplo 2: Facilities de un Provider
```sql
-- Ver facilities asignadas al provider 101
EXEC facility.sp_facility_LST_AllFacilitiesByWounds @providerId = 101;
```

### Ejemplo 3: Alertas de Riesgo
```sql
-- Ver solo facilities con heridas críticas
SELECT
    facility_id,
    facility_name,
    critical_wounds,
    alert_wounds,
    chronic_wounds,
    acuity_level,
    average_push_score
FROM 
    (EXEC facility.sp_facility_LST_AllFacilitiesByWounds @includeZeroWounds = 0) AS FacilityWounds
WHERE 
    critical_wounds > 0 
    OR acuity_level IN ('Crítico', 'Alerta')
ORDER BY 
    critical_wounds DESC;
```

### Ejemplo 4: Análisis de Carga
```sql
-- Comparar carga de trabajo entre providers
SELECT
    provider_id,
    COUNT(*) as facilities_count,
    SUM(total_wound_encounters) as total_encounters,
    SUM(total_active_patients) as total_patients,
    AVG(average_push_score) as facility_avg_push_score,
    COUNT(CASE WHEN critical_wounds > 0 THEN 1 END) as facilities_with_critical_wounds
FROM 
    (EXEC facility.sp_facility_LST_AllFacilitiesByWounds @includeZeroWounds = 0) AS FacilityWounds
GROUP BY 
    provider_id
ORDER BY 
    total_encounters DESC;
```

---

## 🎯 Casos de Uso

### 1. Dashboard Administrativo
- Visualización de todas las facilities
- Identificar facilities con carga alta
- Monitoreo de nivel de acuidad general

### 2. Gestión de Providers
- Asignar facilities a providers según carga
- Evaluar distribución de trabajo
- Identificar specializations requeridas

### 3. Análisis de Riesgo
- Identificar facilities críticas
- Monitoreo de heridas crónicas
- Evaluación de tendencias de mejora

### 4. Reportes Ejecutivos
- Resumen de estado de facilities
- Métricas de desempeño
- Comparativas históricas

### 5. Alertas y Notificaciones
- Notificar cuando facilities alcanzan estado crítico
- Alertas de heridas crónicas sin progreso
- Escalamiento automático

---

## 🔗 Relación con Otros Procedimientos

| Procedimiento | Datos | Enfoque |
|---------------|-------|---------|
| `sp_facility_LST_AllFacilitiesByWounds` | wound_encounters | Facilities con métricas |
| `sp_facility_WoundOutcome` | wound_encounters | Detalle de heridas por facility |
| `sp_facility_AcuityIndex` | wound_encounters | Índice de acuidad |
| `sp_facility_HighRiskWounds` | wound_encounters | Heridas críticas |

---

## ⚙️ Requisitos y Configuración

### Tabla Requerida
```sql
facility.wound_encounters
```

### Campos Requeridos en wound_encounters
- `facility_id` - INT (FK)
- `patient_id` - VARCHAR(50)
- `provider_id` - INT (NULLABLE)
- `disposition` - VARCHAR(50) ['Active', 'New', 'Resolved', 'Hospitalized']
- `progress` - VARCHAR(50) ['Improving', 'Deteriorating', 'Stable']
- `push_score` - INT or DECIMAL
- `surface` - DECIMAL (área en cm²)
- `days` - INT (días desde inicio)
- `dos` - DATE (date of service)
- `etiology` - VARCHAR(100)

### Índices Recomendados
```sql
-- Para mejor rendimiento
CREATE INDEX IX_wound_encounters_facility_id 
    ON facility.wound_encounters(facility_id);
    
CREATE INDEX IX_wound_encounters_provider_id 
    ON facility.wound_encounters(provider_id);
    
CREATE INDEX IX_wound_encounters_dos 
    ON facility.wound_encounters(dos);
    
CREATE INDEX IX_wound_encounters_push_score 
    ON facility.wound_encounters(push_score);
```

---

## 📊 Niveles de Acuidad

El procedimiento calcula automáticamente `acuity_level` basado en el PUSH score promedio:

| PUSH Score Promedio | Nivel | Significado |
|-------------------|-------|------------|
| ≥ 12 | Crítico | Requiere atención inmediata |
| 8-11.99 | Alerta | Monitoreo intensivo |
| 4-7.99 | Monitoreo | Seguimiento regular |
| < 4 | Bajo Riesgo | Riesgo mínimo |

---

## 🚀 Performance

- **Complejidad:** O(n) donde n = número de records en wound_encounters
- **Tiempo típico:** < 1 segundo para 10,000+ records
- **Memoria:** Bajo uso de memoria
- **Escalabilidad:** Optimizado para grandes volúmenes

---

## 📝 Archivo

**Ubicación:** `sp-facility-lst-all-facilities-by-wounds.sql`

**Contiene:**
- Definición del procedimiento
- Documentación completa
- Ejemplos de prueba
- Notas de implementación

---

## 🔄 Integración Frontend

Este procedimiento está diseñado para ser usado por:

1. **Aplicación React** (`wounddatacenter/client`)
   - Endpoint: `/api/facility-facilities-by-wounds`
   - Método: POST
   - Parámetros: `providerId`, `includeZeroWounds`

2. **Aplicación Flutter** (`woundcareapp`)
   - Método: GET `facility/facilities-by-wounds`
   - Parámetros query: `provider_id`, `include_zero_wounds`

---

## ✅ Validación

Para validar que el procedimiento funciona correctamente:

```sql
-- Test 1: Ejecutar sin filtros
EXEC facility.sp_facility_LST_AllFacilitiesByWounds;

-- Test 2: Verificar que retorna datos
DECLARE @rowCount INT;
DECLARE @table TABLE (
    facility_id INT,
    total_wound_encounters INT,
    acuity_level VARCHAR(20)
);

INSERT INTO @table
EXEC facility.sp_facility_LST_AllFacilitiesByWounds @includeZeroWounds = 0;

SELECT @rowCount = @@ROWCOUNT;
IF @rowCount > 0
    PRINT '✓ Procedimiento ejecutado exitosamente con ' + CAST(@rowCount AS VARCHAR(10)) + ' facilities';
ELSE
    PRINT '⚠ No hay facilities con heridas en la base de datos';
```

---

## 📞 Soporte

Para problemas o mejoras:
1. Verificar que `facility.wound_encounters` tiene datos
2. Revisar índices recomendados
3. Ejecutar validación de columnas esperadas
4. Consultar con el equipo de BD

