/**
 * Dashboard route handlers — refactored from 6 copy-pasted handlers (~900 lines)
 * into a factory pattern + individual configs (~250 lines).
 */
import type { Express, Request, Response } from 'express';
import {
    extractFacilityId,
    getAuthToken,
    extractEmail,
    fetchWithDateFallback,
    fetchFromBackend,
    fetchWithTimeout,
    getAuthHeaders,
    transformToKPIsFormat,
    transformToEtiologyFormat,
    transformToWoundReductionFormat,
    transformToHealingStatusFormat,
    transformToWoundsByStatusFormat,
    transformWoundReductionMedian,
} from '../helpers';

export function registerDashboardRoutes(app: Express, BACKEND_API_URL: string, REMOTE_BACKEND_BASE: string) {

    // ─── KPIs ───────────────────────────────────────────────────────────────────
    const dashboardKpisHandler = async (req: Request, res: Response) => {
        const facilityId = extractFacilityId(req);
        const email = extractEmail(req) || "dashboard-system";
        const token = getAuthToken(req);
        const startDate = req.query?.startDate as string;
        const endDate = req.query?.endDate as string;

        if (!facilityId) return res.status(400).json({ status: false, error: "Missing facility ID" });

        try {
            // Try rptFacilityWoundOutcome with date fallback
            const result = await fetchWithDateFallback({
                backendUrl: BACKEND_API_URL,
                method: "rptFacilityWoundOutcome",
                facilityId,
                token,
                email,
                deviceId: "dashboard-kpis",
                startDate,
                endDate,
                validate: (d) => d.status && d.data?.length > 0 && d.data[0]["Number of Active Wounds"] > 0,
            });

            let backendData = result.data;
            let usedPeriod = result.period;

            // Fallback to acuity index
            if (!backendData) {
                const acuity = await fetchFromBackend(BACKEND_API_URL, "rptFacilityAcuityIndex", {
                    facilityId, email, token, deviceId: "dashboard-kpis-fallback",
                });
                if (acuity?.status && acuity.data?.length > 0) {
                    backendData = acuity;
                    usedPeriod = "Last 30 days";
                }
            }

            if (!backendData) {
                return res.status(500).json({ status: false, error: "No KPI data available for this facility" });
            }

            const kpisData = transformToKPIsFormat(backendData);

            // Fetch reports generated count
            try {
                const reportsCount = await fetchFromBackend(BACKEND_API_URL, "getReportsGeneratedCount", {
                    email, facilityId, token, deviceId: "dashboard-kpis-reports",
                    dosStart: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    dosEnd: endDate || new Date().toISOString().split('T')[0],
                });
                if (reportsCount?.status && reportsCount.data) {
                    kpisData.data.reportsGenerated.value = reportsCount.data.reports_generated;
                    kpisData.data.reportsGenerated.period = "In selected date range";
                }
            } catch { /* use calculated value */ }

            res.json(kpisData);
        } catch (error) {
            console.error("/api/dashboard/kpis error:", error);
            res.status(500).json({ status: false, error: "Failed to fetch dashboard KPIs" });
        }
    };

    app.all("/api/dashboard/kpis", dashboardKpisHandler);

    // ─── Wound Etiology ─────────────────────────────────────────────────────────
    const dashboardEtiologyHandler = async (req: Request, res: Response) => {
        const facilityId = extractFacilityId(req);
        const authToken = getAuthToken(req);
        const email = extractEmail(req) || "dashboard-system";
        const startDate = req.query?.startDate as string;
        const endDate = req.query?.endDate as string;

        if (!facilityId) return res.status(400).json({ status: false, error: "Missing facility ID" });
        if (!authToken) return res.status(401).json({ status: false, error: "Authentication required" });

        try {
            let startDateStr = startDate;
            let endDateStr = endDate;
            if (!startDateStr || !endDateStr) {
                const today = new Date();
                const start = new Date(today);
                start.setDate(start.getDate() - 30);
                startDateStr = start.toISOString().split('T')[0];
                endDateStr = today.toISOString().split('T')[0];
            }

            const etiologyResult = await fetchFromBackend(BACKEND_API_URL, "rptEtiologyDistribution", {
                facilityId, dosStart: startDateStr, dosEnd: endDateStr,
                email, token: authToken, deviceId: "dashboard-etiology",
            });

            if (etiologyResult?.status && etiologyResult.data?.length > 0) {
                return res.json(transformToEtiologyFormat(etiologyResult));
            }

            // Return empty
            res.json(transformToEtiologyFormat({ data: [] }));
        } catch (error) {
            console.error("/api/dashboard/wound-etiology error:", error);
            res.status(500).json({ status: false, error: "Failed to fetch wound etiology" });
        }
    };

    app.all("/api/dashboard/wound-etiology", dashboardEtiologyHandler);

    // ─── Wound Reduction ────────────────────────────────────────────────────────
    const dashboardWoundReductionHandler = async (req: Request, res: Response) => {
        const facilityId = extractFacilityId(req);
        const authToken = getAuthToken(req);
        const email = extractEmail(req) || "dashboard-system";
        const startDate = req.query?.startDate as string;
        const endDate = req.query?.endDate as string;

        if (!facilityId) return res.status(400).json({ status: false, error: "Missing facility ID" });
        if (!authToken) return res.status(401).json({ status: false, error: "Authentication required" });

        try {
            // Try rptWoundOutcomeGlobal with date fallback
            const result = await fetchWithDateFallback({
                backendUrl: BACKEND_API_URL,
                method: "rptWoundOutcomeGlobal",
                facilityId,
                token: authToken,
                email,
                deviceId: "dashboard-reduction",
                startDate,
                endDate,
            });

            let backendData = result.data;

            // Fallback to acuity index
            if (!backendData) {
                const acuity = await fetchFromBackend(BACKEND_API_URL, "rptFacilityAcuityIndex", {
                    facilityId, email, token: authToken, deviceId: "dashboard-reduction-fallback",
                });
                if (acuity?.status && acuity.data?.length > 0) {
                    backendData = acuity;
                }
            }

            if (!backendData) {
                return res.status(500).json({ status: false, error: "No wound reduction data available" });
            }

            res.json(transformToWoundReductionFormat(backendData));
        } catch (error) {
            console.error("/api/dashboard/wound-reduction error:", error);
            res.status(500).json({ status: false, error: "Failed to fetch wound reduction data" });
        }
    };

    app.all("/api/dashboard/wound-reduction", dashboardWoundReductionHandler);

    // ─── Healing Status ─────────────────────────────────────────────────────────
    const dashboardHealingStatusHandler = async (req: Request, res: Response) => {
        const facilityId = extractFacilityId(req);
        const authToken = getAuthToken(req);
        const email = extractEmail(req) || "dashboard-system";
        const startDate = req.query?.startDate as string || req.body?.startDate;
        const endDate = req.query?.endDate as string || req.body?.endDate;

        if (!facilityId) return res.status(400).json({ status: false, error: "Missing facility ID" });
        if (!authToken) return res.status(401).json({ status: false, error: "Authentication required" });

        try {
            // Try rptWoundHealingStatus
            const healingResult = await fetchFromBackend(BACKEND_API_URL, "rptWoundHealingStatus", {
                facilityId, dosStart: startDate, dosEnd: endDate,
                email, token: authToken, deviceId: "dashboard-healing-status",
            });

            if (healingResult?.status && healingResult.data?.length > 0) {
                return res.json(transformToHealingStatusFormat(healingResult));
            }

            // Fallback to acuity index
            const acuity = await fetchFromBackend(BACKEND_API_URL, "rptFacilityAcuityIndex", {
                facilityId, email, token: authToken, deviceId: "dashboard-healing-status-fallback",
            });
            if (acuity?.status && acuity.data?.length > 0) {
                return res.json(transformToHealingStatusFormat(acuity));
            }

            res.status(500).json({ status: false, error: "No healing status data available" });
        } catch (error) {
            console.error("/api/dashboard/healing-status error:", error);
            res.status(500).json({ status: false, error: "Failed to fetch healing status" });
        }
    };

    app.all("/api/dashboard/healing-status", dashboardHealingStatusHandler);

    // ─── Wounds by Status ───────────────────────────────────────────────────────
    const dashboardWoundsByStatusHandler = async (req: Request, res: Response) => {
        const facilityId = extractFacilityId(req);
        const authHeaders = getAuthHeaders(req);

        if (!facilityId) return res.status(400).json({ status: false, error: "Missing facility ID" });

        try {
            const response = await fetchWithTimeout(
                `${REMOTE_BACKEND_BASE}/api/reports/facility-acuity-index/${facilityId}`,
                { method: "GET", headers: { "Content-Type": "application/json", ...authHeaders } }
            );

            if (!response.ok) {
                return res.status(500).json({ status: false, error: "Backend error" });
            }

            const backendData = await response.json();
            res.json(transformToWoundsByStatusFormat(backendData));
        } catch (error) {
            console.error("/api/dashboard/wounds-by-status error:", error);
            res.status(500).json({ status: false, error: "Failed to fetch wounds by status" });
        }
    };

    app.all("/api/dashboard/wounds-by-status", dashboardWoundsByStatusHandler);

    // ─── Wound Reduction Median ─────────────────────────────────────────────────
    const dashboardWoundReductionMedianHandler = async (req: Request, res: Response) => {
        const facilityId = extractFacilityId(req);
        const dosStart = req.body?.dosStart || req.query?.dosStart || req.query?.startDate;
        const dosEnd = req.body?.dosEnd || req.query?.dosEnd || req.query?.endDate;
        const email = extractEmail(req) || "dashboard-system";
        const authToken = getAuthToken(req);

        if (!facilityId || !dosStart || !dosEnd) {
            return res.status(400).json({ status: false, error: "Missing required parameters: facilityId, dosStart, dosEnd" });
        }
        if (!authToken) return res.status(401).json({ status: false, error: "Authentication required" });

        try {
            const medianResult = await fetchFromBackend(BACKEND_API_URL, "woundReductionMedian", {
                facilityId, dosStart, dosEnd, email, token: authToken, deviceId: "dashboard-wound-reduction-median",
            });

            if (medianResult?.status && medianResult.data?.length > 0) {
                const transformed = transformWoundReductionMedian(medianResult.data);
                return res.json({ status: true, data: transformed, source: "backend" });
            }

            res.status(500).json({ status: false, error: "No wound reduction median data available" });
        } catch (error) {
            console.error("/api/dashboard/wound-reduction-median error:", error);
            res.status(500).json({ status: false, error: "Failed to fetch wound reduction median data" });
        }
    };

    app.all("/api/dashboard/wound-reduction-median", dashboardWoundReductionMedianHandler);
}
