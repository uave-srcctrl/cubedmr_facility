/**
 * Shared request extraction helpers — eliminates copy-paste across route handlers
 */
import type { Request } from 'express';

/**
 * Extract facility ID from request (header, body, or query — normalized)
 * Used by ~12 route handlers identically
 */
export function extractFacilityId(req: Request): string | undefined {
    return (
        (req.headers["x-facility-id"] as string) ||
        req.body?.facility_id ||
        req.query?.facility_id ||
        req.body?.facilityId ||
        req.query?.facilityId
    ) as string | undefined;
}

/**
 * Extract auth token from Authorization header or body
 */
export function extractToken(req: Request): string | undefined {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        return authHeader.substring(7);
    }
    return req.body?.token;
}

/**
 * Get auth token with dev-mode fallback (system token).
 * Replaces 5 copy-pasted blocks across dashboard handlers.
 */
const DEV_SYSTEM_TOKEN = "38521445-2BBB-40B0-84CD-4AA2C98701C1";

export function getAuthToken(req: Request): string | null {
    const token = extractToken(req);
    if (token) return token;

    const isDev = process.env.NODE_ENV === 'development';
    return isDev ? DEV_SYSTEM_TOKEN : null;
}

/**
 * Extract email from request body or headers
 */
export function extractEmail(req: Request): string | undefined {
    return req.body?.email || (req.headers["x-user-email"] as string) || req.query?.email as string;
}

/**
 * Build auth headers from incoming request (for proxying)
 */
export function getAuthHeaders(req: Request): Record<string, string> {
    const headers: Record<string, string> = {};

    if (req.headers.authorization) {
        headers["Authorization"] = req.headers.authorization;
    }

    const facilityId = extractFacilityId(req);
    if (facilityId) {
        headers["X-Facility-Id"] = facilityId.toString();
    }

    return headers;
}

/**
 * Extract date range from request (query or body)
 */
export function extractDateRange(req: Request): { startDate?: string; endDate?: string } {
    return {
        startDate: req.query?.startDate as string || req.body?.startDate || req.body?.dosStart || req.query?.dosStart as string,
        endDate: req.query?.endDate as string || req.body?.endDate || req.body?.dosEnd || req.query?.dosEnd as string,
    };
}
