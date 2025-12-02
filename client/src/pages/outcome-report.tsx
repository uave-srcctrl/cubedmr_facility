import { useState } from "react";
import { format, subDays } from "date-fns";
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
import { generateOutcomeReport } from "@/lib/mockData";

export default function OutcomeReportGlobal() {
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  
  const data = generateOutcomeReport(startDate, endDate);

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
          <Button variant="default" className="ml-2">
            <FileDown className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Primary Outcomes */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Overall Resolution Rate" value={`${data.overallResolutionRate}%`} trend="positive" />
        <StatCard title="Active Healing Rate" value={`${data.activeHealingRate}%`} trend="positive" />
        <StatCard title="Avg Healing Rate / Week" value={`${data.avgHealingRate}%`} />
        <StatCard title="Hospitalization Rate" value={`${data.currentHospitalizationRate}%`} trend="negative" />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Status Breakdown */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Wound Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
             <MetricRow label="Improving" value={`${data.improving}%`} color="text-emerald-600" />
             <MetricRow label="Stable" value={`${data.stable}%`} />
             <MetricRow label="Deteriorating" value={`${data.deteriorating}%`} color="text-destructive" />
             <MetricRow label="New Wounds" value={data.newWounds} />
             <MetricRow label="Resolved Wounds" value={data.resolvedWounds} />
          </CardContent>
        </Card>

        {/* Healing Times */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Average Healing Times (Days)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
             <div className="space-y-4">
                <MetricRow label="All Wounds" value={data.avgHealingTimeAll} />
                <MetricRow label="Arterial Wounds" value={data.avgHealingTimeArterial} />
                <MetricRow label="Venous Wounds" value={data.avgHealingTimeVenous} />
                <MetricRow label="Diabetic Wounds" value={data.avgHealingTimeDiabetic} />
             </div>
             <div className="space-y-4">
                <MetricRow label="Pressure Ulcers - Stage I" value={data.avgHealingTimePressureI} />
                <MetricRow label="Pressure Ulcers - Stage II" value={data.avgHealingTimePressureII} />
                <MetricRow label="Pressure Ulcers - Stage III" value={data.avgHealingTimePressureIII} />
                <MetricRow label="Pressure Ulcers - Stage IV" value={data.avgHealingTimePressureIV} />
             </div>
          </CardContent>
        </Card>

        {/* Critical Metrics */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle>Critical Indicators</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
             <MetricRow label="All Time Hospitalization Rate" value={`${data.allTimeHospitalizationRate}%`} />
             <MetricRow label="Wounds > 100 Days" value={data.woundsOver100Days} highlight />
             <MetricRow label="% Wounds Not Debrided" value={`${data.notDebridedPct}%`} />
          </CardContent>
        </Card>
      </div>
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
