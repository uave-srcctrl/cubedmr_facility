/**
 * Types and display constants for the Import Audit component.
 * Extracted from import-audit.tsx (LIMP-4 decomposition) without behavior change.
 */
import React from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  RotateCcw,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';

export interface ImportLog {
  id: number;
  import_id: string;
  import_date: string;
  imported_by: string | null;
  facility_id: number | null;
  facility_name: string | null;
  source_type: string;
  original_filename: string | null;
  file_size_bytes: number | null;
  records_found: number;
  records_validated: number;
  records_inserted: number;
  records_failed: number;
  records_duplicated: number;
  ai_provider: string | null;
  ai_processing_time_ms: number | null;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial' | 'reverted' | 'duplicated';
  started_at: string | null;
  completed_at: string | null;
  processing_duration_ms: number | null;
  error_message: string | null;
  patient_names: string[];
  bastion_request: string | null;
  bastion_response: string | null;
}

export interface ImportStats {
  total_imports: number;
  total_records_imported: number;
  successful_imports: number;
  failed_imports: number;
  reverted_imports: number;
  duplicated_imports: number;
  avg_processing_time_ms: number | null;
  last_import_date: string | null;
}

export const statusConfig = {
  completed: {
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800',
    label: 'Completed',
  },
  failed: {
    icon: XCircle,
    color: 'bg-red-100 text-red-800',
    label: 'Failed',
  },
  partial: {
    icon: AlertTriangle,
    color: 'bg-yellow-100 text-yellow-800',
    label: 'Partial',
  },
  pending: {
    icon: Clock,
    color: 'bg-gray-100 text-gray-800',
    label: 'Pending',
  },
  processing: {
    icon: RefreshCw,
    color: 'bg-blue-100 text-blue-800',
    label: 'Processing',
  },
  reverted: {
    icon: RotateCcw,
    color: 'bg-purple-100 text-purple-800',
    label: 'Reverted',
  },
  duplicated: {
    icon: AlertTriangle,
    color: 'bg-orange-100 text-orange-800',
    label: 'Duplicated',
  },
};

export const sourceTypeIcons: Record<string, React.ElementType> = {
  PDF: FileText,
  Excel: FileSpreadsheet,
  CSV: FileSpreadsheet,
  Word: FileText,
};

// Sortable columns
export type SortColumn = 'import_date' | 'original_filename' | 'facility_name' | 'imported_by' | 'records_inserted' | 'status' | 'processing_duration_ms';
export type SortDirection = 'asc' | 'desc';
