import { useQuery } from "@tanstack/react-query";
import { LOCAL_API } from "@/lib/api-config";
import { useAuth } from "./use-auth";

interface UserFacilities {
  status: boolean;
  email: string;
  facilities: (string | number)[];
  entityId: string | number | null;
  entityName: string | null;
  cached: boolean;
  message?: string;
}

/**
 * Hook to fetch list of facilities for the authenticated user
 * 
 * Usage:
 * const { data, isLoading, error } = useUserFacilities();
 * if (data?.facilities) {
 *   console.log("User has access to:", data.facilities);
 * }
 */
export function useUserFacilities() {
  const { getEmail } = useAuth();
  const email = getEmail();

  return useQuery<UserFacilities, Error>({
    queryKey: ["userFacilities", email],
    queryFn: async () => {
      if (!email) {
        throw new Error("User not authenticated");
      }

      const response = await fetch(`${LOCAL_API.USER_FACILITIES}?email=${encodeURIComponent(email)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch facilities: ${response.statusText}`);
      }

      return response.json();
    },
    enabled: !!email,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to check if user has access to a specific facility
 * 
 * Usage:
 * const hasAccess = useHasFacilityAccess("5");
 * if (hasAccess) {
 *   console.log("User can access facility 5");
 * }
 */
export function useHasFacilityAccess(facilityId: string | number | null): boolean {
  const { data } = useUserFacilities();

  if (!facilityId || !data?.facilities) {
    return false;
  }

  const facilityIdStr = String(facilityId);
  return data.facilities.some((fac) => String(fac) === facilityIdStr);
}

/**
 * Hook to get the current facility for the user
 * 
 * Usage:
 * const currentFacility = useCurrentFacility();
 * if (currentFacility) {
 *   console.log("Current facility:", currentFacility);
 * }
 */
export function useCurrentFacility() {
  const { getFacilityId } = useAuth();
  const { data } = useUserFacilities();

  const currentFacilityId = getFacilityId();

  if (!currentFacilityId || !data?.facilities) {
    return null;
  }

  // Return the current facility ID if user has access
  const hasAccess = data.facilities.some((fac) => String(fac) === String(currentFacilityId));
  return hasAccess ? currentFacilityId : null;
}
