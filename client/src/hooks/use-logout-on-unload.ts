import { useEffect } from 'react';
import { useAuth } from './use-auth';

/**
 * Hook that triggers logout when the browser tab/window is closed or the page is unloaded
 * This handles:
 * - Closing the browser tab
 * - Closing the browser window
 * - Navigating away from the site
 * - Pressing the back button to leave the site
 * 
 * Ensures that when reopening the browser, user is NOT authenticated
 */
export function useLogoutOnUnload() {
  const { logout, isAuthenticated, clearAuth } = useAuth();

  useEffect(() => {
    if (!isAuthenticated()) {
      return; // Don't set up listeners if not authenticated
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      console.log('[useLogoutOnUnload] beforeunload event fired - user closing tab/window');
      
      try {
        const token = localStorage.getItem("authToken");
        const email = localStorage.getItem("userEmail");
        
        if (token && email) {
          // Try to send logout request using sendBeacon (most reliable during unload)
          const logoutUrl = localStorage.getItem("logoutUrl") || "/api/auth/logout";
          const payload = JSON.stringify({
            email,
            facility_id: localStorage.getItem("userFacilityId") || null,
          });
          
          // Set content type header for JSON
          const blob = new Blob([payload], { type: 'application/json' });
          navigator.sendBeacon(logoutUrl, blob);
          console.log('[useLogoutOnUnload] Sent beacon logout request to server');
        }
      } catch (error) {
        console.error('[useLogoutOnUnload] Error sending beacon during beforeunload:', error);
      }
      
      // CRITICAL: Clear localStorage immediately to ensure user is not authenticated on browser reopen
      console.log('[useLogoutOnUnload] Clearing localStorage to ensure logout on browser reopen');
      try {
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
        console.log('[useLogoutOnUnload] localStorage cleared');
      } catch (error) {
        console.error('[useLogoutOnUnload] Error clearing localStorage:', error);
      }
    };

    // Add event listener
    window.addEventListener('beforeunload', handleBeforeUnload);

    console.log('[useLogoutOnUnload] Listeners attached - logout on tab/window close enabled');

    // Cleanup: remove listeners when component unmounts
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      console.log('[useLogoutOnUnload] Listeners removed');
    };
  }, [logout, isAuthenticated, clearAuth]);
}
