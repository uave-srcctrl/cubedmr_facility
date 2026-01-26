# 📊 Actualización de Plantilla Excel y Transformaciones

## 🔄 Cambios Realizados

### 1️⃣ Mapeo Ampliado en COLUMN_MAPPING

Se actualizó `client/src/lib/excel-utils.ts` para soportar **ambos formatos** de entrada:

#### Formato 1: Nombres Cortos (Original)
```
'Pt_Name' → 'patient_id'
'Facility' → 'facility_id'
'Wound Loc' → 'location'
...
```

#### Formato 2: Nombres Descriptivos (Nuevo)
```
'Pt Name' → 'patient_id'
'Appropriate debridement' → 'debridement'
'Initial SA' → 'initial_surface'
'Wound start date' → 'start_date'
'Duration (days)' → 'days'
'% Healing2' → 'healing_percentage'
'Healing Velocity (cm²/Week)' → 'healing_rate'
'Healing Time Days' → 'healing_days'
'SA (cm²)' → 'surface'
'Tx Plan' → 'treatment'
'Size (Cm)' → 'size' (transformación especial)
```

### 2️⃣ Transformación Especial: "Size (Cm)"

**Problema:** Campo de Excel contiene "5x4x2" pero la BD requiere 3 campos: width, height, depth

**Solución:** Nueva función `parseSize()` que transforma:
```
Excel: 'Size (Cm)' = "5.2x4.8x1.5"
         ↓ PARSESIZE()
BD:    width: 5.2, height: 4.8, depth: 1.5
```

**Código:**
```typescript
function parseSize(sizeStr: string): { width: number | null; height: number | null; depth: number | null } | null {
  if (!sizeStr || typeof sizeStr !== 'string') return null;
  
  // Intenta parsear formato: "5x4x2" o "5.2 x 4.8 x 1.5"
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

**Casos soportados:**
- "5x4x2" ✓
- "5.2x4.8x1.5" ✓
- "5.2 x 4.8 x 1.5" ✓
- " 5 x 4 x 2 " ✓

### 3️⃣ Campos Ignorados

Columnas que no mapean a nada (se descartan):
```
'Helper Colum' → null (IGNORAR)
'Helper Column' → null (IGNORAR)
```

En `remapExcelColumns()`:
```typescript
if (newKey === '') {
  return;  // Ignora esta columna
}
```

---

## 📋 TABLA DE COMPATIBILIDAD

| Nombre Excel (Nuevo) | Nombre Excel (Antiguo) | Campo BD | Tipo | Acción |
|----------------------|------------------------|----------|------|--------|
| Pt Name | Pt_Name | patient_id | VARCHAR(50) | Mapear |
| Facility | Facility | facility_id | INT | Mapear |
| Provider | Provider | provider_id | INT | Mapear (opcional) |
| Patient Name | Patient Name | patient_name | VARCHAR(100) | Mapear (opcional) |
| Wound Loc | Wound Loc | location | VARCHAR(100) | Mapear |
| Etiology | Etiology | etiology | VARCHAR(100) | Mapear |
| Size (Cm) | Width + Height + Depth | width, height, depth | DECIMAL(10,2) | Transformar |
| SA (cm²) | SA(cm2) | surface | DECIMAL(10,2) | Mapear |
| Exudate | Exudate | exudate | VARCHAR(50) | Mapear (opcional) |
| Tissue | Tissue | tissue | VARCHAR(100) | Mapear (opcional) |
| Tx Plan | Treatment | treatment | VARCHAR(MAX) | Mapear (opcional) |
| Frequency | Frequency | frequency | VARCHAR(50) | Mapear (opcional) |
| Progress | Progress | progress | VARCHAR(50) | Mapear |
| Disposition | Disposition | disposition | VARCHAR(50) | Mapear |
| Appropriate debridement | Debridement | debridement | VARCHAR(50) | Mapear (opcional) |
| Initial SA | Init SA | initial_surface | DECIMAL(10,2) | Mapear (opcional) |
| Wound start date | Start Date | start_date | DATE | Mapear (opcional) |
| Duration (days) | Days | days | INT | Mapear (opcional) |
| % Healing2 | Healing % | healing_percentage | DECIMAL(5,2) | Mapear (opcional) |
| Healing Velocity (cm²/Week) | Healing Rate | healing_rate | DECIMAL(10,2) | Mapear (opcional) |
| Healing Time Days | Healing Days | healing_days | INT | Mapear (opcional) |
| PUSH SCORE | PUSH_SCORE | push_score | INT | Mapear |
| Helper Colum | - | - | - | **IGNORAR** |

---

## ✅ VALIDACIONES ACTUALIZADO

### Campos Requeridos (9)
```typescript
const requiredFields = [
  'patient_id',      // Pt Name
  'facility_id',     // Facility
  'location',        // Wound Loc
  'etiology',        // Etiology
  'surface',         // SA (cm²)
  'push_score',      // PUSH SCORE
  'progress',        // Progress
  'disposition',     // Disposition
  'dos'              // DOS
];
```

### Campos Numéricos
```typescript
const numericFields = [
  'facility_id',
  'provider_id',
  'width',           // De Size (Cm)
  'height',          // De Size (Cm)
  'depth',           // De Size (Cm)
  'surface',
  'initial_surface',
  'days',
  'healing_percentage',
  'healing_rate',
  'healing_days',
  'push_score'
];
```

### Enumeraciones
```typescript
validProgress = ['Improving', 'Deteriorating', 'Stable']
validDisposition = ['Active', 'Resolved', 'New', 'Hospitalized']
validExudate = ['None', 'Minimal', 'Moderate', 'Heavy', 'Copious']
validDebridement = ['None', 'Autolytic', 'Enzymatic', 'Mechanical', 'Surgical']
```

### Validaciones Adicionales
```
✓ surface > 0
✓ push_score: 0-17
✓ facility_id: número entero válido
✓ healing_percentage: 0-100
✓ healing_rate ≥ 0
✓ DOS: fecha válida (YYYY-MM-DD)
✓ start_date: fecha válida
✓ start_date ≤ DOS
```

---

## 🔄 FLUJO DE TRANSFORMACIÓN

```
EXCEL ORIGINAL (23 columnas)
  ↓
readExcelFile() - Lee con XLSX
  ↓
validateExcelData() - Inicia validación
  ├─ remapExcelColumns() - Aplica mappings
  │  ├─ "Pt Name" → "patient_id"
  │  ├─ "Size (Cm)" → parseSize() → width, height, depth
  │  └─ "Helper Colum" → [IGNORAR]
  ├─ Valida campos requeridos
  ├─ Valida tipos de datos
  ├─ Valida enumeraciones
  └─ Valida fechas
  ↓
DATOS TRANSFORMADOS (25 campos efectivos en BD)
  ↓
POST /api/import-excel (JSON)
  ↓
API LOCAL (routes.ts)
  ├─ Phase 1: Validación
  ├─ Phase 2: Sanitización
  ├─ Phase 3: Delegación API Externa
  └─ Phase 4: Retorno resultado
  ↓
INSERCIÓN EN BD: facility.wound_encounters
```

---

## 📝 EJEMPLO DE TRANSFORMACIÓN

### ANTES (Excel Original)
```
Pt Name | Facility | Wound Loc | Size (Cm) | SA (cm²) | Progress | DOS | ...
P001    | 5        | Left leg  | 5x4x2    | 10.5     | Improving| 2025-01-20
```

### DESPUÉS (Datos Transformados)
```json
{
  "patient_id": "P001",
  "facility_id": 5,
  "location": "Left leg",
  "width": 5.0,
  "height": 4.0,
  "depth": 2.0,
  "surface": 10.5,
  "progress": "Improving",
  "dos": "2025-01-20",
  ...
}
```

### EN BD
```sql
INSERT INTO facility.wound_encounters (
  patient_id, facility_id, location, width, height, depth, 
  surface, progress, dos, ...
)
VALUES (
  'P001', 5, 'Left leg', 5.0, 4.0, 2.0,
  10.5, 'Improving', '2025-01-20', ...
)
```

---

## 🎯 CASOS DE USO

### Caso 1: Excel con Formato Antiguo
```
Columnas: Pt_Name, SA(cm2), PUSH_SCORE
↓ FUNCIONA ✓ (Mapeo compatibilidad hacia atrás)
```

### Caso 2: Excel con Formato Nuevo
```
Columnas: Pt Name, SA (cm²), Appropriate debridement, Size (Cm)
↓ FUNCIONA ✓ (Mapeo nuevo + transformación Size)
```

### Caso 3: Excel Mixto (Ambos formatos)
```
Columnas: Pt_Name (antiguo), Appropriate debridement (nuevo)
↓ FUNCIONA ✓ (Soporta ambos simultáneamente)
```

### Caso 4: Excel con Helper Colum
```
Columnas: Pt Name, Helper Colum, Facility
↓ FUNCIONA ✓ (Ignora Helper Colum automáticamente)
```

---

## ⚠️ VALIDACIONES MEJORADAS

### Antes
- Solo validaba presencia de campo
- No verificaba formato de Size

### Ahora
- Valida presencia + tipo + rango + enumeración
- **Transforma Size (Cm) automáticamente**
- Valida coherencia de fechas (start_date ≤ DOS)
- Ignora columnas auxiliares

---

## 🚀 CÓMO USAR

### Opción 1: Descargar Plantilla desde UI
1. Click en "Download Template"
2. Completar con datos
3. Subir archivo

### Opción 2: Excel Manual
1. Crear Excel con columnas (cualquier formato soportado)
2. Llenar datos
3. Subir

### Ambos Formatos Válidos
```
FORMATO ANTIGUO          FORMATO NUEVO
Pt_Name        ← ó →    Pt Name
SA(cm2)        ← ó →    SA (cm²)
Debridement    ← ó →    Appropriate debridement
Width+Height+Depth ← ó → Size (Cm)
```

---

## 📊 COMPATIBILIDAD

| Aspecto | Estado |
|---------|--------|
| Formato antiguo | ✅ Compatible (hacia atrás) |
| Formato nuevo | ✅ Soportado |
| Transformación Size | ✅ Automática |
| Campos ignorados | ✅ Automático |
| Validaciones | ✅ Completas |
| Enumeraciones | ✅ Validadas |
| Fechas | ✅ Coherencia verificada |

---

## 🔍 FUNCIONES ACTUALIZADAS

### `remapExcelColumns(data: any[])`
**Cambios:**
- ✅ Soporta mapeo de múltiples variantes de nombres
- ✅ Transforma "Size (Cm)" → width, height, depth
- ✅ Ignora columnas auxiliares (Helper Colum)
- ✅ Mantiene compatibilidad hacia atrás

### `parseSize(sizeStr: string)`
**Nueva función:**
- ✅ Parsea "5x4x2" o "5.2 x 4.8 x 1.5"
- ✅ Retorna { width, height, depth }
- ✅ Maneja espacios y formatos variables

### `validateExcelData(rawData: any[])`
**Sin cambios de firma:**
- Sigue retornando { isValid, errors, data }
- Ahora retorna datos transformados
- Usa remapExcelColumns() internamente

---

## 📈 RESULTADOS

| Métrica | Antes | Después |
|---------|-------|---------|
| Formatos soportados | 1 | 2+ |
| Flexibilidad de nombres | Baja | Alta |
| Transformaciones automáticas | 0 | 1 (Size) |
| Campos ignorados automáticamente | No | Sí |
| Validaciones de coherencia | Básicas | Completas |
| Compatibilidad hacia atrás | No | ✅ Sí |

---

## ✅ ESTADO

**Implementación:** COMPLETA ✅
- ✅ Mapeo bidireccional
- ✅ Transformación especial Size
- ✅ Validaciones mejoradas
- ✅ Compatibilidad hacia atrás
- ✅ Campos ignorados
- ✅ Documentación
- **Listo para producción**
