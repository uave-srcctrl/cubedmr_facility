// @vitest-environment node
/**
 * Unit Tests: Field Mapper (data layer)
 *
 * Contract tests for the normalization layer that maps the backend's
 * PascalCase-with-spaces field names to camelCase. This layer is a coupling
 * point to the API, so these tests act as a safety net for the API adaptation
 * (LIMP-4 refactor and API-* work): if the backend contract changes, these
 * catch it.
 */

import { describe, it, expect } from 'vitest';
import {
    normalizeFieldNames,
    normalizeFieldNamesArray,
    getFieldValue,
} from '@/lib/field-mapper';

describe('normalizeFieldNames', () => {
    it('maps a known backend field to camelCase', () => {
        const out = normalizeFieldNames({ 'Number of Active Wounds': 5 });
        expect(out.numberOfActiveWounds).toBe(5);
    });

    it('keeps the original key too (backward-compatible fallback)', () => {
        const out = normalizeFieldNames({ 'Number of Active Wounds': 5 });
        expect(out['Number of Active Wounds']).toBe(5);
    });

    it('maps several known fields at once', () => {
        const out = normalizeFieldNames({
            'Resolution Rate': 0.5,
            'Wound Etiology': 'Diabetic',
        });
        expect(out.resolutionRate).toBe(0.5);
        expect(out.woundEtiology).toBe('Diabetic');
    });

    it('leaves unmapped keys unchanged and does not duplicate them', () => {
        const out = normalizeFieldNames({ foo: 1 });
        expect(out.foo).toBe(1);
        expect(Object.keys(out)).toEqual(['foo']);
    });

    it('returns non-object inputs unchanged', () => {
        expect(normalizeFieldNames(null)).toBeNull();
        expect(normalizeFieldNames(42 as any)).toBe(42);
        expect(normalizeFieldNames('x' as any)).toBe('x');
    });
});

describe('normalizeFieldNamesArray', () => {
    it('normalizes every object in the array', () => {
        const out = normalizeFieldNamesArray([
            { 'Resolution Rate': 1 },
            { 'Number of New Wounds': 2 },
        ]);
        expect(out[0].resolutionRate).toBe(1);
        expect(out[1].newWounds).toBe(2);
    });

    it('returns non-array inputs unchanged', () => {
        expect(normalizeFieldNamesArray(null as any)).toBeNull();
    });
});

describe('getFieldValue', () => {
    it('returns the value when the normalized key is present', () => {
        expect(getFieldValue({ numberOfActiveWounds: 7 }, 'numberOfActiveWounds')).toBe(7);
    });

    it('falls back to the backend spaced/PascalCase format', () => {
        expect(getFieldValue({ 'Wound Etiology': 'Venous' }, 'woundEtiology')).toBe('Venous');
    });

    it('treats 0 as a present value (not missing)', () => {
        expect(getFieldValue({ count: 0 }, 'count')).toBe(0);
    });

    it('returns the default (0) when the field is absent', () => {
        expect(getFieldValue({}, 'missing')).toBe(0);
    });

    it('returns a custom default when provided', () => {
        expect(getFieldValue({}, 'missing', 'N/A')).toBe('N/A');
    });

    it('returns the default when data is null/undefined', () => {
        expect(getFieldValue(null, 'x')).toBe(0);
        expect(getFieldValue(undefined, 'x', -1)).toBe(-1);
    });
});
