/**
 * API Configuration
 * Centralized configuration for all API endpoints
 * Supports both local development and remote production environments
 */

// ==========================================
// ENVIRONMENT DETECTION
// ==========================================
const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT || 'local';
const IS_LOCAL = ENVIRONMENT === 'local';
const IS_REMOTE = ENVIRONMENT === 'remote';

// ==========================================
// API BASE URLS
// ==========================================

// Local API (Development) - Direct to api.local (PHP backend)
const LOCAL_API_BASE = 'http://api.local/api';

// Local Express server (for auth endpoints)
const LOCAL_EXPRESS_BASE = '/api';

// Remote API (Production) - External cubed-mr.app server
const REMOTE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL_REMOTE || 'https://cubed-mr.app';
const REMOTE_API_BASE = '/api';

// Select active backend based on environment
const ACTIVE_BACKEND_URL = IS_LOCAL ? 'http://api.local' : REMOTE_BACKEND_URL;
const ACTIVE_API_BASE = IS_LOCAL ? '/api' : REMOTE_API_BASE;

// Debug flag
const DEBUG_API = import.meta.env.VITE_DEBUG_API === 'true';

// Log environment info
if (DEBUG_API) {
  console.log('[API Config] Environment:', ENVIRONMENT);
  console.log('[API Config] API base path:', ACTIVE_API_BASE);
}

/**
 * Local API Endpoints - Direct to api.local (PHP backend)
 */
export const LOCAL_API = {
  // Authentication - Uses Express server (localhost:5000)
  LOGIN: `${LOCAL_EXPRESS_BASE}/get`,
  LOGOUT: `${LOCAL_EXPRESS_BASE}/logout`,
  HEALTH: `${LOCAL_EXPRESS_BASE}/health`,
  
  // User/Facility - Uses Express server
  USER_PROFILE: `${LOCAL_EXPRESS_BASE}/user/profile`,
  FACILITY_METADATA: `${LOCAL_EXPRESS_BASE}/facility/metadata`,
  
  // Flutter-like endpoints for user data and facilities - Uses Express server
  ENTITY_INFO: `${LOCAL_EXPRESS_BASE}/get`,
  GROUPS_BY_USER: `${LOCAL_EXPRESS_BASE}/get`,
  FACILITIES_LIST: `${LOCAL_EXPRESS_BASE}/get`,
  
  // Reports - Uses Express server (generic report handler via proxy to local backend)
  REPORT: `${LOCAL_EXPRESS_BASE}/report`,
  
  // Facility Wound Report - Uses Express server (routes to Slim app via local backend)
  FACILITY_WOUND_REPORT: `${LOCAL_EXPRESS_BASE}/facility-wound-report`,
  
  // Facility Acuity Index - Uses Express server (routes to Slim app)
  FACILITY_ACUITY_INDEX: `${LOCAL_EXPRESS_BASE}/facility-acuity-index`,
  
  // Etiology Distribution - Uses Express server (routes to Slim app)
  ETIOLOGY_DISTRIBUTION: `${LOCAL_EXPRESS_BASE}/etiology-distribution`,
  
  // Dashboard - Uses Express server (which proxies to local backend for local dev)
  DASHBOARD_KPIS: `${LOCAL_EXPRESS_BASE}/dashboard/kpis`,
  DASHBOARD_WOUND_ETIOLOGY: `${LOCAL_EXPRESS_BASE}/dashboard/wound-etiology`,
  DASHBOARD_WOUND_REDUCTION: `${LOCAL_EXPRESS_BASE}/dashboard/wound-reduction`,
  DASHBOARD_WOUND_REDUCTION_MEDIAN: `${LOCAL_EXPRESS_BASE}/dashboard/wound-reduction-median`,
  DASHBOARD_HEALING_STATUS: `${LOCAL_EXPRESS_BASE}/dashboard/healing-status`,
  DASHBOARD_WOUNDS_BY_STATUS: `${LOCAL_EXPRESS_BASE}/dashboard/wounds-by-status`,
  
  // Import Audit - Uses Express server (routes to PHP backend)
  IMPORT_AUDIT: `${LOCAL_EXPRESS_BASE}/import-audit`,
} as const;

/**
 * Remote Backend API Endpoints (cubed-mr.app)
 * These go directly to the external remote server
 */
export const REMOTE_API = {
  // Reports - Facility specific
  FACILITY_WOUND_OUTCOME: (facilityId: string, startDate: string, endDate: string) =>
    `${REMOTE_BACKEND_URL}/api/reports/facility-wound-outcome/${facilityId}/${startDate}/${endDate}`,

  FACILITY_ACUITY_INDEX: (facilityId: string) =>
    `${REMOTE_BACKEND_URL}/api/reports/facility-acuity-index/${facilityId}`,

  // Wounds by Status - Uses facility-acuity-index endpoint as source
  WOUNDS_BY_STATUS: (facilityId: string) =>
    `${REMOTE_BACKEND_URL}/api/reports/facility-acuity-index/${facilityId}`,

  // Reports - Global/Etiology
  OUTCOME_REPORT_GLOBAL: (facilityId: string, startDate: string, endDate: string) =>
    `${REMOTE_BACKEND_URL}/api/reports/outcome-report-global/${facilityId}/${startDate}/${endDate}`,

  ETIOLOGY_DISTRIBUTION: (facilityId: string, date: string) =>
    `${REMOTE_BACKEND_URL}/api/reports/etiology-distribution/${facilityId}/${date}`,
} as const;

/**
 * ACTIVE API CONFIGURATION
 * Dynamically selects between LOCAL and REMOTE based on environment
 */
export const API_CONFIG = {
  ENVIRONMENT,
  IS_LOCAL,
  IS_REMOTE,
  BACKEND_URL: ACTIVE_BACKEND_URL,
  API_BASE: ACTIVE_API_BASE,
  DEBUG: DEBUG_API,
  
  // Endpoints that work for both environments
  LOGIN: `${ACTIVE_API_BASE}/get`,
  LOGOUT: `${ACTIVE_API_BASE}/logout`,
  HEALTH: `${ACTIVE_API_BASE}/health`,
  
  // Reports
  REPORT: `${ACTIVE_API_BASE}/report`,
  
  // Facilities
  FACILITIES_LIST: `${ACTIVE_API_BASE}/get`,
  
  // Common endpoints for both local and remote
  GET: `${ACTIVE_API_BASE}/get`,
  ADD: `${ACTIVE_API_BASE}/add`,
  UPD: `${ACTIVE_API_BASE}/upd`,
  DEL: `${ACTIVE_API_BASE}/del`,
  LST: `${ACTIVE_API_BASE}/lst`,
} as const;

/**
 * Helper function to get facility ID from auth info
 * Returns the entityId if available, otherwise returns empty string
 */
export function getFacilityId(authEntityId: string | null | undefined): string {
  return authEntityId || '5';
}

/**
 * Helper function to switch environments at runtime
 * Useful for testing or switching between local/remote
 */
export function setEnvironment(env: 'local' | 'remote') {
  if (DEBUG_API) {
    console.log('[API Config] Switching environment to:', env);
  }
  // Note: In a real app, you'd need to handle this more dynamically
  // This is a placeholder for documentation purposes
}

/**
 * Helper to construct API URLs
 * Handles both local and remote environments
 */
export function buildApiUrl(endpoint: string, params?: Record<string, string | number>): string {
  let url = `${ACTIVE_BACKEND_URL}${ACTIVE_API_BASE}/${endpoint.replace(/^\//, '')}`;
  
  if (params) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      queryParams.append(key, String(value));
    });
    url += `?${queryParams.toString()}`;
  }
  
  return url;
}
