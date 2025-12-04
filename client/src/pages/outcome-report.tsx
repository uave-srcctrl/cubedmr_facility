import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
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

export default function OutcomeReportGlobal() {
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['outcomeReportGlobal', startDate ? format(startDate, 'yyyy-MM-dd') : null, endDate ? format(endDate, 'yyyy-MM-dd') : null],
    queryFn: async () => {
      if (!startDate || !endDate) return null;

      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      const facilityId = '5';
      const url = `https://cubed-mr.app/api/reports/outcome-report-global/${facilityId}/${formattedStartDate}/${formattedEndDate}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      const result = await response.json();
      return Array.isArray(result) ? result[0] : (result.data || result); // Assuming API returns object or array with one object
    },
    enabled: !!startDate && !!endDate,
  });
  
  // Fallback to empty object if data is null/undefined to avoid crashes, 
  // but we will handle loading/error states separately.
  const reportData = data || {};

  return (
    <div className="space-y-6">
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Overall Resolution Rate" value={`${reportData.overallResolutionRate || reportData.OverallResolutionRate || 0}%`} trend="positive" />
            <StatCard title="Active Healing Rate" value={`${reportData.activeHealingRate || reportData.ActiveHealingRate || 0}%`} trend="positive" />
            <StatCard title="Avg Healing Rate / Week" value={`${reportData.avgHealingRate || reportData.AvgHealingRate || 0}%`} />
            <StatCard title="Hospitalization Rate" value={`${reportData.currentHospitalizationRate || reportData.CurrentHospitalizationRate || 0}%`} trend="negative" />
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Status Breakdown */}
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Wound Status Distribution</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <MetricRow label="Improving" value={`${reportData.improving || reportData.Improving || 0}%`} color="text-emerald-600" />
                <MetricRow label="Stable" value={`${reportData.stable || reportData.Stable || 0}%`} />
                <MetricRow label="Deteriorating" value={`${reportData.deteriorating || reportData.Deteriorating || 0}%`} color="text-destructive" />
                <MetricRow label="New Wounds" value={reportData.newWounds || reportData.NewWounds || 0} />
                <MetricRow label="Resolved Wounds" value={reportData.resolvedWounds || reportData.ResolvedWounds || 0} />
              </CardContent>
            </Card>

            {/* Healing Times */}
            <Card className="col-span-1 lg:col-span-2">
              <CardHeader>
                <CardTitle>Average Healing Times (Days)</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                    <MetricRow label="All Wounds" value={reportData.avgHealingTimeAll || reportData.AvgHealingTimeAll || 0} />
                    <MetricRow label="Arterial Wounds" value={reportData.avgHealingTimeArterial || reportData.AvgHealingTimeArterial || 0} />
                    <MetricRow label="Venous Wounds" value={reportData.avgHealingTimeVenous || reportData.AvgHealingTimeVenous || 0} />
                    <MetricRow label="Diabetic Wounds" value={reportData.avgHealingTimeDiabetic || reportData.AvgHealingTimeDiabetic || 0} />
                </div>
                <div className="space-y-4">
                    <MetricRow label="Pressure Ulcers - Stage I" value={reportData.avgHealingTimePressureI || reportData.AvgHealingTimePressureI || 0} />
                    <MetricRow label="Pressure Ulcers - Stage II" value={reportData.avgHealingTimePressureII || reportData.AvgHealingTimePressureII || 0} />
                    <MetricRow label="Pressure Ulcers - Stage III" value={reportData.avgHealingTimePressureIII || reportData.AvgHealingTimePressureIII || 0} />
                    <MetricRow label="Pressure Ulcers - Stage IV" value={reportData.avgHealingTimePressureIV || reportData.AvgHealingTimePressureIV || 0} />
                </div>
              </CardContent>
            </Card>

            {/* Critical Metrics */}
            <Card className="col-span-1 md:col-span-2 lg:col-span-3">
              <CardHeader>
                <CardTitle>Critical Indicators</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <MetricRow label="All Time Hospitalization Rate" value={`${reportData.allTimeHospitalizationRate || reportData.AllTimeHospitalizationRate || 0}%`} />
                <MetricRow label="Wounds > 100 Days" value={reportData.woundsOver100Days || reportData.WoundsOver100Days || 0} highlight />
                <MetricRow label="% Wounds Not Debrided" value={`${reportData.notDebridedPct || reportData.NotDebridedPct || 0}%`} />
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
                  "w-[160px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>{label}</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
    )
}

function StatCard({ title, value, trend }: { title: string, value: string | number, trend?: 'positive' | 'negative' | 'neutral' }) {
  return (
    <Card>
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
