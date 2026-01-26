import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createSampleExcel, validateExcelData } from '@/lib/excel-utils';

interface ExcelRow {
  [key: string]: any;
}

interface ImportResult {
  success: boolean;
  message: string;
  data?: ExcelRow[];
  errors?: string[];
}

export default function ExcelImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<ExcelRow[]>([]);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImportResult(null);
      setPreviewData([]);
      processFile(selectedFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setProgress(0);

    try {
      const reader = new FileReader();

      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          setProgress((event.loaded / event.total) * 50); // First 50% for reading
        }
      };

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });

          // Get first worksheet
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: ''
          });

          setProgress(75);

          if (jsonData.length === 0) {
            throw new Error('El archivo Excel está vacío');
          }

          // Convert to objects with headers
          const headers = jsonData[0] as string[];
          const rows = jsonData.slice(1) as any[][];

          const processedData = rows.map((row, index) => {
            const obj: ExcelRow = {};
            headers.forEach((header, colIndex) => {
              obj[header] = row[colIndex] || '';
            });
            return obj;
          });

          // Show preview (first 5 rows)
          setPreviewData(processedData.slice(0, 5));

          // Validate data
          const validation = validateExcelData(processedData);
          if (!validation.isValid) {
            setImportResult({
              success: false,
              message: `Archivo procesado pero con errores de validación. Revisa los detalles.`,
              data: processedData,
              errors: validation.errors.slice(0, 10) // Show first 10 errors
            });
          } else {
            setImportResult({
              success: true,
              message: `Archivo procesado exitosamente. ${processedData.length} filas encontradas y validadas.`,
              data: processedData
            });
          }

          setProgress(100);

          toast({
            title: "Archivo procesado",
            description: `${processedData.length} filas encontradas en el archivo.`,
          });

        } catch (error) {
          console.error('Error processing file:', error);
          setImportResult({
            success: false,
            message: 'Error al procesar el archivo Excel.',
            errors: [error instanceof Error ? error.message : 'Error desconocido']
          });
        }
      };

      reader.readAsArrayBuffer(file);

    } catch (error) {
      console.error('Error reading file:', error);
      setImportResult({
        success: false,
        message: 'Error al leer el archivo.',
        errors: [error instanceof Error ? error.message : 'Error desconocido']
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!importResult?.data) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      // Get the authorization token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      // Simulate API call to import data
      const response = await fetch('/api/import-excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          data: importResult.data,
          filename: file?.name
        })
      });

      if (!response.ok) {
        throw new Error('Error al importar los datos');
      }

      const result = await response.json();

      setImportResult({
        success: true,
        message: `Datos importados exitosamente. ${result.insertedCount} registros procesados.`
      });

      toast({
        title: "Importación exitosa",
        description: `${result.insertedCount} registros procesados.`,
      });

    } catch (error) {
      console.error('Import error:', error);
      setImportResult({
        success: false,
        message: 'Error al importar los datos.',
        errors: [error instanceof Error ? error.message : 'Error desconocido']
      });
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  const clearFile = () => {
    setFile(null);
    setImportResult(null);
    setPreviewData([]);
    setProgress(0);
  };

  const downloadTemplate = () => {
    createSampleExcel();
    toast({
      title: "Plantilla descargada",
      description: "El archivo de plantilla se ha descargado.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Importar Datos Excel</h1>
          <p className="text-muted-foreground">
            Sube un archivo Excel para importar datos de heridas
          </p>
        </div>
        <Button onClick={downloadTemplate} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Descargar Plantilla
        </Button>
      </div>

      {/* Drop Zone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Subir Archivo Excel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            {isDragActive ? (
              <p className="text-lg font-medium">Suelta el archivo aquí...</p>
            ) : (
              <div>
                <p className="text-lg font-medium mb-2">
                  Arrastra y suelta un archivo Excel aquí
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  O haz clic para seleccionar un archivo
                </p>
                <p className="text-xs text-muted-foreground">
                  Formatos soportados: .xlsx, .xls (máx. 10MB)
                </p>
              </div>
            )}
          </div>

          {file && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-green-600" />
                  <span className="font-medium">{file.name}</span>
                  <Badge variant="secondary">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={clearFile}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress */}
      {isProcessing && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Procesando archivo...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {previewData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vista Previa de Datos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {Object.keys(previewData[0]).map((header) => (
                      <th key={header} className="text-left p-2 font-medium">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, index) => (
                    <tr key={index} className="border-b">
                      {Object.values(row).map((value, colIndex) => (
                        <td key={colIndex} className="p-2">
                          {String(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Mostrando las primeras 5 filas. Total: {importResult?.data?.length} filas.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {importResult && (
        <Card>
          <CardContent className="pt-6">
            <Alert className={importResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <div className="flex items-center gap-2">
                {importResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <AlertDescription className={importResult.success ? 'text-green-800' : 'text-red-800'}>
                  {importResult.message}
                </AlertDescription>
              </div>
            </Alert>

            {importResult.errors && importResult.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-red-800 mb-2">Errores encontrados:</h4>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {importResult.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {importResult.success && importResult.data && (
              <div className="mt-4 flex gap-2">
                <Button onClick={handleImport} disabled={isProcessing}>
                  {isProcessing ? 'Importando...' : 'Importar Datos'}
                </Button>
                <Button variant="outline" onClick={clearFile}>
                  Limpiar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Instrucciones de Importación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Formato del Archivo Excel:</h4>
            <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
              <li>La primera fila debe contener los nombres de las columnas</li>
              <li>Columnas requeridas: patient_id, facility_id, location, etiology, surface, push_score, progress, disposition, dos</li>
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
              <li>disposition debe ser: Active, Resolved, New</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}