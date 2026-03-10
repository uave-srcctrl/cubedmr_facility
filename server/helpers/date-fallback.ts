/**
 * Date-range fallback cascade utility
 * Replaces 3 identical copy-pasted blocks across route handlers.
 *
 * Strategy: try provided dates first, then 30d → 90d → 180d → 365d
 */
import { fetchWithTimeout } from './fetch-utils';

interface FallbackOptions {
    /** Backend API URL to call */
    backendUrl: string;
    /** SP method name (e.g. "rptFacilityWoundOutcome") */
    method: string;
    /** Facility ID */
    facilityId: string;
    /** Auth token */
    token: string | null;
    /** Email for the request */
    email: string;
    /** Device ID tag */
    deviceId: string;
    /** Client-provided start date (optional) */
    startDate?: string;
    /** Client-provided end date (optional) */
    endDate?: string;
    /** Extra body fields to merge */
    extraBody?: Record<string, any>;
    /** Validation function — called on each response to determine if data is acceptable */
    validate?: (data: any) => boolean;
}

interface FallbackResult {
    data: any | null;
    period: string | null;
}

const DEFAULT_DATE_RANGES = [
    { days: 30, label: "Last 30 days" },
    { days: 90, label: "Last 90 days" },
    { days: 180, label: "Last 180 days" },
    { days: 365, label: "Last 365 days" },
];

/**
 * Try fetching data with explicit dates first, then cascade through
 * progressively wider date ranges until data is found.
 */
export async function fetchWithDateFallback(opts: FallbackOptions): Promise<FallbackResult> {
    const { backendUrl, method, facilityId, token, email, deviceId, extraBody = {} } = opts;
    const defaultValidate = (d: any) => d.status && d.data && d.data.length > 0;
    const validate = opts.validate || defaultValidate;

    // Build list of date ranges to try
    const ranges: Array<{ startDate: string; endDate: string; label: string }> = [];

    if (opts.startDate && opts.endDate) {
        ranges.push({ startDate: opts.startDate, endDate: opts.endDate, label: "Client provided" });
    }

    // Always append the standard fallbacks after any client-provided range
    const today = new Date();
    for (const r of DEFAULT_DATE_RANGES) {
        const start = new Date(today);
        start.setDate(start.getDate() - r.days);
        ranges.push({
            startDate: start.toISOString().split('T')[0],
            endDate: today.toISOString().split('T')[0],
            label: r.label,
        });
    }

    for (const range of ranges) {
        try {
            const response = await fetchWithTimeout(backendUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    entity: "FacilityDataCenter",
                    method,
                    facilityId,
                    dosStart: range.startDate,
                    dosEnd: range.endDate,
                    email,
                    token,
                    deviceId,
                    ...extraBody,
                }),
            });

            if (response.ok) {
                const json = await response.json();
                if (validate(json)) {
                    return { data: json, period: `${range.startDate} to ${range.endDate}` };
                }
            }
        } catch {
            // continue to next range
        }
    }

    return { data: null, period: null };
}

/**
 * Simple single-shot fetch to the backend API with standard FacilityDataCenter payload
 */
export async function fetchFromBackend(
    backendUrl: string,
    method: string,
    params: Record<string, any>
): Promise<any | null> {
    try {
        const response = await fetchWithTimeout(backendUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                entity: "FacilityDataCenter",
                method,
                ...params,
            }),
        });

        if (response.ok) {
            return await response.json();
        }
    } catch {
        // caller handles null
    }
    return null;
}
