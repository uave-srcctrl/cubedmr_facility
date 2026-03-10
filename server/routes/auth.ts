/**
 * Authentication route handlers — /api/get (main proxy), /api/logout
 * The /api/get handler is the largest single handler (~400 lines) — kept mostly intact
 * since it has complex branching logic for TryLogin, OTC, local-only methods, etc.
 */
import type { Express, Request, Response } from 'express';
import { createHash } from 'crypto';
import { appendFileSync } from 'fs';
import rateLimit from 'express-rate-limit';
import { fetchWithTimeout, getAuthHeaders } from '../helpers';
import { logAuthEvent, logSecurityEvent, AuditEventType } from '../audit-logger';

const LOG_FILE = process.env.LOG_FILE || "./server-login.log";

function logLogin(message: string) {
    const timestamp = new Date().toISOString();
    try { appendFileSync(LOG_FILE, `[${timestamp}] ${message}\n`); } catch { /* ignore */ }
}

// ─── Custom rate limiting for login ─────────────────────────────────────────
interface FailedLoginAttempt { count: number; firstAttemptTime: number; }
const failedLoginAttempts = new Map<string, FailedLoginAttempt>();
const MAX_FAILED_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;

function recordFailedLogin(email: string): boolean {
    const now = Date.now();
    const key = email.toLowerCase();
    const attempt = failedLoginAttempts.get(key);
    if (!attempt || now - attempt.firstAttemptTime > RATE_LIMIT_WINDOW) {
        failedLoginAttempts.set(key, { count: 1, firstAttemptTime: now });
        return true;
    }
    attempt.count++;
    return attempt.count <= MAX_FAILED_ATTEMPTS;
}

function clearFailedLogins(email: string): void {
    failedLoginAttempts.delete(email.toLowerCase());
}

function getRemainingAttempts(email: string): number {
    const key = email.toLowerCase();
    const attempt = failedLoginAttempts.get(key);
    if (!attempt) return MAX_FAILED_ATTEMPTS;
    if (Date.now() - attempt.firstAttemptTime > RATE_LIMIT_WINDOW) {
        failedLoginAttempts.delete(key);
        return MAX_FAILED_ATTEMPTS;
    }
    return Math.max(0, MAX_FAILED_ATTEMPTS - attempt.count);
}

// ─── Token cache ────────────────────────────────────────────────────────────
interface TokenCacheEntry { email: string; facilityId?: string; validatedAt: number; expiresAt: number; }
const tokenCache = new Map<string, TokenCacheEntry>();
const SESSION_TIMEOUT = 30 * 60 * 1000;

setInterval(() => {
    const now = Date.now();
    tokenCache.forEach((entry, token) => {
        if (now > entry.expiresAt) tokenCache.delete(token);
    });
}, 60 * 1000);

function invalidateToken(token: string) { tokenCache.delete(token); }

const genericLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Too many requests, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => { res.status(429).json({ status: false, error: "Too many requests. Please try again later." }); },
    skip: (req) => {
        return req.method === "GET" ||
            req.body?.entity === "TryLogin" ||
            req.body?.action === "TryLogin" ||
            req.body?.entity === "FacilityDataCenter" ||
            req.body?.entity === "Facility" ||
            req.body?.entity === "FacilitiesByProvider";
    },
});

export function registerAuthRoutes(app: Express, BACKEND_API_URL: string, PHP_LOCAL_BASE: string) {

    // ─── Main /api/get proxy ──────────────────────────────────────────────────
    app.post("/api/get", genericLimiter, async (req: Request, res: Response) => {
        const { entity, action, email, password, deviceId, name, ...rest } = req.body;

        try {
            const requestedEntity = entity || action;

            const localOnlyMethods = [
                "getWoundsByHealingStatus", "getWoundsByDisposition",
                "lstAllFacilities", "addNewFacility", "updateFacility", "deleteFacility",
                "lstUserGroups", "lstFacilityUsers", "updateUserRoles", "updateUserStatus", "createUser",
            ];

            const isLocalOnlyMethod = requestedEntity === "FacilityDataCenter" && localOnlyMethods.includes(rest.method);
            const localEntities = ["getOneTimeCode", "validateOneTimeCode"];
            const isLocalEntity = localEntities.includes(requestedEntity);

            // ─── TryLogin rate limit ────────────────────────────────────────────
            if (requestedEntity === "TryLogin") {
                if (!email) return res.status(400).json({ status: false, error: "Missing email for login" });
                const remaining = getRemainingAttempts(email);
                if (remaining <= 0) {
                    logLogin(`[/api/get] Rate limit exceeded`);
                    return res.status(429).json({
                        status: false, error: "Too many login attempts. Please try again later.",
                        data: [{ status: 0, reason: 5, msg: "Too many login attempts in the last 15 minutes. Please try again later." }],
                    });
                }
            }

            if (!requestedEntity) return res.status(400).json({ status: false, error: "Missing required parameter: entity" });
            if (!isLocalOnlyMethod && !isLocalEntity && !email) return res.status(400).json({ status: false, error: "Missing required parameter: email" });

            // ─── Local-only methods ─────────────────────────────────────────────
            if (isLocalOnlyMethod || isLocalEntity) {
                try {
                    const localPayload = { entity: requestedEntity, ...(email && { email }), ...(name && { name }), ...(deviceId && { deviceId }), ...(rest.token && { token: rest.token }), ...rest };
                    const localResponse = await fetchWithTimeout(`${PHP_LOCAL_BASE}/get`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(localPayload) });
                    if (localResponse.ok) return res.json(await localResponse.json());
                    return res.status(localResponse.status).json({ status: false, error: `Local API returned status ${localResponse.status}` });
                } catch {
                    return res.status(500).json({ status: false, error: `Failed to process method locally` });
                }
            }

            // ─── TryLogin — OTC check first ────────────────────────────────────
            if (requestedEntity === "TryLogin") {
                if (!password || !deviceId) return res.status(400).json({ status: false, error: "Missing required login parameters: password and deviceId" });

                try {
                    const otcResponse = await fetchWithTimeout(`${PHP_LOCAL_BASE}/get`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ entity: "validateOneTimeCode", email, password, deviceId }),
                    }, 5000);

                    if (otcResponse.ok) {
                        const otcData = await otcResponse.json();
                        if (otcData.status === true && otcData.data?.[0]?.status === 1) {
                            clearFailedLogins(email);
                            return res.json(otcData);
                        }
                        const errorMsg = otcData.error || otcData.data?.[0]?.msg || 'Unknown';
                        if (errorMsg === 'Invalid OTC') return res.json({ status: false, error: 'Invalid one-time code. Use the code from your email or request a new one.', data: [{ status: 0, msg: 'Invalid OTC', reason: 1 }] });
                        if (errorMsg === 'OTC expired') return res.json({ status: false, error: 'One-time code has expired. Request a new one.', data: [{ status: 0, msg: 'OTC expired', reason: 1 }] });
                    }
                } catch { /* continue to remote login */ }
            }

            // ─── Build remote payload ───────────────────────────────────────────
            const remotePayload: any = { entity: requestedEntity, email, ...(action && { action }), ...(password && { password }), ...(deviceId && { deviceId }), ...(name && { name }), ...rest };

            const isLoginAttempt = requestedEntity === "TryLogin" || requestedEntity === "getOneTimeCode" || requestedEntity === "validateOneTimeCode" ||
                (requestedEntity === "FacilityDataCenter" && rest.method === "tryLogin");

            if (!isLoginAttempt) {
                let token: string | undefined;
                const authHeader = req.headers.authorization;
                if (authHeader?.startsWith("Bearer ")) token = authHeader.substring(7);
                else if (remotePayload.token) token = remotePayload.token;
                if (!token) return res.status(401).json({ status: false, error: "Authorization required for this operation" });
            }

            // Add Flutter-like tracking params for facility entities
            if (["FacilityDataCenter", "Facility", "FacilitiesByProvider"].includes(requestedEntity)) {
                if (!remotePayload.deviceId && deviceId) remotePayload.deviceId = deviceId;
                if (remotePayload.email && (remotePayload.deviceId || deviceId)) {
                    const salt = remotePayload.email + "38457487" + (remotePayload.deviceId || deviceId);
                    remotePayload.encountertrackid = createHash('sha256').update(salt).digest('hex');
                }
                if (remotePayload.token && !remotePayload.providertrackid) remotePayload.providertrackid = remotePayload.token;
            }

            // JSON or FormData based on entity type
            let body: string;
            let headers: Record<string, string>;
            if (["TryLogin", "EntityInfo", "GroupsByUser", "FacilityDataCenter"].includes(requestedEntity)) {
                body = JSON.stringify(remotePayload);
                headers = { "Content-Type": "application/json" };
            } else {
                const formData = new URLSearchParams();
                for (const key in remotePayload) {
                    if (remotePayload[key] !== undefined && remotePayload[key] !== null) formData.append(key, remotePayload[key]);
                }
                body = formData.toString();
                headers = { "Content-Type": "application/x-www-form-urlencoded" };
            }

            const remoteResponse = await fetchWithTimeout(BACKEND_API_URL, { method: "POST", headers, body });

            let data: any;
            try {
                const responseText = await remoteResponse.text();
                const trimmed = responseText.trim();
                if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
                    return res.status(500).json({ status: false, error: "Backend returned invalid response", details: `Response is not JSON (starts with: ${trimmed.substring(0, 20)}...)` });
                }
                data = JSON.parse(responseText);
            } catch (e) {
                const errorMsg = e instanceof Error ? e.message : String(e);
                return res.status(500).json({ status: false, error: "Backend returned invalid response", details: errorMsg });
            }

            // Handle TryLogin response
            if (requestedEntity === "TryLogin") {
                const dataItem = data.data?.[0];
                const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
                const userAgent = req.headers['user-agent'] || 'unknown';

                if (dataItem?.status === 1) {
                    clearFailedLogins(email);
                    logAuthEvent(AuditEventType.LOGIN_SUCCESS, email, { ipAddress: clientIp, userAgent, result: 'SUCCESS', details: 'User authenticated successfully' });
                } else {
                    const allowed = recordFailedLogin(email);
                    const remaining = getRemainingAttempts(email);
                    logAuthEvent(AuditEventType.LOGIN_FAILURE, email, { ipAddress: clientIp, userAgent, result: 'FAILURE', details: `Failed login attempt. Remaining: ${remaining}` });

                    if (!allowed) {
                        logSecurityEvent(AuditEventType.RATE_LIMIT_EXCEEDED, { userId: email, ipAddress: clientIp, userAgent, details: 'Login rate limit exceeded - account temporarily locked' });
                        data.data = data.data || [];
                        data.data[0] = { ...dataItem, reason: 5, msg: "Too many login attempts. Please try again in 15 minutes." };
                    }
                }
            }

            res.json(data);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error("POST /api/get error:", errorMessage);
            logLogin(`[/api/get] Error: ${errorMessage}`);
            res.status(500).json({ status: false, error: "Server error", details: errorMessage });
        }
    });

    // ─── Logout (merged — handles both /api/logout and /api/auth/logout) ────
    const logoutHandler = async (req: Request, res: Response) => {
        const { email, deviceId } = req.body;
        const token = req.headers.authorization?.replace("Bearer ", "") || req.body?.token;
        const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';

        if (token) invalidateToken(token);

        logAuthEvent(AuditEventType.LOGOUT, email || 'unknown', {
            ipAddress: clientIp, userAgent, result: 'SUCCESS', details: 'User logged out',
        });

        try {
            const logoutPayload = { entity: "TryLogoutFacilities", email, deviceId: deviceId || "web-client" };
            const remoteResponse = await fetchWithTimeout(BACKEND_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(logoutPayload),
            });
            const data = await remoteResponse.json();

            // Retry with auth headers if unauthorized
            if (data.error === "Unauthorized access" && req.headers.authorization) {
                const authHeaders = getAuthHeaders(req);
                const retryResponse = await fetchWithTimeout(BACKEND_API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...authHeaders },
                    body: JSON.stringify(logoutPayload),
                });
                const retryData = await retryResponse.json();
                return res.json({ answer: true, code: "", ...retryData });
            }

            res.json({ answer: true, code: "", ...data });
        } catch {
            res.json({ answer: true, code: "", error: "Logout processed" });
        }
    };

    app.post("/api/logout", logoutHandler);
    app.post("/api/auth/logout", logoutHandler);

    // ─── Diagnostic routes ──────────────────────────────────────────────────
    app.get("/api/diagnose/backend-connectivity", async (_req: Request, res: Response) => {
        try {
            const response = await fetchWithTimeout(BACKEND_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ entity: "test", email: "test@test.com" }),
            }, 3000);
            const text = await response.text();
            res.json({ status: true, message: "Backend connectivity test successful", url: BACKEND_API_URL, httpStatus: response.status, responseLength: text.length });
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            res.status(500).json({ status: false, error: err.message, url: BACKEND_API_URL, type: err.constructor.name });
        }
    });

    app.get("/api/debug/headers", (req: Request, res: Response) => {
        const authHeaders = getAuthHeaders(req);
        res.json({ allHeaders: req.headers, extractedAuthHeaders: authHeaders, authorizationPresent: !!req.headers.authorization });
    });
}
