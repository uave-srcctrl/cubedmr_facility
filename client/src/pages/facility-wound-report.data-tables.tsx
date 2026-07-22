/**
 * Facility Wound Report - data tables (activity / healing times / patient-acuity).
 * Extracted from facility-wound-report.tsx (LIMP-4 decomposition) without behavior change.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataSourceBadge } from "@/components/data-source-badge";
import { Clock } from "lucide-react";

export function WoundReportDataTables({
  isComponentEnabled,
  dataSource,
  data,
  setNewWoundsModalOpen,
  refetchNewWounds,
  setResolvedWoundsModalOpen,
  refetchResolvedWounds,
  setActiveWoundsModalOpen,
  refetchActiveWounds,
  setChronicWoundsModalOpen,
  refetchChronicWounds,
  chronicWoundsData,
  activeWoundsData,
}: {
  isComponentEnabled: (feature: string, id: string) => boolean;
  dataSource: any;
  data: any;
  setNewWoundsModalOpen: (open: boolean) => void;
  refetchNewWounds: () => void;
  setResolvedWoundsModalOpen: (open: boolean) => void;
  refetchResolvedWounds: () => void;
  setActiveWoundsModalOpen: (open: boolean) => void;
  refetchActiveWounds: () => void;
  setChronicWoundsModalOpen: (open: boolean) => void;
  refetchChronicWounds: () => void;
  chronicWoundsData: any;
  activeWoundsData: any;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
                {/* Wound Activity Metrics Card */}
                {isComponentEnabled('facility-report', 'card-wound-activity') && (
                  <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                      <CardTitle className="text-base">Wound Activity Metrics</CardTitle>
                      <DataSourceBadge source={dataSource} showLabel={false} />
                    </CardHeader>
                    <CardContent>
                      {Array.isArray(data) && data.length > 0 ? (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center border-b pb-1.5">
                            <span className="text-xs text-muted-foreground">New Wounds (%)</span>
                            <span className="text-sm font-semibold">{data[0]['New Wounds (%)'] ? parseFloat(data[0]['New Wounds (%)']).toFixed(1) : 0}%</span>
                          </div>
                          <div className="flex justify-between items-center border-b pb-1.5">
                            <span className="text-xs text-muted-foreground">Resolution Rate (%)</span>
                            <span className="text-sm font-semibold">{data[0]['Resolution Rate (%)'] ? parseFloat(data[0]['Resolution Rate (%)']).toFixed(1) : 0}%</span>
                          </div>
                          <div
                            className="flex justify-between items-center border-b pb-1.5 cursor-pointer hover:bg-muted/50 rounded-md px-1 -mx-1 transition-colors"
                            onClick={() => { setNewWoundsModalOpen(true); refetchNewWounds(); }}
                          >
                            <span className="text-xs text-muted-foreground">Number of New Wounds</span>
                            <span className="text-sm font-semibold text-blue-600 hover:text-blue-700">{data[0]['Number of New Wounds'] ?? 0}</span>
                          </div>
                          <div
                            className="flex justify-between items-center border-b pb-1.5 cursor-pointer hover:bg-muted/50 rounded-md px-1 -mx-1 transition-colors"
                            onClick={() => { setResolvedWoundsModalOpen(true); refetchResolvedWounds(); }}
                          >
                            <span className="text-xs text-muted-foreground">Number of Resolved Wounds</span>
                            <span className="text-sm font-semibold text-green-600 hover:text-green-700">{data[0]['Number of Resolved Wounds'] ?? 0}</span>
                          </div>
                          <div
                            className="flex justify-between items-center border-b pb-1.5 cursor-pointer hover:bg-muted/50 rounded-md px-1 -mx-1 transition-colors"
                            onClick={() => { setActiveWoundsModalOpen(true); refetchActiveWounds(); }}
                          >
                            <span className="text-xs text-muted-foreground">Number of Active Wounds</span>
                            <span className="text-sm font-semibold text-amber-600 hover:text-amber-700">{data[0]['Number of Active Wounds'] ?? 0}</span>
                          </div>
                          <div
                            className="flex justify-between items-center cursor-pointer hover:bg-muted/50 rounded-md px-1 -mx-1 transition-colors"
                            onClick={() => { setChronicWoundsModalOpen(true); refetchChronicWounds(); }}
                          >
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3 text-orange-500" />
                              Chronic Wounds (Older than 100 Days)
                            </span>
                            <span className="text-sm font-semibold text-orange-600 hover:text-orange-700">{chronicWoundsData?.total_wounds ?? data[0]['Wounds > 100 Days'] ?? 0}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">No data available</p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Average Healing Times Card */}
                {isComponentEnabled('facility-report', 'card-healing-times') && (
                  <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                      <CardTitle className="text-base">Average Healing Times (Days)</CardTitle>
                      <DataSourceBadge source={dataSource} showLabel={false} />
                    </CardHeader>
                    <CardContent>
                      {Array.isArray(data) && data.length > 0 ? (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center border-b pb-1.5">
                            <span className="text-xs text-muted-foreground">All Wounds</span>
                            <span className="text-sm font-semibold">{data[0]['Average Healing Days - All'] != null ? parseFloat(data[0]['Average Healing Days - All']).toFixed(2) : '-'}</span>
                          </div>
                          <div className="flex justify-between items-center border-b pb-1.5">
                            <span className="text-xs text-muted-foreground">Arterial</span>
                            <span className="text-sm font-semibold">{data[0]['Average Healing Days - Arterial'] != null ? parseFloat(data[0]['Average Healing Days - Arterial']).toFixed(2) : '-'}</span>
                          </div>
                          <div className="flex justify-between items-center border-b pb-1.5">
                            <span className="text-xs text-muted-foreground">Venous</span>
                            <span className="text-sm font-semibold">{data[0]['Average Healing Days - Venous'] != null ? parseFloat(data[0]['Average Healing Days - Venous']).toFixed(2) : '-'}</span>
                          </div>
                          <div className="flex justify-between items-center border-b pb-1.5">
                            <span className="text-xs text-muted-foreground">Diabetic</span>
                            <span className="text-sm font-semibold">{data[0]['Average Healing Days - Diabetic'] != null ? parseFloat(data[0]['Average Healing Days - Diabetic']).toFixed(2) : '-'}</span>
                          </div>
                          <div className="flex justify-between items-center border-b pb-1.5">
                            <span className="text-xs text-muted-foreground">Pressure I/II</span>
                            <span className="text-sm font-semibold">{data[0]['Average Healing Days - Pressure Ulcer Stage I'] != null ? parseFloat(data[0]['Average Healing Days - Pressure Ulcer Stage I']).toFixed(2) : '-'} / {data[0]['Average Healing Days - Pressure Ulcer Stage II'] != null ? parseFloat(data[0]['Average Healing Days - Pressure Ulcer Stage II']).toFixed(2) : '-'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Pressure III/IV</span>
                            <span className="text-sm font-semibold">{data[0]['Average Healing Days - Pressure Ulcer Stage III'] != null ? parseFloat(data[0]['Average Healing Days - Pressure Ulcer Stage III']).toFixed(2) : '-'} / {data[0]['Average Healing Days - Pressure Ulcer Stage IV'] != null ? parseFloat(data[0]['Average Healing Days - Pressure Ulcer Stage IV']).toFixed(2) : '-'}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">No data available</p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Patient & Acuity Metrics Card */}
                {isComponentEnabled('facility-report', 'card-patient-acuity') && (
                  <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                      <CardTitle className="text-base">Patient & Acuity Metrics</CardTitle>
                      <DataSourceBadge source={dataSource} showLabel={false} />
                    </CardHeader>
                    <CardContent>
                      {Array.isArray(data) && data.length > 0 ? (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center border-b pb-1.5">
                            <span className="text-xs text-muted-foreground">Wounds</span>
                            <span className="text-sm font-semibold">{activeWoundsData?.total_wounds ?? 0}</span>
                          </div>
                          <div className="flex justify-between items-center border-b pb-1.5">
                            <span className="text-xs text-muted-foreground">Avg PUSH Score</span>
                            <span className="text-sm font-semibold">{data[0]['average_push_score'] ? parseFloat(data[0]['average_push_score']).toFixed(2) : 0}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Acuity Level</span>
                            <span className="text-sm font-semibold text-orange-600">{data[0]['acuity_level'] ?? 'N/A'}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">No data available</p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
  );
}
