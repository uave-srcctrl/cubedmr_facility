/**
 * Centralized type definitions for API responses
 * Re-exports types from hooks for easier importing
 */

// Re-export patient/wound types from use-patients hook
export type {
  FacilityPatient,
  WoundEncounter,
  PatientByDate,
  CriticalWound,
  CriticalPatient,
  CriticalCasesResponse,
  DeterioratingWound,
  DeterioratingPatient,
  WoundActivityPatient,
  WoundActivityWound,
  UpdateWoundEncounterParams,
  ReportEncounter,
  ReportPatient,
  ReportsGeneratedResponse,
  WoundsByEtiologyResponse,
  WoundsByHealingStatusResponse,
  WoundsByDispositionResponse,
} from "@/hooks/use-patients";

// Re-export settings types from use-settings hook
export type {
  ImportFormatConfig,
  ChartConfig,
  DataType,
  VisualizationComponent,
  PageComponent,
  PageConfig,
  ThemeConfig,
  AppSettings,
} from "@/hooks/use-settings";

// Re-export wound utility types
export type {
  StatusStyle,
  ChartLineVisibility,
} from "@/lib/wound-utils";

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  status: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta?: PaginationMeta;
}

/**
 * Facility information
 * Complete type for facility data used across the application
 */
export interface Facility {
  id: string | number;
  name: string;
  address?: string;
  phone?: string;
  email?: string | null;
  mobile?: string | null;
  type?: string;
  npi?: string | null;
  contact?: string | null;
  director?: string | null;
  director_phone?: string | null;
  fax?: string | null;
  hha?: string | null;
  region?: string | null;
  admission_coordinator?: string | null;
  clinical_liaison?: string | null;
  /** Number of patients in facility */
  patients?: number;
  /** Number of active patients */
  activePatients?: number;
  /** Facility location string */
  location?: string;
  /** Total wound encounters count */
  total_wound_encounters?: number;
  /** Active wounds count */
  active_wounds?: number;
  /** Average PUSH score */
  average_push_score?: string;
  /** Acuity level */
  acuity_level?: string;
  /** Whether facility is active */
  active?: boolean | number;
  /** Creation timestamp */
  created_at?: string | null;
  /** Last update timestamp */
  updated_at?: string | null;
  /** Allow indexing for dynamic access */
  [key: string]: any;
}

/**
 * User authentication information
 */
export interface AuthInfo {
  userId: string;
  email: string;
  token: string;
  facilityId?: string;
  facilityName?: string;
  role?: string;
}

/**
 * Import audit log entry
 */
export interface ImportLogEntry {
  id: string;
  import_id: string;
  facility_id: number;
  file_name: string;
  file_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'reverted';
  records_imported: number;
  records_failed: number;
  error_message?: string;
  created_at: string;
  completed_at?: string;
  user_id: string;
}

/**
 * Dashboard KPI data
 */
export interface DashboardKPIs {
  totalPatients: number;
  totalWounds: number;
  activeWounds: number;
  healingRate: number;
  avgHealingDays: number;
  criticalCases: number;
}
