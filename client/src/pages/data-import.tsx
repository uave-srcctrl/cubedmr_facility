import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  FileJson,
  File,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Trash2,
  FileCode,
  Folder,
  Info,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createSampleExcel, validateExcelData, remapExcelColumns } from '@/lib/excel-utils';

interface ImportRow {
  [key: string]: any;
}

interface ImportResult {
  success: boolean;
  message: string;
  data?: ImportRow[];
  errors?: string[];
  validatedData?: ImportRow[];  // Datos después de validación
}

interface FileFormat {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  acceptedTypes: Record<string, string[]>;
  color: string;
  maxFileSize: number; // en bytes
}

const FILE_FORMATS: FileFormat[] = [
  {
    id: 'excel',
    name: 'Excel',
    icon: <FileSpreadsheet className="h-5 w-5" />,
    description: 'XLSX, XLS spreadsheets with full validation',
    acceptedTypes: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    color: 'text-green-600',
    maxFileSize: 10 * 1024 * 1024, // 10MB
  },
  {
    id: 'csv',
    name: 'CSV/TSV',
    icon: <FileText className="h-5 w-5" />,
    description: 'Comma or tab separated values',
    acceptedTypes: {
      'text/csv': ['.csv', '.tsv', '.txt'],
    },
    color: 'text-blue-600',
    maxFileSize: 50 * 1024 * 1024, // 50MB
  },
  {
    id: 'json',
    name: 'JSON',
    icon: <FileJson className="h-5 w-5" />,
    description: 'JSON structured data',
    acceptedTypes: {
      'application/json': ['.json'],
    },
    color: 'text-yellow-600',
    maxFileSize: 50 * 1024 * 1024, // 50MB
  },
  {
    id: 'xml',
    name: 'XML',
    icon: <FileCode className="h-5 w-5" />,
    description: 'XML format data',
    acceptedTypes: {
      'application/xml': ['.xml'],
      'text/xml': ['.xml'],
    },
    color: 'text-purple-600',
    maxFileSize: 50 * 1024 * 1024, // 50MB
  },
  {
    id: 'hl7',
    name: 'HL7/FHIR',
    icon: <File className="h-5 w-5" />,
    description: 'HL7 clinical data format',
    acceptedTypes: {
      'text/plain': ['.hl7', '.fhir', '.txt'],
    },
    color: 'text-red-600',
    maxFileSize: 50 * 1024 * 1024, // 50MB
  },
  {
    id: 'docx',
    name: 'Word/PDF',
    icon: <FileText className="h-5 w-5" />,
    description: 'DOCX and PDF documents',
    acceptedTypes: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/pdf': ['.pdf'],
    },
    color: 'text-indigo-600',
    maxFileSize: 50 * 1024 * 1024, // 50MB
  },
];

export default function DataImportPage() {
  const [selectedFormat, setSelectedFormat] = useState<string>('excel');
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<ImportRow[]>([]);
  const [importMode, setImportMode] = useState<'single' | 'directory'>('single');
  const [showValidation, setShowValidation] = useState(false);
  const { toast } = useToast();

  const currentFormat = FILE_FORMATS.find(f => f.id === selectedFormat);

  // Dropzone para archivos individuales
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setFiles([file]);
      setImportResult(null);
      setPreviewData([]);
      processFile(file, selectedFormat);
    }
  }, [selectedFormat]);

  // Dropzone para directorios
  const onDropDirectory = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFiles(acceptedFiles);
      setImportResult(null);
      setPreviewData([]);
      processMultipleFiles(acceptedFiles, selectedFormat);
    }
  }, [selectedFormat]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: importMode === 'single' ? onDrop : onDropDirectory,
    accept: currentFormat?.acceptedTypes,
    multiple: importMode === 'directory',
    maxSize: currentFormat?.maxFileSize || 50 * 1024 * 1024,
  });

  // Función para procesar un archivo individual
  const processFile = async (file: File, format: string) => {
    setIsProcessing(true);
    setProgress(0);

    try {
      const reader = new FileReader();

      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          setProgress((event.loaded / event.total) * 50);
        }
      };

      reader.onload = (e) => {
        try {
          const content = e.target?.result;
          let processedData: ImportRow[] = [];

          switch (format) {
            case 'excel':
              processedData = processExcel(content as ArrayBuffer);
              break;
            case 'csv':
              processedData = processCSV(content as string);
              break;
            case 'json':
              processedData = processJSON(content as string);
              break;
            case 'xml':
              processedData = processXML(content as string);
              break;
            case 'hl7':
              processedData = processHL7(content as string);
              break;
            default:
              throw new Error(`Unsupported format: ${format}`);
          }

          setProgress(75);

          if (processedData.length === 0) {
            throw new Error('No data found in file');
          }

          // Validar si es Excel (formato especial)
          let validationResult: { isValid: boolean; errors: string[]; data: any[] } = { isValid: true, errors: [], data: processedData };
          if (format === 'excel') {
            validationResult = validateExcelData(processedData);
            setShowValidation(true);
          }

          setPreviewData(processedData.slice(0, 10));
          setImportResult({
            success: validationResult.isValid,
            message: validationResult.isValid
              ? `Successfully parsed ${processedData.length} records from ${file.name}`
              : `Archivo procesado con ${validationResult.errors.length} errores de validación`,
            data: processedData,
            errors: validationResult.errors,
            validatedData: validationResult.data,
          });

          if (validationResult.isValid) {
            toast({
              title: 'Archivo procesado exitosamente',
              description: `${processedData.length} registros encontrados y validados`,
            });
          } else {
            toast({
              title: 'Advertencia de validación',
              description: `${validationResult.errors.length} errores encontrados`,
              variant: 'destructive',
            });
          }

          setProgress(100);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
          setImportResult({
            success: false,
            message: `Error procesando archivo: ${errorMessage}`,
            errors: [errorMessage],
          });
          toast({
            title: 'Error procesando archivo',
            description: errorMessage,
            variant: 'destructive',
          });
        }

        setIsProcessing(false);
      };

      if (format === 'excel') {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setImportResult({
        success: false,
        message: `Error leyendo archivo: ${errorMessage}`,
        errors: [errorMessage],
      });
      setIsProcessing(false);
    }
  };

  // Función para procesar múltiples archivos (directorio)
  const processMultipleFiles = async (fileList: File[], format: string) => {
    setIsProcessing(true);
    setProgress(0);

    const allData: ImportRow[] = [];
    const allErrors: string[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const fileProgress = (i / fileList.length) * 100;
      setProgress(fileProgress);

      try {
        const reader = new FileReader();

        reader.onload = (e) => {
          try {
            const content = e.target?.result;
            let processedData: ImportRow[] = [];

            switch (format) {
              case 'excel':
                processedData = processExcel(content as ArrayBuffer);
                break;
              case 'csv':
                processedData = processCSV(content as string);
                break;
              case 'json':
                processedData = processJSON(content as string);
                break;
              case 'xml':
                processedData = processXML(content as string);
                break;
              case 'hl7':
                processedData = processHL7(content as string);
                break;
            }

            allData.push(...processedData);
          } catch (error) {
            allErrors.push(`${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        };

        if (format === 'excel') {
          reader.readAsArrayBuffer(file);
        } else {
          reader.readAsText(file);
        }
      } catch (error) {
        allErrors.push(`${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Pequeña pausa para actualizar el UI
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setProgress(100);
    setImportResult({
      success: allErrors.length === 0,
      message: `Procesados ${fileList.length} archivos. Total: ${allData.length} registros.`,
      data: allData,
      errors: allErrors,
    });

    setPreviewData(allData.slice(0, 10));
    setIsProcessing(false);
  };

  // Procesadores de formato
  const processExcel = (arrayBuffer: ArrayBuffer): ImportRow[] => {
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (jsonData.length === 0) {
      throw new Error('Archivo Excel vacío');
    }

    const headers = jsonData[0] as string[];
    const rows = jsonData.slice(1) as any[][];

    return rows.map((row) => {
      const obj: ImportRow = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] ?? null;
      });
      return obj;
    });
  };

  const processCSV = (content: string): ImportRow[] => {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      throw new Error('Archivo CSV vacío');
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1);

    return rows.map((row) => {
      const values = row.split(',').map(v => v.trim());
      const obj: ImportRow = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] || null;
      });
      return obj;
    });
  };

  const processJSON = (content: string): ImportRow[] => {
    const data = JSON.parse(content);
    if (!Array.isArray(data)) {
      throw new Error('JSON debe ser un array de objetos');
    }
    return data;
  };

  const processXML = (content: string): ImportRow[] => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(content, 'text/xml');

    if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
      throw new Error('Formato XML inválido');
    }

    const records: ImportRow[] = [];
    const elements = xmlDoc.documentElement.children;

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      const record: ImportRow = {};

      for (let j = 0; j < element.children.length; j++) {
        const child = element.children[j];
        record[child.nodeName] = child.textContent;
      }

      records.push(record);
    }

    if (records.length === 0) {
      throw new Error('No se encontraron registros válidos en XML');
    }

    return records;
  };

  const processHL7 = (content: string): ImportRow[] => {
    const segments = content.split('\n').filter(line => line.trim());
    const records: ImportRow[] = [];

    segments.forEach((segment) => {
      const parts = segment.split('|');
      if (parts.length > 0) {
        const record: ImportRow = {
          segmentType: parts[0],
          data: parts.slice(1).join('|'),
          rawSegment: segment,
        };
        records.push(record);
      }
    });

    if (records.length === 0) {
      throw new Error('No se encontraron registros HL7 válidos');
    }

    return records;
  };

  // Función para importar datos al backend
  const handleImport = async () => {
    if (!importResult?.validatedData && !importResult?.data) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token de autenticación no encontrado. Por favor, inicia sesión nuevamente.');
      }

      const dataToImport = importResult.validatedData || importResult.data;
      if (!dataToImport) {
        throw new Error('No hay datos para importar');
      }
      
      // Determinar endpoint según el formato
      let endpoint = '/api/import-data';
      if (selectedFormat === 'excel') {
        endpoint = '/api/import-excel';
      } else if (selectedFormat === 'hl7') {
        endpoint = '/api/import-hl7';
      } else if (selectedFormat === 'json') {
        endpoint = '/api/import-json';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          data: dataToImport,
          filename: files[0]?.name || 'imported-data',
          format: selectedFormat,
          fileCount: files.length,
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al importar los datos');
      }

      const result = await response.json();

      setImportResult(prev => ({
        ...prev!,
        success: true,
        message: `Datos importados exitosamente. ${result.insertedCount || dataToImport.length} registros procesados.`
      }));

      toast({
        title: "Importación exitosa",
        description: `${result.insertedCount || dataToImport.length} registros importados.`,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setImportResult(prev => ({
        ...prev!,
        success: false,
        message: `Error al importar: ${errorMessage}`,
        errors: [...(prev?.errors || []), errorMessage]
      }));
      
      toast({
        title: "Error en importación",
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  // Limpiar archivos
  const handleClearFiles = () => {
    setFiles([]);
    setImportResult(null);
    setPreviewData([]);
    setProgress(0);
    setShowValidation(false);
  };

  // Descargar muestra
  const handleDownloadSample = () => {
    if (selectedFormat === 'excel') {
      createSampleExcel();
    } else {
      const sampleData = getSampleData(selectedFormat);
      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(sampleData));
      element.setAttribute('download', `sample.${getSampleExtension(selectedFormat)}`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }

    toast({
      title: "Archivo descargado",
      description: `Archivo de muestra para ${currentFormat?.name}`,
    });
  };

  const getSampleExtension = (format: string): string => {
    const extensions: Record<string, string> = {
      csv: 'csv',
      json: 'json',
      xml: 'xml',
      hl7: 'hl7',
    };
    return extensions[format] || 'txt';
  };

  const getSampleData = (format: string): string => {
    const sampleWoundRecords = [
      { patient_id: 'P001', facility_id: 5, location: 'Left leg', surface: 10.5, push_score: 12, progress: 'Improving', disposition: 'Active', dos: '2025-01-15' },
      { patient_id: 'P002', facility_id: 5, location: 'Right arm', surface: 5.2, push_score: 8, progress: 'Stable', disposition: 'Active', dos: '2025-01-16' },
    ];

    switch (format) {
      case 'csv':
        const csvHeaders = Object.keys(sampleWoundRecords[0]).join(',');
        const csvRows = sampleWoundRecords.map(r => Object.values(r).join(',')).join('\n');
        return `${csvHeaders}\n${csvRows}`;
      case 'json':
        return JSON.stringify(sampleWoundRecords, null, 2);
      case 'xml':
        return '<?xml version="1.0"?>\n<records>\n' +
          sampleWoundRecords.map(r => 
            `  <record>\n${Object.entries(r).map(([k, v]) => `    <${k}>${v}</${k}>`).join('\n')}\n  </record>`
          ).join('\n') +
          '\n</records>';
      case 'hl7':
        return 'MSH|^~\\&|SYSTEM|FACILITY|RECEIVER|FACILITY|20240101000000||ADT^A01|MSG001|P|2.5\n' +
          'PID|1||P001^^^SYSTEM||DOE^JOHN||19800101|M|||123 MAIN ST^^CITY^STATE^12345||(555)555-5555\n' +
          'OBX|1|NM|SURFACE^Surface Area||10.5|cm2';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Data Import Hub</h1>
        <p className="text-muted-foreground">
          Import patient and wound data from multiple formats. Select a format to begin.
        </p>
      </div>

      {/* Tabs para modo de importación */}
      <Tabs value={importMode} onValueChange={(value) => {
        setImportMode(value as 'single' | 'directory');
        handleClearFiles();
      }}>
        <TabsList>
          <TabsTrigger value="single">Single File</TabsTrigger>
          <TabsTrigger value="directory">Directory</TabsTrigger>
        </TabsList>
        <TabsContent value="single" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                Upload a single file to import data
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="directory" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                Upload multiple files from a directory for batch processing
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Selector de formato */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {FILE_FORMATS.map((format) => (
          <button
            key={format.id}
            onClick={() => {
              setSelectedFormat(format.id);
              handleClearFiles();
            }}
            className={`
              flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all
              ${selectedFormat === format.id
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-primary/2'
              }
            `}
          >
            <div className={format.color}>{format.icon}</div>
            <div className="text-sm font-medium text-center line-clamp-2">{format.name}</div>
          </button>
        ))}
      </div>

      {/* Tarjeta principal de importación */}
      {currentFormat && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${currentFormat.color} bg-primary/10`}>
                  {currentFormat.icon}
                </div>
                <div>
                  <CardTitle>{currentFormat.name} - Import</CardTitle>
                  <CardDescription>{currentFormat.description}</CardDescription>
                </div>
              </div>
              <Badge variant="outline">{currentFormat.name}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-primary/2'
                }
              `}
            >
              <input {...(getInputProps() as any)} webkitdirectory={importMode === 'directory'} />
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium text-foreground">
                {isDragActive
                  ? 'Drop files here...'
                  : importMode === 'directory'
                    ? `Drag and drop ${currentFormat.name} files here`
                    : `Drag and drop your ${currentFormat.name} file here`
                }
              </p>
              <p className="text-sm text-muted-foreground mt-1">or click to select</p>
              <p className="text-xs text-muted-foreground mt-2">
                Maximum size: {(currentFormat.maxFileSize / 1024 / 1024).toFixed(0)}MB
              </p>
            </div>

            {/* File Info */}
            {files.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Selected Files ({files.length})</p>
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {files.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileSpreadsheet className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="text-sm truncate">
                          <p className="font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFiles}
                  disabled={isProcessing}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
            )}

            {/* Progress */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Processing...</span>
                  <span className="text-muted-foreground">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Resultados y Validación */}
            {importResult && (
              <div className="space-y-4">
                <Alert variant={importResult.success ? 'default' : 'destructive'}>
                  {importResult.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>
                    {importResult.success ? 'Importación Exitosa' : 'Error en Importación'}
                  </AlertTitle>
                  <AlertDescription>{importResult.message}</AlertDescription>
                </Alert>

                {/* Errores de validación */}
                {showValidation && importResult.errors && importResult.errors.length > 0 && (
                  <Card className="border-red-200 bg-red-50">
                    <CardHeader>
                      <CardTitle className="text-red-900 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Errores de Validación ({importResult.errors.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {importResult.errors.slice(0, 10).map((error, idx) => (
                          <p key={idx} className="text-sm text-red-800">
                            • {error}
                          </p>
                        ))}
                        {importResult.errors.length > 10 && (
                          <p className="text-sm text-red-700 font-medium">
                            ... y {importResult.errors.length - 10} errores más
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Vista previa de datos */}
            {previewData.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Vista Previa de Datos (primeros 10 registros)
                </h3>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr className="border-b">
                        {Object.keys(previewData[0]).slice(0, 5).map((key) => (
                          <th key={key} className="text-left px-3 py-2 font-medium">
                            {key}
                          </th>
                        ))}
                        {Object.keys(previewData[0]).length > 5 && (
                          <th className="text-left px-3 py-2 font-medium">
                            +{Object.keys(previewData[0]).length - 5} más
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="border-b hover:bg-muted/50">
                          {Object.values(row)
                            .slice(0, 5)
                            .map((value, colIdx) => (
                              <td key={colIdx} className="px-3 py-2 text-sm">
                                {String(value || '-')}
                              </td>
                            ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground">
                  Total de registros: {importResult?.data?.length || 0}
                </p>
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex gap-2 pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={handleDownloadSample}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar Muestra
              </Button>
              {importResult?.success && (
                <Button 
                  onClick={handleImport}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? 'Importando...' : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Importar Datos
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instrucciones por formato */}
      {currentFormat && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Instrucciones de Importación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedFormat === 'excel' && (
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium mb-2">Formato del Archivo Excel:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                    <li>La primera fila debe contener los nombres de las columnas</li>
                    <li>Columnas requeridas: patient_id, facility_id, location, surface, push_score, progress, disposition, dos</li>
                    <li>Formato de fecha: YYYY-MM-DD (ej: 2025-01-15)</li>
                    <li>Valores numéricos: surface y push_score deben ser números</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Validaciones:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                    <li>patient_id no puede estar vacío</li>
                    <li>facility_id debe ser un número válido</li>
                    <li>surface debe ser un número positivo</li>
                    <li>push_score debe estar entre 0 y 17</li>
                    <li>progress debe ser: Improving, Deteriorating, Stable</li>
                    <li>disposition debe ser: Active, Resolved, New, Hospitalized</li>
                  </ul>
                </div>
              </div>
            )}
            {selectedFormat === 'csv' && (
              <div>
                <h4 className="font-medium mb-2">Formato CSV:</h4>
                <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                  <li>Primera fila: nombres de columnas</li>
                  <li>Separador: coma (,) o tabulación</li>
                  <li>Valores con espacios deben ir entre comillas</li>
                  <li>Codificación recomendada: UTF-8</li>
                </ul>
              </div>
            )}
            {selectedFormat === 'json' && (
              <div>
                <h4 className="font-medium mb-2">Formato JSON:</h4>
                <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                  <li>Debe ser un array de objetos</li>
                  <li>Cada objeto representa un registro</li>
                  <li>Las claves deben ser strings válidos</li>
                  <li>Ejemplo: [{"{ patient_id: 'P001', facility_id: 5 }"}]</li>
                </ul>
              </div>
            )}
            {selectedFormat === 'xml' && (
              <div>
                <h4 className="font-medium mb-2">Formato XML:</h4>
                <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                  <li>Estructura: root elemento con múltiples registros</li>
                  <li>Cada registro debe tener elementos secundarios</li>
                  <li>Declaración XML recomendada: {"<?xml version='1.0'?>"}</li>
                  <li>Encoding recomendado: UTF-8</li>
                </ul>
              </div>
            )}
            {selectedFormat === 'hl7' && (
              <div>
                <h4 className="font-medium mb-2">Formato HL7:</h4>
                <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                  <li>Separador de segmentos: salto de línea</li>
                  <li>Separador de campos: | (pipe)</li>
                  <li>Primer segmento: MSH (encabezado del mensaje)</li>
                  <li>Segmentos comunes: PID (paciente), OBX (observación)</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
