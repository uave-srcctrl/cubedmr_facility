import React, { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useDropzone } from 'react-dropzone';
import { useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  ArrowLeft,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/hooks/use-settings';
import { useAuth } from '@/hooks/use-auth';
import { useImport } from '@/contexts/import-context';
import { createSampleExcel, validateExcelData, remapExcelColumns } from '@/lib/excel-utils';
import { dispatchAuthEvent, AUTH_EVENTS } from '@/lib/auth-events';
import { secureStorageSync } from '@/lib/secure-storage';

interface ImportRow {
  [key: string]: any;
}

interface FileError {
  filename: string;
  error: string;
  errorType?: string;  // extraction_failed, facility_mismatch, validation_error, etc.
  details?: string;    // Additional diagnostic info
}

interface ImportResult {
  success: boolean;
  message: string;
  data?: ImportRow[];
  errors?: string[];
  fileErrors?: FileError[];  // Per-file error tracking
  validatedData?: ImportRow[];  // Data after validation
  records_found?: number;
  records_skipped_duplicates?: number;
  facility_id?: number;
  facility_name?: string;
  facility_created?: boolean;
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

// Helper function to check if facility names match (fuzzy matching)
function facilityNamesMatch(name1: string | undefined, name2: string | undefined): boolean {
  if (!name1 || !name2) return false;

  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();

  // Exact match
  if (n1 === n2) return true;

  // One contains the other (partial match)
  if (n1.includes(n2) || n2.includes(n1)) return true;

  // Normalized match (remove common suffixes)
  const normalize = (s: string) =>
    s.replace(/\s+(nursing|home|center|facility|care|medical)$/i, '')
      .replace(/\s+/g, ' ')
      .trim();

  return normalize(n1) === normalize(n2);
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
    id: 'word',
    name: 'Word',
    icon: <FileText className="h-5 w-5" />,
    description: 'DOCX documents',
    acceptedTypes: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    color: 'text-indigo-600',
    maxFileSize: 50 * 1024 * 1024, // 50MB
  },
  {
    id: 'pdf',
    name: 'PDF',
    icon: <FileText className="h-5 w-5" />,
    description: 'PDF documents',
    acceptedTypes: {
      'application/pdf': ['.pdf'],
    },
    color: 'text-rose-600',
    maxFileSize: 50 * 1024 * 1024, // 50MB
  },
];

export default function DataImportPage() {
  const { isComponentEnabled } = useSettings();
  const { getSelectedFacility, getSelectedFacilityInfo, isFacilitySelected, getFacilities } = useAuth();
  const [, navigate] = useLocation();
  const [selectedFormat, setSelectedFormat] = useState<string>('excel');
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<ImportRow[]>([]);
  const [importMode, setImportMode] = useState<'single' | 'directory'>('single');
  const [showValidation, setShowValidation] = useState(false);
  const [showDirectoryWarning, setShowDirectoryWarning] = useState(false);
  const [showDirectoryConfirm, setShowDirectoryConfirm] = useState(false);
  const [pendingDirectoryFiles, setPendingDirectoryFiles] = useState<{
    validFiles: File[];
    skippedCount: number;
    totalCount: number;
    validExtensions: string[];
  } | null>(null);
  const [facilityMismatchError, setFacilityMismatchError] = useState<{
    pdfFacilityName: string;
    selectedFacilityName: string;
  } | null>(null);
  const [showFacilityMismatchModal, setShowFacilityMismatchModal] = useState(false);
  const [pendingMismatchFile, setPendingMismatchFile] = useState<File | null>(null);
  // Directory mismatch handling - multiple files
  const [pendingMismatchFiles, setPendingMismatchFiles] = useState<Array<{
    file: File;
    pdfFacilityName: string;
  }>>([]);
  const [showDirectoryMismatchModal, setShowDirectoryMismatchModal] = useState(false);
  const [showNavigationWarning, setShowNavigationWarning] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setImporting, setImportProgress } = useImport();

  // Sync local processing state with global import context
  useEffect(() => {
    setImporting(isProcessing);
  }, [isProcessing, setImporting]);

  useEffect(() => {
    setImportProgress(progress);
  }, [progress, setImportProgress]);

  // Check if facility is selected
  const hasFacilitySelected = isFacilitySelected();

  // Get current facility ID and info (null if not selected = pre-facility mode)
  const currentFacilityId = getSelectedFacility();
  const currentFacilityInfo = getSelectedFacilityInfo();

  // Auto-select first enabled format if current is disabled
  useEffect(() => {
    const enabledFormats = FILE_FORMATS.filter(format =>
      isComponentEnabled('data-import', `format-${format.id}`)
    );

    // If no formats enabled, nothing to select
    if (enabledFormats.length === 0) return;

    // Check if current selected format is still enabled
    const isCurrentEnabled = enabledFormats.some(f => f.id === selectedFormat);

    // If current format is disabled, select first available
    if (!isCurrentEnabled) {
      setSelectedFormat(enabledFormats[0].id);
    }
  }, [isComponentEnabled, selectedFormat]);

  // Block navigation when import is in progress
  useEffect(() => {
    if (!isProcessing) return;

    // Handle browser close/refresh
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Import in progress. Are you sure you want to leave?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isProcessing]);

  const currentFormat = FILE_FORMATS.find(f => f.id === selectedFormat);

  // Dropzone for individual files
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setFiles([file]);
      setImportResult(null);
      setPreviewData([]);
      processFile(file, selectedFormat);
    }
  }, [selectedFormat]);

  // Helper function to get valid extensions for the current format
  const getValidExtensions = (format: string): string[] => {
    const formatConfig = FILE_FORMATS.find(f => f.id === format);
    if (!formatConfig) return [];

    const extensions: string[] = [];
    Object.values(formatConfig.acceptedTypes).forEach(exts => {
      extensions.push(...exts.map(e => e.toLowerCase()));
    });
    return extensions;
  };

  // Helper function to check if file has valid extension
  const isValidFileExtension = (file: File, format: string): boolean => {
    const validExtensions = getValidExtensions(format);
    const fileName = file.name.toLowerCase();
    return validExtensions.some(ext => fileName.endsWith(ext));
  };

  // Dropzone for directories - with format validation
  const onDropDirectory = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      // Filter files by valid extension for the selected format
      const validExtensions = getValidExtensions(selectedFormat);
      const validFiles = acceptedFiles.filter(file => {
        const fileName = file.name.toLowerCase();
        return validExtensions.some(ext => fileName.endsWith(ext));
      });

      const skippedCount = acceptedFiles.length - validFiles.length;

      // Show confirmation modal instead of processing immediately
      setPendingDirectoryFiles({
        validFiles,
        skippedCount,
        totalCount: acceptedFiles.length,
        validExtensions,
      });
      setShowDirectoryConfirm(true);
    }
  }, [selectedFormat]);

  // Handle directory import confirmation
  const handleConfirmDirectoryImport = useCallback(() => {
    if (!pendingDirectoryFiles) return;

    const { validFiles } = pendingDirectoryFiles;

    if (validFiles.length === 0) {
      setShowDirectoryConfirm(false);
      setPendingDirectoryFiles(null);
      return;
    }

    setFiles(validFiles);
    setImportResult(null);
    setPreviewData([]);
    setShowDirectoryConfirm(false);
    processMultipleFiles(validFiles, selectedFormat);
    setPendingDirectoryFiles(null);
  }, [pendingDirectoryFiles, selectedFormat]);

  // Handle directory import cancellation
  const handleCancelDirectoryImport = useCallback(() => {
    setShowDirectoryConfirm(false);
    setPendingDirectoryFiles(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: importMode === 'single' ? onDrop : onDropDirectory,
    accept: currentFormat?.acceptedTypes,
    multiple: importMode === 'directory',
    maxSize: currentFormat?.maxFileSize || 50 * 1024 * 1024,
  });

  // Function to process PDF with BastionGPT API
  const processPdfWithApi = async (file: File) => {
    setIsProcessing(true);
    setProgress(10);
    setFacilityMismatchError(null);

    try {
      const formData = new FormData();
      formData.append('pdf', file);
      // Use current facility ID, or '0' for auto mode (pre-facility)
      formData.append('facility_id', currentFacilityId ? String(currentFacilityId) : '0');
      formData.append('imported_by', secureStorageSync.getItem('userEmail') || 'web-import');

      setProgress(30);

      const response = await fetch('/api/endpoints/pdf-import.php', {
        method: 'POST',
        body: formData,
      });

      setProgress(70);

      const result = await response.json();

      // Handle facility mismatch - show warning modal for user decision
      if (result.error_type === 'facility_mismatch') {
        setFacilityMismatchError({
          pdfFacilityName: result.pdf_facility_name || 'Unknown',
          selectedFacilityName: result.selected_facility_name || 'Unknown',
        });

        // Store the file for re-import when user confirms
        setPendingMismatchFile(file);

        // Show preview data
        const processedData: ImportRow[] = result.preview || [];
        setPreviewData(processedData.slice(0, 50));

        // Show the facility mismatch modal
        setShowFacilityMismatchModal(true);
        setIsProcessing(false);
        setProgress(100);
        return;
      }

      if (!response.ok || !result.success) {
        const error = new Error(result.error || 'Error processing PDF') as Error & { errorType?: string; details?: string };
        error.errorType = result.error_type || 'processing_error';
        throw error;
      }

      setProgress(90);

      // Transform preview data into ImportRow format
      const processedData: ImportRow[] = result.preview || [];

      setPreviewData(processedData.slice(0, 50));

      // Determine if all records were duplicates
      const allDuplicates = result.records_found > 0 &&
        result.records_inserted === 0 &&
        result.records_skipped_duplicates === result.records_found;

      // Build appropriate message
      let importMessage = '';
      if (allDuplicates) {
        if (result.records_found === 1) {
          importMessage = 'The record already exists in the system and was not imported';
        } else {
          importMessage = `All ${result.records_found} records already exist in the system and were not imported`;
        }
      } else {
        const facilityInfo = result.facility_name ? ` → ${result.facility_name}` : '';
        const createdInfo = result.facility_created ? ' (new)' : '';
        importMessage = `PDF processed: ${result.records_inserted} of ${result.records_found} records imported${facilityInfo}${createdInfo}${result.records_skipped_duplicates > 0 ? ` (${result.records_skipped_duplicates} duplicates skipped)` : ''}`;
      }

      setImportResult({
        success: !allDuplicates,
        message: importMessage,
        data: processedData,
        errors: result.errors || [],
        validatedData: processedData,
        records_found: result.records_found,
        records_skipped_duplicates: result.records_skipped_duplicates,
        facility_id: result.facility_id,
        facility_name: result.facility_name,
        facility_created: result.facility_created,
      });

      // Show appropriate toast
      if (allDuplicates) {
        toast({
          title: 'Duplicate record',
          description: result.records_found === 1
            ? 'This record already exists in the system'
            : `All ${result.records_found} records already exist in the system`,
          variant: 'destructive',
        });
      } else {
        const facilityMsg = result.facility_name
          ? ` → ${result.facility_name}${result.facility_created ? ' (created)' : ''}`
          : '';
        toast({
          title: 'PDF processed successfully',
          description: `${result.records_inserted} records imported${facilityMsg} in ${(result.processing_time_ms / 1000).toFixed(1)}s`,
          className: 'bg-green-500 text-white border-green-600',
        });
      }

      // Always refresh caches after successful PDF processing (even with duplicates)
      queryClient.invalidateQueries({ queryKey: ['enabledDates'] });
      queryClient.invalidateQueries({ queryKey: ['facilityPatientsByDate'] });
      queryClient.invalidateQueries({ queryKey: ['facilityPatients'] });
      queryClient.invalidateQueries({ queryKey: ['import-logs'] });
      queryClient.invalidateQueries({ queryKey: ['import-stats'] });
      // Refresh facilities first to update total_wound_encounters count
      await getFacilities().catch(console.error);
      // Then dispatch event so pages know to refresh (after facilities are updated)
      dispatchAuthEvent(AUTH_EVENTS.DATA_IMPORTED);

      setProgress(100);
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorType = error?.errorType || 'processing_error';
      setImportResult({
        success: false,
        message: `Error processing PDF: ${errorMessage}`,
        errors: [errorMessage],
        fileErrors: [{
          filename: file.name,
          error: errorMessage,
          errorType: errorType,
          details: error?.details
        }],
      });
      toast({
        title: 'Error processing PDF',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to process a single file
  const processFile = async (file: File, format: string) => {
    // Handle PDF and Word files specially - they need server-side processing with AI
    if (format === 'pdf' || format === 'word') {
      return processPdfWithApi(file);
    }

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

          setPreviewData(processedData.slice(0, 50));
          setImportResult({
            success: validationResult.isValid,
            message: validationResult.isValid
              ? `Successfully parsed ${processedData.length} records from ${file.name}`
              : `File processed with ${validationResult.errors.length} validation errors`,
            data: processedData,
            errors: validationResult.errors,
            validatedData: validationResult.data,
          });

          if (validationResult.isValid) {
            toast({
              title: 'File processed successfully',
              description: `${processedData.length} records found and validated`,
            });
          } else {
            toast({
              title: 'Validation warning',
              description: `${validationResult.errors.length} errors found`,
              variant: 'destructive',
            });
          }

          setProgress(100);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          setImportResult({
            success: false,
            message: `Error processing file: ${errorMessage}`,
            errors: [errorMessage],
          });
          toast({
            title: 'Error processing file',
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setImportResult({
        success: false,
        message: `Error reading file: ${errorMessage}`,
        errors: [errorMessage],
      });
      setIsProcessing(false);
    }
  };

  // Helper function to read file as promise
  const readFileAsPromise = (file: File, format: string): Promise<ImportRow[]> => {
    return new Promise((resolve, reject) => {
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

          resolve(processedData);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));

      if (format === 'excel') {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  // Helper function to process single PDF/Word via API
  const processSinglePdfWithApi = async (file: File): Promise<{ data: ImportRow[], errors: string[], recordsInserted: number, recordsSkipped: number }> => {
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('facility_id', currentFacilityId ? String(currentFacilityId) : '0');
    formData.append('imported_by', secureStorageSync.getItem('userEmail') || 'web-import');

    const response = await fetch('/api/endpoints/pdf-import.php', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      // Create error with additional metadata for mismatch detection
      const error = new Error(result.error || 'Error processing file') as Error & { errorType?: string; details?: string; pdfFacilityName?: string };
      error.errorType = result.error_type || 'processing_error';
      if (result.pdf_facility_name) {
        error.details = `PDF facility: ${result.pdf_facility_name}, Selected: ${result.selected_facility_name || 'none'}`;
        error.pdfFacilityName = result.pdf_facility_name;
      }
      throw error;
    }

    return {
      data: result.preview || [],
      errors: result.errors || [],
      recordsInserted: result.records_inserted || 0,
      recordsSkipped: result.records_skipped_duplicates || 0,
    };
  };

  // Helper function to process single PDF with force_facility flag
  const processSinglePdfWithForce = async (file: File): Promise<{ data: ImportRow[], errors: string[], recordsInserted: number, recordsSkipped: number }> => {
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('facility_id', currentFacilityId ? String(currentFacilityId) : '0');
    formData.append('imported_by', secureStorageSync.getItem('userEmail') || 'web-import');
    formData.append('force_facility', '1');

    const response = await fetch('/api/endpoints/pdf-import.php', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Error processing file');
    }

    return {
      data: result.preview || [],
      errors: result.errors || [],
      recordsInserted: result.records_inserted || 0,
      recordsSkipped: result.records_skipped_duplicates || 0,
    };
  };

  // Function to process multiple files (directory)
  const processMultipleFiles = async (fileList: File[], format: string) => {
    setIsProcessing(true);
    setProgress(0);

    const allData: ImportRow[] = [];
    const allErrors: string[] = [];
    const fileErrors: FileError[] = [];
    const mismatchedFiles: Array<{ file: File; pdfFacilityName: string }> = [];
    let totalRecordsInserted = 0;
    let totalRecordsSkipped = 0;
    let filesProcessed = 0;
    let filesWithErrors = 0;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const fileProgress = ((i + 1) / fileList.length) * 100;
      setProgress(fileProgress);

      try {
        // Handle PDF and Word files with API
        if (format === 'pdf' || format === 'word') {
          const result = await processSinglePdfWithApi(file);
          allData.push(...result.data);
          if (result.errors.length > 0) {
            allErrors.push(`${file.name}: ${result.errors.join(', ')}`);
            fileErrors.push({
              filename: file.name,
              error: result.errors.join(', '),
              errorType: 'validation_error'
            });
          }
          totalRecordsInserted += result.recordsInserted;
          totalRecordsSkipped += result.recordsSkipped;
          filesProcessed++;
        } else {
          // Handle other formats with FileReader
          const processedData = await readFileAsPromise(file, format);
          allData.push(...processedData);
          filesProcessed++;
        }
      } catch (error: any) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        const errorType = error?.errorType || 'processing_error';

        // Check if this is a facility mismatch - collect for batch confirmation
        if (errorType === 'facility_mismatch' && error?.pdfFacilityName) {
          mismatchedFiles.push({
            file,
            pdfFacilityName: error.pdfFacilityName
          });
          // Don't count as error yet - user may confirm import later
        } else {
          allErrors.push(`${file.name}: ${errorMsg}`);
          fileErrors.push({
            filename: file.name,
            error: errorMsg,
            errorType: errorType,
            details: error?.details
          });
          filesWithErrors++;
        }
      }
    }

    setProgress(100);

    // Build result message (directory import context)
    let message = '';
    if (format === 'pdf' || format === 'word') {
      // When there are mismatched files pending confirmation, focus on that message
      // instead of showing confusing "Processed 0 of X files. 0 records imported"
      if (mismatchedFiles.length > 0 && filesProcessed === 0) {
        // Only mismatches, no successfully processed files yet
        message = `Directory import: ${mismatchedFiles.length} file(s) with facility mismatch pending confirmation`;
      } else if (mismatchedFiles.length > 0) {
        // Some processed, some mismatched
        message = `Directory import: ${filesProcessed} of ${fileList.length} files processed, ${totalRecordsInserted} records imported`;
        if (totalRecordsSkipped > 0) {
          message += `, ${totalRecordsSkipped} duplicates skipped`;
        }
        message += `. ${mismatchedFiles.length} file(s) with facility mismatch pending confirmation`;
      } else {
        // No mismatches - normal directory message
        message = `Directory import: ${fileList.length} files found, ${filesProcessed} processed successfully. ${totalRecordsInserted} records imported`;
        if (totalRecordsSkipped > 0) {
          message += `, ${totalRecordsSkipped} duplicates skipped`;
        }
      }
      if (filesWithErrors > 0) {
        message += `. ${filesWithErrors} file(s) had errors`;
      }
    } else {
      message = `Directory import: ${fileList.length} files found, ${filesProcessed} processed successfully. Total: ${allData.length} records`;
      if (filesWithErrors > 0) {
        message += `. ${filesWithErrors} file(s) had errors`;
      }
    }

    setImportResult({
      success: allErrors.length === 0 && mismatchedFiles.length === 0,
      message,
      data: allData,
      errors: allErrors,
      fileErrors: fileErrors,
    });

    setPreviewData(allData.slice(0, 50));
    setIsProcessing(false);

    // If there are mismatched files, show the directory mismatch modal
    if (mismatchedFiles.length > 0) {
      setPendingMismatchFiles(mismatchedFiles);
      setShowDirectoryMismatchModal(true);
      toast({
        title: 'Facility Mismatch Detected',
        description: `${mismatchedFiles.length} file(s) have different facility names. Review and confirm to proceed.`,
        variant: 'default',
      });
    } else if (allErrors.length === 0) {
      toast({
        title: 'Directory import completed',
        description: `${filesProcessed} file(s) processed, ${totalRecordsInserted} records imported`,
        className: 'bg-green-500 text-white border-green-600',
      });
    } else {
      toast({
        title: 'Directory import completed with errors',
        description: `${filesProcessed} of ${fileList.length} file(s) processed. ${filesWithErrors} had errors.`,
        variant: 'destructive',
      });
    }

    // Always refresh caches after import attempt (even if some files had errors)
    if (filesProcessed > 0) {
      queryClient.invalidateQueries({ queryKey: ['enabledDates'] });
      queryClient.invalidateQueries({ queryKey: ['facilityPatientsByDate'] });
      queryClient.invalidateQueries({ queryKey: ['facilityPatients'] });
      queryClient.invalidateQueries({ queryKey: ['import-logs'] });
      queryClient.invalidateQueries({ queryKey: ['import-stats'] });
      // Refresh facilities first to update total_wound_encounters count
      await getFacilities().catch(console.error);
      // Then dispatch event so pages know to refresh (after facilities are updated)
      dispatchAuthEvent(AUTH_EVENTS.DATA_IMPORTED);
    }
  };

  // Format processors
  const processExcel = (arrayBuffer: ArrayBuffer): ImportRow[] => {
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (jsonData.length === 0) {
      throw new Error('Empty Excel file');
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
      throw new Error('Empty CSV file');
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
      throw new Error('JSON must be an array of objects');
    }
    return data;
  };

  const processXML = (content: string): ImportRow[] => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(content, 'text/xml');

    if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
      throw new Error('Invalid XML format');
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
      throw new Error('No valid records found in XML');
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
      throw new Error('No valid HL7 records found');
    }

    return records;
  };

  // Function to import data to backend
  const handleImport = async () => {
    if (!importResult?.validatedData && !importResult?.data) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      const dataToImport = importResult.validatedData || importResult.data;
      if (!dataToImport) {
        throw new Error('No data to import');
      }

      // Determine endpoint based on format
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
        throw new Error(errorData.message || 'Error importing data');
      }

      const result = await response.json();

      setImportResult(prev => ({
        ...prev!,
        success: true,
        message: `Data imported successfully. ${result.insertedCount || dataToImport.length} records processed.`
      }));

      toast({
        title: "Import successful",
        description: `${result.insertedCount || dataToImport.length} records imported.`,
      });
      // Refresh caches after import
      queryClient.invalidateQueries({ queryKey: ['enabledDates'] });
      queryClient.invalidateQueries({ queryKey: ['facilityPatientsByDate'] });
      queryClient.invalidateQueries({ queryKey: ['facilityPatients'] });
      queryClient.invalidateQueries({ queryKey: ['import-logs'] });
      queryClient.invalidateQueries({ queryKey: ['import-stats'] });
      // Refresh facilities first to update total_wound_encounters count
      await getFacilities().catch(console.error);
      // Then dispatch event so pages know to refresh (after facilities are updated)
      dispatchAuthEvent(AUTH_EVENTS.DATA_IMPORTED);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setImportResult(prev => ({
        ...prev!,
        success: false,
        message: `Import error: ${errorMessage}`,
        errors: [...(prev?.errors || []), errorMessage]
      }));

      toast({
        title: "Import error",
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  // Clear files
  const handleClearFiles = () => {
    setFiles([]);
    setImportResult(null);
    setPreviewData([]);
    setProgress(0);
    setShowValidation(false);
    setFacilityMismatchError(null);
    setPendingMismatchFile(null);
    setPendingMismatchFiles([]);
  };

  // Handle facility mismatch modal cancel - reset import screen
  const handleFacilityMismatchCancel = () => {
    setShowFacilityMismatchModal(false);
    setFacilityMismatchError(null);
    setPendingMismatchFile(null);
    handleClearFiles();
    toast({
      title: 'Import Cancelled',
      description: 'Import cancelled due to facility mismatch',
    });
  };

  // Handle facility mismatch modal confirm - import at user's discretion
  const handleFacilityMismatchConfirm = async () => {
    setShowFacilityMismatchModal(false);

    if (!pendingMismatchFile || !currentFacilityId) {
      toast({
        title: 'Error',
        description: 'No file pending or facility not selected',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append('pdf', pendingMismatchFile);
      formData.append('facility_id', String(currentFacilityId));
      formData.append('imported_by', secureStorageSync.getItem('userEmail') || 'web-import');
      formData.append('force_facility', '1'); // Force import to selected facility

      setProgress(30);

      const response = await fetch('/api/endpoints/pdf-import.php', {
        method: 'POST',
        body: formData,
      });

      setProgress(70);

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error processing PDF');
      }

      setProgress(90);

      const processedData: ImportRow[] = result.preview || [];
      setPreviewData(processedData.slice(0, 50));

      const allDuplicates = result.records_found > 0 &&
        result.records_inserted === 0 &&
        result.records_skipped_duplicates === result.records_found;

      let importMessage = '';
      if (allDuplicates) {
        importMessage = result.records_found === 1
          ? 'The record already exists in the system and was not imported'
          : `All ${result.records_found} records already exist in the system and were not imported`;
      } else {
        const facilityInfo = currentFacilityInfo?.name ? ` → ${currentFacilityInfo.name}` : '';
        importMessage = `PDF processed (forced): ${result.records_inserted} of ${result.records_found} records imported${facilityInfo}${result.records_skipped_duplicates > 0 ? ` (${result.records_skipped_duplicates} duplicates skipped)` : ''}`;
      }

      setImportResult({
        success: !allDuplicates,
        message: importMessage,
        data: processedData,
        errors: result.errors || [],
        validatedData: processedData,
        records_found: result.records_found,
        records_skipped_duplicates: result.records_skipped_duplicates,
        facility_id: result.facility_id,
        facility_name: result.facility_name,
        facility_created: result.facility_created,
      });

      setFacilityMismatchError(null);
      setPendingMismatchFile(null);

      toast({
        title: 'Import Complete (Discretionary)',
        description: `${result.records_inserted} records imported to ${currentFacilityInfo?.name || 'selected facility'}. This was done at your discretion.`,
        variant: 'default',
      });
      // Refresh caches after import
      queryClient.invalidateQueries({ queryKey: ['enabledDates'] });
      queryClient.invalidateQueries({ queryKey: ['facilityPatientsByDate'] });
      queryClient.invalidateQueries({ queryKey: ['facilityPatients'] });
      queryClient.invalidateQueries({ queryKey: ['import-logs'] });
      queryClient.invalidateQueries({ queryKey: ['import-stats'] });
      // Refresh facilities first to update total_wound_encounters count
      await getFacilities().catch(console.error);
      // Then dispatch event so pages know to refresh (after facilities are updated)
      dispatchAuthEvent(AUTH_EVENTS.DATA_IMPORTED);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      setImportResult({
        success: false,
        message: `Error: ${errorMessage}`,
        errors: [errorMessage],
      });

      toast({
        title: 'Import Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  // Handle directory mismatch modal cancel
  const handleDirectoryMismatchCancel = () => {
    setShowDirectoryMismatchModal(false);
    setPendingMismatchFiles([]);
    toast({
      title: 'Mismatched Files Skipped',
      description: `${pendingMismatchFiles.length} file(s) were not imported due to facility mismatch`,
    });
  };

  // Handle directory mismatch modal confirm - import all mismatched files at user's discretion
  const handleDirectoryMismatchConfirm = async () => {
    setShowDirectoryMismatchModal(false);

    if (pendingMismatchFiles.length === 0 || !currentFacilityId) {
      toast({
        title: 'Error',
        description: 'No files pending or facility not selected',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    let totalInserted = 0;
    let totalSkipped = 0;
    let filesProcessed = 0;
    let filesWithErrors = 0;
    const allData: ImportRow[] = [];
    const errors: string[] = [];

    try {
      for (let i = 0; i < pendingMismatchFiles.length; i++) {
        const { file } = pendingMismatchFiles[i];
        const fileProgress = ((i + 1) / pendingMismatchFiles.length) * 100;
        setProgress(fileProgress);

        try {
          const result = await processSinglePdfWithForce(file);
          allData.push(...result.data);
          totalInserted += result.recordsInserted;
          totalSkipped += result.recordsSkipped;
          filesProcessed++;
        } catch (error: any) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`${file.name}: ${errorMsg}`);
          filesWithErrors++;
        }
      }

      setProgress(100);

      const message = `Directory import (forced): ${filesProcessed} mismatched files processed, ${totalInserted} records imported${totalSkipped > 0 ? `, ${totalSkipped} duplicates skipped` : ''}${filesWithErrors > 0 ? `. ${filesWithErrors} file(s) had errors` : ''}`;

      // Update import result
      setImportResult(prev => ({
        ...prev,
        success: filesWithErrors === 0,
        message: prev?.message ? `${prev.message}. ${message}` : message,
        data: [...(prev?.data || []), ...allData],
        errors: [...(prev?.errors || []), ...errors],
      }));

      setPreviewData(prev => [...prev, ...allData.slice(0, 20)]);

      toast({
        title: 'Mismatched Files Imported',
        description: `${totalInserted} records imported to ${currentFacilityInfo?.name || 'selected facility'} at your discretion.`,
        className: filesWithErrors === 0 ? 'bg-green-500 text-white border-green-600' : undefined,
        variant: filesWithErrors > 0 ? 'destructive' : 'default',
      });

      // Refresh caches
      queryClient.invalidateQueries({ queryKey: ['enabledDates'] });
      queryClient.invalidateQueries({ queryKey: ['facilityPatientsByDate'] });
      queryClient.invalidateQueries({ queryKey: ['facilityPatients'] });
      queryClient.invalidateQueries({ queryKey: ['import-logs'] });
      queryClient.invalidateQueries({ queryKey: ['import-stats'] });
      // Refresh facilities first to update total_wound_encounters count
      await getFacilities().catch(console.error);
      // Then dispatch event so pages know to refresh (after facilities are updated)
      dispatchAuthEvent(AUTH_EVENTS.DATA_IMPORTED);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Import Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setPendingMismatchFiles([]);
    }
  };

  // Download sample
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
      title: "File downloaded",
      description: `Sample file for ${currentFormat?.name}`,
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
      {/* Back to Facility Selection when no facility selected */}
      {!hasFacilitySelected && (
        <Button
          variant="ghost"
          onClick={() => {
            if (isProcessing) {
              setShowNavigationWarning(true);
            } else {
              navigate('/facility-selector');
            }
          }}
          className="mb-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Facility Selection
        </Button>
      )}

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Data Import</h1>
        <p className="text-muted-foreground">
          Import patient and wound data from multiple formats. Select a format to begin.
        </p>
      </div>

      {/* Import mode tabs */}
      <Tabs value={importMode} onValueChange={(value) => {
        if (value === 'directory') {
          setShowDirectoryWarning(true);
        } else {
          setImportMode(value as 'single' | 'directory');
          handleClearFiles();
        }
      }}>
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="single">Single File</TabsTrigger>
            <TabsTrigger value="directory">Directory</TabsTrigger>
          </TabsList>
          <p className="text-sm text-muted-foreground">
            {importMode === 'single'
              ? 'Upload a single file to import data'
              : 'Upload multiple files from a directory for batch processing'
            }
          </p>
        </div>
      </Tabs>

      {/* Format selector */}
      {isComponentEnabled('data-import', 'format-selector') && (() => {
        // Filter formats based on isComponentEnabled for each format
        const enabledFormats = FILE_FORMATS.filter(format =>
          isComponentEnabled('data-import', `format-${format.id}`)
        );

        // Dynamic sizing based on number of enabled formats
        const count = enabledFormats.length;
        const iconSize = count <= 3 ? '[&>svg]:h-8 [&>svg]:w-8'
          : count <= 5 ? '[&>svg]:h-6 [&>svg]:w-6'
            : '[&>svg]:h-5 [&>svg]:w-5';
        const textSize = count <= 3 ? 'text-base'
          : count <= 5 ? 'text-sm'
            : 'text-xs';
        const padding = count <= 3 ? 'px-4 py-4'
          : count <= 5 ? 'px-3 py-3'
            : 'px-2 py-2';
        const gap = count <= 3 ? 'gap-3' : 'gap-2';

        return (
          <div className="flex gap-2 w-full">
            {enabledFormats.map((format) => (
              <button
                key={format.id}
                onClick={() => {
                  setSelectedFormat(format.id);
                  handleClearFiles();
                }}
                className={`
                  flex-1 flex items-center justify-center ${gap} ${padding} rounded-lg border-2 transition-all ${textSize}
                  ${selectedFormat === format.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-primary/2'
                  }
                `}
              >
                <div className={`${format.color} ${iconSize}`}>{format.icon}</div>
                <span className="font-medium truncate">{format.name}</span>
              </button>
            ))}
          </div>
        );
      })()
      }

      {/* Main import card */}
      {isComponentEnabled('data-import', 'upload-area') && currentFormat && (
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
            {/* Facility Mismatch Info - DISABLED: force_facility is always true now */}

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
              <input
                {...(getInputProps() as any)}
                {...(importMode === 'directory' ? { webkitdirectory: '', directory: '' } : {})}
              />
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium text-foreground">
                {isDragActive
                  ? 'Drop files here...'
                  : importMode === 'directory'
                    ? `Select a folder with ${currentFormat.name} files`
                    : `Drag and drop your ${currentFormat.name} file here`
                }
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {importMode === 'directory' ? 'or click to browse folders' : 'or click to select'}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Maximum size per file: {(currentFormat.maxFileSize / 1024 / 1024).toFixed(0)}MB
              </p>
              {importMode === 'directory' && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                  Only {getValidExtensions(selectedFormat).join(', ')} files will be processed
                </p>
              )}
              {/* AI Processing indicator for PDF/Word */}
              {(selectedFormat === 'pdf' || selectedFormat === 'word') && (
                <div className="mt-3 flex items-center justify-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <span>AI Processing with BastionGPT · Automatic wound data extraction</span>
                </div>
              )}
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

            {/* Results and Validation */}
            {importResult && (
              <div className="space-y-4">
                {/* Special alert for duplicates */}
                {importResult.records_skipped_duplicates && importResult.records_skipped_duplicates > 0 &&
                  importResult.records_found === importResult.records_skipped_duplicates ? (
                  <Alert variant="destructive" className="border-amber-500 bg-amber-50">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800">
                      {importResult.records_found === 1
                        ? 'Duplicate Record'
                        : 'Duplicate Records'}
                    </AlertTitle>
                    <AlertDescription className="text-amber-700">
                      {importResult.records_found === 1
                        ? 'The record you are trying to import already exists in the system. No changes were made.'
                        : `The ${importResult.records_found} records you are trying to import already exist in the system. No changes were made.`}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant={importResult.success ? 'default' : 'destructive'}>
                    {importResult.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <AlertTitle>
                      {importResult.success ? 'Import Successful' : 'Import Error'}
                    </AlertTitle>
                    <AlertDescription>
                      {importResult.message}
                      {/* Show facility verification */}
                      {importResult.success && importResult.facility_name && (
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            Imported to: {importResult.facility_name}
                            {importResult.facility_created && ' (new)'}
                          </Badge>
                          {currentFacilityInfo?.name && facilityNamesMatch(currentFacilityInfo.name, importResult.facility_name) && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Matches selected facility
                            </Badge>
                          )}
                          {currentFacilityInfo?.name && !facilityNamesMatch(currentFacilityInfo.name, importResult.facility_name) && (
                            <Badge variant="destructive">
                              Warning: Different from selected ({currentFacilityInfo.name})
                            </Badge>
                          )}
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Per-file errors (detailed) */}
                {importResult.fileErrors && importResult.fileErrors.length > 0 && (
                  <Card className="border-red-200 bg-red-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-red-900 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Import Errors ({importResult.fileErrors.length} file{importResult.fileErrors.length > 1 ? 's' : ''})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-64 overflow-y-auto space-y-3">
                        {importResult.fileErrors.map((fileError, idx) => (
                          <div key={idx} className="border border-red-200 rounded-lg p-3 bg-white">
                            <div className="flex items-start gap-2">
                              <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-red-900 text-sm truncate">
                                    {fileError.filename}
                                  </span>
                                  {fileError.errorType && (
                                    <Badge
                                      variant="outline"
                                      className={`text-xs ${fileError.errorType === 'facility_mismatch'
                                        ? 'bg-amber-50 text-amber-700 border-amber-300'
                                        : fileError.errorType === 'extraction_failed'
                                          ? 'bg-red-50 text-red-700 border-red-300'
                                          : 'bg-gray-50 text-gray-700 border-gray-300'
                                        }`}
                                    >
                                      {fileError.errorType === 'facility_mismatch' ? 'Facility Mismatch'
                                        : fileError.errorType === 'extraction_failed' ? 'Extraction Failed'
                                          : fileError.errorType === 'validation_error' ? 'Validation Error'
                                            : fileError.errorType.replace(/_/g, ' ')}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-red-800 mt-1 break-words">
                                  {fileError.error}
                                </p>
                                {fileError.details && (
                                  <p className="text-xs text-red-600 mt-1 italic">
                                    {fileError.details}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Validation errors (legacy format - fallback) */}
                {showValidation && importResult.errors && importResult.errors.length > 0 && !importResult.fileErrors && (
                  <Card className="border-red-200 bg-red-50">
                    <CardHeader>
                      <CardTitle className="text-red-900 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Validation Errors ({importResult.errors.length})
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
                            ... and {importResult.errors.length - 10} more errors
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Data preview */}
            {previewData.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Data Preview ({previewData.length} records)
                </h3>
                <div className="overflow-x-auto border rounded-lg max-h-[25vh] min-h-[100px] overflow-y-auto">
                  <table className="w-max min-w-full text-sm">
                    <thead className="bg-muted sticky top-0 z-10">
                      <tr className="border-b">
                        <th className="text-left px-4 py-3 font-medium text-xs bg-muted whitespace-nowrap">#</th>
                        {Object.keys(previewData[0]).map((key) => (
                          <th key={key} className="text-left px-4 py-3 font-medium text-xs bg-muted whitespace-nowrap min-w-[120px]">
                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, idx) => (
                        <tr key={idx} className="border-b hover:bg-muted/50">
                          <td className="px-4 py-3 text-xs text-muted-foreground font-medium">{idx + 1}</td>
                          {Object.entries(row).map(([key, value], colIdx) => {
                            // Highlight facility_name column with match indicator
                            const isFacilityCol = key.toLowerCase() === 'facility_name';
                            const facilityMatch = isFacilityCol && currentFacilityInfo?.name
                              ? facilityNamesMatch(currentFacilityInfo.name, String(value || ''))
                              : null;

                            return (
                              <td
                                key={colIdx}
                                className={`px-4 py-3 text-xs whitespace-nowrap max-w-[250px] truncate ${isFacilityCol
                                  ? facilityMatch === true
                                    ? 'bg-green-50 text-green-700 font-medium'
                                    : facilityMatch === false
                                      ? 'bg-red-50 text-red-700 font-medium'
                                      : ''
                                  : ''
                                  }`}
                                title={String(value || '')}
                              >
                                {isFacilityCol && facilityMatch !== null && (
                                  <span className="mr-1">{facilityMatch ? '✓' : '⚠'}</span>
                                )}
                                {value === null || value === undefined || value === '' ? (
                                  <span className="text-muted-foreground italic">-</span>
                                ) : typeof value === 'boolean' ? (
                                  value ? '✓ Yes' : '✗ No'
                                ) : (
                                  String(value)
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Showing {previewData.length} of {importResult?.records_found || importResult?.data?.length || previewData.length} records •
                  {Object.keys(previewData[0]).length} columns •
                  Scroll horizontally to see all fields
                </p>
                {/* Facility verification summary */}
                {currentFacilityInfo?.name && previewData.some(row => row.facility_name) && (() => {
                  const matching = previewData.filter(row =>
                    row.facility_name && facilityNamesMatch(currentFacilityInfo.name, String(row.facility_name))
                  ).length;
                  const total = previewData.filter(row => row.facility_name).length;
                  const allMatch = matching === total;

                  return (
                    <div className={`flex items-center gap-2 mt-2 p-2 rounded text-xs ${allMatch ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                      {allMatch ? (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          All {total} records match selected facility: {currentFacilityInfo.name}
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-4 w-4" />
                          {matching} of {total} records match selected facility: {currentFacilityInfo.name}
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-4 border-t border-border">
              {/* PDF/Word: already imported automatically by AI, don't show button */}
              {importResult?.success && selectedFormat !== 'pdf' && selectedFormat !== 'word' && (
                <Button
                  onClick={handleImport}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? 'Importing...' : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Import Data
                    </>
                  )}
                </Button>
              )}
              {/* PDF/Word: show badge for AI-completed import */}
              {importResult?.success && (selectedFormat === 'pdf' || selectedFormat === 'word') && (
                <Badge variant="default" className="flex-1 justify-center py-2 bg-green-600">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Imported with BastionGPT AI
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Format instructions - Hidden for cleaner UI */}
      {false && currentFormat && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Import Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedFormat === 'excel' && (
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium mb-2">Excel File Format:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                    <li>The first row must contain column names</li>
                    <li>Required columns: patient_id, facility_id, location, surface, push_score, progress, disposition, dos</li>
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
                    <li>disposition must be: Active, Resolved, New, Hospitalized</li>
                  </ul>
                </div>
              </div>
            )}
            {selectedFormat === 'csv' && (
              <div>
                <h4 className="font-medium mb-2">CSV Format:</h4>
                <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                  <li>First row: column names</li>
                  <li>Separator: comma (,) or tab</li>
                  <li>Values with spaces must be enclosed in quotes</li>
                  <li>Recommended encoding: UTF-8</li>
                </ul>
              </div>
            )}
            {selectedFormat === 'json' && (
              <div>
                <h4 className="font-medium mb-2">JSON Format:</h4>
                <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                  <li>Must be an array of objects</li>
                  <li>Each object represents a record</li>
                  <li>Keys must be valid strings</li>
                  <li>Example: [{"{ patient_id: 'P001', facility_id: 5 }"}]</li>
                </ul>
              </div>
            )}
            {selectedFormat === 'xml' && (
              <div>
                <h4 className="font-medium mb-2">XML Format:</h4>
                <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                  <li>Structure: root element with multiple records</li>
                  <li>Each record must have child elements</li>
                  <li>Recommended XML declaration: {"<?xml version='1.0'?>"}</li>
                  <li>Recommended encoding: UTF-8</li>
                </ul>
              </div>
            )}
            {selectedFormat === 'hl7' && (
              <div>
                <h4 className="font-medium mb-2">HL7 Format:</h4>
                <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                  <li>Segment separator: line break</li>
                  <li>Field separator: | (pipe)</li>
                  <li>First segment: MSH (message header)</li>
                  <li>Common segments: PID (patient), OBX (observation)</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Directory Import Warning Modal */}
      <AlertDialog open={showDirectoryWarning} onOpenChange={setShowDirectoryWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Directory Import Warning
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Directory import mode allows you to process multiple files at once. Please be aware:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>All valid files in the selected folder will be processed</li>
                  <li>Large directories may take longer to process</li>
                  <li>Duplicate records across files will be detected and skipped</li>
                  <li>Ensure all files belong to the same facility</li>
                </ul>
                <p className="text-amber-600 dark:text-amber-400 font-medium">
                  Are you sure you want to enable directory import mode?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setImportMode('directory');
                handleClearFiles();
                setShowDirectoryWarning(false);
              }}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Enable Directory Mode
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Directory Import Confirmation Modal */}
      <AlertDialog open={showDirectoryConfirm} onOpenChange={setShowDirectoryConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {pendingDirectoryFiles?.validFiles.length === 0 ? (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  No Valid Files Found
                </>
              ) : (
                <>
                  <Folder className="h-5 w-5 text-blue-500" />
                  Confirm Directory Import
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                {pendingDirectoryFiles?.validFiles.length === 0 ? (
                  <div className="space-y-2">
                    <p className="text-red-600 dark:text-red-400">
                      No files with valid extensions were found in the selected directory.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Expected extensions: <span className="font-mono">{pendingDirectoryFiles?.validExtensions.join(', ')}</span>
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                          {pendingDirectoryFiles?.totalCount}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">Total files found</p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg border border-green-200 dark:border-green-800">
                        <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                          {pendingDirectoryFiles?.validFiles.length}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">Valid files to import</p>
                      </div>
                    </div>

                    {pendingDirectoryFiles && pendingDirectoryFiles.skippedCount > 0 && (
                      <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                        <p className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          <span>
                            <strong>{pendingDirectoryFiles.skippedCount}</strong> file(s) will be skipped (invalid format)
                          </span>
                        </p>
                      </div>
                    )}

                    <div className="text-sm text-muted-foreground">
                      <p>Files preview:</p>
                      <div className="mt-1 max-h-24 overflow-y-auto space-y-1">
                        {pendingDirectoryFiles?.validFiles.slice(0, 5).map((file, idx) => (
                          <p key={idx} className="text-xs font-mono truncate">• {file.name}</p>
                        ))}
                        {pendingDirectoryFiles && pendingDirectoryFiles.validFiles.length > 5 && (
                          <p className="text-xs text-muted-foreground">
                            ... and {pendingDirectoryFiles.validFiles.length - 5} more files
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDirectoryImport}>Cancel</AlertDialogCancel>
            {pendingDirectoryFiles && pendingDirectoryFiles.validFiles.length > 0 && (
              <AlertDialogAction
                onClick={handleConfirmDirectoryImport}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Import {pendingDirectoryFiles.validFiles.length} File(s)
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Facility Mismatch Warning Modal */}
      <AlertDialog open={showFacilityMismatchModal} onOpenChange={setShowFacilityMismatchModal}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Facility Mismatch Warning
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>
                  The PDF file contains data for a different facility:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-xs text-red-600 dark:text-red-400 mb-1">PDF Facility</p>
                    <p className="font-semibold text-red-700 dark:text-red-300">
                      {facilityMismatchError?.pdfFacilityName || 'Unknown'}
                    </p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Selected Facility</p>
                    <p className="font-semibold text-blue-700 dark:text-blue-300">
                      {facilityMismatchError?.selectedFacilityName || 'Unknown'}
                    </p>
                  </div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-amber-700 dark:text-amber-300 font-medium mb-2">
                    Do you want to proceed with the import?
                  </p>
                  <ul className="list-disc list-inside text-xs space-y-1 text-amber-600 dark:text-amber-400">
                    <li>If you proceed, the data will be imported to <strong>{facilityMismatchError?.selectedFacilityName}</strong></li>
                    <li>This action is at your discretion and responsibility</li>
                    <li>Verify that this is the intended behavior before confirming</li>
                  </ul>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleFacilityMismatchCancel}>
              Cancel Import
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFacilityMismatchConfirm}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Proceed at My Discretion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Directory Facility Mismatch Modal - for batch imports */}
      <AlertDialog open={showDirectoryMismatchModal} onOpenChange={setShowDirectoryMismatchModal}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Directory Import: Facility Mismatch Warning
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>
                  {pendingMismatchFiles.length} file(s) contain data for different facilities:
                </p>
                <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                  {pendingMismatchFiles.map((mismatch, idx) => (
                    <div key={idx} className="p-2 flex items-center justify-between text-xs">
                      <span className="font-medium truncate max-w-[200px]" title={mismatch.file.name}>
                        {mismatch.file.name}
                      </span>
                      <span className="text-red-600 dark:text-red-400">
                        {mismatch.pdfFacilityName}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-xs text-red-600 dark:text-red-400 mb-1">PDF Facilities</p>
                    <p className="font-semibold text-red-700 dark:text-red-300 text-sm">
                      {[...new Set(pendingMismatchFiles.map(m => m.pdfFacilityName))].join(', ')}
                    </p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Target Facility</p>
                    <p className="font-semibold text-blue-700 dark:text-blue-300 text-sm">
                      {currentFacilityInfo?.name || 'Selected Facility'}
                    </p>
                  </div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-amber-700 dark:text-amber-300 font-medium mb-2">
                    Do you want to import all {pendingMismatchFiles.length} mismatched files?
                  </p>
                  <ul className="list-disc list-inside text-xs space-y-1 text-amber-600 dark:text-amber-400">
                    <li>All data will be imported to <strong>{currentFacilityInfo?.name || 'selected facility'}</strong></li>
                    <li>This action is at your discretion and responsibility</li>
                    <li>Cancel to skip these files</li>
                  </ul>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDirectoryMismatchCancel}>
              Skip These Files
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDirectoryMismatchConfirm}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Import All at My Discretion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Navigation Warning Modal */}
      <AlertDialog open={showNavigationWarning} onOpenChange={setShowNavigationWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Import in Progress
            </AlertDialogTitle>
            <AlertDialogDescription>
              An import is currently in progress. Leaving this page will cancel the import and may result in incomplete data.
              <br /><br />
              <strong>Files processed: {progress.toFixed(0)}%</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay on Page</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => navigate('/')}
              className="bg-red-600 hover:bg-red-700"
            >
              Leave Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
