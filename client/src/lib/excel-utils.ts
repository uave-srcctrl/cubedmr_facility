import * as XLSX from 'xlsx';

// ============================================================================
// MAPEO DE COLUMNAS: Nombres de Excel (amigables) → Nombres BD internos
// ============================================================================
// Soporta dos formatos de entrada:
// Formato 1 (original): Nombres cortos/abreviados
// Formato 2 (nuevo): Nombres descriptivos completos
const COLUMN_MAPPING: Record<string, string> = {
  // Formato 1: Nombres cortos (compatibilidad hacia atrás)
  'Pt_Name': 'patient_id',
  'Pt Name': 'patient_id',
  'Facility': 'facility_id',
  'Wound Loc': 'location',
  'Etiology': 'etiology',
  'SA(cm2)': 'surface',
  'SA (cm²)': 'surface',
  'PUSH_SCORE': 'push_score',
  'Progress': 'progress',
  'Disposition': 'disposition',
  'DOS': 'dos',
  'Provider': 'provider_id',
  'Patient Name': 'patient_name',
  'Width': 'width',
  'Height': 'height',
  'Depth': 'depth',
  'Size (Cm)': 'size', // Transformación especial
  'Exudate': 'exudate',
  'Tissue': 'tissue',
  'Treatment': 'treatment',
  'Tx Plan': 'treatment',
  'Frequency': 'frequency',
  'Debridement': 'debridement',
  'Appropriate debridement': 'debridement',
  'Init SA': 'initial_surface',
  'Initial SA': 'initial_surface',
  'Start Date': 'start_date',
  'Wound start date': 'start_date',
  'Days': 'days',
  'Duration (days)': 'days',
  'Healing %': 'healing_percentage',
  '% Healing2': 'healing_percentage',
  'Healing Rate': 'healing_rate',
  'Healing Velocity (cm²/Week)': 'healing_rate',
  'Healing Days': 'healing_days',
  'Healing Time Days': 'healing_days',
  
  // Campos a ignorar
  'Helper Colum': null,
  'Helper Column': null
};

// ============================================================================
// TRANSFORMACIONES ESPECIALES
// ============================================================================

/**
 * Parsea campo "Size (Cm)" en formato "WxHxD" a width, height, depth
 * @param sizeStr - String en formato "5x4x2" o null
 * @returns Objeto con width, height, depth o null si no se puede parsear
 */
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

// ============================================================================
// REMAPEO DE COLUMNAS
// ============================================================================

// Función para remapear columnas de Excel a nombres internos
export function remapExcelColumns(data: any[]): any[] {
  if (data.length === 0) return data;

  const firstRow = data[0];
  const originalKeys = Object.keys(firstRow);

  let keyMapping: Record<string, string> = {};
  originalKeys.forEach(key => {
    if (COLUMN_MAPPING[key] !== undefined && COLUMN_MAPPING[key] !== null) {
      keyMapping[key] = COLUMN_MAPPING[key];
    } else if (COLUMN_MAPPING[key] === null) {
      // Ignorar columnas con valor null (Helper Colum, etc)
      keyMapping[key] = '';
    } else {
      // Mantener columnas no mapeadas tal como están
      keyMapping[key] = key;
    }
  });

  return data.map(row => {
    const newRow: Record<string, any> = {};
    
    Object.entries(row).forEach(([key, value]) => {
      const newKey = keyMapping[key];
      
      // Ignorar campos mapeados a vacío
      if (newKey === '') {
        return;
      }
      
      // Transformación especial para "Size (Cm)"
      if (newKey === 'size') {
        const sizeParsed = parseSize(value);
        if (sizeParsed) {
          newRow.width = sizeParsed.width;
          newRow.height = sizeParsed.height;
          newRow.depth = sizeParsed.depth;
        }
      } else {
        newRow[newKey || key] = value;
      }
    });
    
    return newRow;
  });
}

// Función para crear y descargar un archivo Excel de ejemplo
export function createSampleExcel() {
  // Datos de ejemplo basados en los campos reales de facility.wound_encounters
  // Usando los nombres de columnas amigables para el usuario
  const sampleData = [
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
      'Treatment': 'Dressing change with hydrogel',
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
    },
    {
      'Pt_Name': 'P002',
      'Facility': 5,
      'Provider': 102,
      'Patient Name': 'María García',
      'Wound Loc': 'Right arm',
      'Etiology': 'Surgical',
      'Width': 3.0,
      'Height': 2.5,
      'Depth': 0.8,
      'SA(cm2)': 5.2,
      'Exudate': 'Minimal',
      'Tissue': 'Epithelialization',
      'Treatment': 'Simple dressing',
      'Frequency': '3 times per week',
      'Progress': 'Stable',
      'Disposition': 'Active',
      'Debridement': 'None',
      'Init SA': 5.5,
      'Start Date': '2025-01-01',
      'DOS': '2025-01-16',
      'Days': 15,
      'Healing %': 5.5,
      'Healing Rate': 0.2,
      'Healing Days': 60,
      'PUSH_SCORE': 8
    },
    {
      'Pt_Name': 'P003',
      'Facility': 5,
      'Provider': 103,
      'Patient Name': 'Carlos López',
      'Wound Loc': 'Back',
      'Etiology': 'Pressure Ulcer',
      'Width': 8.0,
      'Height': 6.5,
      'Depth': 2.2,
      'SA(cm2)': 15.8,
      'Exudate': 'Heavy',
      'Tissue': 'Necrotic',
      'Treatment': 'Enzymatic debridement',
      'Frequency': 'Daily',
      'Progress': 'Deteriorating',
      'Disposition': 'Active',
      'Debridement': 'Enzymatic',
      'Init SA': 14.0,
      'Start Date': '2024-11-20',
      'DOS': '2025-01-17',
      'Days': 58,
      'Healing %': 0.0,
      'Healing Rate': -0.1,
      'Healing Days': 120,
      'PUSH_SCORE': 15
    },
    {
      'Pt_Name': 'P004',
      'Facility': 5,
      'Provider': 101,
      'Patient Name': 'Ana Martínez',
      'Wound Loc': 'Sacro',
      'Etiology': 'Pressure Ulcer',
      'Width': 4.5,
      'Height': 3.8,
      'Depth': 1.2,
      'SA(cm2)': 8.3,
      'Exudate': 'Moderate',
      'Tissue': 'Granulation',
      'Treatment': 'Moist dressing',
      'Frequency': '2 times per week',
      'Progress': 'Improving',
      'Disposition': 'Resolved',
      'Debridement': 'None',
      'Init SA': 10.0,
      'Start Date': '2024-12-10',
      'DOS': '2025-01-18',
      'Days': 39,
      'Healing %': 17.0,
      'Healing Rate': 0.5,
      'Healing Days': 75,
      'PUSH_SCORE': 10
    },
    {
      'Pt_Name': 'P005',
      'Facility': 5,
      'Provider': 104,
      'Patient Name': 'Roberto Sánchez',
      'Wound Loc': 'Left heel',
      'Etiology': 'Diabetic',
      'Width': 2.0,
      'Height': 1.8,
      'Depth': 0.5,
      'SA(cm2)': 3.1,
      'Exudate': 'Minimal',
      'Tissue': 'Epithelialization',
      'Treatment': 'Silicone dressing',
      'Frequency': 'Weekly',
      'Progress': 'Stable',
      'Disposition': 'Active',
      'Debridement': 'None',
      'Init SA': 3.5,
      'Start Date': '2025-01-05',
      'DOS': '2025-01-19',
      'Days': 14,
      'Healing %': 11.4,
      'Healing Rate': 0.3,
      'Healing Days': 45,
      'PUSH_SCORE': 6
    }
  ];

  // Crear workbook
  const wb = XLSX.utils.book_new();

  // Crear worksheet
  const ws = XLSX.utils.json_to_sheet(sampleData);

  // Ajustar anchos de columna
  const columnWidths = [
    { wch: 10 }, // Pt_Name
    { wch: 10 }, // Facility
    { wch: 10 }, // Provider
    { wch: 18 }, // Patient Name
    { wch: 15 }, // Wound Loc
    { wch: 20 }, // Etiology
    { wch: 8 },  // Width
    { wch: 8 },  // Height
    { wch: 8 },  // Depth
    { wch: 12 }, // SA(cm2)
    { wch: 12 }, // Exudate
    { wch: 18 }, // Tissue
    { wch: 30 }, // Treatment
    { wch: 15 }, // Frequency
    { wch: 12 }, // Progress
    { wch: 12 }, // Disposition
    { wch: 15 }, // Debridement
    { wch: 12 }, // Init SA
    { wch: 12 }, // Start Date
    { wch: 12 }, // DOS
    { wch: 8 },  // Days
    { wch: 12 }, // Healing %
    { wch: 13 }, // Healing Rate
    { wch: 13 }, // Healing Days
    { wch: 12 }  // PUSH_SCORE
  ];

  ws['!cols'] = columnWidths;

  // Agregar worksheet al workbook
  XLSX.utils.book_append_sheet(wb, ws, 'WoundData');

  // Descargar archivo
  XLSX.writeFile(wb, 'wound_data_template.xlsx');
}


// Función para validar datos antes de importar
export function validateExcelData(rawData: any[]): { isValid: boolean; errors: string[]; data: any[] } {
  // Remapear columnas de nombres amigables a nombres internos
  const data = remapExcelColumns(rawData);
  const errors: string[] = [];
  
  // Campos requeridos (mínimos)
  const requiredFields = [
    'patient_id',
    'facility_id',
    'location',
    'etiology',
    'surface',
    'push_score',
    'progress',
    'disposition',
    'dos'
  ];

  // Campos que deben ser numéricos
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

  // Valores válidos para campos enumerados
  const validProgress = ['Improving', 'Deteriorating', 'Stable'];
  const validDisposition = ['Active', 'Resolved', 'New', 'Hospitalized'];
  const validExudate = ['None', 'Minimal', 'Moderate', 'Heavy', 'Copious'];
  const validDebridement = ['None', 'Autolytic', 'Enzymatic', 'Mechanical', 'Surgical'];

  data.forEach((row, index) => {
    const rowNum = index + 2; // +2 porque Excel cuenta desde 1 y hay header

    // Verificar campos requeridos
    requiredFields.forEach(field => {
      if (!row[field] && row[field] !== 0) {
        errors.push(`Fila ${rowNum}: Campo requerido faltante: ${field}`);
      }
    });

    // Validar tipos de datos numéricos
    numericFields.forEach(field => {
      if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
        if (isNaN(parseFloat(row[field]))) {
          errors.push(`Fila ${rowNum}: Campo "${field}" debe ser un número, recibido: ${row[field]}`);
        }
      }
    });

    // Validaciones específicas
    if (row.surface && (isNaN(parseFloat(row.surface)) || parseFloat(row.surface) < 0)) {
      errors.push(`Fila ${rowNum}: Área de superficie inválida: ${row.surface} (debe ser positivo)`);
    }

    if (row.push_score && (isNaN(parseInt(row.push_score)) || parseInt(row.push_score) < 0 || parseInt(row.push_score) > 17)) {
      errors.push(`Fila ${rowNum}: PUSH score inválido: ${row.push_score} (debe ser 0-17)`);
    }

    if (row.facility_id && isNaN(parseInt(row.facility_id))) {
      errors.push(`Fila ${rowNum}: ID de facility inválido: ${row.facility_id}`);
    }

    // Validar valores enumerados
    if (row.progress && !validProgress.includes(row.progress)) {
      errors.push(`Fila ${rowNum}: Progreso inválido: "${row.progress}" (debe ser: ${validProgress.join(', ')})`);
    }

    if (row.disposition && !validDisposition.includes(row.disposition)) {
      errors.push(`Fila ${rowNum}: Disposición inválida: "${row.disposition}" (debe ser: ${validDisposition.join(', ')})`);
    }

    if (row.exudate && !validExudate.includes(row.exudate)) {
      errors.push(`Fila ${rowNum}: Exudado inválido: "${row.exudate}" (debe ser: ${validExudate.join(', ')})`);
    }

    if (row.debridement && !validDebridement.includes(row.debridement)) {
      errors.push(`Fila ${rowNum}: Desbridamiento inválido: "${row.debridement}" (debe ser: ${validDebridement.join(', ')})`);
    }

    // Validar fechas
    if (row.dos) {
      const date = new Date(row.dos);
      if (isNaN(date.getTime())) {
        errors.push(`Fila ${rowNum}: Fecha de servicio inválida: ${row.dos} (formato esperado: YYYY-MM-DD)`);
      }
    }

    if (row.start_date) {
      const date = new Date(row.start_date);
      if (isNaN(date.getTime())) {
        errors.push(`Fila ${rowNum}: Fecha de inicio inválida: ${row.start_date} (formato esperado: YYYY-MM-DD)`);
      }
    }

    // Validar que start_date <= dos
    if (row.start_date && row.dos) {
      const startDate = new Date(row.start_date);
      const dosDate = new Date(row.dos);
      if (startDate > dosDate) {
        errors.push(`Fila ${rowNum}: Fecha de inicio (${row.start_date}) no puede ser posterior a fecha de servicio (${row.dos})`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    data  // Retornar datos remapeados
  };
}