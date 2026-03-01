/**
 * Application-wide constants
 * Centralizes magic numbers and configuration values for better maintainability
 * @module constants
 */

// ============================================================
// TIME CONSTANTS (in milliseconds)
// ============================================================

/** React Query stale time - data considered fresh for 5 minutes */
export const QUERY_STALE_TIME_MS = 5 * 60 * 1000;

/** Authentication sync delay after facility changes */
export const AUTH_SYNC_DELAY_MS = 200;

/** Tab heartbeat interval for single-tab enforcement */
export const TAB_HEARTBEAT_INTERVAL_MS = 2000;

/** Tab heartbeat timeout - consider tab inactive after this */
export const TAB_HEARTBEAT_TIMEOUT_MS = 5000;

// ============================================================
// WOUND CLASSIFICATION THRESHOLDS
// ============================================================

/** Days after which a wound is considered chronic */
export const CHRONIC_WOUND_THRESHOLD_DAYS = 100;

/** PUSH score threshold for high-severity wounds */
export const HIGH_SEVERITY_PUSH_THRESHOLD = 13;

/** Area reduction percentage for "healing" classification */
export const HEALING_AREA_REDUCTION_THRESHOLD = 15;

// ============================================================
// SECURITY CONSTANTS
// ============================================================

/** PBKDF2 iterations for key derivation */
export const PBKDF2_ITERATIONS = 100000;

/** Session storage key for auth token */
export const AUTH_TOKEN_KEY = 'authToken';

/** Session storage key for facility info */
export const FACILITY_INFO_KEY = 'facilityInfo';

// ============================================================
// PAGINATION & LIMITS
// ============================================================

/** Default page size for paginated lists */
export const DEFAULT_PAGE_SIZE = 25;

/** Maximum file size for imports (in bytes) - 10MB */
export const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024;

// ============================================================
// UI CONSTANTS
// ============================================================

/** Debounce delay for search inputs (ms) */
export const SEARCH_DEBOUNCE_MS = 300;

/** Toast notification duration (ms) */
export const TOAST_DURATION_MS = 5000;

/** Animation duration for transitions (ms) */
export const TRANSITION_DURATION_MS = 200;
