/**
 * Facility Wound Report - PUSH score over time chart.
 * Extracted from facility-wound-report.tsx (LIMP-4 decomposition) without behavior change.
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DataSourceBadge } from "@/components/data-source-badge";
import { TrendingDown, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

export function PushScoreChart({
  pushScoreTrend,
  dataSource,
  pushScoreByDate,
}: {
  pushScoreTrend: any;
  dataSource: any;
  pushScoreByDate: any[];
}) {
  return (
    <Card className="shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        Change in PUSH Score Over Time
                        {pushScoreTrend.direction === 'improving' && (
                          <span className="flex items-center text-sm font-normal text-green-600">
                            <TrendingDown className="h-4 w-4 mr-1" />
                            Improving ({pushScoreTrend.change})
                          </span>
                        )}
                        {pushScoreTrend.direction === 'worsening' && (
                          <span className="flex items-center text-sm font-normal text-red-600">
                            <TrendingUp className="h-4 w-4 mr-1" />
                            Worsening (+{pushScoreTrend.change})
                          </span>
                        )}
                        {pushScoreTrend.direction === 'stable' && (
                          <span className="flex items-center text-sm font-normal text-gray-500">
                            Stable
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription>
                        Average PUSH score across all wounds by date of service
                      </CardDescription>
                    </div>
                    <DataSourceBadge source={dataSource} showLabel={false} />
                  </CardHeader>
                  <CardContent>
                    {pushScoreByDate.length > 0 ? (
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={pushScoreByDate}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="pushScoreGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#f97316" stopOpacity={0.1} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                              dataKey="date"
                              tickFormatter={(value) => {
                                try {
                                  const date = new Date(value);
                                  return format(date, 'MM/dd');
                                } catch {
                                  return value;
                                }
                              }}
                              className="text-xs fill-muted-foreground"
                            />
                            <YAxis
                              domain={[0, 17]}
                              tickCount={6}
                              className="text-xs fill-muted-foreground"
                              label={{ value: 'PUSH Score', angle: -90, position: 'insideLeft', className: 'fill-muted-foreground text-xs' }}
                            />
                            <Tooltip
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-background border rounded-lg shadow-lg p-3">
                                      <p className="font-medium">{label}</p>
                                      <p className="text-orange-600">
                                        Avg PUSH Score: <span className="font-bold">{payload[0].value}</span>
                                      </p>
                                      <p className="text-muted-foreground text-sm">
                                        Encounters: {payload[0].payload.encounters}
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <ReferenceLine y={6} stroke="#22c55e" strokeDasharray="5 5" label={{ value: 'Low', position: 'right', className: 'fill-green-600 text-xs' }} />
                            <ReferenceLine y={12} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'High', position: 'right', className: 'fill-red-600 text-xs' }} />
                            <Area
                              type="monotone"
                              dataKey="avgPushScore"
                              stroke="#f97316"
                              strokeWidth={2}
                              fill="url(#pushScoreGradient)"
                              dot={{ fill: '#f97316', strokeWidth: 2, r: 4 }}
                              activeDot={{ r: 6, stroke: '#f97316', strokeWidth: 2 }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        No PUSH score data available for the selected period
                      </div>
                    )}
                  </CardContent>
                </Card>
  );
}
