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
import { useState } from "react";

function Router({ isAuthenticated, onLogout }: { isAuthenticated: boolean; onLogout: () => void }) {
  if (!isAuthenticated) {
    // Simple redirection to login if not authenticated, although simple conditional rendering in App handles this too.
    return <Login onLogin={() => window.location.reload()} />; 
  }

  return (
    <Layout user={{ name: "Dr. Sarah Jenkins", role: "Clinical Director" }} onLogout={onLogout}>
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
  // Simple mock auth state - default to false to show login first
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = () => setIsAuthenticated(true);
  const handleLogout = () => setIsAuthenticated(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {isAuthenticated ? (
          <Router isAuthenticated={true} onLogout={handleLogout} />
        ) : (
          <Login onLogin={handleLogin} />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
