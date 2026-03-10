/**
 * Route registration barrel — replaces the old monolithic routes.ts (3,325 lines).
 * Each domain is now in its own module under server/routes/.
 */
import type { Express } from "express";
import type { Server } from "http";
import { registerAuthRoutes } from "./auth";
import { registerDashboardRoutes } from "./dashboard";
import { registerReportRoutes } from "./reports";
import { registerImportRoutes } from "./import";

// ─── API URL configuration ──────────────────────────────────────────────────
const PHP_LOCAL_BASE = process.env.PHP_LOCAL_BASE || "https://cubed-mr.app/api";
const REMOTE_BACKEND_BASE = process.env.REMOTE_BACKEND_BASE || "https://cubed-mr.app";
const BACKEND_API_URL = process.env.BACKEND_API_URL || `${REMOTE_BACKEND_BASE}/api/get`;

console.log(`[Server Init] Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`[Server Init] PHP Local Base: ${PHP_LOCAL_BASE}`);
console.log(`[Server Init] Remote Backend Base: ${REMOTE_BACKEND_BASE}`);
console.log(`[Server Init] Backend API URL: ${BACKEND_API_URL}`);

export async function registerRoutes(
    httpServer: Server,
    app: Express
): Promise<Server> {
    // Register all route modules
    registerAuthRoutes(app, BACKEND_API_URL, PHP_LOCAL_BASE);
    registerDashboardRoutes(app, BACKEND_API_URL, REMOTE_BACKEND_BASE);
    registerReportRoutes(app, BACKEND_API_URL, REMOTE_BACKEND_BASE);
    registerImportRoutes(app, BACKEND_API_URL, REMOTE_BACKEND_BASE);

    return httpServer;
}
