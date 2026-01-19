import { useEffect } from 'react';
import { useAuth } from './use-auth';

/**
 * Hook that triggers logout when the browser tab/window is closed or the page is unloaded
 * This handles:
 * - Closing the browser tab
 * - Closing the browser window
 * - Navigating away from the site
 * - Pressing the back button to leave the site
 */
export function useLogoutOnUnload() {
  const { logout, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated()) {
      return; // Don't set up listeners if not authenticated
    }

    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      console.log('[useLogoutOnUnload] beforeunload event fired - user closing tab/window');
      
      // Call logout but don't wait for it to complete
      // (beforeunload doesn't allow async operations)
      logout().catch(error => {
        console.error('[useLogoutOnUnload] Error during beforeunload logout:', error);
      });
      
      // Some browsers require returning a string to show the confirmation dialog
      // We don't show a dialog, just silently logout
    };

    const handleUnload = async () => {
      console.log('[useLogoutOnUnload] unload event fired - page is being unloaded');
      
      // Try to logout with a synchronous fetch (beacon)
      try {
        const token = localStorage.getItem("authToken");
        const email = localStorage.getItem("userEmail");
        
        if (token && email) {
          // Use sendBeacon for reliable delivery even if page is unloading
          const logoutUrl = localStorage.getItem("logoutUrl") || "/api/auth/logout";
          const payload = JSON.stringify({
            email,
            facility_id: localStorage.getItem("userFacilityId") || null,
          });
          
          navigator.sendBeacon(logoutUrl, payload);
          console.log('[useLogoutOnUnload] Sent beacon logout request');
        }
      } catch (error) {
        console.error('[useLogoutOnUnload] Error during unload:', error);
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);

    console.log('[useLogoutOnUnload] Listeners attached - logout on tab/window close enabled');

    // Cleanup: remove listeners when component unmounts
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
      console.log('[useLogoutOnUnload] Listeners removed');
    };
  }, [logout, isAuthenticated]);
}
