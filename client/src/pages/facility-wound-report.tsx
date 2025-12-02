import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateFacilityWoundReport } from "@/lib/mockData";

export default function FacilityWoundReport() {
  const [date, setDate] = useState<Date>(new Date());
  const data = generateFacilityWoundReport(date);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Facility Wound Report</h1>
          <p className="text-muted-foreground mt-1">Daily operational metrics by Date of Service (DOS)</p>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button variant="default">
            <FileDown className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Avg Wound Reduction" value={`${data.avgReduction}%`} trend="positive" />
        <StatCard title="Wounds Improving" value={`${data.improving}%`} trend="positive" />
        <StatCard title="Wounds Deteriorating" value={`${data.deteriorating}%`} trend="negative" />
        <StatCard title="Wounds Stable" value={`${data.stable}%`} trend="neutral" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Wound Activity Metrics</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
             <MetricRow label="New Wounds (%)" value={`${data.newWoundsPct}%`} />
             <MetricRow label="Resolution Rate (%)" value={`${data.resolutionRate}%`} />
             <MetricRow label="Number of New Wounds" value={data.newWoundsCount} />
             <MetricRow label="Number of Resolved Wounds" value={data.resolvedWoundsCount} />
             <MetricRow label="Number of Active Wounds" value={data.activeWoundsCount} />
             <MetricRow label="Wounds > 100 Days" value={data.woundsOver100Days} highlight />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Patient & Acuity Metrics</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
             <MetricRow label="Active Patients" value={data.activePatients} />
             <MetricRow label="Facility Acuity Index" value={data.acuityIndex} />
             <MetricRow label="PUSH Score Average" value={data.pushScoreAvg} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
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
