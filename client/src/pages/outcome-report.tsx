import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, subMonths } from "date-fns";
import { Calendar as CalendarIcon, FileDown, Loader2, AlertCircle, RefreshCcw } from "lucide-react";
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
import { FacilityInfoBanner } from "@/components/facility-info-banner";
import { DataSourceBadge } from "@/components/data-source-badge";
import { REMOTE_API, getFacilityId } from "@/lib/api-config";
import { normalizeFieldNames } from "@/lib/field-mapper";

export default function OutcomeReportGlobal() {
  const { getAuthInfo } = useAuth();
  const authInfo = getAuthInfo();
  const facilityId = getFacilityId(authInfo.entityId);
  
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

  const facilityName = authInfo.entityName || authInfo.email?.split('@')[0] || "Facility";
  
  const [startDate, setStartDate] = useState<Date | undefined>(subMonths(new Date(), 12));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [dataSource, setDataSource] = useState<'backend' | 'mock'>('mock');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['outcomeReportGlobal', startDate ? format(startDate, 'yyyy-MM-dd') : null, endDate ? format(endDate, 'yyyy-MM-dd') : null, facilityId],
    queryFn: async () => {
      if (!startDate || !endDate) return null;

      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      const url = REMOTE_API.OUTCOME_REPORT_GLOBAL(facilityId, formattedStartDate, formattedEndDate);

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
    enabled: !!startDate && !!endDate,
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

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Outcome Report Global</h1>
            <p className="text-muted-foreground mt-1">Comprehensive clinical outcomes over a selected period</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <DateRangePicker date={startDate} setDate={setStartDate} label="Start Date" />
            <span className="text-muted-foreground">-</span>
            <DateRangePicker date={endDate} setDate={setEndDate} label="End Date" />
            <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
            <Button variant="default" className="ml-2">
              <FileDown className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </div>

      <FacilityInfoBanner facilityId={facilityId} facilityName={facilityName} />

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error fetching report</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "An unknown error occurred while loading the data."}
          </AlertDescription>
        </Alert>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center h-[400px] space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading outcome data...</p>
        </div>
      ) : !data ? (
         <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Data</AlertTitle>
          <AlertDescription>Please select a valid date range to view the report.</AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Primary Outcomes */}
          <div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Overall Resolution Rate" value={`${(Number(reportData.overallResolutionRate) * 100).toFixed(2)}%`} trend="positive" source={dataSource} />
              <StatCard title="Active Healing Rate" value={`${(Number(reportData.activeHealingRate) * 100).toFixed(2)}%`} trend="positive" source={dataSource} />
              <StatCard title="Avg Healing Rate / Week" value={`${(Number(reportData.avgHealingRate) * 100).toFixed(2)}%`} source={dataSource} />
              <StatCard title="Hospitalization Rate" value={reportData.currentHospitalizationRate ? `${(Number(reportData.currentHospitalizationRate) * 100).toFixed(2)}%` : "--"} trend="negative" source={dataSource} />
            </div>
          </div>

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

            {/* Healing Times */}
            <Card className="col-span-1 lg:col-span-2 relative">
              <CardHeader>
                <CardTitle>Average Healing Times (Days)</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                    <MetricRow label="All Wounds" value={reportData.avgHealingTimeAll || 0} />
                    <MetricRow label="Arterial Wounds" value={reportData.avgHealingTimeArterial || 0} />
                    <MetricRow label="Venous Wounds" value={reportData.avgHealingTimeVenous || 0} />
                    <MetricRow label="Diabetic Wounds" value={reportData.avgHealingTimeDiabetic || 0} />
                </div>
                <div className="space-y-4">
                    <MetricRow label="Pressure Ulcers - Stage I" value={reportData.avgHealingTimePressureI || 0} />
                    <MetricRow label="Pressure Ulcers - Stage II" value={reportData.avgHealingTimePressureII || 0} />
                    <MetricRow label="Pressure Ulcers - Stage III" value={reportData.avgHealingTimePressureIII || 0} />
                    <MetricRow label="Pressure Ulcers - Stage IV" value={reportData.avgHealingTimePressureIV || 0} />
                </div>
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
        </>
      )}
    </div>
  );
}

function DateRangePicker({ date, setDate, label }: { date: Date | undefined, setDate: (d: Date | undefined) => void, label: string }) {
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
