# 📊 Mapeo de Campos: Excel → facility.wound_encounters

## 📋 Listado Completo de Campos Excel → BD

| # | Campo Excel | Mapeo a BD | Tipo BD | Requerido | Validación | Notas |
|---|-------------|-----------|--------|-----------|-----------|-------|
| 1 | **Pt Name** | `patient_id` | VARCHAR(50) | ✅ SÍ | String, no vacío | ID único del paciente |
| 2 | **Wound Loc** | `location` | VARCHAR(100) | ✅ SÍ | String, no vacío | Ubicación de la herida |
| 3 | **Etiology** | `etiology` | VARCHAR(100) | ✅ SÍ | String, no vacío | Causa/origen de la herida |
| 4 | **Size (Cm)** | `width`, `height`, `depth` | DECIMAL(10,2) | ⚠️ OPCIONAL | Número ≥ 0 | Dimensiones en cm (ancho, alto, profundidad) |
| 5 | **SA (cm²)** | `surface` | DECIMAL(10,2) | ✅ SÍ | Número > 0 | Área de superficie en cm² |
| 6 | **Exudate** | `exudate` | VARCHAR(50) | ⚠️ OPCIONAL | Enum: None, Minimal, Moderate, Heavy, Copious | Tipo de exudado |
| 7 | **Tissue** | `tissue` | VARCHAR(100) | ⚠️ OPCIONAL | String | Tipo de tejido |
| 8 | **Tx Plan** | `treatment` | VARCHAR(MAX) | ⚠️ OPCIONAL | String | Plan de tratamiento |
| 9 | **Frequency** | `frequency` | VARCHAR(50) | ⚠️ OPCIONAL | String | Frecuencia de tratamiento |
| 10 | **Progress** | `progress` | VARCHAR(50) | ✅ SÍ | Enum: Improving, Deteriorating, Stable | Progreso de la herida |
| 11 | **Disposition** | `disposition` | VARCHAR(50) | ✅ SÍ | Enum: Active, Resolved, New, Hospitalized | Estado/disposición |
| 12 | **DOS** | `dos` | DATE | ✅ SÍ | Fecha válida (YYYY-MM-DD) | Date of Service / Fecha de servicio |
| 13 | **Facility** | `facility_id` | INT | ✅ SÍ | Número entero | ID de la facility |
| 14 | **Provider** | `provider_id` | INT | ⚠️ OPCIONAL | Número entero | ID del proveedor |
| 15 | **Appropriate debridement** | `debridement` | VARCHAR(50) | ⚠️ OPCIONAL | Enum: None, Autolytic, Enzymatic, Mechanical, Surgical | Tipo de desbridamiento |
| 16 | **Initial SA** | `initial_surface` | DECIMAL(10,2) | ⚠️ OPCIONAL | Número ≥ 0 | Área de superficie inicial |
| 17 | **Wound start date** | `start_date` | DATE | ⚠️ OPCIONAL | Fecha válida (YYYY-MM-DD) | Fecha de inicio de la herida |
| 18 | **Duration (days)** | `days` | INT | ⚠️ OPCIONAL | Número entero ≥ 0 | Duración en días |
| 19 | **% Healing2** | `healing_percentage` | DECIMAL(5,2) | ⚠️ OPCIONAL | Número 0-100 | Porcentaje de cicatrización |
| 20 | **Helper Colum** | **NO MAPEAR** | - | ❌ IGNORAR | - | Columna auxiliar de Excel, no se mapea |
| 21 | **Healing Velocity (cm²/Week)** | `healing_rate` | DECIMAL(10,2) | ⚠️ OPCIONAL | Número ≥ 0 | Velocidad de cicatrización por semana |
| 22 | **Healing Time Days** | `healing_days` | INT | ⚠️ OPCIONAL | Número entero ≥ 0 | Estimado de días para cicatrizar |
| 23 | **PUSH SCORE** | `push_score` | INT | ✅ SÍ | Número 0-17 | PUSH score (0-17) |

---

## 🔴 9 CAMPOS REQUERIDOS (Obligatorios)

```
1. patient_id    ← Pt Name
2. location      ← Wound Loc
3. etiology      ← Etiology
4. surface       ← SA (cm²)
5. progress      ← Progress
6. disposition   ← Disposition
7. dos           ← DOS
8. facility_id   ← Facility
9. push_score    ← PUSH SCORE
```

---

## 🟡 CAMPOS OPCIONALES (14 campos)

```
provider_id           ← Provider
width                 ← Size (Cm) - Ancho
height                ← Size (Cm) - Alto
depth                 ← Size (Cm) - Profundidad
exudate               ← Exudate
tissue                ← Tissue
treatment             ← Tx Plan
frequency             ← Frequency
debridement           ← Appropriate debridement
initial_surface       ← Initial SA
start_date            ← Wound start date
days                  ← Duration (days)
healing_percentage    ← % Healing2
healing_rate          ← Healing Velocity (cm²/Week)
healing_days          ← Healing Time Days
```

---

## ⚫ CAMPOS IGNORADOS

```
Helper Colum  → NO MAPEAR (columna auxiliar de Excel)
```

---

## 📝 CAMPOS AUTOGENERADOS (No vienen del Excel)

| Campo BD | Valor | Descripción |
|----------|-------|-------------|
| `patient_name` | Null | Se puede extraer del patient_id si es necesario |
| `created_date` | GETDATE() | Fecha actual de creación |
| `import_source` | JWT token | Usuario que realizó la importación |

---

## 🎯 ACTUALIZACIÓN DEL COLUMN_MAPPING

**Archivo:** `client/src/lib/excel-utils.ts`

```typescript
const COLUMN_MAPPING: Record<string, string> = {
  'Pt Name': 'patient_id',
  'Wound Loc': 'location',
  'Etiology': 'etiology',
  'Size (Cm)': 'size',  // Nota: requiere parseo a width/height/depth
  'SA (cm²)': 'surface',
  'Exudate': 'exudate',
  'Tissue': 'tissue',
  'Tx Plan': 'treatment',
  'Frequency': 'frequency',
  'Progress': 'progress',
  'Disposition': 'disposition',
  'DOS': 'dos',
  'Facility': 'facility_id',
  'Provider': 'provider_id',
  'Appropriate debridement': 'debridement',
  'Initial SA': 'initial_surface',
  'Wound start date': 'start_date',
  'Duration (days)': 'days',
  '% Healing2': 'healing_percentage',
  'Helper Colum': null,  // IGNORAR
  'Healing Velocity (cm²/Week)': 'healing_rate',
  'Healing Time Days': 'healing_days',
  'PUSH SCORE': 'push_score'
};
```

---

## 🔄 TRANSFORMACIONES ESPECIALES

### 1. Size (Cm) → width, height, depth
Si el Excel contiene "Size (Cm)", puede ser:
- **Opción A**: Una columna con formato "5x4x2" (ancho x alto x profundidad)
- **Opción B**: Tres columnas separadas (Size Width, Size Height, Size Depth)
- **Opción C**: IGNORAR y usar solo surface area

**Recomendación:** Procesar como NULL si no está claro el formato

### 2. Size (Cm) → Se divide en 3 campos
```typescript
function parseSize(sizeStr: string): { width: number, height: number, depth: number } | null {
  if (!sizeStr) return null;
  
  // Intenta parsear formato: "5x4x2"
  const match = sizeStr.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
  if (match) {
    return {
      width: parseFloat(match[1]),
      height: parseFloat(match[2]),
      depth: parseFloat(match[3])
    };
  }
  
  return null;
}
```

### 3. Helper Colum → IGNORAR
- No mapear a ningún campo
- Usar solo para referencia del usuario

---

## ✅ VALIDACIONES POR CAMPO

### Campos Requeridos - Validación Estricta

| Campo | Validación | Error si |
|-------|-----------|----------|
| `patient_id` | No vacío, string | Vacío o null |
| `location` | No vacío, string | Vacío o null |
| `etiology` | No vacío, string | Vacío o null |
| `surface` | Número > 0 | NaN, ≤ 0, o null |
| `progress` | Enum: Improving, Deteriorating, Stable | Valor diferente |
| `disposition` | Enum: Active, Resolved, New, Hospitalized | Valor diferente |
| `dos` | Fecha válida YYYY-MM-DD | Formato incorrecto, null |
| `facility_id` | Número entero | NaN, null, negativo |
| `push_score` | Número 0-17 | Fuera de rango, NaN, null |

### Campos Opcionales - Validación Flexible

| Campo | Validación | Si Vacío |
|-------|-----------|---------|
| `provider_id` | Número entero (si existe) | NULL en BD |
| `width`, `height`, `depth` | Número ≥ 0 | NULL en BD |
| `exudate` | Enum o string | NULL en BD |
| `tissue` | String | NULL en BD |
| `treatment` | String (max 2000 chars) | NULL en BD |
| `frequency` | String | NULL en BD |
| `debridement` | Enum o string | NULL en BD |
| `initial_surface` | Número ≥ 0 | NULL en BD |
| `start_date` | Fecha válida (si existe) | NULL en BD |
| `days` | Número ≥ 0 (si existe) | NULL en BD |
| `healing_percentage` | Número 0-100 | NULL en BD |
| `healing_rate` | Número ≥ 0 | NULL en BD |
| `healing_days` | Número ≥ 0 (si existe) | NULL en BD |

---

## 📐 ESTRUCTURA DE TABLA facility.wound_encounters

```sql
CREATE TABLE facility.wound_encounters (
  id INT PRIMARY KEY IDENTITY(1,1),
  
  -- Identificadores (Requeridos)
  patient_id VARCHAR(50) NOT NULL,
  facility_id INT NOT NULL,
  
  -- Información del proveedor (Opcional)
  provider_id INT NULL,
  patient_name VARCHAR(100) NULL,
  
  -- Características de la herida (Requeridos)
  location VARCHAR(100) NOT NULL,
  etiology VARCHAR(100) NOT NULL,
  
  -- Medidas de la herida (Opcionales)
  width DECIMAL(10,2) NULL,
  height DECIMAL(10,2) NULL,
  depth DECIMAL(10,2) NULL,
  surface DECIMAL(10,2) NOT NULL,
  
  -- Características clínicas (Opcionales)
  exudate VARCHAR(50) NULL,
  tissue VARCHAR(100) NULL,
  treatment VARCHAR(MAX) NULL,
  frequency VARCHAR(50) NULL,
  
  -- Estado (Requeridos)
  progress VARCHAR(50) NOT NULL,
  disposition VARCHAR(50) NOT NULL,
  
  -- Desbridamiento (Opcional)
  debridement VARCHAR(50) NULL,
  
  -- Superficies y fechas (Parcialmente opcionales)
  initial_surface DECIMAL(10,2) NULL,
  start_date DATE NULL,
  dos DATE NOT NULL,
  
  -- Duración y cicatrización (Opcionales)
  days INT NULL,
  healing_percentage DECIMAL(5,2) NULL,
  healing_rate DECIMAL(10,2) NULL,
  healing_days INT NULL,
  
  -- Scoring (Requerido)
  push_score INT NOT NULL,
  
  -- Auditoria
  created_date DATETIME2 DEFAULT GETDATE(),
  import_source VARCHAR(255) NULL,
  
  -- Foreign Key (Recomendado)
  FOREIGN KEY (facility_id) REFERENCES facility.facilities(id)
);
```

---

## 🚀 CÓMO ACTUALIZAR EL CÓDIGO

### 1. Actualizar COLUMN_MAPPING en excel-utils.ts
```typescript
const COLUMN_MAPPING: Record<string, string> = {
  'Pt Name': 'patient_id',
  'Wound Loc': 'location',
  'Etiology': 'etiology',
  'SA (cm²)': 'surface',
  'Exudate': 'exudate',
  'Tissue': 'tissue',
  'Tx Plan': 'treatment',
  'Frequency': 'frequency',
  'Progress': 'progress',
  'Disposition': 'disposition',
  'DOS': 'dos',
  'Facility': 'facility_id',
  'Provider': 'provider_id',
  'Appropriate debridement': 'debridement',
  'Initial SA': 'initial_surface',
  'Wound start date': 'start_date',
  'Duration (days)': 'days',
  '% Healing2': 'healing_percentage',
  'Healing Velocity (cm²/Week)': 'healing_rate',
  'Healing Time Days': 'healing_days',
  'PUSH SCORE': 'push_score'
};
```

### 2. Actualizar validateExcelData en excel-utils.ts
```typescript
const requiredFields = [
  'patient_id',      // Pt Name
  'location',        // Wound Loc
  'etiology',        // Etiology
  'surface',         // SA (cm²)
  'progress',        // Progress
  'disposition',     // Disposition
  'dos',             // DOS
  'facility_id',     // Facility
  'push_score'       // PUSH SCORE
];
```

### 3. Actualizar validaciones de enumeraciones
```typescript
const validProgress = ['Improving', 'Deteriorating', 'Stable'];
const validDisposition = ['Active', 'Resolved', 'New', 'Hospitalized'];
const validExudate = ['None', 'Minimal', 'Moderate', 'Heavy', 'Copious'];
const validDebridement = ['None', 'Autolytic', 'Enzymatic', 'Mechanical', 'Surgical'];
```

### 4. Actualizar INSERT en routes.ts
Ya incluye todos los campos correctamente mapeados.

---

## 📋 CHECKLIST DE VALIDACIÓN

- [x] Mapeo de 23 campos completado
- [x] 9 campos requeridos identificados
- [x] 14 campos opcionales identificados
- [x] 1 campo ignorado (Helper Colum)
- [x] Validaciones por campo definidas
- [x] Enumeraciones documentadas
- [x] Campos autogenerados identificados
- [ ] Código actualizado en excel-utils.ts
- [ ] Código actualizado en routes.ts
- [ ] Plantilla Excel generada con nuevo mapeo
- [ ] Tests ejecutados
- [ ] Documentación de usuario actualizada

---

## 📊 RESUMEN

- **Total campos Excel**: 23
- **Campos mapeados**: 22
- **Campos ignorados**: 1 (Helper Colum)
- **Campos requeridos en BD**: 9
- **Campos opcionales en BD**: 14
- **Transformaciones especiales**: 1 (Size → width/height/depth)
- **Estado**: ✅ LISTO PARA IMPLEMENTAR
