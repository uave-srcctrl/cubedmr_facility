# Flujo Completo de Importación Excel - End to End

## 📋 Descripción General del Proceso

Este documento describe el flujo completo de importación de datos desde Excel, desde que el usuario descarga la plantilla hasta que los datos se guardan en la base de datos.

---

## 🔄 Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USUARIO DESCARGA PLANTILLA                                   │
│    - Haz clic en "Descargar Plantilla"                          │
│    - Se genera Excel con nombres amigables (Pt_Name, Facility)  │
│    - Se incluyen datos de ejemplo                               │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. USUARIO COMPLETA DATOS EN EXCEL                              │
│    - Usa los nombres de columna amigables                       │
│    - Ejemplo: Pt_Name, Facility, Wound Loc, SA(cm2)           │
│    - Los nombres están EXACTAMENTE como en la plantilla        │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. USUARIO SUBE ARCHIVO EXCEL                                   │
│    - Arrastra y suelta o selecciona archivo                    │
│    - React lee el archivo con librería XLSX                    │
│    - Se extrae la primera fila como encabezados                │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. PROCESAMIENTO EN CLIENTE (excel-utils.ts)                    │
│                                                                 │
│ 4A. Lectura de Datos:                                          │
│    - XLSX convierte Excel → JSON array                         │
│    - Cada fila es un objeto con encabezados como keys          │
│    - Ejemplo:                                                  │
│      {                                                         │
│        'Pt_Name': 'P001',                                      │
│        'Facility': 5,                                          │
│        'Wound Loc': 'Left leg',                               │
│        'SA(cm2)': 10.5,                                        │
│        'DOS': '2025-01-15',                                    │
│        'PUSH_SCORE': 12                                        │
│      }                                                         │
│                                                                 │
│ 4B. Validación Inicial:                                        │
│    - validateExcelData() se llama                             │
│    - Recibe rawData con nombres amigables                     │
│    - REMAPEA COLUMNAS internamente:                           │
│      remapExcelColumns() transforma:                          │
│      'Pt_Name' → 'patient_id'                                 │
│      'Facility' → 'facility_id'                               │
│      'Wound Loc' → 'location'                                 │
│      'SA(cm2)' → 'surface'                                    │
│      'DOS' → 'dos'                                            │
│      'PUSH_SCORE' → 'push_score'                             │
│      ... y 19 columnas más                                    │
│                                                                 │
│ 4C. Validación de Datos Remapeados:                           │
│    - Verifica campos requeridos: patient_id, facility_id,     │
│      location, etiology, surface, push_score, progress,       │
│      disposition, dos                                         │
│    - Valida tipos de datos (números, fechas, etc.)            │
│    - Valida valores enumerados (Progress, Disposition)        │
│    - Retorna estructura:                                       │
│      {                                                         │
│        isValid: true/false,                                    │
│        errors: [],                                             │
│        data: [ /* datos remapeados */ ]                        │
│      }                                                         │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │ ¿Validación exitosa?       │
         └──────┬──────────────┬───────┘
                │ NO           │ SÍ
                ▼              ▼
        ┌───────────────┐  ┌──────────────────────────────────┐
        │ Mostrar       │  │ 5. MOSTRAR PREVIEW EN CLIENTE    │
        │ Errores       │  │    - Mostrar primeras filas      │
        │               │  │    - Preview muestra:            │
        │ - Campo X     │  │      * Datos con nombres amigos  │
        │   inválido    │  │      * Filas encontradas         │
        │ - Tipo Z      │  │      * Botón "Importar Datos"    │
        │   incorrecto  │  └──────────┬───────────────────────┘
        └───────────────┘             │
                                      ▼
                        ┌─────────────────────────────────────┐
                        │ 6. USUARIO CONFIRMA IMPORTACIÓN     │
                        │    - Haz clic en "Importar Datos"   │
                        └──────────────┬──────────────────────┘
                                       │
                                       ▼
        ┌──────────────────────────────────────────────────────┐
        │ 7. ENVÍO AL SERVIDOR (POST /api/import-excel)        │
        │                                                      │
        │ Headers:                                            │
        │ - Content-Type: application/json                    │
        │ - Authorization: Bearer {token}                     │
        │                                                      │
        │ Body:                                               │
        │ {                                                   │
        │   "data": [                                         │
        │     {                                               │
        │       "patient_id": "P001",    ← Nombres internos   │
        │       "facility_id": 5,                             │
        │       "location": "Left leg",                       │
        │       "surface": 10.5,                              │
        │       "dos": "2025-01-15",                         │
        │       "push_score": 12,                            │
        │       ... más campos                                │
        │     }                                               │
        │   ],                                                │
        │   "filename": "wounds.xlsx"                         │
        │ }                                                   │
        └──────────────┬───────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────────────────────────┐
        │ 8. PROCESAMIENTO EN SERVIDOR (routes.ts)             │
        │                                                      │
        │ 8A. Autenticación:                                  │
        │    - Verifica token JWT                             │
        │    - Obtiene usuario autenticado                    │
        │                                                      │
        │ 8B. Validación de Seguridad:                        │
        │    - Verifica permisos del usuario                  │
        │    - Verifica que facility_id sea válida            │
        │                                                      │
        │ 8C. Intento 1: Usar Stored Procedure                │
        │    - Llama sp_facility_import_excel_wounds          │
        │    - Parámetros en XML con todos los datos          │
        │    - Transacción ATÓMICA (todo o nada)             │
        │    - Si ÉXITO: Retorna { status, insertedCount: X } │
        │    - Si FALLA: Va a Intento 2                       │
        │                                                      │
        │ 8D. Intento 2 (Fallback): Inserción Directa         │
        │    - Si SP falló                                     │
        │    - Inserta filas individuales en tabla             │
        │    - Menos seguro pero más flexible                 │
        │    - Retorna { status, insertedCount: X }           │
        └──────────────┬───────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────────────────────────┐
        │ 9. INSERCIÓN EN BASE DE DATOS                        │
        │                                                      │
        │ facility.wound_encounters (Tabla destino)          │
        │ ┌────┬──────────┬────────────┬──────────┬─────────┐ │
        │ │id  │patient_id│facility_id │location  │surface  │ │
        │ ├────┼──────────┼────────────┼──────────┼─────────┤ │
        │ │1   │P001      │5           │Left leg  │10.5     │ │
        │ │2   │P002      │5           │Right arm │5.2      │ │
        │ │... │...       │...         │...       │...      │ │
        │ └────┴──────────┴────────────┴──────────┴─────────┘ │
        │                                                      │
        │ Todos los datos con nombres INTERNOS (patient_id,   │
        │ facility_id, location, surface, etc.)               │
        └──────────────┬───────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────────────────────────┐
        │ 10. RESPUESTA AL CLIENTE                             │
        │                                                      │
        │ Respuesta exitosa:                                  │
        │ {                                                   │
        │   "status": "success",                              │
        │   "insertedCount": 150,                             │
        │   "method": "stored_procedure"                      │
        │ }                                                   │
        │                                                      │
        │ Respuesta fallida:                                  │
        │ {                                                   │
        │   "status": "error",                                │
        │   "message": "Error al importar datos"              │
        │ }                                                   │
        └──────────────┬───────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────────────────────────┐
        │ 11. MOSTRAR RESULTADO AL USUARIO                     │
        │                                                      │
        │ Éxito:                                              │
        │ ✅ "Datos importados exitosamente"                  │
        │    "150 registros procesados"                       │
        │                                                      │
        │ Error:                                              │
        │ ❌ "Error al importar los datos"                    │
        │    [Mostrar detalles del error]                     │
        └──────────────────────────────────────────────────────┘
```

---

## 🔑 Puntos Clave del Proceso

### 1. **Remapeo de Columnas (Transparente)**

**En Cliente:**
- Excel: `Pt_Name` → Interno: `patient_id`
- Excel: `SA(cm2)` → Interno: `surface`
- Excel: `DOS` → Interno: `dos`
- Excel: `PUSH_SCORE` → Interno: `push_score`

**Código:**
```typescript
const COLUMN_MAPPING = {
  'Pt_Name': 'patient_id',
  'Facility': 'facility_id',
  'Wound Loc': 'location',
  'SA(cm2)': 'surface',
  'DOS': 'dos',
  'PUSH_SCORE': 'push_score',
  // ... 19 columnas más
};

export function remapExcelColumns(data: any[]): any[] {
  return data.map(row => {
    const newRow: Record<string, any> = {};
    Object.entries(row).forEach(([key, value]) => {
      const newKey = COLUMN_MAPPING[key] || key;
      newRow[newKey] = value;
    });
    return newRow;
  });
}
```

### 2. **Validación Multi-Nivel**

**Cliente (JavaScript):**
```typescript
validateExcelData(rawData) {
  // 1. Remapea columnas
  const mappedData = remapExcelColumns(rawData);
  
  // 2. Verifica campos requeridos
  // 3. Valida tipos de datos
  // 4. Valida valores enumerados (Progress, Disposition)
  // 5. Valida fechas
  // 6. Retorna { isValid, errors, data }
}
```

**Servidor (Node.js):**
```typescript
// En /api/import-excel:
// 1. Autentica usuario
// 2. Verifica permisos
// 3. Valida datos nuevamente en servidor
// 4. Intenta SP (atómico)
// 5. Fallback a inserción directa si es necesario
```

### 3. **Campos Requeridos**

Antes de remapeo (Excel):
- `Pt_Name`
- `Facility`
- `Wound Loc`
- `Etiology`
- `SA(cm2)`
- `Progress`
- `Disposition`
- `DOS`
- `PUSH_SCORE`

Después de remapeo (Interno):
- `patient_id`
- `facility_id`
- `location`
- `etiology`
- `surface`
- `progress`
- `disposition`
- `dos`
- `push_score`

### 4. **Campos Enumerados (Valores Válidos)**

| Campo | Valores Válidos |
|-------|---|
| `Progress` | `Improving`, `Deteriorating`, `Stable` |
| `Disposition` | `Active`, `Resolved`, `New`, `Hospitalized` |
| `Exudate` | `None`, `Minimal`, `Moderate`, `Heavy`, `Copious` |
| `Debridement` | `None`, `Autolytic`, `Enzymatic`, `Mechanical`, `Surgical` |

### 5. **Formatos de Fechas**

- Formato: `YYYY-MM-DD`
- Ejemplo: `2025-01-15`
- Se validan que sean fechas válidas
- Se valida que `start_date` ≤ `dos`

---

## 📊 Ejemplo Completo

### Paso 1: Excel que Sube el Usuario

```
Pt_Name | Facility | Provider | Patient Name | Wound Loc   | Etiology       | Width | Height | Depth | SA(cm2) | Exudate | Tissue       | Treatment          | Frequency    | Progress  | Disposition | Debridement | Init SA | Start Date | DOS        | Days | Healing % | Healing Rate | Healing Days | PUSH_SCORE
P001    | 5        | 101      | Juan Pérez   | Left leg    | Pressure Ulcer | 5.2   | 4.8    | 1.5   | 10.5    | Moderate| Granulation  | Dressing w/gel     | Daily        | Improving | Active      | Autolytic   | 12.0    | 2024-12-15 | 2025-01-15 | 31   | 12.5      | 0.4          | 90           | 12
```

### Paso 2: Lectura por JavaScript (XLSX)

```javascript
{
  'Pt_Name': 'P001',
  'Facility': 5,
  'Provider': 101,
  'Patient Name': 'Juan Pérez',
  'Wound Loc': 'Left leg',
  'Etiology': 'Pressure Ulcer',
  'Width': 5.2,
  'Height': 4.8,
  'Depth': 1.5,
  'SA(cm2)': 10.5,
  'Exudate': 'Moderate',
  'Tissue': 'Granulation',
  'Treatment': 'Dressing w/gel',
  'Frequency': 'Daily',
  'Progress': 'Improving',
  'Disposition': 'Active',
  'Debridement': 'Autolytic',
  'Init SA': 12.0,
  'Start Date': '2024-12-15',
  'DOS': '2025-01-15',
  'Days': 31,
  'Healing %': 12.5,
  'Healing Rate': 0.4,
  'Healing Days': 90,
  'PUSH_SCORE': 12
}
```

### Paso 3: Remapeo de Columnas

```javascript
{
  'patient_id': 'P001',        // Pt_Name → patient_id
  'facility_id': 5,            // Facility → facility_id
  'provider_id': 101,
  'patient_name': 'Juan Pérez',
  'location': 'Left leg',      // Wound Loc → location
  'etiology': 'Pressure Ulcer',
  'width': 5.2,
  'height': 4.8,
  'depth': 1.5,
  'surface': 10.5,             // SA(cm2) → surface
  'exudate': 'Moderate',
  'tissue': 'Granulation',
  'treatment': 'Dressing w/gel',
  'frequency': 'Daily',
  'progress': 'Improving',
  'disposition': 'Active',
  'debridement': 'Autolytic',
  'initial_surface': 12.0,     // Init SA → initial_surface
  'start_date': '2024-12-15',  // Start Date → start_date
  'dos': '2025-01-15',         // DOS → dos
  'days': 31,
  'healing_percentage': 12.5,  // Healing % → healing_percentage
  'healing_rate': 0.4,         // Healing Rate → healing_rate
  'healing_days': 90,          // Healing Days → healing_days
  'push_score': 12             // PUSH_SCORE → push_score
}
```

### Paso 4: Validación

✅ **Campos Requeridos**: Todos presentes
✅ **Tipos de Datos**: Todos correctos
✅ **Valores Enumerados**: 
   - progress = "Improving" ✓
   - disposition = "Active" ✓
   - debridement = "Autolytic" ✓
✅ **Fechas**: Formato válido
✅ **PUSH Score**: 12 (entre 0-17) ✓

### Paso 5: Inserción en BD

```sql
INSERT INTO facility.wound_encounters (
  patient_id, facility_id, provider_id, patient_name, location, 
  etiology, width, height, depth, surface, exudate, tissue, 
  treatment, frequency, progress, disposition, debridement, 
  initial_surface, start_date, dos, days, healing_percentage, 
  healing_rate, healing_days, push_score
) VALUES (
  'P001', 5, 101, 'Juan Pérez', 'Left leg', 'Pressure Ulcer', 
  5.2, 4.8, 1.5, 10.5, 'Moderate', 'Granulation', 
  'Dressing w/gel', 'Daily', 'Improving', 'Active', 'Autolytic', 
  12.0, '2024-12-15', '2025-01-15', 31, 12.5, 0.4, 90, 12
)
```

---

## 🔐 Capas de Seguridad

1. **Autenticación JWT**: Solo usuarios autenticados
2. **Autorización**: Verifica permisos del usuario
3. **Validación Cliente**: Tipos de datos, formatos
4. **Validación Servidor**: Segunda validación de seguridad
5. **Transacción Atómica (SP)**: Todo o nada
6. **Encriptación**: Datos en tránsito (HTTPS)

---

## 📈 Ventajas del Sistema

✅ **Remapeo Automático**: Usuario ve nombres amigables, BD usa nombres internos
✅ **Validación Multi-Nivel**: Cliente + Servidor
✅ **Fallback Automático**: Si SP falla, intenta inserción directa
✅ **Auditoría**: Se registran todas las importaciones
✅ **Escalable**: Soporta miles de registros
✅ **Seguro**: Múltiples capas de validación

---

## 🚀 Próximas Mejoras Potenciales

- [ ] Importación asincrónica para archivos muy grandes
- [ ] Cola de importación con reintentos
- [ ] Notificaciones por email al completar
- [ ] Rollback automático de importaciones fallidas
- [ ] Historial completo de importaciones
- [ ] Validaciones personalizadas por facility
- [ ] Mapeo personalizado de columnas por usuario

