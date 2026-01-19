import { useUserFacilities, useHasFacilityAccess, useCurrentFacility } from "@/hooks/use-user-facilities";
import { useAuth } from "@/hooks/use-auth";
import { AlertCircle, Building2, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Component that displays the list of facilities the user has access to
 * 
 * Example usage:
 * <UserFacilitiesList />
 */
export function UserFacilitiesList() {
  const { getAuthInfo } = useAuth();
  const { data, isLoading, error } = useUserFacilities();

  if (!getAuthInfo().email) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load facilities: {error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!data?.facilities || data.facilities.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Facilities</AlertTitle>
        <AlertDescription>This user doesn't have access to any facilities.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Accessible Facilities
        </h3>

        <div className="space-y-2">
          {data.facilities.map((facility) => (
            <div key={facility} className="flex items-center gap-2 p-2 bg-white dark:bg-blue-900 rounded border border-blue-100 dark:border-blue-700">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
                Facility {facility}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
          <p>
            <strong>Entity:</strong> {data.entityName || "Unknown"} (ID: {data.entityId || "N/A"})
          </p>
          <p>
            <strong>Total Access:</strong> {data.facilities.length} facility/facilities
          </p>
          {data.cached && <p className="text-blue-600 dark:text-blue-300">• Data from cache</p>}
        </div>
      </div>
    </div>
  );
}

/**
 * Component that shows a list of facilities with access control badge
 * 
 * Example usage:
 * <FacilityAccessMatrix facilities={[1, 2, 3, 5, 10]} />
 */
export function FacilityAccessMatrix({ facilities }: { facilities: (string | number)[] }) {
  return (
    <div className="space-y-2">
      {facilities.map((facilityId) => (
        <FacilityAccessBadge key={facilityId} facilityId={facilityId} />
      ))}
    </div>
  );
}

/**
 * Single facility access badge
 */
function FacilityAccessBadge({ facilityId }: { facilityId: string | number }) {
  const hasAccess = useHasFacilityAccess(facilityId);

  const bgColor = hasAccess ? "bg-green-100 dark:bg-green-950" : "bg-red-100 dark:bg-red-950";
  const borderColor = hasAccess ? "border-green-300 dark:border-green-700" : "border-red-300 dark:border-red-700";
  const textColor = hasAccess ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200";
  const icon = hasAccess ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />;

  return (
    <div className={`${bgColor} ${borderColor} ${textColor} p-2 rounded border flex items-center gap-2 text-sm`}>
      {icon}
      <span>
        Facility {facilityId} - {hasAccess ? "Accessible" : "No Access"}
      </span>
    </div>
  );
}

/**
 * Component that shows facility access status overview
 */
export function FacilityAccessOverview() {
  const { getAuthInfo } = useAuth();
  const { data, isLoading } = useUserFacilities();
  const currentFacility = useCurrentFacility();

  const authInfo = getAuthInfo();

  if (isLoading) {
    return <div className="text-gray-500">Loading facility information...</div>;
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
      <div className="space-y-2 text-sm">
        <div>
          <span className="font-semibold text-gray-700 dark:text-gray-300">User: </span>
          <span className="text-gray-600 dark:text-gray-400">{authInfo.email}</span>
        </div>
        <div>
          <span className="font-semibold text-gray-700 dark:text-gray-300">Entity: </span>
          <span className="text-gray-600 dark:text-gray-400">{data?.entityName || "N/A"}</span>
        </div>
        <div>
          <span className="font-semibold text-gray-700 dark:text-gray-300">Current Facility: </span>
          <span className="text-gray-600 dark:text-gray-400">{currentFacility || "None"}</span>
        </div>
        <div>
          <span className="font-semibold text-gray-700 dark:text-gray-300">Total Accessible: </span>
          <span className="text-blue-600 dark:text-blue-400 font-mono">
            {data?.facilities?.length || 0} facility/facilities
          </span>
        </div>
      </div>
    </div>
  );
}
