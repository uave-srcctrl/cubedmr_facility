import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, subMonths, parseISO } from "date-fns";
import { Calendar as CalendarIcon, FileDown, AlertCircle, RefreshCcw, TrendingUp, TrendingDown, Clock, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { useReportDateRange } from "@/hooks/use-report-date-range";
import { useEnabledDates } from "@/hooks/use-enabled-dates";
import { useDeterioratingWounds, useNewWounds, useResolvedWounds, useActiveWounds, useChronicWounds } from "@/hooks/use-patients";
import { onAuthEvent, AUTH_EVENTS } from "@/lib/auth-events";
import { FacilityInfoBanner } from "@/components/facility-info-banner";
import { NoFacilityData } from "@/components/no-facility-data";
import { DataSourceBadge } from "@/components/data-source-badge";
import { useFacilityHasData } from "@/hooks/use-facility-has-data";
import { EcgLoader } from "@/components/ecg-loader";
import { DeterioratingWoundsModal } from "@/components/deteriorating-wounds-modal";
import { WoundActivityModal, WoundActivityType } from "@/components/wound-activity-modal";
import { LOCAL_API } from "@/lib/api-config";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from "recharts";

export default function FacilityWoundReport() {
  const { getAuthInfo, getSelectedFacility, getToken, getEmail } = useAuth();
  const { isComponentEnabled } = useSettings();
  const { startDate, endDate, setStartDate, setEndDate, startDateStr, endDateStr } = useReportDateRange();
  const authInfo = getAuthInfo();
  const token = getToken();
  const email = getEmail();

  // Check if facility has wound encounter data
  const { hasData: facilityHasData, facilityName } = useFacilityHasData();

  // Use state for facilityId to support reactive updates
  const [facilityId, setFacilityId] = useState<string | null>(() => getSelectedFacility());
  const { data: enabledDates = [], isLoading: enabledDatesLoading } = useEnabledDates(facilityId);
  const [datesInitialized, setDatesInitialized] = useState(false);

  // Deteriorating wounds modal state
  const [deterioratingModalOpen, setDeterioratingModalOpen] = useState(false);

  // Wound activity modals state
  const [newWoundsModalOpen, setNewWoundsModalOpen] = useState(false);
  const [resolvedWoundsModalOpen, setResolvedWoundsModalOpen] = useState(false);
  const [activeWoundsModalOpen, setActiveWoundsModalOpen] = useState(false);
  const [chronicWoundsModalOpen, setChronicWoundsModalOpen] = useState(false);

  // Listen for facility changes
  useEffect(() => {
    const unsubscribe = onAuthEvent(AUTH_EVENTS.FACILITY_CHANGED, (newFacilityId: string) => {
      console.log('[FacilityWoundReport] 🔄 Facility changed:', newFacilityId);
      setFacilityId(newFacilityId);
      setDatesInitialized(false); // Reset dates initialization when facility changes
    });
    return unsubscribe;
  }, []);

  // Set default dates based on enabledDates (both start and end = most recent encounter)
  useEffect(() => {
    if (!enabledDatesLoading && enabledDates && enabledDates.length > 0 && !datesInitialized) {
      // Get last (most recent) enabled date
      const lastDateStr = enabledDates[enabledDates.length - 1]; // Most recent date

      // Parse date
      const [endYear, endMonth, endDay] = lastDateStr.split('-').map(Number);
      const lastDate = new Date(endYear, endMonth - 1, endDay);

      console.log('[FacilityWoundReport] Setting date range to most recent:', lastDateStr);

      setStartDate(lastDate);
      setEndDate(lastDate);
      setDatesInitialized(true);
    }
  }, [enabledDates, enabledDatesLoading, datesInitialized, setStartDate, setEndDate]);

  // Calculate first and last encounter dates for display
  const { firstEncounterDate, lastEncounterDate } = useMemo(() => {
    if (enabledDates && enabledDates.length > 0) {
      const sorted = [...enabledDates].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      const parseDate = (dateStr: string) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
      };
      return {
        firstEncounterDate: parseDate(sorted[0]),
        lastEncounterDate: parseDate(sorted[sorted.length - 1])
      };
    }
    return { firstEncounterDate: undefined, lastEncounterDate: undefined };
  }, [enabledDates]);

  console.log('[FacilityWoundReport] authInfo:', authInfo);
  console.log('[FacilityWoundReport] facilityId:', facilityId);
  console.log('[FacilityWoundReport] token present:', !!token);
  console.log('[FacilityWoundReport] email:', email);
  console.log('[FacilityWoundReport] Date range:', startDateStr, 'to', endDateStr);

  // If no facilityId, show error - shouldn't happen if auth is working
  if (!facilityId) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Error</AlertTitle>
          <AlertDescription>
            Missing facility information. Please log in again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const [dataSource, setDataSource] = useState<'backend' | 'mock'>('mock');

  // Deteriorating wounds data
  const { data: deterioratingData, isLoading: deterioratingLoading, refetch: refetchDeteriorating } = useDeterioratingWounds(
    facilityId,
    startDateStr,
    endDateStr
  );

  // Wound activity data
  const { data: newWoundsData, isLoading: newWoundsLoading, refetch: refetchNewWounds } = useNewWounds(
    facilityId,
    startDateStr,
    endDateStr
  );
  const { data: resolvedWoundsData, isLoading: resolvedWoundsLoading, refetch: refetchResolvedWounds } = useResolvedWounds(
    facilityId,
    startDateStr,
    endDateStr
  );
  const { data: activeWoundsData, isLoading: activeWoundsLoading, refetch: refetchActiveWounds } = useActiveWounds(
    facilityId,
    startDateStr,
    endDateStr
  );
  const { data: chronicWoundsData, isLoading: chronicWoundsLoading, refetch: refetchChronicWounds } = useChronicWounds(
    facilityId,
    startDateStr,
    endDateStr
  );

  // Facility Acuity Index query
  // Determine acuity trend calculation mode from settings
  const acuityTrend4WeeksEnabled = isComponentEnabled('facility-report', 'acuity-trend-4weeks');
  const acuityTrendDateRangeEnabled = isComponentEnabled('facility-report', 'acuity-trend-daterange');
  // Default to 4-weeks mode if neither is explicitly enabled or both are enabled
  const useAcuityDateRangeMode = acuityTrendDateRangeEnabled && !acuityTrend4WeeksEnabled;

  // Query for 4-weeks mode (default): uses endDate and calculates 4 weeks back
  const { data: acuityIndexData4Weeks, isLoading: acuityIndexLoading4Weeks } = useQuery({
    queryKey: ['facilityAcuityIndex4Weeks', facilityId, endDateStr],
    queryFn: async () => {
      const response = await fetch(LOCAL_API.FACILITY_ACUITY_INDEX, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Facility-Id": facilityId || '',
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          facilityId: facilityId,
          dos: endDateStr
        })
      });
      if (!response.ok) throw new Error(`Failed to fetch acuity index: ${response.statusText}`);
      const result = await response.json();
      if (result.status === false) throw new Error(result.error || "Failed to fetch acuity data");
      const data = result.data || result;
      return Array.isArray(data) ? data : [data];
    },
    enabled: !!facilityId && !!endDateStr && !useAcuityDateRangeMode
  });

  // Query for date-range mode: uses startDate to endDate interval
  const { data: acuityIndexDataRange, isLoading: acuityIndexLoadingRange } = useQuery({
    queryKey: ['facilityAcuityIndexRange', facilityId, startDateStr, endDateStr],
    queryFn: async () => {
      const response = await fetch(LOCAL_API.FACILITY_ACUITY_INDEX, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Facility-Id": facilityId || '',
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          facilityId: facilityId,
          startDate: startDateStr,
          endDate: endDateStr
        })
      });
      if (!response.ok) throw new Error(`Failed to fetch acuity index: ${response.statusText}`);
      const result = await response.json();
      if (result.status === false) throw new Error(result.error || "Failed to fetch acuity data");
      const data = result.data || result;
      return Array.isArray(data) ? data : [data];
    },
    enabled: !!facilityId && !!startDateStr && !!endDateStr && useAcuityDateRangeMode
  });

  // Select the appropriate data based on mode
  const acuityIndexData = useAcuityDateRangeMode ? acuityIndexDataRange : acuityIndexData4Weeks;
  const acuityIndexLoading = useAcuityDateRangeMode ? acuityIndexLoadingRange : acuityIndexLoading4Weeks;

  // Calculate current acuity index from data (use latest entry with valid data)
  const currentAcuityIndex = useMemo(() => {
    if (!acuityIndexData || !Array.isArray(acuityIndexData) || acuityIndexData.length === 0) return null;
    // Find the last entry that has a valid Facility Acuity Index
    for (let i = acuityIndexData.length - 1; i >= 0; i--) {
      const item = acuityIndexData[i];
      if (item?.["Facility Acuity Index"] != null && item["Facility Acuity Index"] !== '') {
        return parseFloat(item["Facility Acuity Index"]);
      }
    }
    return null;
  }, [acuityIndexData]);

  // Process acuity trend data for chart
  const acuityTrendData = useMemo(() => {
    if (!acuityIndexData || !Array.isArray(acuityIndexData) || acuityIndexData.length === 0) return [];

    // Calculate month for each week based on the reference date (endDate)
    const referenceDate = endDateStr ? new Date(endDateStr) : new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return acuityIndexData.map((item: any, idx: number) => {
      // Calculate approximate date for this week (4 weeks back from reference, oldest first)
      const weeksBack = acuityIndexData.length - 1 - idx;
      const weekDate = new Date(referenceDate);
      weekDate.setDate(weekDate.getDate() - (weeksBack * 7));
      const monthAbbr = months[weekDate.getMonth()];

      // Calculate week number within the month (1-5)
      const dayOfMonth = weekDate.getDate();
      const weekOfMonth = Math.ceil(dayOfMonth / 7);

      return {
        week: `W${weekOfMonth}/${monthAbbr}`,
        index: item["Facility Acuity Index"] ? parseFloat(item["Facility Acuity Index"]) : 0
      };
    });
  }, [acuityIndexData, endDateStr]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['facilityWoundReport', facilityId, startDateStr, endDateStr],
    queryFn: async () => {
      // Fetch wound outcome report directly from PHP API with date fallback
      const { fetchWithDateFallback } = await import("@/lib/date-fallback");

      const result = await fetchWithDateFallback({
        method: "rptFacilityWoundOutcome",
        facilityId,
        token,
        email: email || "facility-wound-report",
        deviceId: "facility-wound-report",
        startDate: startDateStr,
        endDate: endDateStr,
      });

      console.log('[FacilityWoundReport] Received response:', result);

      if (result.data?.data) {
        const dataArray = Array.isArray(result.data.data) ? result.data.data : [result.data.data];
        return dataArray;
      }

      return [];
    },
  });

  // Track data source based on response - use useEffect to properly update state
  useEffect(() => {
    if (!isLoading && !error && data) {
      // Data loaded successfully from backend
      setDataSource('backend');
    } else if (error) {
      // Error occurred, using mock
      setDataSource('mock');
    }
  }, [data, error, isLoading]);

  // Query for wound encounters to aggregate PUSH scores by date
  const { data: woundEncountersData } = useQuery({
    queryKey: ['woundEncountersPushScore', facilityId, startDateStr, endDateStr],
    queryFn: async () => {
      const url = LOCAL_API.FACILITIES_LIST;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Facility-Id": facilityId,
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      console.log('[FacilityWoundReport] Fetching PUSH score data for:', startDateStr, 'to', endDateStr);

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          entity: "FacilityDataCenter",
          method: "getReportsList",
          facilityId: facilityId,
          dosStart: startDateStr,
          dosEnd: endDateStr,
          email: email,
          token: token,
          deviceId: "web-client"
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch wound encounters`);
      }

      const result = await response.json();
      console.log('[FacilityWoundReport] PUSH score query result:', result);

      if (result.status === false) {
        throw new Error(result.error || "Failed to fetch wound encounters");
      }

      // getReportsList returns data grouped by patient, flatten the encounters
      const groupedData = result.data || [];
      const flatEncounters: any[] = [];

      if (Array.isArray(groupedData)) {
        groupedData.forEach((patient: any) => {
          if (patient.encounters && Array.isArray(patient.encounters)) {
            flatEncounters.push(...patient.encounters);
          }
        });
      }

      console.log('[FacilityWoundReport] Flattened encounters:', flatEncounters.length);
      return flatEncounters;
    },
    enabled: !!facilityId && !!token && !!startDateStr && !!endDateStr
  });

  // Process wound encounters to get average PUSH score by DOS
  const pushScoreByDate = useMemo(() => {
    if (!woundEncountersData || !Array.isArray(woundEncountersData) || woundEncountersData.length === 0) {
      return [];
    }

    // Group by DOS and calculate average PUSH score
    const groupedByDos: Record<string, { total: number; count: number }> = {};

    woundEncountersData.forEach((encounter: any) => {
      const dos = encounter.dos || encounter.DOS || encounter.date_of_service;
      const pushScore = parseFloat(encounter.push_score || encounter.PUSH_SCORE || encounter.pushScore || 0);

      if (dos && !isNaN(pushScore) && pushScore > 0) {
        const dateKey = typeof dos === 'string' ? dos.split('T')[0] : dos;

        if (!groupedByDos[dateKey]) {
          groupedByDos[dateKey] = { total: 0, count: 0 };
        }
        groupedByDos[dateKey].total += pushScore;
        groupedByDos[dateKey].count += 1;
      }
    });

    // Convert to array and calculate averages
    const result = Object.entries(groupedByDos)
      .map(([date, { total, count }]) => ({
        date,
        avgPushScore: Number((total / count).toFixed(2)),
        encounters: count
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return result;
  }, [woundEncountersData]);

  // Calculate trend
  const pushScoreTrend = useMemo(() => {
    if (pushScoreByDate.length < 2) return { direction: 'stable', change: 0 };

    const firstHalf = pushScoreByDate.slice(0, Math.floor(pushScoreByDate.length / 2));
    const secondHalf = pushScoreByDate.slice(Math.floor(pushScoreByDate.length / 2));

    const avgFirst = firstHalf.reduce((sum, d) => sum + d.avgPushScore, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((sum, d) => sum + d.avgPushScore, 0) / secondHalf.length;

    const change = avgSecond - avgFirst;

    return {
      direction: change < -0.5 ? 'improving' : change > 0.5 ? 'worsening' : 'stable',
      change: Number(change.toFixed(2))
    };
  }, [pushScoreByDate]);

  // Show NoFacilityData if the selected facility has no wound encounters
  if (!facilityHasData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Facility Wound Report</h1>
          <p className="text-muted-foreground mt-1">Operational metrics by Date of Service (DOS)</p>
        </div>
        <NoFacilityData facilityName={facilityName} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Facility Wound Report</h1>
            <p className="text-muted-foreground mt-1">Operational metrics by Date of Service (DOS)</p>
          </div>
          <div className="flex flex-col items-start gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              {isComponentEnabled('facility-report', 'filter-panel') && (
                <>
                  <DateRangePicker date={startDate} setDate={setStartDate} label="Start Date" enabledDates={enabledDates} />
                  <span className="text-muted-foreground">-</span>
                  <DateRangePicker date={endDate} setDate={setEndDate} label="End Date" enabledDates={enabledDates} />
                </>
              )}
              <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
                <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
              {isComponentEnabled('facility-report', 'export-options') && (
                <Button variant="default" className="ml-2">
                  <FileDown className="mr-2 h-4 w-4" />
                  Export
                </Button>
              )}
            </div>
            {/* Date Range Info */}
            {enabledDates.length > 0 && firstEncounterDate && lastEncounterDate && (
              <p className="text-xs text-muted-foreground mt-[5px]">
                Data available from {format(firstEncounterDate, 'MMM dd, yyyy')} to {format(lastEncounterDate, 'MMM dd, yyyy')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* <FacilityInfoBanner facilityId={facilityId} facilityName={facilityName} /> */}

      {isComponentEnabled('facility-report', 'data-table') && (
        <>
          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error fetching report</AlertTitle>
              <AlertDescription>
                {error instanceof Error ? error.message : "An unknown error occurred while loading the data."}
              </AlertDescription>
            </Alert>
          ) : isLoading ? (
            <EcgLoader title="Loading facility data..." minHeight="min-h-[400px]" />
          ) : !data || (Array.isArray(data) && data.length === 0) ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Data Available</AlertTitle>
              <AlertDescription>No wound encounters found for this facility.</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-6">
              {/* KPI Cards - Row 1 */}
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                {/* Avg Wound Reduction KPI */}
                {isComponentEnabled('facility-report', 'card-avg-wound-reduction') && (
                  <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Avg Wound Reduction</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {Array.isArray(data) && data.length > 0 && data[0]?.['Average Percentage Wound Area Reduction'] ? (
                        <div>
                          <div className="text-3xl font-bold text-blue-600">
                            {(parseFloat(data[0]['Average Percentage Wound Area Reduction']) * 100).toFixed(1)}%
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">Monthly area reduction</p>
                        </div>
                      ) : (
                        <div className="text-muted-foreground text-sm">No data available</div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Wounds Improving KPI */}
                {isComponentEnabled('facility-report', 'card-wounds-improving') && (
                  <Card className="border-l-4 border-l-green-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Wounds Improving</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {Array.isArray(data) && data.length > 0 && data[0]?.['Percent of Wounds Improving'] != null ? (
                        <div>
                          <div className="text-3xl font-bold text-green-600">
                            {Math.round(parseFloat(data[0]['Percent of Wounds Improving']) * (data[0]['Number of Active Wounds'] || 0))}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">Of {data[0]['Number of Active Wounds'] || 0} active wounds</p>
                        </div>
                      ) : (
                        <div className="text-muted-foreground text-sm">No data available</div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Wounds Deteriorating KPI */}
                {isComponentEnabled('facility-report', 'card-wounds-deteriorating') && (
                  <Card
                    className="border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => {
                      setDeterioratingModalOpen(true);
                      refetchDeteriorating();
                    }}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Wounds Deteriorating</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {Array.isArray(data) && data.length > 0 && data[0]?.['Percent of Wounds Deteriorating'] != null ? (
                        <div>
                          <div className="text-3xl font-bold text-red-600">
                            {Math.round(parseFloat(data[0]['Percent of Wounds Deteriorating']) * (data[0]['Number of Active Wounds'] || 0))}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">wounds with increased area</p>
                        </div>
                      ) : (
                        <div className="text-muted-foreground text-sm">No data available</div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Wounds Stable KPI */}
                {isComponentEnabled('facility-report', 'card-wounds-stable') && (
                  <Card className="border-l-4 border-l-yellow-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Wounds Stable</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {Array.isArray(data) && data.length > 0 && data[0]?.['Percent of Wounds Stable'] != null ? (
                        <div>
                          <div className="text-3xl font-bold text-yellow-600">
                            {Math.round(parseFloat(data[0]['Percent of Wounds Stable']) * (data[0]['Number of Active Wounds'] || 0))}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">Of {data[0]['Number of Active Wounds'] || 0} active wounds</p>
                        </div>
                      ) : (
                        <div className="text-muted-foreground text-sm">No data available</div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Facility Acuity Index KPI */}
                {isComponentEnabled('facility-report', 'card-acuity-index') && (
                  <Card className="border-l-4 border-l-purple-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Facility Acuity Index</CardTitle>
                      <Stethoscope className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                      {acuityIndexLoading ? (
                        <div className="text-muted-foreground text-sm">Loading...</div>
                      ) : currentAcuityIndex !== null ? (
                        <div>
                          <div className="text-3xl font-bold text-purple-600">
                            {currentAcuityIndex.toFixed(1)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">Wounds per patient</p>
                        </div>
                      ) : (
                        <div className="text-muted-foreground text-sm">No data available</div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Chronic Wounds KPI */}
                {isComponentEnabled('facility-report', 'card-chronic-wounds') && (
                  <Card
                    className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-950/20"
                    onClick={() => {
                      setChronicWoundsModalOpen(true);
                      refetchChronicWounds();
                    }}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Chronic Wounds</CardTitle>
                      <Clock className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-orange-600">
                        {chronicWoundsLoading ? '...' : chronicWoundsData?.total_wounds ?? 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">wounds older than 100 days</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Acuity Index Trend Chart */}
              {isComponentEnabled('facility-report', 'chart-acuity-trend') && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div className="flex flex-col gap-0.5">
                      <CardTitle className="text-base">Acuity Index Trend</CardTitle>
                      <CardDescription className="text-xs">
                        {useAcuityDateRangeMode
                          ? `Date range: ${startDateStr} to ${endDateStr}`
                          : `4 weeks back from ${endDateStr}`
                        } (Data points: {acuityTrendData.length})
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {acuityIndexLoading && <RefreshCcw className="h-3 w-3 animate-spin text-muted-foreground" />}
                      <DataSourceBadge source={dataSource} showLabel={false} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className={cn("h-[280px] w-full transition-opacity duration-300", acuityIndexLoading && "opacity-60")}>
                      {acuityTrendData.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          No trend data available
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={acuityTrendData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis
                              dataKey="week"
                              stroke="hsl(var(--muted-foreground))"
                              fontSize={11}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis
                              domain={['auto', 'auto']}
                              stroke="hsl(var(--muted-foreground))"
                              fontSize={11}
                              tickLine={false}
                              axisLine={false}
                            />
                            <Tooltip
                              contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                            />
                            <Line
                              type="monotone"
                              dataKey="index"
                              stroke="hsl(var(--primary))"
                              strokeWidth={2}
                              dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "hsl(var(--background))" }}
                              activeDot={{ r: 6 }}
                              isAnimationActive={true}
                              animationDuration={600}
                              animationEasing="ease-in-out"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Data Tables - Row 2 (3 columns) */}
              <div className="grid gap-4 lg:grid-cols-3">
                {/* Wound Activity Metrics Card */}
                {isComponentEnabled('facility-report', 'card-wound-activity') && (
                  <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                      <CardTitle className="text-base">Wound Activity Metrics</CardTitle>
                      <DataSourceBadge source={dataSource} showLabel={false} />
                    </CardHeader>
                    <CardContent>
                      {Array.isArray(data) && data.length > 0 ? (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center border-b pb-1.5">
                            <span className="text-xs text-muted-foreground">New Wounds (%)</span>
                            <span className="text-sm font-semibold">{data[0]['New Wounds (%)'] ? parseFloat(data[0]['New Wounds (%)']).toFixed(1) : 0}%</span>
                          </div>
                          <div className="flex justify-between items-center border-b pb-1.5">
                            <span className="text-xs text-muted-foreground">Resolution Rate (%)</span>
                            <span className="text-sm font-semibold">{data[0]['Resolution Rate (%)'] ? parseFloat(data[0]['Resolution Rate (%)']).toFixed(1) : 0}%</span>
                          </div>
                          <div
                            className="flex justify-between items-center border-b pb-1.5 cursor-pointer hover:bg-muted/50 rounded-md px-1 -mx-1 transition-colors"
                            onClick={() => { setNewWoundsModalOpen(true); refetchNewWounds(); }}
                          >
                            <span className="text-xs text-muted-foreground">Number of New Wounds</span>
                            <span className="text-sm font-semibold text-blue-600 hover:text-blue-700">{data[0]['Number of New Wounds'] ?? 0}</span>
                          </div>
                          <div
                            className="flex justify-between items-center border-b pb-1.5 cursor-pointer hover:bg-muted/50 rounded-md px-1 -mx-1 transition-colors"
                            onClick={() => { setResolvedWoundsModalOpen(true); refetchResolvedWounds(); }}
                          >
                            <span className="text-xs text-muted-foreground">Number of Resolved Wounds</span>
                            <span className="text-sm font-semibold text-green-600 hover:text-green-700">{data[0]['Number of Resolved Wounds'] ?? 0}</span>
                          </div>
                          <div
                            className="flex justify-between items-center border-b pb-1.5 cursor-pointer hover:bg-muted/50 rounded-md px-1 -mx-1 transition-colors"
                            onClick={() => { setActiveWoundsModalOpen(true); refetchActiveWounds(); }}
                          >
                            <span className="text-xs text-muted-foreground">Number of Active Wounds</span>
                            <span className="text-sm font-semibold text-amber-600 hover:text-amber-700">{data[0]['Number of Active Wounds'] ?? 0}</span>
                          </div>
                          <div
                            className="flex justify-between items-center cursor-pointer hover:bg-muted/50 rounded-md px-1 -mx-1 transition-colors"
                            onClick={() => { setChronicWoundsModalOpen(true); refetchChronicWounds(); }}
                          >
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3 text-orange-500" />
                              Chronic Wounds (Older than 100 Days)
                            </span>
                            <span className="text-sm font-semibold text-orange-600 hover:text-orange-700">{chronicWoundsData?.total_wounds ?? data[0]['Wounds > 100 Days'] ?? 0}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">No data available</p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Average Healing Times Card */}
                {isComponentEnabled('facility-report', 'card-healing-times') && (
                  <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                      <CardTitle className="text-base">Average Healing Times (Days)</CardTitle>
                      <DataSourceBadge source={dataSource} showLabel={false} />
                    </CardHeader>
                    <CardContent>
                      {Array.isArray(data) && data.length > 0 ? (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center border-b pb-1.5">
                            <span className="text-xs text-muted-foreground">All Wounds</span>
                            <span className="text-sm font-semibold">{data[0]['Average Healing Days - All'] != null ? parseFloat(data[0]['Average Healing Days - All']).toFixed(2) : '-'}</span>
                          </div>
                          <div className="flex justify-between items-center border-b pb-1.5">
                            <span className="text-xs text-muted-foreground">Arterial</span>
                            <span className="text-sm font-semibold">{data[0]['Average Healing Days - Arterial'] != null ? parseFloat(data[0]['Average Healing Days - Arterial']).toFixed(2) : '-'}</span>
                          </div>
                          <div className="flex justify-between items-center border-b pb-1.5">
                            <span className="text-xs text-muted-foreground">Venous</span>
                            <span className="text-sm font-semibold">{data[0]['Average Healing Days - Venous'] != null ? parseFloat(data[0]['Average Healing Days - Venous']).toFixed(2) : '-'}</span>
                          </div>
                          <div className="flex justify-between items-center border-b pb-1.5">
                            <span className="text-xs text-muted-foreground">Diabetic</span>
                            <span className="text-sm font-semibold">{data[0]['Average Healing Days - Diabetic'] != null ? parseFloat(data[0]['Average Healing Days - Diabetic']).toFixed(2) : '-'}</span>
                          </div>
                          <div className="flex justify-between items-center border-b pb-1.5">
                            <span className="text-xs text-muted-foreground">Pressure I/II</span>
                            <span className="text-sm font-semibold">{data[0]['Average Healing Days - Pressure Ulcer Stage I'] != null ? parseFloat(data[0]['Average Healing Days - Pressure Ulcer Stage I']).toFixed(2) : '-'} / {data[0]['Average Healing Days - Pressure Ulcer Stage II'] != null ? parseFloat(data[0]['Average Healing Days - Pressure Ulcer Stage II']).toFixed(2) : '-'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Pressure III/IV</span>
                            <span className="text-sm font-semibold">{data[0]['Average Healing Days - Pressure Ulcer Stage III'] != null ? parseFloat(data[0]['Average Healing Days - Pressure Ulcer Stage III']).toFixed(2) : '-'} / {data[0]['Average Healing Days - Pressure Ulcer Stage IV'] != null ? parseFloat(data[0]['Average Healing Days - Pressure Ulcer Stage IV']).toFixed(2) : '-'}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">No data available</p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Patient & Acuity Metrics Card */}
                {isComponentEnabled('facility-report', 'card-patient-acuity') && (
                  <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                      <CardTitle className="text-base">Patient & Acuity Metrics</CardTitle>
                      <DataSourceBadge source={dataSource} showLabel={false} />
                    </CardHeader>
                    <CardContent>
                      {Array.isArray(data) && data.length > 0 ? (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center border-b pb-1.5">
                            <span className="text-xs text-muted-foreground">Wounds</span>
                            <span className="text-sm font-semibold">{activeWoundsData?.total_wounds ?? 0}</span>
                          </div>
                          <div className="flex justify-between items-center border-b pb-1.5">
                            <span className="text-xs text-muted-foreground">Avg PUSH Score</span>
                            <span className="text-sm font-semibold">{data[0]['average_push_score'] ? parseFloat(data[0]['average_push_score']).toFixed(2) : 0}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Acuity Level</span>
                            <span className="text-sm font-semibold text-orange-600">{data[0]['acuity_level'] ?? 'N/A'}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">No data available</p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* PUSH Score Over Time Chart - Row 3 (only show if date range spans multiple days) */}
              {startDateStr !== endDateStr && isComponentEnabled('facility-report', 'chart-push-score') && (
                <Card className="shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        Change in PUSH Score Over Time
                        {pushScoreTrend.direction === 'improving' && (
                          <span className="flex items-center text-sm font-normal text-green-600">
                            <TrendingDown className="h-4 w-4 mr-1" />
                            Improving ({pushScoreTrend.change})
                          </span>
                        )}
                        {pushScoreTrend.direction === 'worsening' && (
                          <span className="flex items-center text-sm font-normal text-red-600">
                            <TrendingUp className="h-4 w-4 mr-1" />
                            Worsening (+{pushScoreTrend.change})
                          </span>
                        )}
                        {pushScoreTrend.direction === 'stable' && (
                          <span className="flex items-center text-sm font-normal text-gray-500">
                            Stable
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription>
                        Average PUSH score across all wounds by date of service
                      </CardDescription>
                    </div>
                    <DataSourceBadge source={dataSource} showLabel={false} />
                  </CardHeader>
                  <CardContent>
                    {pushScoreByDate.length > 0 ? (
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={pushScoreByDate}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="pushScoreGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#f97316" stopOpacity={0.1} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                              dataKey="date"
                              tickFormatter={(value) => {
                                try {
                                  const date = new Date(value);
                                  return format(date, 'MM/dd');
                                } catch {
                                  return value;
                                }
                              }}
                              className="text-xs fill-muted-foreground"
                            />
                            <YAxis
                              domain={[0, 17]}
                              tickCount={6}
                              className="text-xs fill-muted-foreground"
                              label={{ value: 'PUSH Score', angle: -90, position: 'insideLeft', className: 'fill-muted-foreground text-xs' }}
                            />
                            <Tooltip
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-background border rounded-lg shadow-lg p-3">
                                      <p className="font-medium">{label}</p>
                                      <p className="text-orange-600">
                                        Avg PUSH Score: <span className="font-bold">{payload[0].value}</span>
                                      </p>
                                      <p className="text-muted-foreground text-sm">
                                        Encounters: {payload[0].payload.encounters}
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <ReferenceLine y={6} stroke="#22c55e" strokeDasharray="5 5" label={{ value: 'Low', position: 'right', className: 'fill-green-600 text-xs' }} />
                            <ReferenceLine y={12} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'High', position: 'right', className: 'fill-red-600 text-xs' }} />
                            <Area
                              type="monotone"
                              dataKey="avgPushScore"
                              stroke="#f97316"
                              strokeWidth={2}
                              fill="url(#pushScoreGradient)"
                              dot={{ fill: '#f97316', strokeWidth: 2, r: 4 }}
                              activeDot={{ r: 6, stroke: '#f97316', strokeWidth: 2 }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        No PUSH score data available for the selected period
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}

      {/* Deteriorating Wounds Modal */}
      <DeterioratingWoundsModal
        deterioratingPatients={deterioratingData?.data || []}
        totalWounds={deterioratingData?.total_wounds || 0}
        totalPatients={deterioratingData?.total_patients || 0}
        facilityId={facilityId || ''}
        isLoading={deterioratingLoading}
        open={deterioratingModalOpen}
        onOpenChange={setDeterioratingModalOpen}
        onRefetch={refetchDeteriorating}
        startDate={startDateStr}
        endDate={endDateStr}
      />

      {/* New Wounds Modal */}
      <WoundActivityModal
        type="new"
        patients={newWoundsData?.data || []}
        totalWounds={newWoundsData?.total_wounds || 0}
        totalPatients={newWoundsData?.total_patients || 0}
        facilityId={facilityId || ''}
        isLoading={newWoundsLoading}
        open={newWoundsModalOpen}
        onOpenChange={setNewWoundsModalOpen}
        onRefetch={refetchNewWounds}
        startDate={startDateStr}
        endDate={endDateStr}
      />

      {/* Resolved Wounds Modal */}
      <WoundActivityModal
        type="resolved"
        patients={resolvedWoundsData?.data || []}
        totalWounds={resolvedWoundsData?.total_wounds || 0}
        totalPatients={resolvedWoundsData?.total_patients || 0}
        facilityId={facilityId || ''}
        isLoading={resolvedWoundsLoading}
        open={resolvedWoundsModalOpen}
        onOpenChange={setResolvedWoundsModalOpen}
        onRefetch={refetchResolvedWounds}
        startDate={startDateStr}
        endDate={endDateStr}
      />

      {/* Active Wounds Modal */}
      <WoundActivityModal
        type="active"
        patients={activeWoundsData?.data || []}
        totalWounds={activeWoundsData?.total_wounds || 0}
        totalPatients={activeWoundsData?.total_patients || 0}
        facilityId={facilityId || ''}
        isLoading={activeWoundsLoading}
        open={activeWoundsModalOpen}
        onOpenChange={setActiveWoundsModalOpen}
        onRefetch={refetchActiveWounds}
        startDate={startDateStr}
        endDate={endDateStr}
      />

      {/* Chronic Wounds Modal */}
      <WoundActivityModal
        type="chronic"
        patients={chronicWoundsData?.data || []}
        totalWounds={chronicWoundsData?.total_wounds || 0}
        totalPatients={chronicWoundsData?.total_patients || 0}
        facilityId={facilityId || ''}
        isLoading={chronicWoundsLoading}
        open={chronicWoundsModalOpen}
        onOpenChange={setChronicWoundsModalOpen}
        onRefetch={refetchChronicWounds}
        startDate={startDateStr}
        endDate={endDateStr}
      />
    </div>
  );
}

function DateRangePicker({ date, setDate, label, enabledDates }: { date: Date | undefined, setDate: (d: Date | undefined) => void, label: string, enabledDates?: string[] }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[228px] justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>{label}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[288px] p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
          defaultMonth={date}
          enabledDates={enabledDates}
          className="w-full"
        />
      </PopoverContent>
    </Popover>
  )
}
