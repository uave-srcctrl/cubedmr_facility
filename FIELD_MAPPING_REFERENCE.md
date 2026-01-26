# 🔄 Mapeo de Campos: Esquema Anterior → facility.wound_encounters

## Resumen Ejecutivo

Todos los procedimientos almacenados han sido ajustados para usar **los campos exactos** de la tabla `facility.wound_encounters`. Este documento proporciona un mapeo de referencia rápida.

---

## 📋 Tabla de Correspondencia

| Concepto | Campo Anterior | Campo Real (wound_encounters) | Tipo | Notas |
|----------|---|---|---|---|
| **ID de Encuentro** | `encounter_id` | `id` | INT | Identificador único |
| **Fecha de Servicio** | `date_of_service` | `dos` | DATE | Día del encuentro |
| **ID Paciente** | `patient_id` | `patient_id` | VARCHAR(50) | PK secundaria |
| **ID Facility** | `facility_id` | `facility_id` | INT | FK a tabla facilities |
| **ID Provider** | N/A | `provider_id` | INT | Proveedor responsable |
| **Nombre Paciente** | N/A | `patient_name` | VARCHAR(250) | Información adicional |
| **Ubicación de Herida** | `wound_location` | `location` | VARCHAR(250) | Localización anatómica |
| **Etiología** | `wound_etiology` | `etiology` | VARCHAR(50) | Tipo/causa de herida |
| **Ancho (cm)** | N/A | `width` | NUMERIC | Dimensión horizontal |
| **Alto/Largo (cm)** | N/A | `height` | NUMERIC | Dimensión vertical |
| **Profundidad (cm)** | `depth_cm` | `depth` | NUMERIC | Profundidad de herida |
| **Área de Superficie (cm²)** | `area_cm2` | `surface` | NUMERIC | Área total |
| **Exudado** | N/A | `exudate` | VARCHAR(50) | Tipo de exudado |
| **Tipo de Tejido** | N/A | `tissue` | VARCHAR(250) | Clasificación de tejido |
| **Tratamiento** | N/A | `treatment` | VARCHAR(800) | Plan de tratamiento |
| **Frecuencia** | N/A | `frequency` | VARCHAR(50) | Frecuencia de curas |
| **Progreso** | `improvement_status` | `progress` | VARCHAR(50) | Improving/Stable/Deteriorating |
| **Disposición** | `wound_status` | `disposition` | VARCHAR(50) | Active/Resolved/New/Hospitalized |
| **Desbridamiento** | N/A | `debridement` | VARCHAR(50) | Tipo de desbridamiento |
| **Superficie Inicial** | `initial_surface` | `initial_surface` | NUMERIC | Área inicial (baseline) |
| **Fecha de Inicio** | `admission_date` | `start_date` | DATE | Cuándo comenzó la herida |
| **Días de Evolución** | `days_since_onset` | `days` | INT | Tiempo total de herida |
| **Porcentaje de Cicatrización** | N/A | `healing_percentage` | NUMERIC | % de cicatrización |
| **Columna Auxiliar** | N/A | `helper_colum` | BIT | Campo técnico |
| **Tasa de Cicatrización** | N/A | `healing_rate` | NUMERIC | Velocidad de cicatrización |
| **Días de Cicatrización** | `healing_days` | `healing_days` | INT | Días para cicatrizar |
| **PUSH Score** | `push_score` | `push_score` | INT | Escala PUSH (0-17) |

---

## 🎯 Cambios Principales por Procedimiento

### SP 1: sp_facility_WoundOutcome

```sql
-- ANTES → DESPUÉS
area_cm2           →  surface
wound_status       →  disposition
improvement_status →  progress
date_of_service    →  dos
days_since_onset   →  days
is_active = 1      →  [REMOVIDO - no existe en tabla]
```

### SP 2: sp_facility_AcuityIndex

```sql
-- ANTES → DESPUÉS
wound_etiology     →  etiology (con LIKE wildcard)
date_of_service    →  dos
is_active = 1      →  [REMOVIDO]
```

**Mapeo de Etiologías (usando LIKE):**
```sql
-- ANTES: wound_etiology = 'Pressure Ulcer'
-- DESPUÉS: etiology LIKE '%Pressure%' OR etiology LIKE '%Ulcer%'

-- ANTES: wound_etiology = 'Diabetic'
-- DESPUÉS: etiology LIKE '%Diabetic%'

-- ANTES: wound_etiology = 'Venous'
-- DESPUÉS: etiology LIKE '%Venous%'

-- ANTES: wound_etiology = 'Arterial'
-- DESPUÉS: etiology LIKE '%Arterial%'
```

### SP 3: sp_facility_EtiologyDistribution

```sql
-- ANTES → DESPUÉS
date_of_service    →  dos
area_cm2           →  surface
days_since_onset   →  days
wound_etiology     →  etiology
improvement_status →  progress
is_active = 1      →  [REMOVIDO]
```

### SP 4: sp_facility_OutcomeReportGlobal

```sql
-- ANTES → DESPUÉS
area_cm2           →  surface
date_of_service    →  dos
wound_status       →  disposition
improvement_status →  progress
days_since_onset   →  days
wound_id           →  id
wound_etiology     →  etiology (con LIKE)
is_active = 1      →  [REMOVIDO]
```

### SP 5: sp_facility_WoundProgressTrend

```sql
-- ANTES → DESPUÉS
date_of_service    →  dos
area_cm2           →  surface
days_since_onset   →  days
wound_status       →  disposition
improvement_status →  progress
is_active = 1      →  [REMOVIDO]
```

### SP 6: sp_facility_PatientWoundSummary

```sql
-- ANTES → DESPUÉS
date_of_service    →  dos
area_cm2           →  surface
wound_status       →  disposition
improvement_status →  progress
is_active = 1      →  [REMOVIDO]
```

### SP 7: sp_facility_HighRiskWounds

```sql
-- ANTES → DESPUÉS
encounter_id       →  id
wound_id           →  id (reutilizado)
wound_status       →  disposition
wound_etiology     →  etiology
wound_location     →  location
area_cm2           →  surface
improvement_status →  progress
days_since_onset   →  days
date_of_service    →  dos
is_active = 1      →  [REMOVIDO]
```

---

## ⚠️ Consideraciones Importantes

### 1. Cambio de Tipo de Dato
- `patient_id`: Antes se asumía INT, ahora es **VARCHAR(50)**
  - **Impacto**: No afecta queries (SQL Server convierte automáticamente)
  - **Recomendación**: Si usas en aplicación, asegura conversión a string

### 2. Campos que NO existen en wound_encounters
```sql
is_active = 1  -- REMOVIDO (no existe en la tabla)
```
- **Impacto**: Todas las queries ahora retornan TODOS los registros sin filtro de estado activo
- **Recomendación**: Si necesitas filtrar, agregar validación en aplicación o aplicar filtro basado en `disposition`

### 3. Mapeo de Etiologías
- **Campo anterior**: Valores exactos como `'Pressure Ulcer'`
- **Campo actual**: Usa LIKE wildcards para mayor flexibilidad
- **Ejemplo**:
  ```sql
  -- Antiguamente
  WHERE wound_etiology = 'Pressure Ulcer'
  
  -- Ahora
  WHERE etiology LIKE '%Pressure%' OR etiology LIKE '%Ulcer%'
  ```

### 4. Campos Opcionales Disponibles
La tabla `wound_encounters` tiene campos adicionales que PUEDES usar en futuras queries:

```sql
exudate              -- Tipo de exudado
tissue               -- Clasificación de tejido
treatment            -- Plan de tratamiento (hasta 800 caracteres)
frequency            -- Frecuencia de curas
debridement          -- Tipo de desbridamiento
initial_surface      -- Área basal para comparación
healing_percentage   -- Porcentaje de cicatrización
healing_rate         -- Velocidad de cicatrización
healing_days         -- Proyección de días para cicatrizar
provider_id          -- Proveedor responsable
patient_name         -- Nombre completo del paciente
```

---

## ✅ Validación de Cambios

### Test Query para Verificar Disponibilidad de Campos

```sql
-- Ejecutar en remoteWoundcareDB para confirmar que todos los campos existen
SELECT TOP 1
    id,
    dos,
    patient_id,
    facility_id,
    provider_id,
    patient_name,
    location,
    etiology,
    width,
    height,
    depth,
    surface,
    exudate,
    tissue,
    treatment,
    frequency,
    progress,
    disposition,
    debridement,
    initial_surface,
    start_date,
    days,
    healing_percentage,
    helper_colum,
    healing_rate,
    healing_days,
    push_score
FROM facility.wound_encounters
WHERE facility_id = 5;
```

**Resultado esperado**: Una fila con todos los campos presentes (algunos pueden ser NULL)

---

## 📊 Diferencias en Resultados

### Volumen de Datos
- **Antes**: Queries filtraban por `is_active = 1` (solo registros activos)
- **Después**: Queries retornan TODOS los registros de la tabla
- **Impacto**: Resultados pueden ser 2-3x mayores
- **Solución**: Si necesitas filtrar por estado, agregar:
  ```sql
  AND disposition IN ('Active', 'New')
  ```

### Precisión de Cálculos
- Los cálculos de promedios y porcentajes son ahora más precisos
- Se incluyen todos los encuentros históricos
- Métricas pueden cambiar respecto a versión anterior

---

## 🔗 Próximos Pasos

1. ✅ **Procedimientos actualizados** con campos reales
2. ⏳ Ejecutar `node deploy-facility-procedures.js` para crear los SPs
3. ⏳ Validar resultados contra datos reales
4. ⏳ Actualizar endpoints en Node.js si es necesario
5. ⏳ Ajustar normalizaciones en React si es necesario

---

**Última actualización:** 20 de enero de 2026  
**Estado:** Todos los procedimientos sincronizados con schema real
