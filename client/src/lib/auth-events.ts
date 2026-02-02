/**
 * Custom events for authentication state changes
 * Used because storage events don't fire for changes in the same tab
 */

export const AUTH_EVENTS = {
  LOGIN: 'auth:login',
  LOGOUT: 'auth:logout',
  AUTH_READY: 'auth:ready',
  FACILITY_CHANGED: 'auth:facility_changed',
};

export function dispatchAuthEvent(eventName: string, detail?: any) {
  const event = new CustomEvent(eventName, { detail });
  window.dispatchEvent(event);
  console.log(`[AuthEvents] Dispatched: ${eventName}`, detail);
}

export function onAuthEvent(eventName: string, callback: (detail?: any) => void) {
  const handler = (event: Event) => {
    if (event instanceof CustomEvent) {
      callback(event.detail);
    }
  };
  window.addEventListener(eventName, handler);
  return () => window.removeEventListener(eventName, handler);
}
