/**
 * Field mapper to handle inconsistent field naming from backend APIs
 * Converts PascalCase with spaces to camelCase
 */

// Mapping of backend field names (with spaces) to normalized camelCase
const fieldMapping: Record<string, string> = {
  // General metrics
  "Number of Active Wounds": "numberOfActiveWounds",
  "Number of Active Patients": "numberOfActivePatients",
  "Resolution Rate": "resolutionRate",
  "Average Wound Area Change": "averageWoundAreaChange",
  "Facility Acuity Index": "facilityAcuityIndex",
  "Push Score Average": "pushScoreAverage",
  // Outcome Report fields - Primary metrics
  "Overall Resolution Rate": "overallResolutionRate",
  "Active Wound Healing Rate": "activeHealingRate",
  "Average Healing Rate": "avgHealingRate",
  "Percent of Wounds Improving": "improving",
  "Percent of Wounds Deteriorating": "deteriorating",
  "Percent of Wounds Stable": "stable",
  "Percent of New Wounds": "percentOfNewWounds",
  // Outcome Report fields - Counts
  "Number of New Wounds": "newWounds",
  "Number of Resolved Wounds": "resolvedWounds",
  "Number of Wounds With 100 or more Days": "woundsOver100Days",
  // Outcome Report fields - Healing Times
  "Average Healing Days - All": "avgHealingTimeAll",
  "Average Healing Days - Arterial": "avgHealingTimeArterial",
  "Average Healing Days - Venous": "avgHealingTimeVenous",
  "Average Healing Days - Diabetic": "avgHealingTimeDiabetic",
  "Average Healing Days - Pressure Ulcer Stage I": "avgHealingTimePressureI",
  "Average Healing Days - Pressure Ulcer Stage II": "avgHealingTimePressureII",
  "Average Healing Days - Pressure Ulcer Stage III": "avgHealingTimePressureIII",
  "Average Healing Days - Pressure Ulcer Stage IV": "avgHealingTimePressureIV",
  "Perc of Wounds not Debrided (except heels)": "notDebridedPct",
  // Acuity report fields
  "week": "week",
  "patients": "patients",
  "wounds": "wounds",
  // Etiology fields
  "Wound Etiology": "woundEtiology",
};

/**
 * Normalizes an object's field names from backend format to camelCase
 * @param data - The object with backend field names
 * @returns New object with normalized camelCase field names
 */
export function normalizeFieldNames(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const normalized: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    // Check if we have a mapping for this field
    const camelCaseKey = fieldMapping[key] || key;
    // Also add as-is for backward compatibility
    normalized[camelCaseKey] = value;
    // Add the original key as well for fallback
    if (camelCaseKey !== key) {
      normalized[key] = value;
    }
  }

  return normalized;
}

/**
 * Normalizes an array of objects
 */
export function normalizeFieldNamesArray(data: any[]): any[] {
  if (!Array.isArray(data)) {
    return data;
  }
  return data.map(normalizeFieldNames);
}

/**
 * Gets a field value with automatic fallback to both camelCase and original format
 * @param data - The object containing the field
 * @param fieldName - The camelCase field name to look up
 * @param defaultValue - Default value if field is not found
 * @returns The field value or default
 */
export function getFieldValue(data: any, fieldName: string, defaultValue: any = 0): any {
  if (!data) return defaultValue;

  // Try normalized key first
  if (data[fieldName] !== undefined && data[fieldName] !== null) {
    return data[fieldName];
  }

  // Try with spaces (backend format)
  const backendFormats = [
    fieldName.replace(/([A-Z])/g, ' $1').trim(), // camelCase -> "Name Format"
    fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1'), // full PascalCase
  ];

  for (const format of backendFormats) {
    if (data[format] !== undefined && data[format] !== null) {
      return data[format];
    }
  }

  return defaultValue;
}
