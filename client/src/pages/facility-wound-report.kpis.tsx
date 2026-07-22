/**
 * Facility Wound Report - KPI cards row.
 * Extracted from facility-wound-report.tsx (LIMP-4 decomposition) without behavior change.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Stethoscope, Clock } from 'lucide-react';

export function WoundReportKPIs({
  isComponentEnabled,
  data,
  setDeterioratingModalOpen,
  refetchDeteriorating,
  acuityIndexLoading,
  currentAcuityIndex,
  setChronicWoundsModalOpen,
  refetchChronicWounds,
  chronicWoundsLoading,
  chronicWoundsData,
}: {
  isComponentEnabled: (feature: string, id: string) => boolean;
  data: any;
  setDeterioratingModalOpen: (open: boolean) => void;
  refetchDeteriorating: () => void;
  acuityIndexLoading: boolean;
  currentAcuityIndex: number | null;
  setChronicWoundsModalOpen: (open: boolean) => void;
  refetchChronicWounds: () => void;
  chronicWoundsLoading: boolean;
  chronicWoundsData: any;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                {/* Avg Wound Reduction KPI */}
                {isComponentEnabled('facility-report', 'card-avg-wound-reduction') && (
                  <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Avg Wound Reduction</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {Array.isArray(data) && data.length > 0 && data[0]?.['Average Percentage Wound Area Reduction'] ? (
                        <div>
                          <div className="text-3xl font-bold text-blue-600">
                            {(parseFloat(data[0]['Average Percentage Wound Area Reduction']) * 100).toFixed(1)}%
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">Monthly area reduction</p>
                        </div>
                      ) : (
                        <div className="text-muted-foreground text-sm">No data available</div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Wounds Improving KPI */}
                {isComponentEnabled('facility-report', 'card-wounds-improving') && (
                  <Card className="border-l-4 border-l-green-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Wounds Improving</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {Array.isArray(data) && data.length > 0 && data[0]?.['Percent of Wounds Improving'] != null ? (
                        <div>
                          <div className="text-3xl font-bold text-green-600">
                            {Math.round(parseFloat(data[0]['Percent of Wounds Improving']) * (data[0]['Number of Active Wounds'] || 0))}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">Of {data[0]['Number of Active Wounds'] || 0} active wounds</p>
                        </div>
                      ) : (
                        <div className="text-muted-foreground text-sm">No data available</div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Wounds Deteriorating KPI */}
                {isComponentEnabled('facility-report', 'card-wounds-deteriorating') && (
                  <Card
                    className="border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => {
                      setDeterioratingModalOpen(true);
                      refetchDeteriorating();
                    }}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Wounds Deteriorating</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {Array.isArray(data) && data.length > 0 && data[0]?.['Percent of Wounds Deteriorating'] != null ? (
                        <div>
                          <div className="text-3xl font-bold text-red-600">
                            {Math.round(parseFloat(data[0]['Percent of Wounds Deteriorating']) * (data[0]['Number of Active Wounds'] || 0))}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">wounds with increased area</p>
                        </div>
                      ) : (
                        <div className="text-muted-foreground text-sm">No data available</div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Wounds Stable KPI */}
                {isComponentEnabled('facility-report', 'card-wounds-stable') && (
                  <Card className="border-l-4 border-l-yellow-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Wounds Stable</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {Array.isArray(data) && data.length > 0 && data[0]?.['Percent of Wounds Stable'] != null ? (
                        <div>
                          <div className="text-3xl font-bold text-yellow-600">
                            {Math.round(parseFloat(data[0]['Percent of Wounds Stable']) * (data[0]['Number of Active Wounds'] || 0))}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">Of {data[0]['Number of Active Wounds'] || 0} active wounds</p>
                        </div>
                      ) : (
                        <div className="text-muted-foreground text-sm">No data available</div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Facility Acuity Index KPI */}
                {isComponentEnabled('facility-report', 'card-acuity-index') && (
                  <Card className="border-l-4 border-l-purple-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Facility Acuity Index</CardTitle>
                      <Stethoscope className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                      {acuityIndexLoading ? (
                        <div className="text-muted-foreground text-sm">Loading...</div>
                      ) : currentAcuityIndex !== null ? (
                        <div>
                          <div className="text-3xl font-bold text-purple-600">
                            {currentAcuityIndex.toFixed(1)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">Wounds per patient</p>
                        </div>
                      ) : (
                        <div className="text-muted-foreground text-sm">No data available</div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Chronic Wounds KPI */}
                {isComponentEnabled('facility-report', 'card-chronic-wounds') && (
                  <Card
                    className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-950/20"
                    onClick={() => {
                      setChronicWoundsModalOpen(true);
                      refetchChronicWounds();
                    }}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Chronic Wounds</CardTitle>
                      <Clock className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-orange-600">
                        {chronicWoundsLoading ? '...' : chronicWoundsData?.total_wounds ?? 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">wounds older than 100 days</p>
                    </CardContent>
                  </Card>
                )}
              </div>
  );
}
