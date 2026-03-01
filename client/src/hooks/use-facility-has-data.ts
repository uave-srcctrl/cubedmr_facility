import { useAuth } from "./use-auth";
import { useMemo, useState, useEffect } from "react";
import { onAuthEvent, AUTH_EVENTS } from "@/lib/auth-events";

/**
 * Hook to check if the selected facility has wound encounter data
 * Returns hasData: true if facility has wound_encounters, false otherwise
 */
export function useFacilityHasData() {
  const { getSelectedFacilityDetails, getAvailableFacilities, getSelectedFacility } = useAuth();
  
  // Force re-render when facilities change
  const [refreshKey, setRefreshKey] = useState(0);
  
  useEffect(() => {
    // Listen for facility changes and data updates to refresh
    const unsubscribeFacility = onAuthEvent(AUTH_EVENTS.FACILITY_CHANGED, () => {
      setRefreshKey(k => k + 1);
    });
    const unsubscribeData = onAuthEvent(AUTH_EVENTS.DATA_IMPORTED, () => {
      setRefreshKey(k => k + 1);
    });
    const unsubscribeFacilitiesUpdated = onAuthEvent(AUTH_EVENTS.FACILITIES_UPDATED, () => {
      setRefreshKey(k => k + 1);
    });
    
    return () => {
      unsubscribeFacility();
      unsubscribeData();
      unsubscribeFacilitiesUpdated();
    };
  }, []);
  
  const facilityId = getSelectedFacility();
  const facilities = getAvailableFacilities();
  
  const { hasData, totalWoundEncounters, facility } = useMemo(() => {
    // Find current facility in the list
    const currentFacility = facilities.find(f => String(f.id) === String(facilityId));
    
    if (!currentFacility) {
      return { hasData: false, totalWoundEncounters: 0, facility: null };
    }
    
    // Check total_wound_encounters from the SP response
    const total = currentFacility.total_wound_encounters ?? 
                  currentFacility.totalWoundEncounters ?? 
                  0;
    
    return {
      hasData: total > 0,
      totalWoundEncounters: total,
      facility: currentFacility
    };
  }, [facilityId, facilities, refreshKey]);

  return {
    hasData,
    totalWoundEncounters,
    facility,
    facilityId,
    facilityName: facility?.name || facility?.facility_name || 'Unknown Facility'
  };
}
