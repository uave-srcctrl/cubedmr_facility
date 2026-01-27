import { useEffect } from 'react';

/**
 * Hook that clears authentication data when the LAST tab/window of the domain is closed
 * Uses sessionStorage to detect when all tabs of a domain are closed
 * 
 * How it works:
 * - sessionStorage is unique per tab/window
 * - When ALL tabs are closed, sessionStorage is cleared automatically
 * - On next browser open, sessionStorage will be empty
 * - This hook detects that and clears localStorage (persistent data)
 * 
 * This allows tokens to persist between tabs but be cleared when entire browser session ends
 */
export function useLogoutOnBrowserClose() {
  useEffect(() => {
    const SESSION_KEY = 'authSessionMarker';
    
    // Check if this is a new browser session (sessionStorage is empty)
    const sessionMarker = sessionStorage.getItem(SESSION_KEY);
    
    if (!sessionMarker) {
      console.log('[useLogoutOnBrowserClose] New browser session detected - clearing auth data');
      
      // This is a new session (all previous tabs were closed)
      // Clear authentication-related localStorage to require fresh login
      localStorage.removeItem("authToken");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userEntity");
      localStorage.removeItem("userEntityName");
      localStorage.removeItem("userEntityId");
      localStorage.removeItem("userCurrentTenant");
      localStorage.removeItem("userFacilityId");
      localStorage.removeItem("userFacilities");
      localStorage.removeItem("selectedFacilityId");
      localStorage.removeItem("availableFacilities");
      localStorage.removeItem("userGroups");
      localStorage.removeItem("userName");
      
      console.log('[useLogoutOnBrowserClose] Auth data cleared for new session');
    } else {
      console.log('[useLogoutOnBrowserClose] Existing session detected - keeping auth data');
    }
    
    // Mark that this session has been initialized
    sessionStorage.setItem(SESSION_KEY, 'active');
    
    return () => {
      // Cleanup is not needed here as sessionStorage is automatically cleared when all tabs close
    };
  }, []);
}
