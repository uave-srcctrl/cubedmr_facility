import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, subMonths } from "date-fns";
import { Calendar as CalendarIcon, FileDown, AlertCircle, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { useReportDateRange } from "@/hooks/use-report-date-range";
import { useEnabledDates } from "@/hooks/use-enabled-dates";
import { onAuthEvent, AUTH_EVENTS } from "@/lib/auth-events";
import { FacilityInfoBanner } from "@/components/facility-info-banner";
import { NoFacilityData } from "@/components/no-facility-data";
import { DataSourceBadge } from "@/components/data-source-badge";
import { useFacilityHasData } from "@/hooks/use-facility-has-data";
import { EcgLoader } from "@/components/ecg-loader";
import { REMOTE_API, getFacilityId } from "@/lib/api-config";
import { normalizeFieldNames } from "@/lib/field-mapper";
import { logger } from "@/lib/logger";

export default function OutcomeReportGlobal() {
  const { getAuthInfo, getSelectedFacility } = useAuth();
  const { isComponentEnabled } = useSettings();
  const { startDate, endDate, setStartDate, setEndDate, startDateStr, endDateStr } = useReportDateRange();
  const authInfo = getAuthInfo();
  
  // Check if facility has wound encounter data
  const { hasData: facilityHasData, facilityName } = useFacilityHasData();
  
  // Use state for facilityId to support reactive updates
  const [facilityId, setFacilityId] = useState<string | null>(() => {
    // First try getSelectedFacility, then fallback to getFacilityId
    const selected = getSelectedFacility();
    return selected || getFacilityId(authInfo.entityId);
  });
  const { data: enabledDates = [], isLoading: enabledDatesLoading } = useEnabledDates(facilityId);
  const [datesInitialized, setDatesInitialized] = useState(false);
  
  // Listen for facility changes
  useEffect(() => {
    const unsubscribe = onAuthEvent(AUTH_EVENTS.FACILITY_CHANGED, (newFacilityId: string) => {
      logger.debug('[OutcomeReport] 🔄 Facility changed:', newFacilityId);
      setFacilityId(newFacilityId);
      setDatesInitialized(false); // Reset dates initialization when facility changes
    });
    return unsubscribe;
  }, []);

  // Calculate first and last encounter dates from enabledDates
  const { firstEncounterDate, lastEncounterDate } = useMemo(() => {
    if (enabledDates && enabledDates.length > 0) {
      const firstDateStr = enabledDates[0];
      const lastDateStr = enabledDates[enabledDates.length - 1];
      
      const [startYear, startMonth, startDay] = firstDateStr.split('-').map(Number);
      const [endYear, endMonth, endDay] = lastDateStr.split('-').map(Number);
      
      return {
        firstEncounterDate: new Date(startYear, startMonth - 1, startDay),
        lastEncounterDate: new Date(endYear, endMonth - 1, endDay)
      };
    }
    return { firstEncounterDate: undefined, lastEncounterDate: undefined };
  }, [enabledDates]);

  // Set initial dates from enabledDates (both start and end = most recent encounter)
  useEffect(() => {
    if (!enabledDatesLoading && lastEncounterDate && !datesInitialized) {
      logger.debug('[OutcomeReport] Setting date range to most recent:', lastEncounterDate);
      setStartDate(lastEncounterDate);
      setEndDate(lastEncounterDate);
      setDatesInitialized(true);
    }
  }, [enabledDates, enabledDatesLoading, firstEncounterDate, lastEncounterDate, datesInitialized, setStartDate, setEndDate]);
  
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

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['outcomeReportGlobal', startDateStr, endDateStr, facilityId],
    queryFn: async () => {
      const url = REMOTE_API.OUTCOME_REPORT_GLOBAL(facilityId, startDateStr, endDateStr);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      const result = await response.json();
      // Handle if result is wrapped in array or object
      let data;
      if (Array.isArray(result) && result.length > 0) {
        data = result[0];
      } else if (result.data && Array.isArray(result.data) && result.data.length > 0) {
        data = result.data[0];
      } else if (result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
        data = result.data;
      } else {
        data = result;
      }
      // Normalize field names from backend format
      return normalizeFieldNames(data);
    },
  });
  
  // Track data source based on response - use useEffect to properly update state
  useEffect(() => {
    if (!isLoading && !error && data && typeof data === 'object' && Object.keys(data).length > 0) {
      // Data loaded successfully from backend
      setDataSource('backend');
    } else if (error) {
      // Error occurred, using mock
      setDataSource('mock');
    }
  }, [data, error, isLoading]);
  
  // Fallback to empty object if data is null/undefined to avoid crashes, 
  // but we will handle loading/error states separately.
  const reportData = data || {};

  // Show NoFacilityData if the selected facility has no wound encounters
  if (!facilityHasData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Outcome Report Global</h1>
          <p className="text-muted-foreground mt-1">Comprehensive clinical outcomes over a selected period</p>
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
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Outcome Report Global</h1>
            <p className="text-muted-foreground mt-1">Comprehensive clinical outcomes over a selected period</p>
          </div>
          <div className="flex flex-col items-start gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              {isComponentEnabled('outcome-report', 'timeline') && (
              <>
              <DateRangePicker date={startDate} setDate={setStartDate} label="Start Date" enabledDates={enabledDates} />
              <span className="text-muted-foreground">-</span>
              <DateRangePicker date={endDate} setDate={setEndDate} label="End Date" enabledDates={enabledDates} />
              </>
              )}
              <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
                <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
              <Button variant="default" className="ml-2">
                <FileDown className="mr-2 h-4 w-4" />
                Export
              </Button>
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

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error fetching report</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "An unknown error occurred while loading the data."}
          </AlertDescription>
        </Alert>
      ) : isLoading ? (
        <EcgLoader title="Loading outcome data..." minHeight="min-h-[400px]" />
      ) : !data ? (
         <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Data</AlertTitle>
          <AlertDescription>Please select a valid date range to view the report.</AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Primary Outcomes */}
          {isComponentEnabled('outcome-report', 'statistics') && (
          <div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Overall Resolution Rate" value={`${(Number(reportData.overallResolutionRate) * 100).toFixed(2)}%`} trend="positive" source={dataSource} />
              <StatCard title="Active Healing Rate" value={`${(Number(reportData.activeHealingRate) * 100).toFixed(2)}%`} trend="positive" source={dataSource} />
              <StatCard title="Avg Healing Rate / Week" value={`${(Number(reportData.avgHealingRate) * 100).toFixed(2)}%`} source={dataSource} />
              <StatCard title="Hospitalization Rate" value={reportData.currentHospitalizationRate ? `${(Number(reportData.currentHospitalizationRate) * 100).toFixed(2)}%` : "--"} trend="negative" source={dataSource} />
            </div>
          </div>
          )}

          {isComponentEnabled('outcome-report', 'comparisons') && (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {/* Status Breakdown */}
            <Card className="col-span-1 relative">
              <CardHeader>
                <CardTitle>Wound Status Distribution</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <MetricRow label="Improving" value={`${(Number(reportData.improving) * 100).toFixed(2)}%`} color="text-emerald-600" />
                <MetricRow label="Stable" value={`${(Number(reportData.stable) * 100).toFixed(2)}%`} />
                <MetricRow label="Deteriorating" value={`${(Number(reportData.deteriorating) * 100).toFixed(2)}%`} color="text-destructive" />
                <MetricRow label="New Wounds" value={reportData.newWounds || 0} />
                <MetricRow label="Resolved Wounds" value={reportData.resolvedWounds || 0} />
              </CardContent>
              <div className="absolute top-4 right-4">
                <DataSourceBadge source={dataSource} showLabel={false} />
              </div>
            </Card>

            {/* Critical Metrics */}
            <Card className="col-span-1 md:col-span-2 lg:col-span-3 relative">
              <CardHeader>
                <CardTitle>Critical Indicators</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <MetricRow label="All Time Hospitalization Rate" value={`${Number(reportData.allTimeHospitalizationRate) || 0}%`} />
                <MetricRow label="Wounds > 100 Days" value={reportData.woundsOver100Days || 0} highlight />
                <MetricRow label="% Wounds Not Debrided" value={`${(Number(reportData.notDebridedPct) * 100).toFixed(2) || 0}%`} />
              </CardContent>
              <div className="absolute top-4 right-4">
                <DataSourceBadge source={dataSource} showLabel={false} />
              </div>
            </Card>
          </div>
          )}
        </>
      )}
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
                enabledDates={enabledDates}
                className="w-full"
              />
            </PopoverContent>
          </Popover>
    )
}

function StatCard({ title, value, trend, source }: { title: string, value: string | number, trend?: 'positive' | 'negative' | 'neutral', source?: 'backend' | 'mock' }) {
  return (
    <Card className="relative">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", 
          trend === 'positive' ? "text-emerald-600" : 
          trend === 'negative' ? "text-destructive" : "text-foreground"
        )}>
          {value}
        </div>
      </CardContent>
      {source && (
        <div className="absolute bottom-4 right-4">
          <DataSourceBadge source={source} showLabel={false} />
        </div>
      )}
    </Card>
  );
}

function MetricRow({ label, value, highlight, color }: { label: string, value: string | number, highlight?: boolean, color?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-bold", highlight && "text-destructive", color)}>{value}</span>
    </div>
  );
}
