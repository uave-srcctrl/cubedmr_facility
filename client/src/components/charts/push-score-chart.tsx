/**
 * Shared PUSH Score Over Time chart component
 * Used in wound detail modals for pressure ulcers with multiple encounters
 */
import { memo } from "react";
import { format, parseISO } from "date-fns";
import { Calendar as CalendarIcon, Zap } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { toNum } from "@/lib/wound-utils";

export interface PushEncounter {
  id?: string;
  dos: string;
  push_score: number | string | null;
}

export interface PushScoreChartProps {
  /** Array of encounters with PUSH scores (chronological order, oldest first) */
  encounters: PushEncounter[];
  /** Currently selected date (YYYY-MM-DD) */
  selectedDate: string;
  /** Optional start date of range selection */
  startDate?: string;
  /** Optional end date of range selection */
  endDate?: string;
  /** Callback when user clicks on an encounter date */
  onDateClick: (date: string) => void;
}

interface ChartDataPoint {
  date: string;
  rawDate: string;
  pushScore: number;
  changeFromPrev: number;
  changeFromInitial: number;
  id?: string;
}

const formatDate = (dateStr: string): string => {
  try {
    return format(parseISO(dateStr), "MM/dd/yy");
  } catch {
    return dateStr;
  }
};

export const PushScoreChart = memo(function PushScoreChart({
  encounters,
  selectedDate,
  startDate,
  endDate,
  onDateClick,
}: PushScoreChartProps) {
  // Filter encounters that have push_score
  const encountersWithPush = encounters.filter((e) => e.push_score != null);

  // Need at least 2 data points for a chart
  if (encountersWithPush.length < 2) return null;

  const initialPush = toNum(encountersWithPush[0]?.push_score);

  // Calculate chart data
  const chartData: ChartDataPoint[] = encountersWithPush.map((e, i) => {
    const currentPush = toNum(e.push_score);
    const prevPush =
      i > 0 ? toNum(encountersWithPush[i - 1].push_score) : currentPush;
    const changeFromPrev = i > 0 ? currentPush - prevPush : 0;
    const changeFromInitial = currentPush - initialPush;

    return {
      date: formatDate(e.dos),
      rawDate: e.dos,
      pushScore: currentPush,
      changeFromPrev,
      changeFromInitial,
      id: e.id,
    };
  });

  const selectedDateFormatted = formatDate(selectedDate);
  const startDateFormatted = startDate ? formatDate(startDate) : null;
  const endDateFormatted = endDate ? formatDate(endDate) : null;
  const hasDateRange = !!(startDate && endDate);

  // Reverse for display (most recent first)
  const displayData = [...chartData].reverse();

  return (
    <div className="mt-4 pt-4 border-t bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 p-3 rounded-md -mx-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-orange-600" />
          <p className="text-xs font-medium text-orange-700 dark:text-orange-400">
            PUSH Score Over Time
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-4">
        {/* Left column - Data list */}
        <div className="space-y-1 max-h-[180px] overflow-y-auto">
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
                key={enc.id || idx}
                onClick={(e) => {
                  e.stopPropagation();
                  onDateClick(enc.rawDate);
                }}
                className={cn(
                  "flex items-center justify-between p-2 rounded text-xs cursor-pointer transition-colors",
                  isSelected
                    ? "bg-orange-100 dark:bg-orange-900/30 border-2 border-orange-500"
                    : isInRange
                      ? "bg-orange-50 dark:bg-orange-900/10 border-l-2 border-orange-300"
                      : "bg-muted/30 hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-2">
                  <CalendarIcon
                    className={cn(
                      "h-3 w-3",
                      isSelected
                        ? "text-orange-600"
                        : isInRange
                          ? "text-orange-400"
                          : "text-muted-foreground"
                    )}
                  />
                  <span
                    className={
                      isSelected
                        ? "font-semibold text-orange-700 dark:text-orange-300"
                        : isInRange
                          ? "text-orange-600 dark:text-orange-400"
                          : ""
                    }
                  >
                    {enc.date}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium text-orange-700 dark:text-orange-400">
                    {enc.pushScore}/17
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
                      {enc.changeFromPrev}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {/* Right column - Line Chart */}
        <div className="h-[180px] w-full">
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
                fontSize={10}
                tickLine={false}
                axisLine={false}
                angle={-45}
                textAnchor="end"
                height={50}
              />
              <YAxis
                domain={[0, 17]}
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                ticks={[0, 5, 10, 15, 17]}
                label={{
                  value: "Score",
                  angle: -90,
                  position: "insideLeft",
                  fontSize: 10,
                  fill: "hsl(var(--muted-foreground))",
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  borderRadius: "8px",
                  border: "1px solid hsl(var(--border))",
                  fontSize: "11px",
                }}
                formatter={(value: number) => [`${value}/17`, "PUSH Score"]}
              />
              {/* Shaded area for selected date range */}
              {hasDateRange && startDateFormatted && endDateFormatted && (
                <ReferenceArea
                  x1={startDateFormatted}
                  x2={endDateFormatted}
                  fill="#f97316"
                  fillOpacity={0.15}
                  stroke="#f97316"
                  strokeOpacity={0.3}
                />
              )}
              <Line
                type="monotone"
                dataKey="pushScore"
                stroke="#f97316"
                strokeWidth={2}
                dot={{
                  r: 3,
                  fill: "#f97316",
                  strokeWidth: 2,
                  stroke: "hsl(var(--background))",
                }}
                activeDot={{ r: 5 }}
              />
              {/* Vertical reference line for selected date */}
              <ReferenceLine
                x={selectedDateFormatted}
                stroke="#8b5cf6"
                strokeWidth={2}
                strokeDasharray="5 3"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
});

PushScoreChart.displayName = 'PushScoreChart';
