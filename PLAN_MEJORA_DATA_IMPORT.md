# Plan de Mejora: Data Import Hub

## 🎯 Objetivo
Mejorar el Data Import Hub para que sea tan robusto como Excel Import, pero con soporte para múltiples formatos.

---

## ✅ TAREAS RECOMENDADAS

### FASE 1: Validación y API (CRÍTICA)

#### 1.1 Agregar Validación Genérica
**Archivo:** `client/src/pages/data-import.tsx`

```typescript
// Después de procesar archivo, agregar validación
const validateImportedData = (data: ImportRow[], format: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  data.forEach((row, idx) => {
    // Validaciones genéricas
    if (Object.keys(row).length === 0) {
      errors.push(`Row ${idx + 1}: Empty row`);
    }
    
    // Formato específico
    if (format === 'excel') {
      // Reutilizar lógica de excel-import
      const excelValidation = validateExcelData([row]);
      if (!excelValidation.isValid) {
        errors.push(...excelValidation.errors);
      }
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors: errors.slice(0, 20) // Limitar a 20 errores
  };
};
```

**Cambios en processFile():**
```typescript
// Después de obtener processedData
const validation = validateImportedData(processedData, format);

if (!validation.isValid) {
  setImportResult({
    success: false,
    message: `Validation errors found in file`,
    data: processedData,
    errors: validation.errors
  });
} else {
  setImportResult({
    success: true,
    message: `Successfully validated ${processedData.length} records`,
    data: processedData,
  });
}
```

#### 1.2 Implementar handleImport()
```typescript
const handleImport = async () => {
  if (!importResult?.data) return;
  
  setIsProcessing(true);
  
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    // Mapear formato a endpoint
    const endpoints: Record<string, string> = {
      'excel': '/api/import-excel',
      'csv': '/api/import-data',
      'json': '/api/import-data',
      'xml': '/api/import-data',
      'hl7': '/api/import-hl7'
    };
    
    const endpoint = endpoints[selectedFormat] || '/api/import-data';
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        data: importResult.data,
        filename: file?.name,
        format: selectedFormat,
        itemCount: importResult.data.length
      })
    });
    
    if (!response.ok) {
      throw new Error(`Import failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    setImportResult({
      success: true,
      message: `Successfully imported ${result.insertedCount || importResult.data.length} records`,
      data: importResult.data
    });
    
    toast({
      title: 'Import Successful',
      description: `${result.insertedCount || importResult.data.length} records imported`,
    });
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    setImportResult({
      success: false,
      message: `Import failed: ${errorMsg}`,
      errors: [errorMsg]
    });
    
    toast({
      title: 'Import Failed',
      description: errorMsg,
      variant: 'destructive'
    });
  } finally {
    setIsProcessing(false);
  }
};
```

#### 1.3 Actualizar Botón de Importación
```typescript
// En la sección de botones
{importResult?.success && (
  <Button 
    onClick={handleImport} 
    disabled={isProcessing}
    className="flex-1"
  >
    {isProcessing ? 'Importing...' : 'Import Data'}
  </Button>
)}
```

---

### FASE 2: Localización (IMPORTANTE)

#### 2.1 Crear archivo i18n
**Archivo:** `client/src/lib/i18n-data-import.ts`

```typescript
export const i18n = {
  es: {
    title: 'Importar Datos',
    description: 'Importa datos de pacientes y heridas desde múltiples formatos',
    selectFormat: 'Selecciona un formato de datos',
    dragDrop: 'Arrastra y suelta tu archivo aquí',
    click: 'o haz clic para seleccionar',
    maxSize: 'Tamaño máximo: 50MB',
    excel: { name: 'Excel', description: 'Hojas de cálculo XLSX, XLS' },
    csv: { name: 'CSV/TSV', description: 'Valores separados por comas o tabulaciones' },
    json: { name: 'JSON', description: 'Datos estructurados en JSON' },
    xml: { name: 'XML', description: 'Datos en formato XML' },
    hl7: { name: 'HL7/FHIR', description: 'Formato de datos clínicos HL7' },
    docx: { name: 'Word/PDF', description: 'Documentos DOCX y PDF' },
    processing: 'Procesando...',
    success: 'Importación exitosa',
    failed: 'Importación fallida',
    validation_errors: 'Errores de validación encontrados',
    download_sample: 'Descargar Muestra',
    import_data: 'Importar Datos',
    clearing: 'Limpiando...',
  },
  en: {
    title: 'Data Import',
    description: 'Import patient and wound data from multiple formats',
    selectFormat: 'Select a data format',
    dragDrop: 'Drag and drop your file here',
    click: 'or click to select',
    maxSize: 'Max file size: 50MB',
    excel: { name: 'Excel', description: 'XLSX, XLS spreadsheets' },
    csv: { name: 'CSV/TSV', description: 'Comma or tab separated values' },
    json: { name: 'JSON', description: 'JSON structured data' },
    xml: { name: 'XML', description: 'XML format data' },
    hl7: { name: 'HL7/FHIR', description: 'HL7 clinical data format' },
    docx: { name: 'Word/PDF', description: 'DOCX and PDF documents' },
    processing: 'Processing...',
    success: 'Import Successful',
    failed: 'Import Failed',
    validation_errors: 'Validation errors found',
    download_sample: 'Download Sample',
    import_data: 'Import Data',
    clearing: 'Clearing...',
  }
};
```

#### 2.2 Usar i18n en componente
```typescript
const DataImportPage = () => {
  // Detectar idioma (del localStorage o del navegador)
  const language = localStorage.getItem('language') || 'es';
  const t = i18n[language as keyof typeof i18n];
  
  // Usar en JSX:
  <h1>{t.title}</h1>
  <p>{t.description}</p>
  <Button>{t.download_sample}</Button>
};
```

---

### FASE 3: Instrucciones y Guías (IMPORTANTE)

#### 3.1 Crear Componente InstructionCard
**Archivo:** `client/src/components/import-instructions.tsx`

```typescript
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface InstructionCardProps {
  format: string;
}

export const ImportInstructions = ({ format }: InstructionCardProps) => {
  const instructions: Record<string, any> = {
    excel: {
      title: 'Instrucciones Excel',
      requirements: [
        'Primera fila: nombres de columnas',
        'Formatos soportados: .xlsx, .xls',
        'Máximo: 10MB'
      ],
      fields: [
        'patient_id (requerido)',
        'facility_id (número)',
        'location (texto)',
        'etiology (texto)',
        'surface (número positivo)',
        'push_score (0-17)',
        'progress (Improving|Deteriorating|Stable)',
        'disposition (Active|Resolved|New)',
        'dos (YYYY-MM-DD)'
      ],
      example: 'Descargar plantilla de ejemplo'
    },
    csv: {
      title: 'Instrucciones CSV',
      requirements: [
        'Primera línea: encabezados',
        'Separador: coma o tabulación',
        'Codificación: UTF-8'
      ],
      fields: [
        'Cualquier columna es válida',
        'Se respetan los tipos detectados'
      ]
    },
    // ... más formatos
  };
  
  const info = instructions[format];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          {info.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">Requisitos:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {info.requirements.map((req: string) => (
              <li key={req}>{req}</li>
            ))}
          </ul>
        </div>
        {info.fields && (
          <div>
            <h4 className="font-medium mb-2">Campos:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {info.fields.map((field: string) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

#### 3.2 Agregar al Data Import Hub
```typescript
import { ImportInstructions } from '@/components/import-instructions';

// En el JSX, debajo del preview:
{previewData.length > 0 && (
  <>
    {/* Preview existente */}
    <ImportInstructions format={selectedFormat} />
  </>
)}
```

---

### FASE 4: Mejoras en HL7 (OPCIONAL)

#### 4.1 Procesador HL7 Mejorado
```typescript
const processHL7 = (content: string): ImportRow[] => {
  const segments = content.split('\n').filter(line => line.trim());
  const records: ImportRow[] = [];
  
  // Parsear segmentos HL7
  const allSegments = segments.map(segment => {
    const parts = segment.split('|');
    const segmentType = parts[0];
    
    const record: ImportRow = {
      segmentType,
      // Parsear campos específicos según tipo
    };
    
    switch (segmentType) {
      case 'MSH': // Message Header
        record.sendingApp = parts[3];
        record.sendingFacility = parts[4];
        record.receivingApp = parts[5];
        record.receivingFacility = parts[6];
        break;
      case 'PID': // Patient Identification
        record.patientId = parts[3];
        record.patientName = parts[5];
        record.dateOfBirth = parts[7];
        record.sex = parts[8];
        break;
      case 'OBX': // Observation/Result
        record.valueType = parts[2];
        record.observationIdentifier = parts[3];
        record.observationValue = parts[5];
        break;
    }
    
    return record;
  });
  
  if (allSegments.length === 0) {
    throw new Error('No valid HL7 records found');
  }
  
  return allSegments;
};
```

---

## 📝 CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Validación y API ✅
- [ ] Copiar lógica `validateExcelData` a `data-import.tsx`
- [ ] Crear función `validateImportedData()` genérica
- [ ] Integrar validación en `processFile()`
- [ ] Implementar `handleImport()`
- [ ] Crear endpoints backend si no existen
- [ ] Habilitar botón de importación
- [ ] Probar con múltiples formatos

### Fase 2: Localización ✅
- [ ] Crear archivo `i18n-data-import.ts`
- [ ] Traducir UI al español
- [ ] Agregar selector de idioma
- [ ] Probar con ambos idiomas

### Fase 3: Instrucciones ✅
- [ ] Crear `ImportInstructions` component
- [ ] Agregar instrucciones por formato
- [ ] Agregar ejemplos
- [ ] Incluir en UI

### Fase 4: HL7 (Opcional)
- [ ] Mejorar parseo HL7
- [ ] Agregar más segmentos
- [ ] Documentar campos

---

## 🧪 CASOS DE PRUEBA

### Test 1: Import Excel
```
1. Seleccionar formato Excel
2. Draggear archivo válido
3. Verificar validación ✓
4. Click "Import Data"
5. Verificar API call
6. Confirmar éxito
```

### Test 2: Import CSV
```
1. Seleccionar formato CSV
2. Subir archivo CSV
3. Verificar parsing
4. Ver preview
5. Importar
6. Confirmar éxito
```

### Test 3: Error Handling
```
1. Draggear archivo vacío → Error message
2. Archivo con campos inválidos → Validation errors
3. Archivo demasiado grande → Size error
4. Sin token → Auth error
```

### Test 4: UI/UX
```
1. Selector formato responde
2. Preview muestra datos correctos
3. Botones funcionan
4. Mensajes claros
5. Transiciones smooth
```

---

## 🎬 RESULTADO ESPERADO

Después de implementar estas mejoras:

✅ **Mismo nivel de robustez** que Excel Import
✅ **Soporte para múltiples formatos**
✅ **Validación de datos**
✅ **Integración con API**
✅ **Soporte multiidioma**
✅ **Instrucciones claras**
✅ **UX moderna y consistente**

