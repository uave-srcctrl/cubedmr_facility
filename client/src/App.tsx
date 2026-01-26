import { Switch, Route } from "wouter";
import React, { useState, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import FacilityWoundReport from "@/pages/facility-wound-report";
import OutcomeReportGlobal from "@/pages/outcome-report";
import EtiologyReport from "@/pages/etiology-report";
import AcuityReport from "@/pages/acuity-report";
import ExcelImportPage from "@/pages/excel-import";
import FacilitySelectorPage from "@/pages/facility-selector";
import { useAuth } from "@/hooks/use-auth";
import { useLogoutOnUnload } from "@/hooks/use-logout-on-unload";
import { useLogoutOnBrowserClose } from "@/hooks/use-logout-on-browser-close";
import { useSingleTabEnforcement } from "@/hooks/use-single-tab-enforcement";
import { onAuthEvent, AUTH_EVENTS } from "@/lib/auth-events";

// Simple error boundary for debugging
class ErrorBoundaryComponent extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    console.error('[ErrorBoundary] Caught error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red' }}>
          <h1>❌ Error Rendering Component</h1>
          <p>{this.state.error?.toString()}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return <ErrorBoundaryComponent>{children}</ErrorBoundaryComponent>;
}

function Router({ isAuthenticated, user, onLogout }: { isAuthenticated: boolean; user: any; onLogout: () => void }) {
  const { isFacilitySelected } = useAuth();
  const facilitySelected = isFacilitySelected();

  console.log('[Router] Rendering - isAuthenticated:', isAuthenticated, 'facilitySelected:', facilitySelected);
  
  if (!isAuthenticated) {
    console.log('[Router] NOT authenticated - showing Login component');
    // Pass a no-op onLogin since App.tsx will detect auth state changes automatically
    return <Login onLogin={() => {
      console.log("[Router] Login detected, waiting for auth state update...");
      // App.tsx will automatically detect the auth state change via the interval
    }} />; 
  }

  // Si autenticado pero SIN facility seleccionada, mostrar selector
  if (!facilitySelected) {
    console.log('[Router] Authenticated but no facility selected - showing FacilitySelectorPage');
    return <FacilitySelectorPage />;
  }

  console.log('[Router] AUTHENTICATED - showing Dashboard in Layout');
  return (
    <Layout user={user} onLogout={onLogout}>
      <Switch>
        {console.log('[Router/Switch] Inside Switch, location should be /facility/')}
        <Route path="/facility/" component={Dashboard} />
        <Route path="/facility/facility-report" component={FacilityWoundReport} />
        <Route path="/facility/outcome-report" component={OutcomeReportGlobal} />
        <Route path="/facility/etiology-report" component={EtiologyReport} />
        <Route path="/facility/acuity-report" component={AcuityReport} />
        <Route path="/facility/excel-import" component={ExcelImportPage} />
        <Route path="/facility-selector" component={FacilitySelectorPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  const { isAuthenticated, getAuthInfo, loadUser, getFacilities, getEntityId, logout } = useAuth();
  const [isAuth, setIsAuth] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Clear auth data when new browser session starts (last tab was closed)
  useLogoutOnBrowserClose();
  
  // Enforce only one tab of the application per browser
  const { isActiveTab, showBlockedMessage } = useSingleTabEnforcement();
  
  console.log('[App] App component rendering - isAuth:', isAuth, 'user:', user?.name, 'initialized:', isInitialized, 'isActiveTab:', isActiveTab);

  // Initialize auth state on mount
  useEffect(() => {
    const updateAuthState = async () => {
      const authenticated = isAuthenticated();
      console.log("[App] updateAuthState called - isAuthenticated:", authenticated);
      
      if (authenticated) {
        console.log("[App] User is authenticated, loading fresh user data...");
        
        // Get basic auth info from localStorage first
        const authInfo = getAuthInfo();
        const email = authInfo.email;
        
        if (email) {
          console.log("[App] Loading user data for:", email);
          
          // Try to load fresh user data from API (similar to Flutter's loadUser)
          const loadUserSuccess = await loadUser(email);
          
          if (loadUserSuccess) {
            console.log("[App] User data loaded successfully");
          } else {
            console.log("[App] Failed to load fresh user data, but continuing with cached data");
            // Don't clear auth - use cached data instead
            // This allows the app to work even if the API is temporarily unavailable
          }
          
          // Try to load facilities (with or without fresh data)
          try {
            const facilities = await getFacilities();
            console.log("[App] Facilities loaded:", facilities.length, "facilities");
          } catch (error) {
            console.log("[App] Failed to load facilities, continuing with cached:", error);
            // Continue anyway - use cached facilities if available
          }
          
          // Get current auth info (fresh or cached)
          const currentAuthInfo = getAuthInfo();
          console.log("[App] Current auth info:", currentAuthInfo);
          
          // Set auth state with current data (fresh or cached)
          if (currentAuthInfo.token && currentAuthInfo.email) {
            setIsAuth(true);
            setUser({
              name: currentAuthInfo.userName || currentAuthInfo.entityName || currentAuthInfo.email?.split('@')[0] || "Facility",
              role: currentAuthInfo.entity || "Facility Admin",
              email: currentAuthInfo.email,
              entityId: currentAuthInfo.entityId,
            });
            console.log("[App] Auth state set with user:", currentAuthInfo.email);
          } else {
            console.log("[App] No token or email in auth info, clearing auth");
            setIsAuth(false);
            setUser(null);
          }
        } else {
          console.log("[App] No email found in localStorage, user not authenticated");
          setIsAuth(false);
          setUser(null);
        }
      } else {
        console.log("[App] isAuthenticated is false - checking localStorage...");
        const token = localStorage.getItem("authToken");
        const email = localStorage.getItem("userEmail");
        console.log("[App] localStorage - token:", token ? "present" : "missing", "email:", email ? "present" : "missing");
        setIsAuth(false);
        setUser(null);
        console.log("[App] Auth cleared");
      }
      
      // Mark app as initialized
      setIsInitialized(true);
    };

    // Check auth state on mount
    updateAuthState();

    // Listen for custom auth events from login/logout
    const unsubscribeLogin = onAuthEvent(AUTH_EVENTS.LOGIN, (detail) => {
      console.log("[App] LOGIN event received - triggering updateAuthState");
      // Small delay to ensure localStorage is synchronized
      setTimeout(() => {
        console.log("[App] LOGIN event - 100ms delay passed, calling updateAuthState");
        updateAuthState();
      }, 100);
    });

    const unsubscribeLogout = onAuthEvent(AUTH_EVENTS.LOGOUT, (detail) => {
      console.log("[App] LOGOUT event received - triggering updateAuthState");
      updateAuthState();
    });

    // Also listen for storage changes (for other tabs)
    const handleStorageChange = () => {
      console.log("[App] Storage event fired - checking if auth changed");
      setTimeout(() => {
        updateAuthState();
      }, 100);
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      unsubscribeLogin();
      unsubscribeLogout();
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Enable logout when tab/browser is closed (after initialization)
  useLogoutOnUnload();

  const handleLogout = async () => {
    console.log("[App] handleLogout() called - current isAuth:", isAuth);
    try {
      console.log("[App] Calling logout()...");
      await logout();
      console.log("[App] logout() completed successfully");
    } catch (error) {
      console.error("[App] Logout error:", error);
    }
    
    console.log("[App] handleLogout() - manually setting state to logged out");
    // Clear local state - App will detect the change via logout event
    setIsAuth(false);
    setUser(null);
    console.log("[App] handleLogout() - state cleared, should show login page now");
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <ErrorBoundary>
          {!isActiveTab && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              color: 'white',
              fontFamily: 'Arial, sans-serif',
            }}>
              <div style={{
                textAlign: 'center',
                padding: '40px',
                backgroundColor: '#222',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                maxWidth: '400px',
              }}>
                <h1 style={{ marginTop: 0, marginBottom: '20px', fontSize: '24px' }}>
                  ⚠️ Another Tab Is Open
                </h1>
                <p style={{ marginBottom: '20px', fontSize: '16px', lineHeight: '1.5' }}>
                  The application is already open in another tab of this browser.
                </p>
                <p style={{ marginBottom: '30px', fontSize: '14px', color: '#aaa' }}>
                  Close the other tab and refresh this page to continue.
                </p>
                <button
                  onClick={() => window.close()}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Close This Tab
                </button>
              </div>
            </div>
          )}
          
          {isActiveTab && (
            <>
              {isAuth && user ? (
                <>
                  {console.log('[App] Rendering Router with isAuth=true, user=', user.name)}
                  <Router isAuthenticated={true} user={user} onLogout={handleLogout} />
                </>
              ) : (
                <>
                  {console.log('[App] Rendering Login - isAuth=', isAuth, ', user=', user)}
                  <Login onLogin={() => {
                    console.log("[App] Login successful, waiting for auth state update...");
                  }} />
                </>
              )}
            </>
          )}
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
