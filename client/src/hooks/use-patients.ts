import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LOCAL_API } from "@/lib/api-config";
import { useAuth } from "./use-auth";

interface FacilityPatient {
  patient_id: string;
  facility_id: number;
  patient_name?: string;
  name?: string;
  wound_encounter_count: number;
  last_encounter_date: string;
  first_encounter_date: string;
  last_start_date: string;
}

interface WoundEncounter {
  id: string;
  dos: string;
  patient_id: string;
  facility_id: number;
  provider_id: string;
  patient_name: string;
  location: string;
  etiology: string;
  width: number;
  height: number;
  depth: number;
  surface: number;
  exudate: string;
  tissue: string;
  treatment: string;
  frequency: string;
  progress: string;
  disposition: string;
  debridement: string;
  initial_surface: number;
  start_date: string;
  days: number;
  healing_percentage: number;
  healing_rate: number;
  healing_days: number;
  push_score: number;
  POA: boolean;
  Palliative: boolean;
  Objective: boolean;
  facility_acquired: boolean;
}

/**
 * Hook to fetch patients for a specific facility
 */
export function useFacilityPatients(facilityId: string | null) {
  const { getToken, getEmail } = useAuth();
  const token = getToken();
  const email = getEmail();

  return useQuery<FacilityPatient[], Error>({
    queryKey: ["facilityPatients", facilityId],
    queryFn: async () => {
      if (!facilityId || !token || !email) {
        throw new Error("Missing required parameters");
      }

      const deviceId = localStorage.getItem("deviceId") || "web-" + Math.random().toString(36).substr(2, 9);

      const response = await fetch(LOCAL_API.FACILITIES_LIST, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity: "FacilityDataCenter",
          method: "lstFacilityPatients", // Correct method for listing patients
          token,
          email,
          deviceId,
          facilityId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch patients: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    },
    enabled: !!facilityId && !!token && !!email,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch wound encounters for a specific patient
 */
export function usePatientDetail(facilityId: string | null, patientId: string | null) {
  const { getToken, getEmail } = useAuth();
  const token = getToken();
  const email = getEmail();

  return useQuery<WoundEncounter[], Error>({
    queryKey: ["patientDetail", facilityId, patientId],
    queryFn: async () => {
      if (!facilityId || !patientId || !token || !email) {
        throw new Error("Missing required parameters");
      }

      const deviceId = localStorage.getItem("deviceId") || "web-" + Math.random().toString(36).substr(2, 9);

      const response = await fetch(LOCAL_API.FACILITIES_LIST, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity: "FacilityDataCenter",
          method: "getFacilityPatientDetail", // Correct method for patient details
          token,
          email,
          deviceId,
          facilityId,
          patientId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch patient details: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    },
    enabled: !!facilityId && !!patientId && !!token && !!email,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

interface PatientByDate {
  patient_id: string;
  patient_name: string;
  wound_encounter_count: number;
  first_encounter_date: string;
  last_encounter_date: string;
  wound_locations: string;
  active_wounds: number;
  resolved_wounds: number;
}

/**
 * Hook to fetch patients for a specific facility filtered by date range
 * Returns patients who have wound encounters within the specified date range
 */
export function useFacilityPatientsByDate(facilityId: string | null, startDate: string | null, endDate?: string | null) {
  const { getToken, getEmail } = useAuth();
  const token = getToken();
  const email = getEmail();

  return useQuery<PatientByDate[], Error>({
    queryKey: ["facilityPatientsByDate", facilityId, startDate, endDate],
    queryFn: async () => {
      if (!facilityId || !startDate || !token || !email) {
        throw new Error("Missing required parameters");
      }

      const deviceId = localStorage.getItem("deviceId") || "web-" + Math.random().toString(36).substr(2, 9);

      const response = await fetch(LOCAL_API.FACILITIES_LIST, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity: "FacilityDataCenter",
          method: "lstFacilityPatientsByDate",
          token,
          email,
          deviceId,
          facilityId,
          startDate,
          endDate: endDate || startDate,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch patients: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    },
    enabled: !!facilityId && !!startDate && !!token && !!email,
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new
    refetchOnWindowFocus: false,
  });
}

// Critical wound case
interface CriticalWound {
  id: string;
  dos: string;
  patient_id: string;
  facility_id: string;
  patient_name: string;
  location: string;
  etiology: string;
  width: number;
  height: number;
  depth: number;
  surface: number;
  initial_surface: number;
  exudate: string;
  tissue: string;
  progress: string;
  treatment: string;
  debridement: string;
  start_date: string;
  days: number;
  healing_percentage: number;
  push_score: number;
  POA: boolean;
  Palliative: boolean;
  facility_acquired: boolean;
  critical_reason: string;
  encounter_history: Array<{
    id: number;
    dos: string;
    width: number;
    height: number;
    depth: number;
    surface: number;
    exudate: string;
    tissue: string;
    treatment: string;
    progress: string;
    debridement: string;
    days: number;
    healing_percentage: number;
    push_score: number;
  }>;
}

interface CriticalPatient {
  patient_id: string;
  patient_name: string;
  wounds: CriticalWound[];
}

interface CriticalCasesResponse {
  data: CriticalPatient[];
  total_wounds: number;
  total_patients: number;
}

/**
 * Hook to fetch critical cases (wounds requiring immediate attention)
 * Returns wounds that are deteriorating, have high PUSH scores, slow healing, or size increased
 * If startDate and endDate are provided, only considers wounds with encounters in that range,
 * and evaluates critical status based on the last encounter within the range.
 */
export function useCriticalCases(facilityId: string | null, startDate?: string, endDate?: string) {
  const { getToken, getEmail } = useAuth();
  const email = getEmail();
  const token = getToken();
  
  console.log('[useCriticalCases] facilityId:', facilityId, 'startDate:', startDate, 'endDate:', endDate, 'token:', !!token, 'email:', email);

  return useQuery<CriticalCasesResponse, Error>({
    queryKey: ["criticalCases", facilityId, startDate, endDate],
    queryFn: async () => {
      // Re-fetch token and email inside queryFn for freshness
      const currentToken = getToken();
      const currentEmail = getEmail();
      
      console.log('[useCriticalCases] queryFn executing for facilityId:', facilityId, 'startDate:', startDate, 'endDate:', endDate);
      
      if (!facilityId || !currentToken || !currentEmail) {
        console.log('[useCriticalCases] Missing params:', { facilityId, token: !!currentToken, email: currentEmail });
        throw new Error("Missing required parameters");
      }

      const deviceId = localStorage.getItem("deviceId") || "web-" + Math.random().toString(36).substr(2, 9);

      console.log('[useCriticalCases] Fetching from:', LOCAL_API.FACILITIES_LIST);
      
      const response = await fetch(LOCAL_API.FACILITIES_LIST, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity: "FacilityDataCenter",
          method: "getFacilityCriticalCases",
          token: currentToken,
          email: currentEmail,
          deviceId,
          facilityId,
          dosStart: startDate || undefined,
          dosEnd: endDate || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch critical cases: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[useCriticalCases] Response:', data);
      
      return {
        data: data.data || [],
        total_wounds: data.total_wounds || 0,
        total_patients: data.total_patients || 0
      };
    },
    enabled: !!facilityId && !!token && !!email,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Types for deteriorating wounds (reusing CriticalWound structure without critical_reason)
export interface DeterioratingWound {
  id: string;
  dos: string;
  patient_id: string;
  facility_id: string;
  patient_name: string;
  location: string;
  etiology: string;
  width: number;
  height: number;
  depth: number;
  surface: number;
  initial_surface: number;
  exudate: string;
  tissue: string;
  progress: string;
  treatment: string;
  debridement: string;
  start_date: string;
  days: number;
  healing_percentage: number;
  push_score: number;
  POA: boolean;
  Palliative: boolean;
  facility_acquired: boolean;
  deteriorating_encounter_count?: number;
  encounter_history: Array<{
    id: number;
    dos: string;
    width: number;
    height: number;
    depth: number;
    surface: number;
    exudate: string;
    tissue: string;
    treatment: string;
    progress: string;
    debridement: string;
    days: number;
    healing_percentage: number;
    push_score: number;
  }>;
}

export interface DeterioratingPatient {
  patient_id: string;
  patient_name: string;
  wounds: DeterioratingWound[];
}

interface DeterioratingWoundsResponse {
  data: DeterioratingPatient[];
  total_wounds: number;
  total_patients: number;
}

/**
 * Hook to fetch deteriorating wounds for a facility
 * Returns wounds where progress status is "Deteriorating"
 */
export function useDeterioratingWounds(facilityId: string | null, startDate?: string, endDate?: string) {
  const { getToken, getEmail } = useAuth();
  const email = getEmail();
  const token = getToken();
  
  console.log('[useDeterioratingWounds] facilityId:', facilityId, 'startDate:', startDate, 'endDate:', endDate, 'token:', !!token, 'email:', email);

  return useQuery<DeterioratingWoundsResponse, Error>({
    queryKey: ["deterioratingWounds", facilityId, startDate, endDate],
    queryFn: async () => {
      const currentToken = getToken();
      const currentEmail = getEmail();
      
      console.log('[useDeterioratingWounds] queryFn executing for facilityId:', facilityId, 'startDate:', startDate, 'endDate:', endDate);
      
      if (!facilityId || !currentToken || !currentEmail) {
        console.log('[useDeterioratingWounds] Missing params:', { facilityId, token: !!currentToken, email: currentEmail });
        throw new Error("Missing required parameters");
      }

      const deviceId = localStorage.getItem("deviceId") || "web-" + Math.random().toString(36).substr(2, 9);

      console.log('[useDeterioratingWounds] Fetching from:', LOCAL_API.FACILITIES_LIST);
      
      const response = await fetch(LOCAL_API.FACILITIES_LIST, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity: "FacilityDataCenter",
          method: "getFacilityDeterioratingWounds",
          token: currentToken,
          email: currentEmail,
          deviceId,
          facilityId,
          dosStart: startDate || undefined,
          dosEnd: endDate || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch deteriorating wounds: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[useDeterioratingWounds] Response:', data);
      
      return {
        data: data.data || [],
        total_wounds: data.total_wounds || 0,
        total_patients: data.total_patients || 0
      };
    },
    enabled: !!facilityId && !!token && !!email,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Reusable types for wound activity modals (same structure as DeterioratingPatient/DeterioratingWound)
export type WoundActivityPatient = DeterioratingPatient;
export type WoundActivityWound = DeterioratingWound;

interface WoundActivityResponse {
  data: WoundActivityPatient[];
  total_wounds: number;
  total_patients: number;
}

/**
 * Hook to fetch new wounds for a facility
 * Returns wounds where progress = 'New'
 */
export function useNewWounds(facilityId: string | null, startDate?: string, endDate?: string) {
  const { getToken, getEmail } = useAuth();
  const email = getEmail();
  const token = getToken();

  return useQuery<WoundActivityResponse, Error>({
    queryKey: ["newWounds", facilityId, startDate, endDate],
    queryFn: async () => {
      const currentToken = getToken();
      const currentEmail = getEmail();
      
      if (!facilityId || !currentToken || !currentEmail) {
        throw new Error("Missing required parameters");
      }

      const deviceId = localStorage.getItem("deviceId") || "web-" + Math.random().toString(36).substr(2, 9);

      const response = await fetch(LOCAL_API.FACILITIES_LIST, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity: "FacilityDataCenter",
          method: "getFacilityNewWounds",
          token: currentToken,
          email: currentEmail,
          deviceId,
          facilityId,
          dosStart: startDate || undefined,
          dosEnd: endDate || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch new wounds: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        data: data.data || [],
        total_wounds: data.total_wounds || 0,
        total_patients: data.total_patients || 0
      };
    },
    enabled: !!facilityId && !!token && !!email,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch resolved wounds for a facility
 * Returns wounds where disposition = 'Resolved'
 */
export function useResolvedWounds(facilityId: string | null, startDate?: string, endDate?: string) {
  const { getToken, getEmail } = useAuth();
  const email = getEmail();
  const token = getToken();

  return useQuery<WoundActivityResponse, Error>({
    queryKey: ["resolvedWounds", facilityId, startDate, endDate],
    queryFn: async () => {
      const currentToken = getToken();
      const currentEmail = getEmail();
      
      if (!facilityId || !currentToken || !currentEmail) {
        throw new Error("Missing required parameters");
      }

      const deviceId = localStorage.getItem("deviceId") || "web-" + Math.random().toString(36).substr(2, 9);

      const response = await fetch(LOCAL_API.FACILITIES_LIST, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity: "FacilityDataCenter",
          method: "getFacilityResolvedWounds",
          token: currentToken,
          email: currentEmail,
          deviceId,
          facilityId,
          dosStart: startDate || undefined,
          dosEnd: endDate || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch resolved wounds: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        data: data.data || [],
        total_wounds: data.total_wounds || 0,
        total_patients: data.total_patients || 0
      };
    },
    enabled: !!facilityId && !!token && !!email,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch active wounds for a facility
 * Returns wounds where disposition = 'Active'
 */
export function useActiveWounds(facilityId: string | null, startDate?: string, endDate?: string) {
  const { getToken, getEmail } = useAuth();
  const email = getEmail();
  const token = getToken();

  return useQuery<WoundActivityResponse, Error>({
    queryKey: ["activeWounds", facilityId, startDate, endDate],
    queryFn: async () => {
      const currentToken = getToken();
      const currentEmail = getEmail();
      
      if (!facilityId || !currentToken || !currentEmail) {
        throw new Error("Missing required parameters");
      }

      const deviceId = localStorage.getItem("deviceId") || "web-" + Math.random().toString(36).substr(2, 9);

      const response = await fetch(LOCAL_API.FACILITIES_LIST, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity: "FacilityDataCenter",
          method: "getFacilityActiveWounds",
          token: currentToken,
          email: currentEmail,
          deviceId,
          facilityId,
          dosStart: startDate || undefined,
          dosEnd: endDate || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch active wounds: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        data: data.data || [],
        total_wounds: data.total_wounds || 0,
        total_patients: data.total_patients || 0
      };
    },
    enabled: !!facilityId && !!token && !!email,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch chronic wounds for a facility
 * Returns wounds where days > 100
 */
export function useChronicWounds(facilityId: string | null, startDate?: string, endDate?: string) {
  const { getToken, getEmail } = useAuth();
  const email = getEmail();
  const token = getToken();

  return useQuery<WoundActivityResponse, Error>({
    queryKey: ["chronicWounds", facilityId, startDate, endDate],
    queryFn: async () => {
      const currentToken = getToken();
      const currentEmail = getEmail();
      
      if (!facilityId || !currentToken || !currentEmail) {
        throw new Error("Missing required parameters");
      }

      const deviceId = localStorage.getItem("deviceId") || "web-" + Math.random().toString(36).substr(2, 9);

      const response = await fetch(LOCAL_API.FACILITIES_LIST, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity: "FacilityDataCenter",
          method: "getFacilityChronicWounds",
          token: currentToken,
          email: currentEmail,
          deviceId,
          facilityId,
          dosStart: startDate || undefined,
          dosEnd: endDate || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch chronic wounds: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        data: data.data || [],
        total_wounds: data.total_wounds || 0,
        total_patients: data.total_patients || 0
      };
    },
    enabled: !!facilityId && !!token && !!email,
    staleTime: 5 * 60 * 1000,
  });
}

interface UpdateWoundEncounterParams {
  facilityId: string;
  patientId: string;
  encounterId: string;
  location?: string;
  etiology?: string;
  startDate?: string;
  width?: number;
  height?: number;
  depth?: number;
  exudate?: string;
  tissue?: string;
  treatment?: string;
  frequency?: string;
  progress?: string;
  disposition?: string;
  debridement?: string;
  pushScore?: number;
  poa?: boolean;
  palliative?: boolean;
  objective?: string;
  facilityAcquired?: boolean;
}

/**
 * Hook to update a wound encounter
 */
export function useUpdateWoundEncounter() {
  const { getToken, getEmail } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateWoundEncounterParams) => {
      const token = getToken();
      const email = getEmail();
      
      if (!token || !email) {
        throw new Error("Missing authentication");
      }

      const deviceId = localStorage.getItem("deviceId") || "web-" + Math.random().toString(36).substr(2, 9);

      const response = await fetch(LOCAL_API.FACILITIES_LIST, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity: "FacilityDataCenter",
          method: "updateWoundEncounter",
          token,
          email,
          deviceId,
          ...params,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update wound encounter: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.status) {
        throw new Error(data.error || "Update failed");
      }
      
      return data;
    },
    onSuccess: async (_, variables) => {
      // Refetch all wound-related queries to refresh data across all modals
      // Using refetchQueries to ensure data is updated before proceeding
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["patientDetail", variables.facilityId, variables.patientId] }),
        queryClient.refetchQueries({ queryKey: ["facilityPatients"] }),
        queryClient.refetchQueries({ queryKey: ["facilityPatientsByDate"] }),
        queryClient.refetchQueries({ queryKey: ["criticalCases"] }),
        queryClient.refetchQueries({ queryKey: ["deterioratingWounds"] }),
        queryClient.refetchQueries({ queryKey: ["newWounds"] }),
        queryClient.refetchQueries({ queryKey: ["resolvedWounds"] }),
        queryClient.refetchQueries({ queryKey: ["activeWounds"] }),
        queryClient.refetchQueries({ queryKey: ["chronicWounds"] }),
        queryClient.refetchQueries({ queryKey: ["reportsGenerated"] }),
        queryClient.refetchQueries({ queryKey: ["woundsByDisposition"] }),
        queryClient.refetchQueries({ queryKey: ["woundsByHealingStatus"] }),
        queryClient.refetchQueries({ queryKey: ["woundsByEtiology"] }),
      ]);
    },
  });
}

// Report encounter for Reports Generated modal
interface ReportEncounter {
  id: string;
  dos: string;
  patient_id: string;
  facility_id: number;
  patient_name: string;
  location: string;
  etiology: string;
  width: number;
  height: number;
  depth: number;
  surface: number;
  initial_surface: number;
  exudate: string;
  tissue: string;
  progress: string;
  treatment: string;
  disposition: string;
  start_date: string;
  days: number;
  healing_percentage: number;
  push_score: number;
}

interface ReportPatient {
  patient_id: string;
  patient_name: string;
  encounters: ReportEncounter[];
}

interface ReportsGeneratedResponse {
  data: ReportPatient[];
  total_encounters: number;
  total_patients: number;
}

/**
 * Hook to fetch reports generated (wound encounters) within a date range
 */
export function useReportsGenerated(facilityId: string | null, startDate: string | null, endDate: string | null) {
  const { getToken, getEmail } = useAuth();
  const email = getEmail();
  const token = getToken();

  return useQuery<ReportsGeneratedResponse, Error>({
    queryKey: ["reportsGenerated", facilityId, startDate, endDate],
    queryFn: async () => {
      const currentToken = getToken();
      const currentEmail = getEmail();
      
      if (!facilityId || !currentToken || !currentEmail || !startDate || !endDate) {
        throw new Error("Missing required parameters");
      }

      const deviceId = localStorage.getItem("deviceId") || "web-" + Math.random().toString(36).substr(2, 9);

      const response = await fetch(LOCAL_API.FACILITIES_LIST, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity: "FacilityDataCenter",
          method: "getReportsList",
          token: currentToken,
          email: currentEmail,
          deviceId,
          facilityId,
          dosStart: startDate,
          dosEnd: endDate,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch reports: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        data: data.data || [],
        total_encounters: data.total_encounters || 0,
        total_patients: data.total_patients || 0
      };
    },
    enabled: !!facilityId && !!token && !!email && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  });
}

// Types for wounds by etiology (reusing CriticalPatient structure)
export interface WoundsByEtiologyResponse {
  data: CriticalPatient[];
  total_wounds: number;
  total_patients: number;
  etiology: string;
}

/**
 * Hook to fetch wounds filtered by etiology
 * Used for etiology distribution chart click functionality
 */
export function useWoundsByEtiology(facilityId: string | null, etiology: string | null, startDate?: string, endDate?: string) {
  const { getToken, getEmail } = useAuth();
  const email = getEmail();
  const token = getToken();

  return useQuery<WoundsByEtiologyResponse, Error>({
    queryKey: ["woundsByEtiology", facilityId, etiology, startDate, endDate],
    queryFn: async () => {
      const currentToken = getToken();
      const currentEmail = getEmail();
      
      if (!facilityId || !etiology || !currentToken || !currentEmail) {
        throw new Error("Missing required parameters");
      }

      const deviceId = localStorage.getItem("deviceId") || "web-" + Math.random().toString(36).substr(2, 9);

      const response = await fetch(LOCAL_API.FACILITIES_LIST, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity: "FacilityDataCenter",
          method: "getWoundsByEtiology",
          token: currentToken,
          email: currentEmail,
          deviceId,
          facilityId,
          etiology,
          dosStart: startDate || undefined,
          dosEnd: endDate || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch wounds by etiology: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        data: data.data || [],
        total_wounds: data.total_wounds || 0,
        total_patients: data.total_patients || 0,
        etiology: data.etiology || etiology
      };
    },
    enabled: !!facilityId && !!etiology && !!token && !!email,
    staleTime: 5 * 60 * 1000,
  });
}

// Types for wounds by healing status (reusing CriticalPatient structure)
export interface WoundsByHealingStatusResponse {
  data: CriticalPatient[];
  total_wounds: number;
  total_patients: number;
  healingStatus: string;
}

/**
 * Hook to fetch wounds filtered by healing status (progress)
 * Used for healing status chart click functionality
 */
export function useWoundsByHealingStatus(facilityId: string | null, healingStatus: string | null, startDate?: string, endDate?: string) {
  const { getToken, getEmail } = useAuth();
  const email = getEmail();
  const token = getToken();

  return useQuery<WoundsByHealingStatusResponse, Error>({
    queryKey: ["woundsByHealingStatus", facilityId, healingStatus, startDate, endDate],
    queryFn: async () => {
      const currentToken = getToken();
      const currentEmail = getEmail();
      
      if (!facilityId || !healingStatus || !currentToken || !currentEmail) {
        throw new Error("Missing required parameters");
      }

      const deviceId = localStorage.getItem("deviceId") || "web-" + Math.random().toString(36).substr(2, 9);

      const response = await fetch(LOCAL_API.FACILITIES_LIST, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity: "FacilityDataCenter",
          method: "getWoundsByHealingStatus",
          token: currentToken,
          email: currentEmail,
          deviceId,
          facilityId,
          healingStatus,
          dosStart: startDate || undefined,
          dosEnd: endDate || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch wounds by healing status: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        data: data.data || [],
        total_wounds: data.total_wounds || 0,
        total_patients: data.total_patients || 0,
        healingStatus: data.healingStatus || healingStatus
      };
    },
    enabled: !!facilityId && !!healingStatus && !!token && !!email,
    staleTime: 5 * 60 * 1000,
  });
}

// Types for wounds by disposition status (reusing CriticalPatient structure)
export interface WoundsByDispositionResponse {
  data: CriticalPatient[];
  total_wounds: number;
  total_patients: number;
  disposition: string;
}

/**
 * Hook to fetch wounds filtered by disposition status
 * Used for wounds by status chart click functionality
 */
export function useWoundsByDisposition(facilityId: string | null, disposition: string | null, startDate?: string, endDate?: string) {
  const { getToken, getEmail } = useAuth();
  const email = getEmail();
  const token = getToken();

  return useQuery<WoundsByDispositionResponse, Error>({
    queryKey: ["woundsByDisposition", facilityId, disposition, startDate, endDate],
    queryFn: async () => {
      const currentToken = getToken();
      const currentEmail = getEmail();
      
      if (!facilityId || !disposition || !currentToken || !currentEmail) {
        throw new Error("Missing required parameters");
      }

      const deviceId = localStorage.getItem("deviceId") || "web-" + Math.random().toString(36).substr(2, 9);

      const response = await fetch(LOCAL_API.FACILITIES_LIST, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity: "FacilityDataCenter",
          method: "getWoundsByDisposition",
          token: currentToken,
          email: currentEmail,
          deviceId,
          facilityId,
          disposition,
          dosStart: startDate || undefined,
          dosEnd: endDate || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch wounds by disposition: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        data: data.data || [],
        total_wounds: data.total_wounds || 0,
        total_patients: data.total_patients || 0,
        disposition: data.disposition || disposition
      };
    },
    enabled: !!facilityId && !!disposition && !!token && !!email,
    staleTime: 5 * 60 * 1000,
  });
}

export type { FacilityPatient, WoundEncounter, PatientByDate, CriticalWound, CriticalPatient, CriticalCasesResponse, UpdateWoundEncounterParams, ReportEncounter, ReportPatient, ReportsGeneratedResponse, WoundsByEtiologyResponse, WoundsByHealingStatusResponse, WoundsByDispositionResponse };