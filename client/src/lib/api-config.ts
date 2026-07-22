import { logger } from "@/lib/logger";
/**
 * API Configuration
 * Centralized configuration for all API endpoints
 * 
 * ALL requests go directly to the PHP Slim API served by Apache.
 * Node.js/Express has been removed from the architecture.
 * 
 * Architecture: React SPA (Apache /facility/) → PHP Slim API (Apache /api/) → SQL Server
 */

// ==========================================
// API BASE — PHP Slim API served by Apache
// ==========================================
const PHP_API_BASE = '/api';

// Remote backend URL (same server, used for report URL generation)
const REMOTE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL_REMOTE || 'https://cubed-mr.app';

// Debug flag
const DEBUG_API = import.meta.env.VITE_DEBUG_API === 'true';

if (DEBUG_API) {
  logger.debug('[API Config] PHP API base:', PHP_API_BASE);
}

/**
 * API Endpoints — all point directly to PHP Slim API
 */
export const LOCAL_API = {
  // Main entity handler — handles TryLogin, EntityInfo, GroupsByUser, FacilityDataCenter, etc.
  LOGIN: `${PHP_API_BASE}/get`,

  // Entity handler aliases (all point to /api/get — differentiated by body payload)
  ENTITY_INFO: `${PHP_API_BASE}/get`,
  GROUPS_BY_USER: `${PHP_API_BASE}/get`,
  FACILITIES_LIST: `${PHP_API_BASE}/get`,

  // Reports — PHP Slim route in facility-app-routes.php
  REPORT: `${PHP_API_BASE}/report`,

  // Facility Acuity Index — PHP Slim route
  FACILITY_ACUITY_INDEX: `${PHP_API_BASE}/api/facility-acuity-index`,

  // PHP endpoint files (direct file access via Apache)
  IMPORT_AUDIT: `${PHP_API_BASE}/endpoints/import-audit.php`,
  PDF_IMPORT: `${PHP_API_BASE}/endpoints/pdf-import.php`,
  ENABLED_DATES: `${PHP_API_BASE}/endpoints/enabled-dates.php`,

  // Excel import — PHP Slim route
  IMPORT_EXCEL: `${PHP_API_BASE}/import-excel`,

  // User facilities — PHP endpoint
  USER_FACILITIES: `${PHP_API_BASE}/get`,
} as const;

/**
 * Remote Backend API Endpoints (cubed-mr.app)
 * Used for report pages that need direct URL access
 */
export const REMOTE_API = {
  FACILITY_WOUND_OUTCOME: (facilityId: string, startDate: string, endDate: string) =>
    `${REMOTE_BACKEND_URL}/api/reports/facility-wound-outcome/${facilityId}/${startDate}/${endDate}`,

  FACILITY_ACUITY_INDEX: (facilityId: string) =>
    `${REMOTE_BACKEND_URL}/api/reports/facility-acuity-index/${facilityId}`,

  WOUNDS_BY_STATUS: (facilityId: string) =>
    `${REMOTE_BACKEND_URL}/api/reports/facility-acuity-index/${facilityId}`,

  OUTCOME_REPORT_GLOBAL: (facilityId: string, startDate: string, endDate: string) =>
    `${REMOTE_BACKEND_URL}/api/reports/outcome-report-global/${facilityId}/${startDate}/${endDate}`,

  ETIOLOGY_DISTRIBUTION: (facilityId: string, date: string) =>
    `${REMOTE_BACKEND_URL}/api/reports/etiology-distribution/${facilityId}/${date}`,
} as const;

/**
 * ACTIVE API CONFIGURATION
 * Single-environment: PHP Slim API via Apache
 */
export const API_CONFIG = {
  BACKEND_URL: REMOTE_BACKEND_URL,
  API_BASE: PHP_API_BASE,
  DEBUG: DEBUG_API,

  // Main endpoints
  LOGIN: `${PHP_API_BASE}/get`,
  HEALTH: `${PHP_API_BASE}/health`,

  // Reports
  REPORT: `${PHP_API_BASE}/report`,

  // CRUD
  GET: `${PHP_API_BASE}/get`,
  ADD: `${PHP_API_BASE}/add`,
  UPD: `${PHP_API_BASE}/upd`,
  DEL: `${PHP_API_BASE}/del`,
  LST: `${PHP_API_BASE}/lst`,
} as const;

/**
 * Helper function to get facility ID from auth info
 */
export function getFacilityId(authEntityId: string | null | undefined): string {
  return authEntityId || '5';
}

/**
 * Helper to construct API URLs
 */
export function buildApiUrl(endpoint: string, params?: Record<string, string | number>): string {
  let url = `${PHP_API_BASE}/${endpoint.replace(/^\//, '')}`;

  if (params) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      queryParams.append(key, String(value));
    });
    url += `?${queryParams.toString()}`;
  }

  return url;
}
