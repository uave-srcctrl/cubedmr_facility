/**
 * Facility Wound Report - Acuity Index trend chart.
 * Extracted from facility-wound-report.tsx (LIMP-4 decomposition) without behavior change.
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DataSourceBadge } from "@/components/data-source-badge";
import { RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function AcuityTrendChart({
  useAcuityDateRangeMode,
  startDateStr,
  endDateStr,
  acuityTrendData,
  acuityIndexLoading,
  dataSource,
}: {
  useAcuityDateRangeMode: boolean;
  startDateStr: string;
  endDateStr: string;
  acuityTrendData: any[];
  acuityIndexLoading: boolean;
  dataSource: any;
}) {
  return (
    <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div className="flex flex-col gap-0.5">
                      <CardTitle className="text-base">Acuity Index Trend</CardTitle>
                      <CardDescription className="text-xs">
                        {useAcuityDateRangeMode
                          ? `Date range: ${startDateStr} to ${endDateStr}`
                          : `4 weeks back from ${endDateStr}`
                        } (Data points: {acuityTrendData.length})
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {acuityIndexLoading && <RefreshCcw className="h-3 w-3 animate-spin text-muted-foreground" />}
                      <DataSourceBadge source={dataSource} showLabel={false} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className={cn("h-[280px] w-full transition-opacity duration-300", acuityIndexLoading && "opacity-60")}>
                      {acuityTrendData.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          No trend data available
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={acuityTrendData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis
                              dataKey="week"
                              stroke="hsl(var(--muted-foreground))"
                              fontSize={11}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis
                              domain={['auto', 'auto']}
                              stroke="hsl(var(--muted-foreground))"
                              fontSize={11}
                              tickLine={false}
                              axisLine={false}
                            />
                            <Tooltip
                              contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                            />
                            <Line
                              type="monotone"
                              dataKey="index"
                              stroke="hsl(var(--primary))"
                              strokeWidth={2}
                              dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "hsl(var(--background))" }}
                              activeDot={{ r: 6 }}
                              isAnimationActive={true}
                              animationDuration={600}
                              animationEasing="ease-in-out"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </CardContent>
                </Card>
  );
}
