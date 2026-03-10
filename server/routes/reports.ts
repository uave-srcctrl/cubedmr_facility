/**
 * Report route handlers — etiology distribution, wound report, acuity index, general reports
 */
import type { Express, Request, Response } from 'express';
import {
    extractFacilityId,
    extractToken,
    extractEmail,
    getAuthToken,
    getAuthHeaders,
    fetchWithTimeout,
    fetchWithDateFallback,
    transformToEtiologyFormat,
} from '../helpers';

export function registerReportRoutes(app: Express, BACKEND_API_URL: string, REMOTE_BACKEND_BASE: string) {

    // ─── Facility Acuity Index ──────────────────────────────────────────────────
    const facilityAcuityIndexHandler = async (req: Request, res: Response) => {
        const facilityId = extractFacilityId(req);
        const dos = req.body?.dos || req.query?.dos;
        const startDate = req.body?.startDate || req.query?.startDate;
        const endDate = req.body?.endDate || req.query?.endDate;

        if (!facilityId) return res.status(400).json({ error: "Missing facility ID" });

        try {
            const PHP_LOCAL_BASE = process.env.PHP_LOCAL_BASE || "https://cubed-mr.app/api";
            const phpUrl = `${PHP_LOCAL_BASE}/api/facility-acuity-index`;
            const requestBody: any = { facility_id: facilityId, facilityId };

            if (startDate && endDate) {
                requestBody.startDate = startDate;
                requestBody.endDate = endDate;
            } else if (dos) {
                requestBody.dos = dos;
            }

            const response = await fetch(phpUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Facility-Id': facilityId },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorText = await response.text();
                return res.status(response.status).json({ error: `Backend returned ${response.status}`, details: errorText });
            }

            const data = await response.json();
            if (data && typeof data === 'object') return res.json(data);
            res.json({ status: true, data, source: "backend" });
        } catch (error) {
            console.error("[/api/facility-acuity-index] Error:", error);
            res.status(500).json({ error: "Failed to fetch acuity index", details: error instanceof Error ? error.message : String(error) });
        }
    };

    app.all("/api/facility-acuity-index", facilityAcuityIndexHandler);

    // ─── Etiology Distribution ──────────────────────────────────────────────────
    const etiologyDistributionHandler = async (req: Request, res: Response) => {
        const facilityId = extractFacilityId(req);
        const token = extractToken(req);
        const email = extractEmail(req);
        let dosStart = req.body?.dosStart || req.query?.dosStart;
        let dosEnd = req.body?.dosEnd || req.query?.dosEnd;

        // Single date → 30-day range
        const singleDate = req.body?.date || req.query?.date;
        if (singleDate && !dosStart && !dosEnd) {
            const endDate = new Date(singleDate as string);
            const startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - 30);
            dosStart = startDate.toISOString().split('T')[0];
            dosEnd = endDate.toISOString().split('T')[0];
        }

        // Default: last 30 days
        if (!dosStart || !dosEnd) {
            const today = new Date();
            const startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 30);
            dosStart = startDate.toISOString().split('T')[0];
            dosEnd = today.toISOString().split('T')[0];
        }

        if (!facilityId) return res.status(400).json({ error: "Missing facility ID" });

        try {
            const etiologyResponse = await fetchWithTimeout(BACKEND_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    entity: "FacilityDataCenter",
                    method: "rptEtiologyDistribution",
                    facilityId, dosStart, dosEnd,
                    email: email || "etiology-report",
                    token,
                    deviceId: "etiology-report",
                }),
            });

            if (!etiologyResponse.ok) {
                return res.status(500).json({ error: "Failed to fetch etiology distribution from backend" });
            }

            const backendData = await etiologyResponse.json();
            let rawData = backendData.data || backendData;

            // Transform metric_name/metric_value format
            if (Array.isArray(rawData) && rawData.length > 0 && rawData[0].metric_name !== undefined) {
                const countMap = new Map<string, number>();
                const pctMap = new Map<string, number>();

                for (const row of rawData) {
                    const metricName = String(row.metric_name || '');
                    const metricValue = parseFloat(row.metric_value) || 0;

                    if (metricName.startsWith('Number of ')) {
                        const etiology = metricName.replace(/^Number of\s+/i, '').trim();
                        countMap.set(etiology, Math.round(metricValue));
                    } else if (metricName.startsWith('Percentage of ')) {
                        const etiology = metricName.replace(/^Percentage of\s+/i, '').trim();
                        pctMap.set(etiology, parseFloat(metricValue.toFixed(2)));
                    }
                }

                rawData = Array.from(countMap.entries()).map(([etiology, count]) => ({
                    woundEtiology: etiology,
                    count,
                    percentage: pctMap.get(etiology) ?? 0,
                }));
            }

            res.json({ status: true, data: rawData, source: "backend" });
        } catch (error) {
            console.error("/api/etiology-distribution error:", error);
            res.status(500).json({ error: "Failed to fetch etiology distribution" });
        }
    };

    app.all("/api/etiology-distribution", etiologyDistributionHandler);

    // ─── Facility Wound Report ──────────────────────────────────────────────────
    const facilityWoundReportHandler = async (req: Request, res: Response) => {
        const facilityId = extractFacilityId(req);
        const token = getAuthToken(req);
        const email = extractEmail(req);
        const dosStart = req.body?.dosStart || req.query?.dosStart;
        const dosEnd = req.body?.dosEnd || req.query?.dosEnd;

        if (!facilityId) return res.status(400).json({ error: "Missing facility ID" });

        try {
            const result = await fetchWithDateFallback({
                backendUrl: BACKEND_API_URL,
                method: "rptFacilityWoundOutcome",
                facilityId,
                token,
                email: email || "facility-wound-report",
                deviceId: "facility-wound-report",
                startDate: dosStart,
                endDate: dosEnd,
            });

            if (result.data?.data) {
                const dataArray = Array.isArray(result.data.data) ? result.data.data : [result.data.data];
                return res.json({ status: true, data: dataArray, source: "backend", period: result.period });
            }

            res.status(400).json({ status: false, error: "No wound outcome data available for the specified date range and facility", source: "backend" });
        } catch (error) {
            console.error("[/api/facility-wound-report] error:", error);
            res.status(500).json({ error: "Failed to fetch wound report" });
        }
    };

    app.all("/api/facility-wound-report", facilityWoundReportHandler);

    // ─── General Report Endpoint ────────────────────────────────────────────────
    const woundsByStatusColors: Record<string, string> = {
        'Active': '#10b981', 'Resolved': '#3b82f6', 'Expired': '#6b7280',
        'Discharged': '#8b5cf6', 'Hospitalized Wound Related': '#ef4444',
        'Hospitalized Not Wound Related': '#f97316', 'Rescheduled': '#eab308', 'Sign Off': '#14b8a6',
    };

    app.post("/api/report", async (req: Request, res: Response) => {
        const { reportName, facilityId, status, email, startDate, endDate, token } = req.body;
        const authHeaders = getAuthHeaders(req);
        const authToken = getAuthToken(req) || token;

        if (!facilityId) return res.status(400).json({ status: false, error: "Missing facility ID" });

        try {
            if (reportName === "rptWoundsByStatus") {
                const localResponse = await fetchWithTimeout(BACKEND_API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        entity: "FacilityDataCenter",
                        method: "rptWoundsByStatus",
                        facilityId, status: status || null,
                        dosStart: startDate, dosEnd: endDate,
                        email: email || "dashboard-system",
                        token: authToken,
                        deviceId: "dashboard-wounds-by-status",
                    }),
                });

                if (localResponse.ok) {
                    const localData = await localResponse.json();
                    if (localData.status && localData.data?.length > 0) {
                        const dataWithColors = localData.data.map((item: any) => ({
                            ...item,
                            name: item.status || item.name,
                            value: item.count || item.value,
                            color: woundsByStatusColors[item.status || item.name] || '#6b7280',
                        }));
                        return res.json({ status: true, data: dataWithColors });
                    }
                }
                return res.json({ status: true, data: [] });

            } else if (reportName === "etiologyReport") {
                const date = new Date().toISOString().split('T')[0];
                const remoteUrl = `${REMOTE_BACKEND_BASE}/api/reports/etiology-distribution/${facilityId}/${date}`;
                const remoteResponse = await fetchWithTimeout(remoteUrl, {
                    method: "GET",
                    headers: { "Content-Type": "application/json", ...authHeaders },
                });
                const data = await remoteResponse.json();
                return res.json({ status: data.status !== false, data: data.data || data, error: data.error });

            } else {
                const remoteUrl = `${REMOTE_BACKEND_BASE}/api/reports/facility-acuity-index/${facilityId}`;
                const remoteResponse = await fetchWithTimeout(remoteUrl, {
                    method: "GET",
                    headers: { "Content-Type": "application/json", ...authHeaders },
                });
                const data = await remoteResponse.json();
                return res.json({ status: data.status !== false, data: data.data || data, error: data.error });
            }
        } catch (error) {
            console.error(`/api/report error for ${reportName}:`, error);
            res.status(500).json({ status: false, error: "Failed to fetch report" });
        }
    });
}
