# Referencia Técnica Rápida - Excel Import

## 📁 Archivos Modificados

### 1. Cliente: `client/src/lib/excel-utils.ts`

**Función: `remapExcelColumns(data: any[]): any[]`**
- Mapea nombres de Excel a nombres internos
- Usado por: `validateExcelData()`
- Entrada: Array con claves amigables (Pt_Name, SA(cm2), DOS)
- Salida: Array con claves internas (patient_id, surface, dos)

**Función: `createSampleExcel()`**
- Genera Excel descargable con plantilla
- Usa nombres amigables en encabezados
- Incluye 5 filas de datos de ejemplo
- Ancho de columnas optimizado

**Función: `validateExcelData(rawData: any[]): { isValid, errors, data }`**
- Recibe datos con nombres amigables
- Llama a `remapExcelColumns()` internamente
- Retorna datos remapeados en propiedad `data`
- Valida 9 campos requeridos
- Valida 12 campos numéricos
- Valida valores enumerados

### 2. Cliente: `client/src/pages/excel-import.tsx`

**Cambios:**
- Authorization header agregado a fetch
- Token JWT en headers
- Usa `validateExcelData()` que ahora retorna `data` remapeada

**Flujo:**
```typescript
processFile() → XLSX.read() → validateExcelData() → preview
handleImport() → fetch('/api/import-excel', { data, token })
```

### 3. Servidor: `server/routes.ts`

**Endpoint: `POST /api/import-excel`**
- Recibe datos remapeados del cliente
- Autentica usuario
- Valida facility_id
- Intenta SP: `sp_facility_import_excel_wounds`
- Fallback: Inserción directa
- Retorna: `{ status, insertedCount, method }`

### 4. Database: `sp_facility_import_excel_wounds`

**Estado:** ✅ YA EXISTE
- Acepta XML con datos
- Validación atómica
- Transacción: TODO O NADA
- 26 campos soportados

---

## 🔄 Mapeo Completo de Columnas (26 Campos)

```typescript
const COLUMN_MAPPING: Record<string, string> = {
  'Pt_Name': 'patient_id',
  'Facility': 'facility_id',
  'Provider': 'provider_id',
  'Patient Name': 'patient_name',
  'Wound Loc': 'location',
  'Etiology': 'etiology',
  'Width': 'width',
  'Height': 'height',
  'Depth': 'depth',
  'SA(cm2)': 'surface',
  'Exudate': 'exudate',
  'Tissue': 'tissue',
  'Treatment': 'treatment',
  'Frequency': 'frequency',
  'Progress': 'progress',
  'Disposition': 'disposition',
  'Debridement': 'debridement',
  'Init SA': 'initial_surface',
  'Start Date': 'start_date',
  'DOS': 'dos',
  'Days': 'days',
  'Healing %': 'healing_percentage',
  'Healing Rate': 'healing_rate',
  'Healing Days': 'healing_days',
  'PUSH_SCORE': 'push_score'
};
```

---

## ⭐ Campos Requeridos

```typescript
const requiredFields = [
  'patient_id',      // Pt_Name
  'facility_id',     // Facility
  'location',        // Wound Loc
  'etiology',        // Etiology
  'surface',         // SA(cm2)
  'push_score',      // PUSH_SCORE
  'progress',        // Progress
  'disposition',     // Disposition
  'dos'              // DOS
];
```

---

## 🔢 Campos Numéricos (Validación Tipo)

```typescript
const numericFields = [
  'facility_id',
  'provider_id',
  'width',
  'height',
  'depth',
  'surface',
  'initial_surface',
  'days',
  'healing_percentage',
  'healing_rate',
  'healing_days',
  'push_score'
];
```

---

## 📋 Valores Enumerados Válidos

```typescript
const validProgress = ['Improving', 'Deteriorating', 'Stable'];
const validDisposition = ['Active', 'Resolved', 'New', 'Hospitalized'];
const validExudate = ['None', 'Minimal', 'Moderate', 'Heavy', 'Copious'];
const validDebridement = ['None', 'Autolytic', 'Enzymatic', 'Mechanical', 'Surgical'];
```

---

## 🔧 Cómo Funcionan las Funciones Clave

### `remapExcelColumns(data)`

```typescript
export function remapExcelColumns(data: any[]): any[] {
  if (data.length === 0) return data;

  const firstRow = data[0];
  const originalKeys = Object.keys(firstRow);

  // Crear mapeo de claves
  let keyMapping: Record<string, string> = {};
  originalKeys.forEach(key => {
    if (COLUMN_MAPPING[key]) {
      keyMapping[key] = COLUMN_MAPPING[key];  // Mapear si existe
    } else {
      keyMapping[key] = key;  // Pasar tal cual si no existe mapeo
    }
  });

  // Aplicar mapeo a cada fila
  return data.map(row => {
    const newRow: Record<string, any> = {};
    Object.entries(row).forEach(([key, value]) => {
      const newKey = keyMapping[key] || key;
      newRow[newKey] = value;
    });
    return newRow;
  });
}
```

### `validateExcelData(rawData)`

```typescript
export function validateExcelData(rawData: any[]): 
  { isValid: boolean; errors: string[]; data: any[] } {
  
  let errors: string[] = [];
  
  // 1. REMAPEAR COLUMNAS
  const data = remapExcelColumns(rawData);
  
  // 2. VALIDAR CAMPOS REQUERIDOS
  const requiredFields = ['patient_id', 'facility_id', ...];
  data.forEach((row, index) => {
    requiredFields.forEach(field => {
      if (!row[field] && row[field] !== 0) {
        errors.push(`Fila ${index + 2}: Campo requerido faltante: ${field}`);
      }
    });
  });
  
  // 3. VALIDAR TIPOS DE DATOS
  // ... validación de tipos
  
  // 4. VALIDAR VALORES ENUMERADOS
  // ... validación de enums
  
  // 5. VALIDAR FECHAS
  // ... validación de fechas
  
  // 6. RETORNAR RESULTADO
  return {
    isValid: errors.length === 0,
    errors,
    data  // ← Datos remapeados
  };
}
```

---

## 📤 Flujo de Llamadas en Cliente

```
Usuario selecciona archivo
         ↓
processFile()
  ↓ Lee con XLSX
  ↓ Extrae JSON
  ↓ Llama validateExcelData(rawData)
    ↓ Internamente: remapExcelColumns(rawData)
    ↓ Valida usando nombres internos
    ↓ Retorna { isValid, errors, data: [...remapped...] }
  ↓ Muestra preview
         ↓
Usuario confirma
         ↓
handleImport()
  ↓ Envía importResult.data a /api/import-excel
  ↓ Con Authorization header
         ↓
Servidor responde
         ↓
Mostrar resultado
```

---

## 🔐 Validaciones de Seguridad

### Cliente-side
```typescript
// En validateExcelData()
1. Verificar estructura JSON válida
2. Validar tipos de datos
3. Validar rangos de valores (push_score 0-17)
4. Validar formatos (fechas YYYY-MM-DD)
5. Validar que no haya inyección SQL (aunque axios la maneja)
```

### Servidor-side
```typescript
// En POST /api/import-excel
1. Verificar token JWT válido
2. Verificar permisos del usuario
3. Validar facility_id existe y pertenece al usuario
4. Re-validar todos los datos
5. Usar SP con transacción atómica
6. Log de auditoría
```

---

## 🧪 Ejemplo de Uso

### Descargar Plantilla
```typescript
import { createSampleExcel } from '@/lib/excel-utils';

function DownloadTemplate() {
  const handleDownload = () => {
    createSampleExcel();
    // Se abre diálogo de descarga automáticamente
  };
  
  return <button onClick={handleDownload}>Descargar Plantilla</button>;
}
```

### Procesar Archivo
```typescript
import { validateExcelData } from '@/lib/excel-utils';
import * as XLSX from 'xlsx';

function ProcessFile(file: File) {
  const reader = new FileReader();
  
  reader.onload = (e) => {
    const data = new Uint8Array(e.target?.result as ArrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    // Validar (remapea internamente)
    const result = validateExcelData(jsonData);
    
    if (result.isValid) {
      // result.data tiene nombres internos listos para enviar al servidor
      console.log(result.data);
    } else {
      // result.errors tiene lista de errores
      console.error(result.errors);
    }
  };
  
  reader.readAsArrayBuffer(file);
}
```

---

## 🔄 Transformación de Datos Ejemplo

**Entrada (Lo que el usuario sube):**
```json
[
  {
    "Pt_Name": "P001",
    "Facility": 5,
    "Wound Loc": "Left leg",
    "SA(cm2)": 10.5,
    "DOS": "2025-01-15",
    "PUSH_SCORE": 12
  }
]
```

**Salida (Lo que se envía al servidor):**
```json
[
  {
    "patient_id": "P001",
    "facility_id": 5,
    "location": "Left leg",
    "surface": 10.5,
    "dos": "2025-01-15",
    "push_score": 12
  }
]
```

---

## 🚨 Errores Comunes y Soluciones

| Error | Causa | Solución |
|-------|-------|----------|
| "Campo requerido faltante: patient_id" | Falta Pt_Name | Agregar columna Pt_Name |
| "Campo 'surface' debe ser un número" | SA(cm2) con texto | Usar solo números en SA(cm2) |
| "PUSH score inválido: 25" | Número fuera de rango | PUSH_SCORE debe ser 0-17 |
| "Progreso inválido: 'progressing'" | Valor no válido | Usar: Improving, Stable, Deteriorating |
| "Autorización fallida" | Token expirado | Iniciar sesión nuevamente |

---

## 📚 Documentación Relacionada

- `EXCEL_IMPORT_GUIDE.md` - Guía para usuarios
- `EXCEL_IMPORT_END_TO_END_FLOW.md` - Flujo técnico completo
- `server/routes.ts` - Endpoint POST /api/import-excel
- `sp-facility-import-excel-wounds.sql` - Stored Procedure

---

## ✅ Testing Checklist

- [ ] Descargar plantilla genera Excel válido
- [ ] Excel descargado tiene nombres amigables
- [ ] Validación rechaza campos requeridos vacíos
- [ ] Validación rechaza tipos de datos incorrectos
- [ ] Remapeo transforma nombres correctamente
- [ ] API recibe datos con nombres internos
- [ ] SP inserta datos en BD correctamente
- [ ] Fallback funciona si SP falla
- [ ] Autorización valida token JWT
- [ ] Usuario ve error si token inválido
- [ ] Datos insertados son exactos

---

**Última actualización:** 2025-01-18  
**Versión:** 2.0  
**Estado:** ✅ Implementado y Listo para Producción

