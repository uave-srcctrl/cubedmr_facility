/**
 * HIPAA Audit Logger
 * 
 * Provides secure audit logging for PHI access events as required by HIPAA.
 * Logs are written to a secure append-only file with no PHI content in the logs themselves.
 */

import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';

// Audit log file path (should be in a secure, backed-up location in production)
const AUDIT_LOG_DIR = process.env.AUDIT_LOG_DIR || './logs';
const AUDIT_LOG_FILE = join(AUDIT_LOG_DIR, 'hipaa-audit.log');

// Ensure log directory exists
if (!existsSync(AUDIT_LOG_DIR)) {
  mkdirSync(AUDIT_LOG_DIR, { recursive: true });
}

/**
 * PHI Access Event Types
 */
export enum AuditEventType {
  // Authentication events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  SESSION_TIMEOUT = 'SESSION_TIMEOUT',
  
  // PHI access events
  PHI_VIEW = 'PHI_VIEW',
  PHI_CREATE = 'PHI_CREATE',
  PHI_UPDATE = 'PHI_UPDATE',
  PHI_DELETE = 'PHI_DELETE',
  PHI_EXPORT = 'PHI_EXPORT',
  PHI_IMPORT = 'PHI_IMPORT',
  
  // Report access
  REPORT_GENERATE = 'REPORT_GENERATE',
  REPORT_VIEW = 'REPORT_VIEW',
  REPORT_EXPORT = 'REPORT_EXPORT',
  
  // Administrative events
  USER_CREATE = 'USER_CREATE',
  USER_UPDATE = 'USER_UPDATE',
  USER_DEACTIVATE = 'USER_DEACTIVATE',
  PERMISSION_CHANGE = 'PERMISSION_CHANGE',
  
  // Security events
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY'
}

/**
 * PHI Resource Types
 */
export enum AuditResourceType {
  PATIENT = 'PATIENT',
  ENCOUNTER = 'ENCOUNTER',
  WOUND = 'WOUND',
  ASSESSMENT = 'ASSESSMENT',
  TREATMENT = 'TREATMENT',
  FACILITY = 'FACILITY',
  PROVIDER = 'PROVIDER',
  REPORT = 'REPORT',
  USER = 'USER',
  SYSTEM = 'SYSTEM'
}

interface AuditEntry {
  timestamp: string;
  eventType: AuditEventType;
  resourceType: AuditResourceType;
  resourceId?: string; // ID of resource accessed (hashed if PHI-related)
  userId?: string; // User email or ID (hashed)
  userIdHash?: string; // SHA-256 hash of user ID for privacy
  facilityId?: string;
  ipAddress?: string;
  userAgent?: string;
  action: string;
  result: 'SUCCESS' | 'FAILURE' | 'DENIED';
  details?: string; // Non-PHI details only
  sessionId?: string;
}

/**
 * Hash function for user/resource IDs in logs (privacy protection)
 */
function hashId(id: string): string {
  return createHash('sha256').update(id).digest('hex').substring(0, 16);
}

/**
 * Format audit entry as JSON line for logging
 */
function formatEntry(entry: AuditEntry): string {
  // Add hash of userId if provided
  if (entry.userId) {
    entry.userIdHash = hashId(entry.userId);
    // Don't store plain userId in logs
    delete entry.userId;
  }
  
  // Hash resource IDs that might be PHI-related
  if (entry.resourceId && entry.resourceType !== AuditResourceType.SYSTEM) {
    entry.resourceId = hashId(entry.resourceId);
  }
  
  return JSON.stringify(entry);
}

/**
 * Write audit entry to log file
 */
function writeAuditLog(entry: AuditEntry): void {
  try {
    const logLine = formatEntry(entry) + '\n';
    appendFileSync(AUDIT_LOG_FILE, logLine, { encoding: 'utf8' });
  } catch (error) {
    // Don't throw - audit logging should not break the application
    console.error('[AuditLogger] Failed to write audit log:', error);
  }
}

/**
 * Log a PHI access event
 */
export function logPhiAccess(
  eventType: AuditEventType,
  resourceType: AuditResourceType,
  options: {
    resourceId?: string;
    userId?: string;
    facilityId?: string;
    ipAddress?: string;
    userAgent?: string;
    action: string;
    result: 'SUCCESS' | 'FAILURE' | 'DENIED';
    details?: string;
    sessionId?: string;
  }
): void {
  const entry: AuditEntry = {
    timestamp: new Date().toISOString(),
    eventType,
    resourceType,
    ...options
  };
  
  writeAuditLog(entry);
}

/**
 * Log authentication event
 */
export function logAuthEvent(
  eventType: AuditEventType.LOGIN_SUCCESS | AuditEventType.LOGIN_FAILURE | AuditEventType.LOGOUT | AuditEventType.SESSION_TIMEOUT,
  userId: string,
  options: {
    ipAddress?: string;
    userAgent?: string;
    result: 'SUCCESS' | 'FAILURE';
    details?: string;
    sessionId?: string;
  }
): void {
  logPhiAccess(eventType, AuditResourceType.USER, {
    userId,
    action: eventType.toLowerCase().replace('_', ' '),
    ...options
  });
}

/**
 * Log security event  
 */
export function logSecurityEvent(
  eventType: AuditEventType.UNAUTHORIZED_ACCESS | AuditEventType.RATE_LIMIT_EXCEEDED | AuditEventType.INVALID_TOKEN | AuditEventType.SUSPICIOUS_ACTIVITY,
  options: {
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    details: string;
    resourceType?: AuditResourceType;
  }
): void {
  logPhiAccess(eventType, options.resourceType || AuditResourceType.SYSTEM, {
    userId: options.userId,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
    action: 'security violation',
    result: 'DENIED',
    details: options.details
  });
}

/**
 * Log patient data access
 */
export function logPatientAccess(
  action: 'view' | 'create' | 'update' | 'delete' | 'export',
  patientId: string,
  options: {
    userId?: string;
    facilityId?: string;
    ipAddress?: string;
    result: 'SUCCESS' | 'FAILURE';
    details?: string;
  }
): void {
  const eventTypeMap = {
    view: AuditEventType.PHI_VIEW,
    create: AuditEventType.PHI_CREATE,
    update: AuditEventType.PHI_UPDATE,
    delete: AuditEventType.PHI_DELETE,
    export: AuditEventType.PHI_EXPORT
  };
  
  logPhiAccess(eventTypeMap[action], AuditResourceType.PATIENT, {
    resourceId: patientId,
    action: `patient ${action}`,
    ...options
  });
}

export default {
  logPhiAccess,
  logAuthEvent,
  logSecurityEvent,
  logPatientAccess,
  AuditEventType,
  AuditResourceType
};
