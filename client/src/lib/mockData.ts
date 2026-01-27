import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Mock Data for Dashboard KPI Cards
export const dashboardKPIs = {
  activeWounds: {
    value: 42,
    trend: 4,
    label: "Active Wounds",
    period: "from last month"
  },
  healingRate: {
    value: 72,
    trend: 2.5,
    label: "Healing Rate",
    unit: "%",
    period: "improvement"
  },
  reportsGenerated: {
    value: 128,
    label: "Reports Generated",
    period: "In the last 30 days"
  },
  criticalCases: {
    value: 3,
    label: "Critical Cases",
    period: "Requiring immediate attention"
  }
};

// Mock Data for Charts
export const woundEtiologyData = [
  { name: "Pressure Ulcer", value: 45, fill: "hsl(var(--chart-1))" },
  { name: "Venous Stasis", value: 25, fill: "hsl(var(--chart-2))" },
  { name: "Diabetic", value: 20, fill: "hsl(var(--chart-3))" },
  { name: "Arterial", value: 5, fill: "hsl(var(--chart-4))" },
  { name: "Surgical", value: 5, fill: "hsl(var(--chart-5))" },
];

export const woundReductionData = [
  { month: "Jan", reduction: 12 },
  { month: "Feb", reduction: 15 },
  { month: "Mar", reduction: 18 },
  { month: "Apr", reduction: 14 },
  { month: "May", reduction: 22 },
  { month: "Jun", reduction: 25 },
];

export const healingStatusData = [
  { status: "Improving", percentage: 55, fill: "hsl(var(--chart-2))" },
  { status: "Stable", percentage: 30, fill: "hsl(var(--chart-1))" },
  { status: "Deteriorating", percentage: 15, fill: "hsl(var(--chart-4))" },
];

export const woundsByStatusData = [
  { status: "Admitted", count: 12 },
  { status: "Active", count: 45 },
  { status: "Resolved", count: 32 },
  { status: "Hospitalized", count: 4 },
];

// Mock Data for Facility Wound Report
export const generateFacilityWoundReport = (date: Date) => ({
  date: date.toLocaleDateString(),
  avgReduction: 18.5,
  improving: 62,
  deteriorating: 8,
  stable: 30,
  newWoundsPct: 12,
  resolutionRate: 45,
  newWoundsCount: 5,
  resolvedWoundsCount: 12,
  activeWoundsCount: 42,
  woundsOver100Days: 3,
  activePatients: 28,
  acuityIndex: 3.4,
  pushScoreAvg: 8.2,
});

// Mock Data for Outcome Report
export const generateOutcomeReport = (startDate: Date | undefined, endDate: Date | undefined) => ({
  overallResolutionRate: 68,
  activeHealingRate: 72,
  avgHealingRate: 2.5, // % per week
  improving: 65,
  deteriorating: 10,
  stable: 25,
  newWounds: 15,
  resolvedWounds: 22,
  allTimeHospitalizationRate: 5,
  currentHospitalizationRate: 2,
  avgHealingTimeAll: 45,
  avgHealingTimeArterial: 52,
  avgHealingTimeVenous: 48,
  avgHealingTimeDiabetic: 60,
  avgHealingTimePressureI: 14,
  avgHealingTimePressureII: 28,
  avgHealingTimePressureIII: 55,
  avgHealingTimePressureIV: 90,
  woundsOver100Days: 4,
  notDebridedPct: 12,
});

// Mock Data for Etiology List
export const etiologyListData = [
  { type: "Pressure Ulcer - Stage I", count: 8, percentage: 15 },
  { type: "Pressure Ulcer - Stage II", count: 12, percentage: 22 },
  { type: "Pressure Ulcer - Stage III", count: 5, percentage: 9 },
  { type: "Pressure Ulcer - Stage IV", count: 2, percentage: 4 },
  { type: "Venous Stasis Ulcer", count: 15, percentage: 28 },
  { type: "Diabetic Foot Ulcer", count: 8, percentage: 15 },
  { type: "Arterial Ulcer", count: 2, percentage: 4 },
  { type: "Surgical Wound", count: 2, percentage: 3 },
];

// Mock Data for Acuity Index
export const acuityIndexData = {
  activeWounds: 54,
  activePatients: 32,
  acuityIndex: 4.2,
  trend: [
    { week: "W1", index: 3.8 },
    { week: "W2", index: 3.9 },
    { week: "W3", index: 4.1 },
    { week: "W4", index: 4.2 },
  ]
};
