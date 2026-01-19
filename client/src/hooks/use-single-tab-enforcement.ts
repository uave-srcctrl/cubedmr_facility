import { useEffect, useState } from 'react';

/**
 * Hook that enforces only one active tab of the application per browser
 * If a second tab is opened while another is active, this tab will be closed
 * 
 * How it works:
 * - Each tab registers itself in localStorage when it loads
 * - If another tab is already registered and active, this tab closes
 * - When a tab closes, it unregisters itself
 * - Uses storage events to detect changes from other tabs
 */
export function useSingleTabEnforcement() {
  const [isActiveTab, setIsActiveTab] = useState(true);
  const [showBlockedMessage, setShowBlockedMessage] = useState(false);

  useEffect(() => {
    const TAB_ID_KEY = 'appActiveTabId';
    const TAB_TIMESTAMP_KEY = 'appActiveTabTimestamp';
    const HEARTBEAT_INTERVAL = 2000; // 2 seconds
    const HEARTBEAT_TIMEOUT = 5000; // 5 seconds
    
    // Generate unique ID for this tab
    const currentTabId = Date.now().toString() + Math.random().toString(36);
    
    console.log('[useSingleTabEnforcement] Tab initialized with ID:', currentTabId);

    // Try to become the active tab
    const registerTab = () => {
      try {
        const existingTabId = localStorage.getItem(TAB_ID_KEY);
        const existingTimestamp = localStorage.getItem(TAB_TIMESTAMP_KEY);
        const now = Date.now();
        
        // Check if another tab is already active and still alive
        if (existingTabId && existingTabId !== currentTabId) {
          const timeSinceLastHeartbeat = now - (parseInt(existingTimestamp || '0') || 0);
          
          if (timeSinceLastHeartbeat < HEARTBEAT_TIMEOUT) {
            console.log('[useSingleTabEnforcement] Another active tab found. Blocking this tab.');
            setIsActiveTab(false);
            setShowBlockedMessage(true);
            return false;
          } else {
            console.log('[useSingleTabEnforcement] Previous tab is inactive (no heartbeat). Taking over.');
          }
        }
        
        // Register this tab as active
        localStorage.setItem(TAB_ID_KEY, currentTabId);
        localStorage.setItem(TAB_TIMESTAMP_KEY, now.toString());
        console.log('[useSingleTabEnforcement] This tab is now active');
        setIsActiveTab(true);
        setShowBlockedMessage(false);
        return true;
      } catch (error) {
        console.error('[useSingleTabEnforcement] Error registering tab:', error);
        return false;
      }
    };

    // Unregister this tab when closing
    const unregisterTab = () => {
      try {
        const existingTabId = localStorage.getItem(TAB_ID_KEY);
        if (existingTabId === currentTabId) {
          localStorage.removeItem(TAB_ID_KEY);
          localStorage.removeItem(TAB_TIMESTAMP_KEY);
          console.log('[useSingleTabEnforcement] Tab unregistered');
        }
      } catch (error) {
        console.error('[useSingleTabEnforcement] Error unregistering tab:', error);
      }
    };

    // Send heartbeat to show this tab is still alive
    const sendHeartbeat = () => {
      try {
        const existingTabId = localStorage.getItem(TAB_ID_KEY);
        if (existingTabId === currentTabId) {
          localStorage.setItem(TAB_TIMESTAMP_KEY, Date.now().toString());
          console.log('[useSingleTabEnforcement] Heartbeat sent');
        }
      } catch (error) {
        console.error('[useSingleTabEnforcement] Error sending heartbeat:', error);
      }
    };

    // Listen for storage changes from other tabs
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === TAB_ID_KEY) {
        console.log('[useSingleTabEnforcement] Detected tab change from another tab');
        // Re-check if we should be the active tab
        registerTab();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Try to register this tab
    registerTab();

    // Send heartbeat periodically
    const heartbeatInterval = setInterval(() => {
      sendHeartbeat();
    }, HEARTBEAT_INTERVAL);

    // Unregister when closing
    const handleBeforeUnload = () => {
      unregisterTab();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    console.log('[useSingleTabEnforcement] Enforcement enabled - only one tab allowed');

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      unregisterTab();
      console.log('[useSingleTabEnforcement] Cleanup completed');
    };
  }, []);

  return { isActiveTab, showBlockedMessage };
}
