import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";

interface EnabledDatesResponse {
  status: boolean;
  data: string[]; // Array of date strings in YYYY-MM-DD format
  meta: {
    facility_id: number;
    patient_id: number | null;
    count: number;
    date_range: {
      start: string;
      end: string;
    };
    timestamp: string;
    source: string;
  };
}

/**
 * Hook to fetch enabled dates for a facility
 * Returns dates that have wound encounter data available
 */
export function useEnabledDates(facilityId: string | null, patientId?: string | null) {
  const { getToken, getEmail } = useAuth();
  const token = getToken();
  const email = getEmail();

  return useQuery<string[], Error>({
    queryKey: ["enabledDates", facilityId, patientId],
    queryFn: async () => {
      if (!facilityId || !token || !email) {
        throw new Error("Missing required parameters");
      }

      const params = new URLSearchParams({
        facility_id: facilityId,
      });

      if (patientId) {
        params.append('patient_id', patientId);
      }

      const response = await fetch(`/api/enabled-dates?${params}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch enabled dates: ${response.statusText}`);
      }

      const data: EnabledDatesResponse = await response.json();

      if (!data.status || !data.data) {
        throw new Error("Invalid response format");
      }

      // Normalize dates - handle PHP DateTime objects serialized as { date: "...", timezone_type, timezone }
      return data.data.map((item: any) => {
        if (typeof item === 'string') return item;
        if (item?.date && typeof item.date === 'string') return item.date.substring(0, 10);
        if (item instanceof Date) return item.toISOString().substring(0, 10);
        return String(item);
      });
    },
    enabled: !!facilityId && !!token && !!email,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}