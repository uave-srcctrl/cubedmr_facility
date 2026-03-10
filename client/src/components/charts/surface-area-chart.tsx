/**
 * Shared Surface Area Over Time chart component
 * Used in wound detail modals to show surface area trends
 */
import { memo } from "react";
import { format, parseISO } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toNum, ChartLineVisibility } from "@/lib/wound-utils";

export interface SurfaceEncounter {
  id?: string | number;
  dos: string;
  surface: number | string | null;
  healing_percentage?: number | string | null;
}

export interface SurfaceAreaChartProps {
  /** Array of encounters with surface measurements (chronological order, oldest first) */
  encounters: SurfaceEncounter[];
  /** Currently selected date (YYYY-MM-DD) */
  selectedDate: string;
  /** Optional start date of range selection */
  startDate?: string;
  /** Optional end date of range selection */
  endDate?: string;
  /** Callback when user clicks on an encounter date */
  onDateClick: (date: string) => void;
  /** Current visibility state for chart lines */
  visibility: ChartLineVisibility;
  /** Callback to toggle line visibility */
  onToggleLine: (line: keyof ChartLineVisibility) => void;
}

interface ChartDataPoint {
  date: string;
  rawDate: string;
  surface: number;
  changeFromPrev: number;
  changeFromInitial: number;
  healing: number;
}

const formatDate = (dateStr: string): string => {
  try {
    return format(parseISO(dateStr), "MM/dd/yy");
  } catch {
    return dateStr;
  }
};

export const SurfaceAreaChart = memo(function SurfaceAreaChart({
  encounters,
  selectedDate,
  startDate,
  endDate,
  onDateClick,
  visibility,
  onToggleLine,
}: SurfaceAreaChartProps) {
  // Need at least 2 data points for a chart
  if (encounters.length < 2) return null;

  const initialSurface = toNum(encounters[0]?.surface) || 1;

  // Calculate chart data with change percentages
  const chartData: ChartDataPoint[] = encounters.map((e, i) => {
    const currentSurface = toNum(e.surface);
    const prevSurface =
      i > 0 ? toNum(encounters[i - 1].surface) || 1 : currentSurface;
    const changeFromPrev =
      i > 0 ? ((currentSurface - prevSurface) / prevSurface) * 100 : 0;
    const changeFromInitial =
      ((currentSurface - initialSurface) / initialSurface) * 100;

    return {
      date: formatDate(e.dos),
      rawDate: e.dos,
      surface: currentSurface,
      changeFromPrev,
      changeFromInitial,
      healing: toNum(e.healing_percentage),
    };
  });

  const selectedDateFormatted = formatDate(selectedDate);
  const startDateFormatted = startDate ? formatDate(startDate) : null;
  const endDateFormatted = endDate ? formatDate(endDate) : null;
  const hasDateRange = !!(startDate && endDate);

  // Reverse for display (most recent first)
  const displayData = [...chartData].reverse();

  return (
    <div className="mt-4 pt-4 border-t">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground">
          Change in Surface Area Over Time
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant={visibility.surface ? "default" : "outline"}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onToggleLine("surface");
            }}
          >
            <span
              className={cn(
                "w-2 h-2 rounded-full bg-primary mr-1",
                visibility.surface && "ring-1 ring-white"
              )}
            />
            Surface
          </Button>
          <Button
            variant={visibility.prev ? "default" : "outline"}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onToggleLine("prev");
            }}
          >
            <span
              className={cn(
                "w-2 h-2 rounded-full bg-orange-500 mr-1",
                visibility.prev && "ring-1 ring-white"
              )}
            />
            Δ Prev
          </Button>
          <Button
            variant={visibility.change ? "default" : "outline"}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onToggleLine("change");
            }}
          >
            <span
              className={cn(
                "w-2 h-2 rounded-full bg-red-500 mr-1",
                visibility.change && "ring-1 ring-white"
              )}
            />
            Δ Initial
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-4">
        {/* Left column - Data list (clickable dates) */}
        <div className="space-y-1 max-h-[150px] overflow-y-auto">
          {displayData.map((enc, idx) => {
            const isFirst = idx === displayData.length - 1;
            const isSelected = enc.date === selectedDateFormatted;
            const isInRange =
              hasDateRange &&
              startDate &&
              endDate &&
              enc.rawDate >= startDate &&
              enc.rawDate <= endDate;
            return (
              <div
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  onDateClick(enc.rawDate);
                }}
                className={cn(
                  "flex items-center justify-between p-2 rounded text-xs cursor-pointer transition-colors",
                  isSelected
                    ? "bg-violet-100 dark:bg-violet-900/30 border-2 border-violet-500"
                    : isInRange
                      ? "bg-violet-50 dark:bg-violet-900/10 border-l-2 border-violet-300"
                      : "bg-muted/30 hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-2">
                  <CalendarIcon
                    className={cn(
                      "h-3 w-3",
                      isSelected
                        ? "text-violet-600"
                        : isInRange
                          ? "text-violet-400"
                          : "text-muted-foreground"
                    )}
                  />
                  <span
                    className={cn(
                      "text-xs",
                      isSelected
                        ? "font-semibold text-violet-700 dark:text-violet-300"
                        : isInRange
                          ? "text-violet-600 dark:text-violet-400"
                          : ""
                    )}
                  >
                    {enc.date}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">
                    {enc.surface.toFixed(2)} cm²
                  </span>
                  {!isFirst && (
                    <span
                      className={
                        enc.changeFromPrev < 0
                          ? "text-green-600"
                          : enc.changeFromPrev > 0
                            ? "text-red-600"
                            : "text-muted-foreground"
                      }
                    >
                      {enc.changeFromPrev > 0 ? "+" : ""}
                      {enc.changeFromPrev.toFixed(0)}%
                    </span>
                  )}
                  <span
                    className={
                      enc.changeFromInitial < 0
                        ? "text-green-600"
                        : enc.changeFromInitial > 0
                          ? "text-red-600"
                          : "text-muted-foreground"
                    }
                  >
                    ({enc.changeFromInitial > 0 ? "+" : ""}
                    {enc.changeFromInitial.toFixed(0)}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        {/* Right column - Line Chart */}
        <div className="h-[150px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={9}
                tickLine={false}
                axisLine={false}
                angle={-45}
                textAnchor="end"
                height={45}
              />
              {visibility.surface && (
                <YAxis
                  yAxisId="left"
                  domain={["auto", "auto"]}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                  width={35}
                  label={{
                    value: "cm²",
                    angle: -90,
                    position: "insideLeft",
                    fontSize: 9,
                    fill: "hsl(var(--muted-foreground))",
                  }}
                />
              )}
              {(visibility.prev || visibility.change) && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={["auto", "auto"]}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}%`}
                  width={40}
                />
              )}
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  borderRadius: "8px",
                  border: "1px solid hsl(var(--border))",
                  fontSize: "11px",
                }}
                formatter={(value: number, name: string) => {
                  if (name === "surface")
                    return [`${value.toFixed(2)} cm²`, "Surface"];
                  if (name === "changeFromPrev")
                    return [
                      `${value > 0 ? "+" : ""}${value.toFixed(1)}%`,
                      "Δ Prev",
                    ];
                  if (name === "changeFromInitial")
                    return [
                      `${value > 0 ? "+" : ""}${value.toFixed(1)}%`,
                      "Δ Initial",
                    ];
                  return [value, name];
                }}
              />
              {/* Shaded area for selected date range */}
              {hasDateRange &&
                startDateFormatted &&
                endDateFormatted &&
                visibility.surface && (
                  <ReferenceArea
                    x1={startDateFormatted}
                    x2={endDateFormatted}
                    yAxisId="left"
                    fill="#8b5cf6"
                    fillOpacity={0.15}
                    stroke="#8b5cf6"
                    strokeOpacity={0.3}
                  />
                )}
              {hasDateRange &&
                startDateFormatted &&
                endDateFormatted &&
                !visibility.surface &&
                (visibility.prev || visibility.change) && (
                  <ReferenceArea
                    x1={startDateFormatted}
                    x2={endDateFormatted}
                    yAxisId="right"
                    fill="#8b5cf6"
                    fillOpacity={0.15}
                    stroke="#8b5cf6"
                    strokeOpacity={0.3}
                  />
                )}
              {visibility.surface && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="surface"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{
                    r: 3,
                    fill: "hsl(var(--primary))",
                    strokeWidth: 2,
                    stroke: "hsl(var(--background))",
                  }}
                  activeDot={{ r: 5 }}
                />
              )}
              {visibility.prev && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="changeFromPrev"
                  stroke="#f97316"
                  strokeWidth={1.5}
                  strokeDasharray="2 2"
                  dot={{ r: 2, fill: "#f97316" }}
                />
              )}
              {visibility.change && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="changeFromInitial"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  dot={{ r: 2, fill: "#ef4444" }}
                />
              )}
              {/* Vertical reference line for selected date */}
              {visibility.surface && (
                <ReferenceLine
                  x={selectedDateFormatted}
                  yAxisId="left"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                />
              )}
              {!visibility.surface && (visibility.prev || visibility.change) && (
                <ReferenceLine
                  x={selectedDateFormatted}
                  yAxisId="right"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
});

SurfaceAreaChart.displayName = 'SurfaceAreaChart';
