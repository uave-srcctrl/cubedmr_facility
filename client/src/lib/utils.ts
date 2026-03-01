import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalizes etiology strings to standard format
 * Converts variations like "Stage II", "Pressure Stage II", "Pressure Ulcer Stage II",
 * "Pressure, Stage IV" to standardized "Pressure (II)" format
 */
export function normalizeEtiology(etiology: string | null | undefined): string {
  if (!etiology) return 'Unknown';
  
  const e = etiology.trim();
  const eLower = e.toLowerCase();
  
  // Check if it's a pressure-related etiology
  if (eLower.includes('pressure') || eLower.includes('stage')) {
    // Already in correct format: "Pressure (I)", "Pressure (II)", etc.
    if (/pressure\s*\([ivdtu]/i.test(e)) {
      return e;
    }
    
    // Handle "Stage IV", "Stage III", etc. (without "Pressure" prefix)
    const stageOnlyMatch = e.match(/^stage\s+(iv|iii|ii|i|unstageable|dti)$/i);
    if (stageOnlyMatch) {
      const stage = stageOnlyMatch[1].toUpperCase();
      return `Pressure (${stage === 'UNSTAGEABLE' ? 'Unstageable' : stage === 'DTI' ? 'DTI' : stage})`;
    }
    
    // Handle "Pressure, Stage IV", "Pressure, Stage III", etc. (with comma)
    const pressureCommaStageMatch = e.match(/pressure[,\s]+stage\s+(iv|iii|ii|i|4|3|2|1|unstageable|dti)/i);
    if (pressureCommaStageMatch) {
      let stage = pressureCommaStageMatch[1].toUpperCase();
      // Convert numeric to roman numerals
      const romanMap: Record<string, string> = { '1': 'I', '2': 'II', '3': 'III', '4': 'IV' };
      if (romanMap[stage]) stage = romanMap[stage];
      return `Pressure (${stage === 'UNSTAGEABLE' ? 'Unstageable' : stage === 'DTI' ? 'DTI' : stage})`;
    }
    
    // Handle "Pressure Stage II", "Pressure Ulcer Stage II"
    const pressureStageMatch = e.match(/pressure(?:\s+ulcer)?\s+stage\s+(iv|iii|ii|i|unstageable|dti)/i);
    if (pressureStageMatch) {
      const stage = pressureStageMatch[1].toUpperCase();
      return `Pressure (${stage === 'UNSTAGEABLE' ? 'Unstageable' : stage === 'DTI' ? 'DTI' : stage})`;
    }
    
    // Handle "Pressure Ulcer" without stage
    if (/^pressure\s*ulcer$/i.test(e)) {
      return 'Pressure Ulcer';
    }
    
    // If it just says "Pressure" without more info
    if (/^pressure$/i.test(e)) {
      return 'Pressure';
    }
  }
  
  // Return original for non-pressure etiologies
  return e;
}

/**
 * Checks if an etiology is a pressure ulcer variant
 */
export function isPressureEtiology(etiology: string | null | undefined): boolean {
  if (!etiology) return false;
  const eLower = etiology.toLowerCase();
  return eLower.includes('pressure') || /^stage\s+(iv|iii|ii|i|unstageable|dti)$/i.test(etiology);
}

/**
 * Returns CSS classes for etiology badge styling
 * Handles all pressure ulcer variants with a unified color scheme
 */
export function getEtiologyColor(etiology: string | null | undefined): string {
  if (!etiology) return "bg-slate-50 text-slate-700 border-slate-200";
  
  const eLower = etiology.toLowerCase();
  
  // All pressure ulcer variants get red styling
  if (isPressureEtiology(etiology)) {
    return "bg-red-50 text-red-700 border-red-200";
  }
  
  // Other etiologies
  const colors: Record<string, string> = {
    "venous": "bg-blue-50 text-blue-700 border-blue-200",
    "diabetic": "bg-orange-50 text-orange-700 border-orange-200",
    "arterial": "bg-purple-50 text-purple-700 border-purple-200",
    "surgical": "bg-gray-50 text-gray-700 border-gray-200",
    "traumatic": "bg-yellow-50 text-yellow-700 border-yellow-200",
    "neuropathic": "bg-amber-50 text-amber-700 border-amber-200",
    "inflammatory": "bg-pink-50 text-pink-700 border-pink-200",
    "other": "bg-slate-50 text-slate-700 border-slate-200",
  };
  
  // Match by substring for flexibility
  for (const [key, value] of Object.entries(colors)) {
    if (eLower.includes(key)) {
      return value;
    }
  }
  
  return "bg-slate-50 text-slate-700 border-slate-200";
}

/**
 * Format a date string for display
 * Centralizes date formatting to ensure consistency across the application
 * 
 * @param dateStr - The date string to format (ISO format or parseable date string)
 * @param options - Optional Intl.DateTimeFormatOptions for custom formatting
 * @returns Formatted date string or '--' if invalid/null
 * 
 * @example
 * ```typescript
 * formatDate('2026-02-28') // "February 28, 2026"
 * formatDate('2026-02-28', { month: 'short' }) // "Feb 28, 2026"
 * formatDate(null) // "--"
 * ```
 */
export function formatDate(
  dateStr: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateStr) return '--';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', options ?? {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format a date string with time included
 * 
 * @param dateStr - The date string to format
 * @returns Formatted date and time string or '--' if invalid/null
 */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format a date for short display (e.g., in charts, tables)
 * 
 * @param dateStr - The date string to format
 * @returns Short formatted date string (e.g., "Feb 28")
 */
export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
