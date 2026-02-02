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

// Treatment types for mock wounds
export const treatmentTypes = [
  "Limpieza de herida",
  "Cambio de vendaje",
  "Aplicación de antiséptico",
  "Terapia de presión negativa",
  "Desbridamiento",
  "Aplicación de ungüento",
  "Curación avanzada",
  "Evaluación clínica",
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

// Mock Data for Patients List (40 patients - USA locations with wound details)
export const mockPatients = [
  { id: "P001", first_name: "James", last_name: "Anderson", date_of_birth: "1945-03-15", phone: "555-0101", email: "james.anderson@email.com", address: "123 Main Street", city: "New York, NY", status: "active", created_at: "2024-01-10", active_wounds: 2, wounds: [{ id: "W001", type: "Pressure Ulcer", push_score: 12, in_house: true, treatments: [{ date: "2024-01-15", type: "Cambio de vendaje" }, { date: "2024-01-18", type: "Limpieza de herida" }] }, { id: "W002", type: "Diabetic", push_score: null, in_house: false, treatments: [{ date: "2024-01-16", type: "Aplicación de ungüento" }] }] },
  { id: "P002", first_name: "Mary", last_name: "Taylor", date_of_birth: "1952-07-22", phone: "555-0102", email: "mary.taylor@email.com", address: "456 Oak Avenue", city: "Los Angeles, CA", status: "active", created_at: "2024-01-12", active_wounds: 1, wounds: [{ id: "W003", type: "Venous Stasis", push_score: null, in_house: true, treatments: [{ date: "2024-01-20", type: "Evaluación clínica" }, { date: "2024-01-25", type: "Cambio de vendaje" }] }] },
  { id: "P003", first_name: "Robert", last_name: "Miller", date_of_birth: "1948-11-08", phone: "555-0103", email: "robert.miller@email.com", address: "789 Elm Street", city: "Chicago, IL", status: "active", created_at: "2024-01-15", active_wounds: 3, wounds: [{ id: "W004", type: "Pressure Ulcer", push_score: 15, in_house: true, treatments: [{ date: "2024-01-18", type: "Terapia de presión negativa" }, { date: "2024-01-22", type: "Desbridamiento" }] }, { id: "W005", type: "Surgical", push_score: null, in_house: false, treatments: [{ date: "2024-01-20", type: "Limpieza de herida" }] }, { id: "W006", type: "Diabetic", push_score: null, in_house: true, treatments: [{ date: "2024-01-19", type: "Aplicación de antiséptico" }] }] },
  { id: "P004", first_name: "Patricia", last_name: "Thomas", date_of_birth: "1950-05-19", phone: "555-0104", email: "patricia.thomas@email.com", address: "321 Maple Drive", city: "Houston, TX", status: "active", created_at: "2024-01-20", active_wounds: 2, wounds: [{ id: "W007", type: "Pressure Ulcer", push_score: 8, in_house: true, treatments: [{ date: "2024-01-25", type: "Cambio de vendaje" }] }, { id: "W008", type: "Arterial", push_score: null, in_house: false, treatments: [{ date: "2024-01-26", type: "Evaluación clínica" }] }] },
  { id: "P005", first_name: "Michael", last_name: "Jackson", date_of_birth: "1947-02-14", phone: "555-0105", email: "michael.jackson@email.com", address: "654 Birch Road", city: "Phoenix, AZ", status: "active", created_at: "2024-02-01", active_wounds: 1, wounds: [{ id: "W009", type: "Pressure Ulcer", push_score: 11, in_house: true, treatments: [{ date: "2024-02-05", type: "Limpieza de herida" }, { date: "2024-02-08", type: "Cambio de vendaje" }] }] },
  { id: "P006", first_name: "Jennifer", last_name: "White", date_of_birth: "1953-09-27", phone: "555-0106", email: "jennifer.white@email.com", address: "987 Cedar Lane", city: "Philadelphia, PA", status: "active", created_at: "2024-02-05", active_wounds: 2, wounds: [{ id: "W010", type: "Venous Stasis", push_score: null, in_house: true, treatments: [{ date: "2024-02-10", type: "Evaluación clínica" }] }, { id: "W011", type: "Diabetic", push_score: null, in_house: false, treatments: [{ date: "2024-02-12", type: "Aplicación de ungüento" }] }] },
  { id: "P007", first_name: "William", last_name: "Harris", date_of_birth: "1946-12-03", phone: "555-0107", email: "william.harris@email.com", address: "111 Pine Street", city: "San Antonio, TX", status: "inactive", created_at: "2024-02-10", active_wounds: 0, wounds: [] },
  { id: "P008", first_name: "Barbara", last_name: "Martin", date_of_birth: "1951-06-16", phone: "555-0108", email: "barbara.martin@email.com", address: "222 Spruce Avenue", city: "San Diego, CA", status: "active", created_at: "2024-02-15", active_wounds: 1, wounds: [{ id: "W012", type: "Pressure Ulcer", push_score: 14, in_house: true, treatments: [{ date: "2024-02-20", type: "Terapia de presión negativa" }, { date: "2024-02-23", type: "Cambio de vendaje" }] }] },
  { id: "P009", first_name: "David", last_name: "Thompson", date_of_birth: "1949-04-09", phone: "555-0109", email: "david.thompson@email.com", address: "333 Walnut Court", city: "Dallas, TX", status: "active", created_at: "2024-02-20", active_wounds: 2, wounds: [{ id: "W013", type: "Diabetic", push_score: null, in_house: true, treatments: [{ date: "2024-02-25", type: "Aplicación de ungüento" }] }, { id: "W014", type: "Surgical", push_score: null, in_house: false, treatments: [{ date: "2024-02-26", type: "Limpieza de herida" }] }] },
  { id: "P010", first_name: "Susan", last_name: "Garcia", date_of_birth: "1954-10-25", phone: "555-0110", email: "susan.garcia@email.com", address: "444 Cherry Way", city: "San Jose, CA", status: "discharged", created_at: "2024-01-05", active_wounds: 0, wounds: [] },
  { id: "P011", first_name: "Richard", last_name: "Martinez", date_of_birth: "1947-08-11", phone: "555-0111", email: "richard.martinez@email.com", address: "555 Ash Boulevard", city: "Austin, TX", status: "active", created_at: "2024-03-01", active_wounds: 1, wounds: [{ id: "W015", type: "Pressure Ulcer", push_score: 9, in_house: true, treatments: [{ date: "2024-03-05", type: "Cambio de vendaje" }] }] },
  { id: "P012", first_name: "Linda", last_name: "Robinson", date_of_birth: "1950-01-30", phone: "555-0112", email: "linda.robinson@email.com", address: "666 Oak Park Drive", city: "Jacksonville, FL", status: "active", created_at: "2024-03-05", active_wounds: 3, wounds: [{ id: "W016", type: "Pressure Ulcer", push_score: 16, in_house: true, treatments: [{ date: "2024-03-10", type: "Desbridamiento" }, { date: "2024-03-12", type: "Terapia de presión negativa" }] }, { id: "W017", type: "Venous Stasis", push_score: null, in_house: false, treatments: [{ date: "2024-03-11", type: "Evaluación clínica" }] }, { id: "W018", type: "Diabetic", push_score: null, in_house: true, treatments: [{ date: "2024-03-13", type: "Aplicación de ungüento" }] }] },
  { id: "P013", first_name: "Joseph", last_name: "Clark", date_of_birth: "1948-07-14", phone: "555-0113", email: "joseph.clark@email.com", address: "777 Maple Heights", city: "Fort Worth, TX", status: "active", created_at: "2024-03-10", active_wounds: 1, wounds: [{ id: "W019", type: "Surgical", push_score: null, in_house: true, treatments: [{ date: "2024-03-15", type: "Limpieza de herida" }, { date: "2024-03-18", type: "Cambio de vendaje" }] }] },
  { id: "P014", first_name: "Margaret", last_name: "Rodriguez", date_of_birth: "1952-03-22", phone: "555-0114", email: "margaret.rodriguez@email.com", address: "888 Elm Creek Road", city: "Columbus, OH", status: "inactive", created_at: "2024-03-15", active_wounds: 0, wounds: [] },
  { id: "P015", first_name: "Thomas", last_name: "Lewis", date_of_birth: "1946-09-08", phone: "555-0115", email: "thomas.lewis@email.com", address: "999 Bay View Drive", city: "Charlotte, NC", status: "active", created_at: "2024-03-20", active_wounds: 2, wounds: [{ id: "W020", type: "Pressure Ulcer", push_score: 13, in_house: true, treatments: [{ date: "2024-03-25", type: "Cambio de vendaje" }, { date: "2024-03-28", type: "Evaluación clínica" }] }, { id: "W021", type: "Arterial", push_score: null, in_house: false, treatments: [{ date: "2024-03-26", type: "Limpieza de herida" }] }] },
  { id: "P016", first_name: "Dorothy", last_name: "Lee", date_of_birth: "1955-02-18", phone: "555-0116", email: "dorothy.lee@email.com", address: "101 Desert Bloom Lane", city: "San Francisco, CA", status: "active", created_at: "2024-03-25", active_wounds: 1, wounds: [{ id: "W022", type: "Diabetic", push_score: null, in_house: true, treatments: [{ date: "2024-03-30", type: "Aplicación de ungüento" }] }] },
  { id: "P017", first_name: "Charles", last_name: "Walker", date_of_birth: "1949-11-05", phone: "555-0117", email: "charles.walker@email.com", address: "202 Mountain View Road", city: "Indianapolis, IN", status: "discharged", created_at: "2024-01-08", active_wounds: 0, wounds: [] },
  { id: "P018", first_name: "Lisa", last_name: "Hall", date_of_birth: "1951-05-12", phone: "555-0118", email: "lisa.hall@email.com", address: "303 River Rock Court", city: "Austin, TX", status: "active", created_at: "2024-04-01", active_wounds: 2, wounds: [{ id: "W023", type: "Pressure Ulcer", push_score: 10, in_house: true, treatments: [{ date: "2024-04-05", type: "Terapia de presión negativa" }, { date: "2024-04-08", type: "Cambio de vendaje" }] }, { id: "W024", type: "Venous Stasis", push_score: null, in_house: false, treatments: [{ date: "2024-04-06", type: "Evaluación clínica" }] }] },
  { id: "P019", first_name: "Christopher", last_name: "Allen", date_of_birth: "1947-10-20", phone: "555-0119", email: "christopher.allen@email.com", address: "404 Pine Valley Drive", city: "Seattle, WA", status: "active", created_at: "2024-04-05", active_wounds: 1, wounds: [{ id: "W025", type: "Surgical", push_score: null, in_house: true, treatments: [{ date: "2024-04-10", type: "Limpieza de herida" }] }] },
  { id: "P020", first_name: "Betty", last_name: "Young", date_of_birth: "1953-12-07", phone: "555-0120", email: "betty.young@email.com", address: "505 Sunset Beach Road", city: "Denver, CO", status: "active", created_at: "2024-04-10", active_wounds: 3, wounds: [{ id: "W026", type: "Pressure Ulcer", push_score: 17, in_house: true, treatments: [{ date: "2024-04-15", type: "Desbridamiento" }, { date: "2024-04-18", type: "Cambio de vendaje" }] }, { id: "W027", type: "Diabetic", push_score: null, in_house: false, treatments: [{ date: "2024-04-16", type: "Aplicación de ungüento" }] }, { id: "W028", type: "Arterial", push_score: null, in_house: true, treatments: [{ date: "2024-04-17", type: "Evaluación clínica" }] }] },
  { id: "P021", first_name: "Daniel", last_name: "Hernandez", date_of_birth: "1946-04-15", phone: "555-0121", email: "daniel.hernandez@email.com", address: "606 Sunset Boulevard", city: "Boston, MA", status: "inactive", created_at: "2024-04-15", active_wounds: 0, wounds: [] },
  { id: "P022", first_name: "Karen", last_name: "King", date_of_birth: "1954-08-29", phone: "555-0122", email: "karen.king@email.com", address: "707 Greenwood Avenue", city: "Miami, FL", status: "active", created_at: "2024-04-20", active_wounds: 1, wounds: [{ id: "W029", type: "Pressure Ulcer", push_score: 7, in_house: true, treatments: [{ date: "2024-04-25", type: "Cambio de vendaje" }, { date: "2024-04-28", type: "Limpieza de herida" }] }] },
  { id: "P023", first_name: "Matthew", last_name: "Wright", date_of_birth: "1950-06-03", phone: "555-0123", email: "matthew.wright@email.com", address: "808 Starlight Lane", city: "El Paso, TX", status: "active", created_at: "2024-04-25", active_wounds: 2, wounds: [{ id: "W030", type: "Venous Stasis", push_score: null, in_house: true, treatments: [{ date: "2024-04-30", type: "Evaluación clínica" }] }, { id: "W031", type: "Diabetic", push_score: null, in_house: false, treatments: [{ date: "2024-05-01", type: "Aplicación de ungüento" }] }] },
  { id: "P024", first_name: "Nancy", last_name: "Lopez", date_of_birth: "1952-09-17", phone: "555-0124", email: "nancy.lopez@email.com", address: "909 Sunshine Street", city: "Nashville, TN", status: "discharged", created_at: "2024-02-03", active_wounds: 0, wounds: [] },
  { id: "P025", first_name: "Donald", last_name: "Hill", date_of_birth: "1948-01-25", phone: "555-0125", email: "donald.hill@email.com", address: "1010 Moonlight Avenue", city: "Memphis, TN", status: "active", created_at: "2024-05-01", active_wounds: 1, wounds: [{ id: "W032", type: "Pressure Ulcer", push_score: 6, in_house: true, treatments: [{ date: "2024-05-05", type: "Cambio de vendaje" }] }] },
  { id: "P026", first_name: "Sandra", last_name: "Scott", date_of_birth: "1951-03-11", phone: "555-0126", email: "sandra.scott@email.com", address: "1111 Starry Lane", city: "Baltimore, MD", status: "active", created_at: "2024-05-05", active_wounds: 2, wounds: [{ id: "W033", type: "Surgical", push_score: null, in_house: true, treatments: [{ date: "2024-05-10", type: "Limpieza de herida" }, { date: "2024-05-13", type: "Cambio de vendaje" }] }, { id: "W034", type: "Diabetic", push_score: null, in_house: false, treatments: [{ date: "2024-05-11", type: "Aplicación de ungüento" }] }] },
  { id: "P027", first_name: "Mark", last_name: "Green", date_of_birth: "1949-07-19", phone: "555-0127", email: "mark.green@email.com", address: "1212 Bright Avenue", city: "Louisville, KY", status: "active", created_at: "2024-05-10", active_wounds: 1, wounds: [{ id: "W035", type: "Pressure Ulcer", push_score: 5, in_house: true, treatments: [{ date: "2024-05-15", type: "Terapia de presión negativa" }] }] },
  { id: "P028", first_name: "Ashley", last_name: "Adams", date_of_birth: "1955-11-14", phone: "555-0128", email: "ashley.adams@email.com", address: "1313 Fresh Road", city: "Portland, OR", status: "active", created_at: "2024-05-15", active_wounds: 3, wounds: [{ id: "W036", type: "Pressure Ulcer", push_score: 18, in_house: true, treatments: [{ date: "2024-05-20", type: "Desbridamiento" }, { date: "2024-05-23", type: "Cambio de vendaje" }] }, { id: "W037", type: "Venous Stasis", push_score: null, in_house: false, treatments: [{ date: "2024-05-21", type: "Evaluación clínica" }] }, { id: "W038", type: "Arterial", push_score: null, in_house: true, treatments: [{ date: "2024-05-22", type: "Limpieza de herida" }] }] },
  { id: "P029", first_name: "Donald", last_name: "Nelson", date_of_birth: "1947-02-28", phone: "555-0129", email: "donald.nelson@email.com", address: "1414 Serenity Lane", city: "Milwaukee, WI", status: "inactive", created_at: "2024-05-20", active_wounds: 0, wounds: [] },
  { id: "P030", first_name: "Kimberly", last_name: "Carter", date_of_birth: "1953-06-06", phone: "555-0130", email: "kimberly.carter@email.com", address: "1515 Hope Street", city: "Las Vegas, NV", status: "active", created_at: "2024-05-25", active_wounds: 1, wounds: [{ id: "W039", type: "Diabetic", push_score: null, in_house: true, treatments: [{ date: "2024-05-30", type: "Aplicación de ungüento" }] }] },
  { id: "P031", first_name: "Steven", last_name: "Mitchell", date_of_birth: "1946-10-10", phone: "555-0131", email: "steven.mitchell@email.com", address: "1616 Strong Avenue", city: "Albuquerque, NM", status: "active", created_at: "2024-06-01", active_wounds: 2, wounds: [{ id: "W040", type: "Pressure Ulcer", push_score: 4, in_house: true, treatments: [{ date: "2024-06-05", type: "Cambio de vendaje" }] }, { id: "W041", type: "Surgical", push_score: null, in_house: false, treatments: [{ date: "2024-06-06", type: "Limpieza de herida" }] }] },
  { id: "P032", first_name: "Emily", last_name: "Perez", date_of_birth: "1952-04-23", phone: "555-0132", email: "emily.perez@email.com", address: "1717 Noble Street", city: "Tucson, AZ", status: "discharged", created_at: "2024-01-18", active_wounds: 0, wounds: [] },
  { id: "P033", first_name: "Paul", last_name: "Roberts", date_of_birth: "1950-12-19", phone: "555-0133", email: "paul.roberts@email.com", address: "1818 Strong Oak Road", city: "Fresno, CA", status: "active", created_at: "2024-06-05", active_wounds: 1, wounds: [{ id: "W042", type: "Venous Stasis", push_score: null, in_house: true, treatments: [{ date: "2024-06-10", type: "Evaluación clínica" }, { date: "2024-06-13", type: "Cambio de vendaje" }] }] },
  { id: "P034", first_name: "Donna", last_name: "Phillips", date_of_birth: "1954-08-04", phone: "555-0134", email: "donna.phillips@email.com", address: "1919 Sweet Blossom Drive", city: "Sacramento, CA", status: "active", created_at: "2024-06-10", active_wounds: 2, wounds: [{ id: "W043", type: "Pressure Ulcer", push_score: 3, in_house: true, treatments: [{ date: "2024-06-15", type: "Terapia de presión negativa" }] }, { id: "W044", type: "Diabetic", push_score: null, in_house: false, treatments: [{ date: "2024-06-16", type: "Aplicación de ungüento" }] }] },
  { id: "P035", first_name: "Andrew", last_name: "Campbell", date_of_birth: "1948-05-16", phone: "555-0135", email: "andrew.campbell@email.com", address: "2020 Safe Harbor Drive", city: "Long Beach, CA", status: "active", created_at: "2024-06-15", active_wounds: 1, wounds: [{ id: "W045", type: "Surgical", push_score: null, in_house: true, treatments: [{ date: "2024-06-20", type: "Limpieza de herida" }, { date: "2024-06-23", type: "Cambio de vendaje" }] }] },
  { id: "P036", first_name: "Carol", last_name: "Parker", date_of_birth: "1951-09-09", phone: "555-0136", email: "carol.parker@email.com", address: "2121 Friendly Lane", city: "Kansas City, MO", status: "inactive", created_at: "2024-06-20", active_wounds: 0, wounds: [] },
  { id: "P037", first_name: "Kenneth", last_name: "Evans", date_of_birth: "1949-03-27", phone: "555-0137", email: "kenneth.evans@email.com", address: "2222 Open Field Road", city: "Mesa, AZ", status: "active", created_at: "2024-06-25", active_wounds: 2, wounds: [{ id: "W046", type: "Pressure Ulcer", push_score: 2, in_house: true, treatments: [{ date: "2024-06-30", type: "Cambio de vendaje" }] }, { id: "W047", type: "Arterial", push_score: null, in_house: false, treatments: [{ date: "2024-07-01", type: "Evaluación clínica" }] }] },
  { id: "P038", first_name: "Melissa", last_name: "Edwards", date_of_birth: "1952-07-31", phone: "555-0138", email: "melissa.edwards@email.com", address: "2323 Open Road Street", city: "Virginia Beach, VA", status: "active", created_at: "2024-07-01", active_wounds: 1, wounds: [{ id: "W048", type: "Diabetic", push_score: null, in_house: true, treatments: [{ date: "2024-07-05", type: "Aplicación de ungüento" }] }] },
  { id: "P039", first_name: "Kevin", last_name: "Collins", date_of_birth: "1947-11-13", phone: "555-0139", email: "kevin.collins@email.com", address: "2424 Long Road Drive", city: "Atlanta, GA", status: "discharged", created_at: "2024-02-12", active_wounds: 0, wounds: [] },
  { id: "P040", first_name: "Deborah", last_name: "Stewart", date_of_birth: "1955-01-21", phone: "555-0140", email: "deborah.stewart@email.com", address: "2525 Extended Drive", city: "Honolulu, HI", status: "active", created_at: "2024-07-05", active_wounds: 3, wounds: [{ id: "W049", type: "Pressure Ulcer", push_score: 1, in_house: true, treatments: [{ date: "2024-07-10", type: "Cambio de vendaje" }, { date: "2024-07-13", type: "Limpieza de herida" }] }, { id: "W050", type: "Venous Stasis", push_score: null, in_house: false, treatments: [{ date: "2024-07-11", type: "Evaluación clínica" }] }, { id: "W051", type: "Surgical", push_score: null, in_house: true, treatments: [{ date: "2024-07-12", type: "Limpieza de herida" }] }] },
];
