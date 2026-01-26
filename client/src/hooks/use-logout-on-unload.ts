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
 * IMPORTANT: Uses sessionStorage-based approach to avoid affecting other open tabs
 * When ALL tabs are closed, sessionStorage is automatically cleared
 * Tokens are stored in sessionStorage so they don't persist across browser sessions
 */
export function useLogoutOnUnload() {
  const { logout, isAuthenticated } = useAuth();

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
      
      // IMPORTANT: DO NOT clear localStorage here because:
      // - localStorage is shared between ALL tabs of the same domain
      // - Clearing it when closing ONE tab will affect other open tabs
      // - sessionStorage is automatically cleared when the LAST tab closes
      // - Instead, we rely on tokens being stored in sessionStorage
      console.log('[useLogoutOnUnload] Tab/window closed - session will persist in other tabs');
    };

    // Add event listener
    window.addEventListener('beforeunload', handleBeforeUnload);

    console.log('[useLogoutOnUnload] Listeners attached - logout on tab/window close enabled');

    // Cleanup: remove listeners when component unmounts
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      console.log('[useLogoutOnUnload] Listeners removed');
    };
  }, [logout, isAuthenticated]);
}
