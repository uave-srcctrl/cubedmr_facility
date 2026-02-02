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
import { LOCAL_API, getFacilityId } from "@/lib/api-config";
import { normalizeFieldNames } from "@/lib/field-mapper";

export default function FacilityWoundReport() {
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
    queryKey: ['facilityWoundReport', startDate ? format(startDate, 'yyyy-MM-dd') : null, endDate ? format(endDate, 'yyyy-MM-dd') : null, facilityId],
    queryFn: async () => {
      if (!startDate || !endDate) return null;

      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      
      // Use local API endpoint with facility ID header
      const url = `${LOCAL_API.FACILITY_WOUND_REPORT}?startDate=${formattedStartDate}&endDate=${formattedEndDate}`;
      
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Facility-Id": facilityId,
      };

      const response = await fetch(url, { method: "GET", headers });

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[FacilityWoundReport] Received response:', result);
      
      // Handle if result is wrapped in array or object
      let data;
      if (result.status === false) {
        throw new Error(result.error || "Failed to fetch wound report");
      }
      
      if (Array.isArray(result.data) && result.data.length > 0) {
        data = result.data[0];
      } else if (result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
        data = result.data;
      } else {
        data = result.data;
      }
      
      // Normalize field names from backend format
      return normalizeFieldNames(data);
    },
    enabled: !!startDate && !!endDate,
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

  const reportData = data || {};

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Facility Wound Report</h1>
            <p className="text-muted-foreground mt-1">Operational metrics by Date of Service (DOS)</p>
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
            <p className="text-muted-foreground">Loading facility data...</p>
        </div>
      ) : !data ? (
         <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Data</AlertTitle>
          <AlertDescription>Please select a valid date range to view the report.</AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Avg Wound Reduction" value={`${(parseFloat(reportData.averageWoundAreaChange || 0)).toFixed(2)}cm\u00B2`} trend="positive" source={dataSource} />
            <StatCard title="Wounds Improving" value={`${(parseFloat(reportData.improving || 0) * 100).toFixed(2)}%`} trend="positive" source={dataSource} />
            <StatCard title="Wounds Deteriorating" value={`${(parseFloat(reportData.deteriorating || 0) * 100).toFixed(2)}%`} trend="negative" source={dataSource} />
            <StatCard title="Wounds Stable" value={`${(parseFloat(reportData.stable || 0) * 100).toFixed(2)}%`} trend="neutral" source={dataSource} />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Wound Activity Metrics</CardTitle>
                <DataSourceBadge source={dataSource} showLabel={false} />
              </CardHeader>
              <CardContent className="grid gap-4">
                 <MetricRow label="New Wounds (%)" value={`${(parseFloat(reportData.percentOfNewWounds || 0) * 100).toFixed(2)}%`} />
                 <MetricRow label="Resolution Rate (%)" value={`${(parseFloat(reportData.resolutionRate || 0) * 100).toFixed(2)}%`} />
                 <MetricRow label="Number of New Wounds" value={parseFloat((reportData.newWounds || 0).toString()).toFixed(2)} />
                 <MetricRow label="Number of Resolved Wounds" value={parseFloat((reportData.resolvedWounds || 0).toString()).toFixed(2)} />
                 <MetricRow label="Number of Active Wounds" value={parseFloat((reportData.numberOfActiveWounds || 0).toString()).toFixed(2)} />
                 <MetricRow label="Wounds > 100 Days" value={parseFloat((reportData.woundsOver100Days || 0).toString()).toFixed(2)} highlight />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Patient & Acuity Metrics</CardTitle>
                <DataSourceBadge source={dataSource} showLabel={false} />
              </CardHeader>
              <CardContent className="grid gap-4">
                 <MetricRow label="Active Patients" value={parseFloat((reportData.numberOfActivePatients || 0).toString()).toFixed(2)} />
                 <MetricRow label="Facility Acuity Index" value={parseFloat((reportData.facilityAcuityIndex || 0).toString()).toFixed(2)} />
                 <MetricRow label="PUSH Score Average" value={parseFloat((reportData.pushScoreAverage || 0).toString()).toFixed(2)} />
              </CardContent>
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

function MetricRow({ label, value, highlight }: { label: string, value: string | number, highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-bold", highlight && "text-destructive")}>{value}</span>
    </div>
  );
}
