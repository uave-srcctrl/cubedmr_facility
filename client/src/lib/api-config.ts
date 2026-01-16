/**
 * API Configuration
 * Centralized configuration for all API endpoints
 * This prevents hardcoded URLs scattered throughout the codebase
 */

// Backend API base URL - use Vite's environment variables
const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL || "https://cubed-mr.app";

// Local server API base URL (for local API calls)
// With <base href="/facility/"> in index.html, relative paths work correctly
const LOCAL_API_BASE = "api";

/**
 * Local API Endpoints (via our Express server)
 */
export const LOCAL_API = {
  // Authentication
  LOGIN: `${LOCAL_API_BASE}/get`,
  LOGOUT: `${LOCAL_API_BASE}/logout`,
  HEALTH: `${LOCAL_API_BASE}/health`,
  
  // User/Facility
  USER_PROFILE: `${LOCAL_API_BASE}/user/profile`,
  FACILITY_METADATA: `${LOCAL_API_BASE}/facility/metadata`,
  
  // Reports (new endpoint for handling report requests)
  REPORT: `${LOCAL_API_BASE}/report`,
  
  // Facility Wound Report
  FACILITY_WOUND_REPORT: `${LOCAL_API_BASE}/facility-wound-report`,
  
  // Facility Acuity Index
  FACILITY_ACUITY_INDEX: `${LOCAL_API_BASE}/facility-acuity-index`,
  
  // Etiology Distribution
  ETIOLOGY_DISTRIBUTION: `${LOCAL_API_BASE}/etiology-distribution`,
  
  // Dashboard
  DASHBOARD_KPIS: `${LOCAL_API_BASE}/dashboard/kpis`,
  DASHBOARD_WOUND_ETIOLOGY: `${LOCAL_API_BASE}/dashboard/wound-etiology`,
  DASHBOARD_WOUND_REDUCTION: `${LOCAL_API_BASE}/dashboard/wound-reduction`,
  DASHBOARD_HEALING_STATUS: `${LOCAL_API_BASE}/dashboard/healing-status`,
  DASHBOARD_WOUNDS_BY_STATUS: `${LOCAL_API_BASE}/dashboard/wounds-by-status`,
} as const;

/**
 * Remote Backend API Endpoints
 * These go directly to the cubed-mr.app backend
 */
export const REMOTE_API = {
  // Reports - Facility specific
  FACILITY_WOUND_OUTCOME: (facilityId: string, startDate: string, endDate: string) =>
    `${BACKEND_BASE_URL}/api/reports/facility-wound-outcome/${facilityId}/${startDate}/${endDate}`,

  FACILITY_ACUITY_INDEX: (facilityId: string) =>
    `${BACKEND_BASE_URL}/api/reports/facility-acuity-index/${facilityId}`,

  // Wounds by Status - Uses facility-acuity-index endpoint as source
  // NOTE: rptWoundsByStatus endpoint doesn't exist, so we use facility-acuity-index
  WOUNDS_BY_STATUS: (facilityId: string) =>
    `${BACKEND_BASE_URL}/api/reports/facility-acuity-index/${facilityId}`,

  // Reports - Global/Etiology
  OUTCOME_REPORT_GLOBAL: (facilityId: string, startDate: string, endDate: string) =>
    `${BACKEND_BASE_URL}/api/reports/outcome-report-global/${facilityId}/${startDate}/${endDate}`,

  ETIOLOGY_DISTRIBUTION: (facilityId: string, date: string) =>
    `${BACKEND_BASE_URL}/api/reports/etiology-distribution/${facilityId}/${date}`,
} as const;

/**
 * Helper function to get facility ID from auth info
 * Returns the entityId if available, otherwise returns empty string
 * NOTE: When a user is authenticated, entityId should always be present
 */
export function getFacilityId(authEntityId: string | null | undefined): string {
  return authEntityId || "";
}
