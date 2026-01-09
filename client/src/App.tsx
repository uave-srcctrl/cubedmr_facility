import { Switch, Route } from "wouter";
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
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

function Router({ isAuthenticated, user, onLogout }: { isAuthenticated: boolean; user: any; onLogout: () => void }) {
  if (!isAuthenticated) {
    // Simple redirection to login if not authenticated, although simple conditional rendering in App handles this too.
    return <Login onLogin={() => window.location.reload()} />; 
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/facility-report" component={FacilityWoundReport} />
        <Route path="/outcome-report" component={OutcomeReportGlobal} />
        <Route path="/etiology-report" component={EtiologyReport} />
        <Route path="/acuity-report" component={AcuityReport} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  const { isAuthenticated, getAuthInfo, logout } = useAuth();
  const [isAuth, setIsAuth] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Initialize auth state on mount
  useEffect(() => {
    const updateAuthState = () => {
      if (isAuthenticated()) {
        const authInfo = getAuthInfo();
        setIsAuth(true);
        setUser({
          name: authInfo.entityName || authInfo.email?.split('@')[0] || "Facility",
          role: authInfo.entity || "Facility Admin",
          email: authInfo.email,
          entityId: authInfo.entityId,
        });
        console.log("[App] Auth state updated:", { authInfo });
      } else {
        setIsAuth(false);
        setUser(null);
        console.log("[App] Auth cleared");
      }
    };

    updateAuthState();

    // Listen for storage changes (login from another tab)
    const handleStorageChange = () => {
      updateAuthState();
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleLogout = async () => {
    await logout();
    setIsAuth(false);
    setUser(null);
    // Redirect to login page
    window.location.href = "/login";
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {isAuth && user ? (
          <Router isAuthenticated={true} user={user} onLogout={handleLogout} />
        ) : (
          <Login onLogin={() => {
            // Navigate to dashboard after successful login
            window.location.href = "/";
          }} />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
