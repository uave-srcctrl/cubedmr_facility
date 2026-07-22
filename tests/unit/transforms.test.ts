/**
 * Unit Tests: Data transforms (data layer)
 *
 * Contract tests for the functions that turn raw backend responses into the
 * shapes the dashboard/report components expect. This is the coupling layer to
 * the API, so these tests are the safety net for the API adaptation (API-*) and
 * for the LIMP-4 refactor: if a transform's output shape drifts, these fail.
 *
 * Scope of this first increment: transformToKPIsFormat and transformToEtiologyFormat.
 * The remaining transforms (wound reduction, healing status, wounds-by-status,
 * etc.) are the next increment.
 */

import { describe, it, expect } from 'vitest';
import {
    transformToKPIsFormat,
    transformToEtiologyFormat,
} from '@/lib/transforms';

describe('transformToKPIsFormat', () => {
    it('maps the wound-outcome format (fields with "Number of ...")', () => {
        const res = transformToKPIsFormat({
            data: [{
                'Number of Active Wounds': '10',
                'Percent of Wounds Improving': '0.25',
                'Number of Resolved Wounds': '3',
                'Number of New Wounds': '2',
                'Facility Acuity Index': '4',
            }],
        });
        expect(res.status).toBe(true);
        expect(res.source).toBe('backend');
        expect(res.data.activeWounds.value).toBe(10);
        expect(res.data.healingRate.value).toBe(25);      // 0.25 * 100
        expect(res.data.reportsGenerated.value).toBe(5);  // resolved(3) + new(2)
        expect(res.data.criticalCases.value).toBe(4);
    });

    it('aggregates the acuity-index (weekly) format', () => {
        const res = transformToKPIsFormat({
            data: [
                { wounds: 5, patients: 3, 'Facility Acuity Index': '2' },
                { wounds: 8, patients: 4, 'Facility Acuity Index': '6' },
            ],
        });
        expect(res.data.activeWounds.value).toBe(8);       // max wounds
        expect(res.data.healingRate.value).toBe(3);        // round(min(4*0.8, 100))
        expect(res.data.reportsGenerated.value).toBe(16);  // round(8 * 2)
        expect(res.data.criticalCases.value).toBe(6);      // round(acuity index of last week)
    });

    it('returns zeroed KPIs when there is no data', () => {
        const res = transformToKPIsFormat({ data: [] });
        expect(res.status).toBe(true);
        expect(res.data.activeWounds.value).toBe(0);
        expect(res.data.healingRate.value).toBe(0);
        expect(res.data.reportsGenerated.value).toBe(0);
        expect(res.data.criticalCases.value).toBe(0);
    });
});

describe('transformToEtiologyFormat', () => {
    it('maps the metric_name format, keeping only "Number of ..." rows', () => {
        const res = transformToEtiologyFormat({
            data: [
                { metric_name: 'Number of Diabetic', metric_value: '12' },
                { metric_name: 'Number of Venous', metric_value: '8' },
                { metric_name: 'Total Wounds', metric_value: '5' }, // filtered out
            ],
        });
        expect(res.status).toBe(true);
        expect(res.data).toHaveLength(2);
        expect(res.data[0]).toMatchObject({ name: 'Diabetic', value: 12 });
        expect(res.data[1]).toMatchObject({ name: 'Venous', value: 8 });
        // color palette is applied deterministically by index
        expect(res.data[0].fill).toBe('#dbeafe');
    });

    it('maps the name/value format and falls back to "Others" for missing names', () => {
        const res = transformToEtiologyFormat({
            data: [
                { name: 'Arterial', value: 4 },
                { value: 2 }, // no name -> "Others"
            ],
        });
        expect(res.data[0]).toMatchObject({ name: 'Arterial', value: 4 });
        expect(res.data[1]).toMatchObject({ name: 'Others', value: 2 });
    });

    it('maps an object of numeric breakdowns (underscores become spaces)', () => {
        const res = transformToEtiologyFormat({ pressure_ulcer: 7, note: 'x' });
        expect(res.data).toHaveLength(1);
        expect(res.data[0]).toMatchObject({ name: 'pressure ulcer', value: 7 });
    });
});
