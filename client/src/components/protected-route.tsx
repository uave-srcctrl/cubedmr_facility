import { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated()) {
    console.log("[ProtectedRoute] User not authenticated");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Not authenticated. Redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
