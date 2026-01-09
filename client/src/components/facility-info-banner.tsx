import { Building2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function FacilityInfoBanner() {
  const { getAuthInfo } = useAuth();
  const authInfo = getAuthInfo();

  // Show banner if we have an email (facility is logged in)
  if (!authInfo.email) {
    return null;
  }

  // Use email as fallback for name if entityName is not available
  const displayName = authInfo.entityName || authInfo.email?.split('@')[0] || "Facility";

  return (
    <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg border border-blue-200 dark:border-blue-800">
      <div className="flex-shrink-0">
        <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 truncate">
          {displayName}
        </p>
        <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
          {authInfo.entity || "Facility"} {authInfo.entityId && `• ID: ${authInfo.entityId}`}
        </p>
      </div>
      {authInfo.email && (
        <div className="flex-shrink-0 text-right">
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
            {authInfo.email}
          </p>
        </div>
      )}
    </div>
  );
}
