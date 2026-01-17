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
import FacilitySelectorPage from "@/pages/facility-selector";
import { useAuth } from "@/hooks/use-auth";
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
        <Route path="/facility-selector" component={FacilitySelectorPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  const { isAuthenticated, getAuthInfo, logout } = useAuth();
  const [isAuth, setIsAuth] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  console.log('[App] App component rendering - isAuth:', isAuth, 'user:', user?.name);

  // Initialize auth state on mount
  useEffect(() => {
    const updateAuthState = () => {
      const authenticated = isAuthenticated();
      console.log("[App] updateAuthState called - isAuthenticated:", authenticated);
      
      if (authenticated) {
        const authInfo = getAuthInfo();
        console.log("[App] Setting auth - authInfo:", authInfo);
        console.log("[App] About to call setIsAuth(true)");
        setIsAuth(true);
        console.log("[App] setIsAuth(true) called");
        setUser({
          name: authInfo.entityName || authInfo.email?.split('@')[0] || "Facility",
          role: authInfo.entity || "Facility Admin",
          email: authInfo.email,
          entityId: authInfo.entityId,
        });
        console.log("[App] setUser() called");
        console.log("[App] Auth state updated:", { authInfo });
      } else {
        console.log("[App] isAuthenticated is false - checking localStorage...");
        const token = localStorage.getItem("authToken");
        const facilityId = localStorage.getItem("userFacilityId");
        console.log("[App] localStorage - token:", token ? "present" : "missing", "facilityId:", facilityId);
        setIsAuth(false);
        setUser(null);
        console.log("[App] Auth cleared");
      }
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

  const handleLogout = async () => {
    console.log("[App] handleLogout() called - current isAuth:", isAuth);
    try {
      console.log("[App] Calling logout()...");
      await logout();
      console.log("[App] logout() completed");
    } catch (error) {
      console.error("[App] Logout error:", error);
    }
    
    console.log("[App] handleLogout() - manually setting state to logged out");
    // Clear local state - App will detect the change via logout event
    setIsAuth(false);
    setUser(null);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <ErrorBoundary>
          {isAuth && user ? (
            <>
              {console.log('[App] Rendering Router with isAuth=true, user=', user.name)}
              <Router isAuthenticated={true} user={user} onLogout={handleLogout} />
            </>
          ) : (
            <>
              {console.log('[App] Rendering Login with isAuth=false')}
              <Login onLogin={() => {
                console.log("[App] Login successful, waiting for auth state update...");
              }} />
            </>
          )}
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
