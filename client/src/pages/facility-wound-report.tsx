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
import { DateRangePicker } from "./facility-wound-report.date-range-picker";
import { WoundReportKPIs } from "./facility-wound-report.kpis";
import { AcuityTrendChart } from "./facility-wound-report.acuity-chart";
import { PushScoreChart } from "./facility-wound-report.push-chart";
import { WoundReportDataTables } from "./facility-wound-report.data-tables";
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
import { logger } from "@/lib/logger";

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
      logger.debug('[FacilityWoundReport] 🔄 Facility changed:', newFacilityId);
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

      logger.debug('[FacilityWoundReport] Setting date range to most recent:', lastDateStr);

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

  logger.debug('[FacilityWoundReport] authInfo:', authInfo);
  logger.debug('[FacilityWoundReport] facilityId:', facilityId);
  logger.debug('[FacilityWoundReport] token present:', !!token);
  logger.debug('[FacilityWoundReport] email:', email);
  logger.debug('[FacilityWoundReport] Date range:', startDateStr, 'to', endDateStr);

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

      logger.debug('[FacilityWoundReport] Received response:', result);

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

      logger.debug('[FacilityWoundReport] Fetching PUSH score data for:', startDateStr, 'to', endDateStr);

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
      logger.debug('[FacilityWoundReport] PUSH score query result:', result);

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

      logger.debug('[FacilityWoundReport] Flattened encounters:', flatEncounters.length);
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
              <WoundReportKPIs
                isComponentEnabled={isComponentEnabled}
                data={data}
                setDeterioratingModalOpen={setDeterioratingModalOpen}
                refetchDeteriorating={refetchDeteriorating}
                acuityIndexLoading={acuityIndexLoading}
                currentAcuityIndex={currentAcuityIndex}
                setChronicWoundsModalOpen={setChronicWoundsModalOpen}
                refetchChronicWounds={refetchChronicWounds}
                chronicWoundsLoading={chronicWoundsLoading}
                chronicWoundsData={chronicWoundsData}
              />

              {/* Acuity Index Trend Chart */}
              {isComponentEnabled('facility-report', 'chart-acuity-trend') && (
                <AcuityTrendChart
                  useAcuityDateRangeMode={useAcuityDateRangeMode}
                  startDateStr={startDateStr}
                  endDateStr={endDateStr}
                  acuityTrendData={acuityTrendData}
                  acuityIndexLoading={acuityIndexLoading}
                  dataSource={dataSource}
                />
              )}

              {/* Data Tables - Row 2 (3 columns) */}
              <WoundReportDataTables
                isComponentEnabled={isComponentEnabled}
                dataSource={dataSource}
                data={data}
                setNewWoundsModalOpen={setNewWoundsModalOpen}
                refetchNewWounds={refetchNewWounds}
                setResolvedWoundsModalOpen={setResolvedWoundsModalOpen}
                refetchResolvedWounds={refetchResolvedWounds}
                setActiveWoundsModalOpen={setActiveWoundsModalOpen}
                refetchActiveWounds={refetchActiveWounds}
                setChronicWoundsModalOpen={setChronicWoundsModalOpen}
                refetchChronicWounds={refetchChronicWounds}
                chronicWoundsData={chronicWoundsData}
                activeWoundsData={activeWoundsData}
              />

              {/* PUSH Score Over Time Chart - Row 3 (only show if date range spans multiple days) */}
              {startDateStr !== endDateStr && isComponentEnabled('facility-report', 'chart-push-score') && (
                <PushScoreChart
                  pushScoreTrend={pushScoreTrend}
                  dataSource={dataSource}
                  pushScoreByDate={pushScoreByDate}
                />
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
