/**
 * Unit Tests: Wound Utilities
 * 
 * Tests for wound-related utility functions.
 * Regression tests for NaN bug fix (Phase 34).
 */

import { describe, it, expect } from 'vitest';
import {
    toNum,
    getHealingColor,
    getHealingBackground,
    getProgressBackground,
    getWoundCardBackground,
    isProgressPositive,
    isProgressNegative,
    formatDateDisplay,
    getProgressIconType,
} from '@/lib/wound-utils';

// ================================================================
// toNum() — safe numeric parser (NaN bug regression tests)
// ================================================================
describe('toNum - Safe Numeric Parser', () => {
    describe('number inputs', () => {
        it('should return valid numbers unchanged', () => {
            expect(toNum(42)).toBe(42);
            expect(toNum(3.14)).toBe(3.14);
            expect(toNum(0)).toBe(0);
            expect(toNum(-5)).toBe(-5);
        });

        it('should return 0 for NaN', () => {
            expect(toNum(NaN)).toBe(0);
        });

        it('should handle Infinity', () => {
            expect(toNum(Infinity)).toBe(Infinity);
            expect(toNum(-Infinity)).toBe(-Infinity);
        });
    });

    describe('string inputs', () => {
        it('should parse numeric strings', () => {
            expect(toNum('42')).toBe(42);
            expect(toNum('3.14')).toBe(3.14);
            expect(toNum('0')).toBe(0);
            expect(toNum('-5')).toBe(-5);
        });

        it('should return 0 for non-numeric strings', () => {
            expect(toNum('')).toBe(0);
            expect(toNum('abc')).toBe(0);
            expect(toNum('NaN')).toBe(0);
            expect(toNum('undefined')).toBe(0);
            expect(toNum('null')).toBe(0);
        });

        it('should parse strings with leading numbers', () => {
            expect(toNum('42px')).toBe(42);
            expect(toNum('3.14cm')).toBe(3.14);
        });
    });

    describe('null/undefined/object inputs', () => {
        it('should return 0 for null', () => {
            expect(toNum(null)).toBe(0);
        });

        it('should return 0 for undefined', () => {
            expect(toNum(undefined)).toBe(0);
        });

        it('should return 0 for objects', () => {
            expect(toNum({})).toBe(0);
            expect(toNum([])).toBe(0);
        });

        it('should return 0 for boolean', () => {
            expect(toNum(true)).toBe(0);
            expect(toNum(false)).toBe(0);
        });
    });

    describe('regression: wound measurement NaN scenarios', () => {
        it('should safely handle missing wound dimensions', () => {
            // Scenario: SP returned null for width/height/depth
            const width = toNum(undefined);
            const height = toNum(undefined);
            const depth = toNum(null);

            const area = width * height;
            const volume = area * depth;

            expect(area).toBe(0);
            expect(volume).toBe(0);
            expect(isNaN(area)).toBe(false);
            expect(isNaN(volume)).toBe(false);
        });

        it('should compute surface area correctly with valid dimensions', () => {
            const width = toNum('2.5');
            const height = toNum('3.0');

            const area = width * height;
            expect(area).toBe(7.5);
        });

        it('should handle partial dimensions (one missing)', () => {
            const width = toNum('2.5');
            const height = toNum(null);

            const area = width * height;
            expect(area).toBe(0);
            expect(isNaN(area)).toBe(false);
        });

        it('should handle healing percentage calculation safely', () => {
            const initial = toNum('10');
            const current = toNum('7');
            const healed = initial > 0 ? ((initial - current) / initial) * 100 : 0;
            expect(healed).toBe(30);
        });

        it('should handle healing percentage with zero initial area', () => {
            const initial = toNum(0);
            const current = toNum(0);
            const healed = initial > 0 ? ((initial - current) / initial) * 100 : 0;
            expect(healed).toBe(0);
            expect(isNaN(healed)).toBe(false);
        });
    });
});

// ================================================================
// getHealingColor()
// ================================================================
describe('getHealingColor', () => {
    it('should return green for >= 75%', () => {
        expect(getHealingColor(100)).toBe('text-green-600');
        expect(getHealingColor(75)).toBe('text-green-600');
    });

    it('should return emerald for >= 50%', () => {
        expect(getHealingColor(74)).toBe('text-emerald-600');
        expect(getHealingColor(50)).toBe('text-emerald-600');
    });

    it('should return yellow for >= 25%', () => {
        expect(getHealingColor(49)).toBe('text-yellow-600');
        expect(getHealingColor(25)).toBe('text-yellow-600');
    });

    it('should return orange for < 25%', () => {
        expect(getHealingColor(24)).toBe('text-orange-600');
        expect(getHealingColor(0)).toBe('text-orange-600');
    });
});

// ================================================================
// getHealingBackground()
// ================================================================
describe('getHealingBackground', () => {
    it('should return green styles for positive healing', () => {
        const result = getHealingBackground(50);
        expect(result.bg).toContain('green');
        expect(result.icon).toContain('green');
    });

    it('should return red styles for zero or negative healing', () => {
        const result = getHealingBackground(0);
        expect(result.bg).toContain('red');
        expect(result.icon).toContain('red');
    });
});

// ================================================================
// getProgressBackground()
// ================================================================
describe('getProgressBackground', () => {
    it('should return green for improving', () => {
        expect(getProgressBackground('Improving').bg).toContain('green');
        expect(getProgressBackground('Healing').bg).toContain('green');
        expect(getProgressBackground('Resolved').bg).toContain('green');
    });

    it('should return red for worsening', () => {
        expect(getProgressBackground('Worsening').bg).toContain('red');
        expect(getProgressBackground('Declining').bg).toContain('red');
        expect(getProgressBackground('Deteriorating').bg).toContain('red');
    });

    it('should return cyan for stable/unknown', () => {
        expect(getProgressBackground('Stable').bg).toContain('cyan');
        expect(getProgressBackground('').bg).toContain('cyan');
    });

    it('should handle null-like inputs', () => {
        expect(getProgressBackground(undefined as any).bg).toContain('cyan');
        expect(getProgressBackground(null as any).bg).toContain('cyan');
    });
});

// ================================================================
// getWoundCardBackground()
// ================================================================
describe('getWoundCardBackground', () => {
    it('should prioritize disposition for resolved wounds', () => {
        const result = getWoundCardBackground('Worsening', 'Resolved');
        expect(result).toContain('green');
    });

    it('should use progress when no disposition', () => {
        expect(getWoundCardBackground('Improving')).toContain('sky');
        expect(getWoundCardBackground('Worsening')).toContain('red');
        expect(getWoundCardBackground('Resolved')).toContain('green');
    });

    it('should return muted for unknown progress', () => {
        expect(getWoundCardBackground('Stable')).toContain('muted');
        expect(getWoundCardBackground('')).toContain('muted');
    });
});

// ================================================================
// isProgressPositive / isProgressNegative
// ================================================================
describe('Progress Status Helpers', () => {
    it('should detect positive progress', () => {
        expect(isProgressPositive('Improving')).toBe(true);
        expect(isProgressPositive('Healing')).toBe(true);
        expect(isProgressPositive('Resolved')).toBe(true);
        expect(isProgressPositive('Closed')).toBe(true);
    });

    it('should not detect non-positive as positive', () => {
        expect(isProgressPositive('Worsening')).toBe(false);
        expect(isProgressPositive('Stable')).toBe(false);
        expect(isProgressPositive('')).toBe(false);
    });

    it('should detect negative progress', () => {
        expect(isProgressNegative('Worsening')).toBe(true);
        expect(isProgressNegative('Declining')).toBe(true);
        expect(isProgressNegative('Deteriorating')).toBe(true);
    });

    it('should not detect non-negative as negative', () => {
        expect(isProgressNegative('Improving')).toBe(false);
        expect(isProgressNegative('Stable')).toBe(false);
        expect(isProgressNegative('')).toBe(false);
    });
});

// ================================================================
// formatDateDisplay()
// ================================================================
describe('formatDateDisplay', () => {
    it('should format YYYY-MM-DD dates', () => {
        const result = formatDateDisplay('2024-01-15');
        expect(result).toContain('Jan');
        expect(result).toContain('15');
        expect(result).toContain('2024');
    });

    it('should handle invalid date strings', () => {
        const result = formatDateDisplay('not-a-date');
        // Should return the original string or a reasonable fallback
        expect(typeof result).toBe('string');
    });
});

// ================================================================
// getProgressIconType()
// ================================================================
describe('getProgressIconType', () => {
    it('should return improving for healing progress', () => {
        expect(getProgressIconType('Improving')).toBe('improving');
        expect(getProgressIconType('Healing')).toBe('improving');
    });

    it('should return deteriorating for worsening progress', () => {
        expect(getProgressIconType('Worsening')).toBe('deteriorating');
        expect(getProgressIconType('Declining')).toBe('deteriorating');
        expect(getProgressIconType('Deteriorating')).toBe('deteriorating');
    });

    it('should return stable for unknown progress', () => {
        expect(getProgressIconType('Stable')).toBe('stable');
        expect(getProgressIconType('')).toBe('stable');
    });
});
