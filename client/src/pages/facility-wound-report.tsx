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

export default function FacilityWoundReport() {
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['facilityWoundReport', startDate ? format(startDate, 'yyyy-MM-dd') : null, endDate ? format(endDate, 'yyyy-MM-dd') : null],
    queryFn: async () => {
      if (!startDate || !endDate) return null;

      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      const facilityId = '5';
      const url = `https://cubed-mr.app/api/reports/facility-wound-outcome/${facilityId}/${formattedStartDate}/${formattedEndDate}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      const result = await response.json();
      // Handle if result is wrapped in array or object
      return Array.isArray(result) ? result[0] : (result.data || result);
    },
    enabled: !!startDate && !!endDate,
  });

  const reportData = data || {};

  return (
    <div className="space-y-6">
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
            Export PDF
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
            <StatCard title="Avg Wound Reduction" value={`${reportData.avgPercentWoundAreaReduction || reportData.AvgPercentWoundAreaReduction || 0}%`} trend="positive" />
            <StatCard title="Wounds Improving" value={`${reportData.percentOfWoundsImproving || reportData.PercentOfWoundsImproving || 0}%`} trend="positive" />
            <StatCard title="Wounds Deteriorating" value={`${reportData.percentOfWoundsDeteriorating || reportData.PercentOfWoundsDeteriorating || 0}%`} trend="negative" />
            <StatCard title="Wounds Stable" value={`${reportData.percentOfWoundsStable || reportData.PercentOfWoundsStable || 0}%`} trend="neutral" />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Wound Activity Metrics</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                 <MetricRow label="New Wounds (%)" value={`${reportData.percentOfNewWounds || reportData.PercentOfNewWounds || 0}%`} />
                 <MetricRow label="Resolution Rate (%)" value={`${reportData.resolutionRate || reportData.ResolutionRate || 0}%`} />
                 <MetricRow label="Number of New Wounds" value={reportData.numberOfNewWounds || reportData.NumberOfNewWounds || 0} />
                 <MetricRow label="Number of Resolved Wounds" value={reportData.numberOfResolvedWounds || reportData.NumberOfResolvedWounds || 0} />
                 <MetricRow label="Number of Active Wounds" value={reportData.numberOfActiveWounds || reportData.NumberOfActiveWounds || 0} />
                 <MetricRow label="Wounds > 100 Days" value={reportData.numberOfWoundsOver100Days || reportData.NumberOfWoundsOver100Days || 0} highlight />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Patient & Acuity Metrics</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                 <MetricRow label="Active Patients" value={reportData.numberOfActivePatients || reportData.NumberOfActivePatients || 0} />
                 <MetricRow label="Facility Acuity Index" value={reportData.facilityAcuityIndex || reportData.FacilityAcuityIndex || 0} />
                 <MetricRow label="PUSH Score Average" value={reportData.pushScoreAverage || reportData.PushScoreAverage || 0} />
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

function MetricRow({ label, value, highlight }: { label: string, value: string | number, highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-bold", highlight && "text-destructive")}>{value}</span>
    </div>
  );
}
