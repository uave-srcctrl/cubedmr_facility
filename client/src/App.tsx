import { Switch, Route, useLocation } from "wouter";
import React, { useState, useEffect, Suspense, lazy } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import Login from "@/pages/login";
import FacilitySelectorPage from "@/pages/facility-selector";
import { useAuth } from "@/hooks/use-auth";
import { useLogoutOnUnload } from "@/hooks/use-logout-on-unload";
import { useLogoutOnBrowserClose } from "@/hooks/use-logout-on-browser-close";
import { useSingleTabEnforcement } from "@/hooks/use-single-tab-enforcement";
import { onAuthEvent, AUTH_EVENTS } from "@/lib/auth-events";
import { ImportProvider } from "@/contexts/import-context";
import { EcgLoader } from "@/components/ecg-loader";
import { RouteErrorBoundary } from "@/components/route-error-boundary";
import { logger } from "@/lib/logger";

// Lazy load pages for better initial bundle size
const Dashboard = lazy(() => import("@/pages/dashboard"));
const FacilityWoundReport = lazy(() => import("@/pages/facility-wound-report"));
const OutcomeReportGlobal = lazy(() => import("@/pages/outcome-report"));
const EtiologyReport = lazy(() => import("@/pages/etiology-report"));
const AcuityReport = lazy(() => import("@/pages/acuity-report"));
const RoundSummary = lazy(() => import("@/pages/round-summary"));
const ExcelImportPage = lazy(() => import("@/pages/excel-import"));
const DataImportPage = lazy(() => import("@/pages/data-import"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const PatientsPage = lazy(() => import("@/pages/patients"));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <EcgLoader size="lg" text="Loading..." />
    </div>
  );
}

// Simple error boundary for debugging
class ErrorBoundaryComponent extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    logger.error('[ErrorBoundary] Caught error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    logger.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
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
  const [location, setLocation] = useLocation();
  const facilitySelected = isFacilitySelected();
  const [wasAuthenticated, setWasAuthenticated] = useState(false);

  // Routes that can be accessed without facility selection (only when explicitly navigated)
  const allowedWithoutFacility = ['/facility/data-import'];
  const isAllowedRoute = allowedWithoutFacility.some(route => location === route);

  // When user just logged in (transition from !auth to auth) without facility,
  // redirect to root to ensure they go through facility selector
  useEffect(() => {
    if (isAuthenticated && !wasAuthenticated && !facilitySelected && isAllowedRoute) {
      logger.debug('[Router] Fresh login detected on allowed route, redirecting to facility selector');
      setLocation('/');
    }
    if (isAuthenticated) {
      setWasAuthenticated(true);
    } else {
      setWasAuthenticated(false);
    }
  }, [isAuthenticated, facilitySelected, isAllowedRoute, wasAuthenticated, setLocation]);

  logger.debug('[Router] Rendering - isAuthenticated:', isAuthenticated, 'facilitySelected:', facilitySelected, 'location:', location, 'isAllowedRoute:', isAllowedRoute);

  if (!isAuthenticated) {
    logger.debug('[Router] NOT authenticated - showing Login component');
    // Pass a no-op onLogin since App.tsx will detect auth state changes automatically
    return <Login onLogin={() => {
      logger.debug("[Router] Login detected, waiting for auth state update...");
      // App.tsx will automatically detect the auth state change via the interval
    }} />;
  }

  // Si autenticado pero SIN facility seleccionada, mostrar selector
  // EXCEPTO si estamos en una ruta permitida sin facility
  if (!facilitySelected && !isAllowedRoute) {
    logger.debug('[Router] Authenticated but no facility selected - showing FacilitySelectorPage');
    return <FacilitySelectorPage />;
  }

  // If on data-import without facility, render it directly without Layout
  if (!facilitySelected && isAllowedRoute) {
    logger.debug('[Router] Authenticated, no facility, but on allowed route - showing DataImportPage');
    return (
      <div className="min-h-screen bg-background py-6 px-[10%]">
        <Suspense fallback={<PageLoader />}>
          <DataImportPage />
        </Suspense>
      </div>
    );
  }

  logger.debug('[Router] AUTHENTICATED - showing Dashboard in Layout');
  return (
    <Layout user={user} onLogout={onLogout}>
      <Suspense fallback={<PageLoader />}>
        <RouteErrorBoundary>
          <Switch>
            <Route path="/facility/" component={Dashboard} />
            <Route path="/facility/patients" component={PatientsPage} />
            <Route path="/facility/facility-report" component={FacilityWoundReport} />
            <Route path="/facility/outcome-report" component={OutcomeReportGlobal} />
            <Route path="/facility/etiology-report" component={EtiologyReport} />
            <Route path="/facility/acuity-report" component={AcuityReport} />
            <Route path="/facility/round-summary" component={RoundSummary} />
            <Route path="/facility/excel-import" component={ExcelImportPage} />
            <Route path="/facility/data-import" component={DataImportPage} />
            <Route path="/facility/settings" component={SettingsPage} />
            <Route path="/facility-selector" component={FacilitySelectorPage} />
            <Route component={NotFound} />
          </Switch>
        </RouteErrorBoundary>
      </Suspense>
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

  logger.debug('[App] App component rendering - isAuth:', isAuth, 'user:', user?.name, 'initialized:', isInitialized, 'isActiveTab:', isActiveTab);

  // Initialize auth state on mount
  useEffect(() => {
    const updateAuthState = async () => {
      const authenticated = isAuthenticated();
      logger.debug("[App] updateAuthState called - isAuthenticated:", authenticated);

      if (authenticated) {
        logger.debug("[App] User is authenticated, loading fresh user data...");

        // Get basic auth info from localStorage first
        const authInfo = getAuthInfo();
        const email = authInfo.email;

        if (email) {
          logger.debug("[App] Loading user data for:", email);

          // Try to load fresh user data from API (similar to Flutter's loadUser)
          const loadUserSuccess = await loadUser(email);

          if (loadUserSuccess) {
            logger.debug("[App] User data loaded successfully");
          } else {
            logger.debug("[App] Failed to load fresh user data, but continuing with cached data");
            // Don't clear auth - use cached data instead
            // This allows the app to work even if the API is temporarily unavailable
          }

          // Try to load facilities (with or without fresh data)
          try {
            const facilities = await getFacilities();
            logger.debug("[App] Facilities loaded:", facilities.length, "facilities");
          } catch (error) {
            logger.debug("[App] Failed to load facilities, continuing with cached:", error);
            // Continue anyway - use cached facilities if available
          }

          // Get current auth info (fresh or cached)
          const currentAuthInfo = getAuthInfo();
          logger.debug("[App] Current auth info:", currentAuthInfo);

          // Set auth state with current data (fresh or cached)
          if (currentAuthInfo.token && currentAuthInfo.email) {
            setIsAuth(true);
            setUser({
              name: currentAuthInfo.userName || currentAuthInfo.entityName || currentAuthInfo.email?.split('@')[0] || "Facility",
              role: currentAuthInfo.entity || "Facility Admin",
              email: currentAuthInfo.email,
              entityId: currentAuthInfo.entityId,
            });
            logger.debug("[App] Auth state set with user:", currentAuthInfo.email);
          } else {
            logger.debug("[App] No token or email in auth info, clearing auth");
            setIsAuth(false);
            setUser(null);
          }
        } else {
          logger.debug("[App] No email found in localStorage, user not authenticated");
          setIsAuth(false);
          setUser(null);
        }
      } else {
        logger.debug("[App] isAuthenticated is false - checking localStorage...");
        const token = localStorage.getItem("authToken");
        const email = localStorage.getItem("userEmail");
        logger.debug("[App] localStorage - token:", token ? "present" : "missing", "email:", email ? "present" : "missing");
        setIsAuth(false);
        setUser(null);
        logger.debug("[App] Auth cleared");
      }

      // Mark app as initialized
      setIsInitialized(true);
    };

    // Check auth state on mount
    updateAuthState();

    // Listen for custom auth events from login/logout
    const unsubscribeLogin = onAuthEvent(AUTH_EVENTS.LOGIN, (detail) => {
      logger.debug("[App] LOGIN event received - triggering updateAuthState");
      // Small delay to ensure localStorage is synchronized
      setTimeout(() => {
        logger.debug("[App] LOGIN event - 100ms delay passed, calling updateAuthState");
        updateAuthState();
      }, 100);
    });

    const unsubscribeLogout = onAuthEvent(AUTH_EVENTS.LOGOUT, (detail) => {
      logger.debug("[App] LOGOUT event received - triggering updateAuthState");
      updateAuthState();
    });

    const unsubscribeFacilityChanged = onAuthEvent(AUTH_EVENTS.FACILITY_CHANGED, (facilityId) => {
      logger.debug("[App] FACILITY_CHANGED event received - facilityId:", facilityId);
      // Force a re-render to update facilitySelected state in Router
      updateAuthState();
    });

    // Also listen for storage changes (for other tabs)
    const handleStorageChange = () => {
      logger.debug("[App] Storage event fired - checking if auth changed");
      setTimeout(() => {
        updateAuthState();
      }, 100);
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      unsubscribeLogin();
      unsubscribeLogout();
      unsubscribeFacilityChanged();
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Enable logout when tab/browser is closed (after initialization)
  useLogoutOnUnload();

  const handleLogout = async () => {
    logger.debug("[App] handleLogout() called - current isAuth:", isAuth);
    try {
      logger.debug("[App] Calling logout()...");
      await logout();
      logger.debug("[App] logout() completed successfully");
    } catch (error) {
      logger.error("[App] Logout error:", error);
    }

    logger.debug("[App] handleLogout() - manually setting state to logged out");
    // Clear local state - App will detect the change via logout event
    setIsAuth(false);
    setUser(null);
    logger.debug("[App] handleLogout() - state cleared, should show login page now");
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ImportProvider>
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
                    {logger.debug('[App] Rendering Router with isAuth=true, user=', user.name)}
                    <Router isAuthenticated={true} user={user} onLogout={handleLogout} />
                  </>
                ) : (
                  <>
                    {logger.debug('[App] Rendering Login - isAuth=', isAuth, ', user=', user)}
                    <Login onLogin={() => {
                      logger.debug("[App] Login successful, waiting for auth state update...");
                    }} />
                  </>
                )}
              </>
            )}
          </ErrorBoundary>
        </TooltipProvider>    </ImportProvider>    </QueryClientProvider>
  );
}

export default App;
