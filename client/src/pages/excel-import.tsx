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
import { useSettings } from '@/hooks/use-settings';
import { createSampleExcel, validateExcelData } from '@/lib/excel-utils';
import { logger } from "@/lib/logger";

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
  const { isComponentEnabled } = useSettings();
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
            throw new Error('The Excel file is empty');
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
              message: `File processed but with validation errors. Review the details.`,
              data: processedData,
              errors: validation.errors.slice(0, 10) // Show first 10 errors
            });
          } else {
            setImportResult({
              success: true,
              message: `File processed successfully. ${processedData.length} rows found and validated.`,
              data: processedData
            });
          }

          setProgress(100);

          toast({
            title: "File processed",
            description: `${processedData.length} rows found in the file.`,
          });

        } catch (error) {
          logger.error('Error processing file:', error);
          setImportResult({
            success: false,
            message: 'Error processing the Excel file.',
            errors: [error instanceof Error ? error.message : 'Unknown error']
          });
        }
      };

      reader.readAsArrayBuffer(file);

    } catch (error) {
      logger.error('Error reading file:', error);
      setImportResult({
        success: false,
        message: 'Error reading the file.',
        errors: [error instanceof Error ? error.message : 'Unknown error']
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
        throw new Error('Error importing data');
      }

      const result = await response.json();

      setImportResult({
        success: true,
        message: `Data imported successfully. ${result.insertedCount} records processed.`
      });

      toast({
        title: "Import successful",
        description: `${result.insertedCount} records processed.`,
      });

    } catch (error) {
      logger.error('Import error:', error);
      setImportResult({
        success: false,
        message: 'Error importing data.',
        errors: [error instanceof Error ? error.message : 'Unknown error']
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
      title: "Template downloaded",
      description: "The template file has been downloaded.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Import Excel Data</h1>
          <p className="text-muted-foreground">
            Upload an Excel file to import wound data
          </p>
        </div>
        <Button onClick={downloadTemplate} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Download Template
        </Button>
      </div>

      {/* Drop Zone */}
      {isComponentEnabled('excel-import', 'upload-area') && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Excel File
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
              <p className="text-lg font-medium">Drop file here...</p>
            ) : (
              <div>
                <p className="text-lg font-medium mb-2">
                  Drag and drop an Excel file here
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Or click to select a file
                </p>
                <p className="text-xs text-muted-foreground">
                  Supported formats: .xlsx, .xls (max. 10MB)
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
      )}

      {/* Progress */}
      {isProcessing && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Processing file...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {isComponentEnabled('excel-import', 'preview') && previewData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Data Preview</CardTitle>
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
              Showing first 5 rows. Total: {importResult?.data?.length} rows.
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
                <h4 className="font-medium text-red-800 mb-2">Errors found:</h4>
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
                  {isProcessing ? 'Importing...' : 'Import Data'}
                </Button>
                <Button variant="outline" onClick={clearFile}>
                  Clear
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
            Import Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Excel File Format:</h4>
            <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
              <li>The first row must contain column names</li>
              <li>Required columns: patient_id, facility_id, location, etiology, surface, push_score, progress, disposition, dos</li>
              <li>Date format: YYYY-MM-DD (e.g.: 2025-01-15)</li>
              <li>Numeric values: surface and push_score must be numbers</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">Validations:</h4>
            <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
              <li>patient_id cannot be empty</li>
              <li>facility_id must be a valid number</li>
              <li>surface must be a positive number</li>
              <li>push_score must be between 0 and 17</li>
              <li>progress must be: Improving, Deteriorating, Stable</li>
              <li>disposition must be: Active, Resolved, New</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}