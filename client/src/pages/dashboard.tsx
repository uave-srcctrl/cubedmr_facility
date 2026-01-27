import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line
} from "recharts";
import { 
  woundEtiologyData, 
  woundReductionData, 
  healingStatusData, 
  woundsByStatusData,
  dashboardKPIs as mockDashboardKPIs
} from "@/lib/mockData";
import { ArrowUpRight, Activity, Users, FileText, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { LOCAL_API } from "@/lib/api-config";
import { DataSourceBadge } from "@/components/data-source-badge";
import { NoDataComponent } from "@/components/no-data-component-card";
import { FacilityInfoBanner } from "@/components/facility-info-banner";
import { EcgLoader } from "@/components/ecg-loader";
import { useState, useEffect } from "react";

export default function Dashboard() {
  console.log('[Dashboard] 🎯 Dashboard component mounted!');
  
  const { getAuthInfo, getToken, getSelectedFacility } = useAuth();
  const authInfo = getAuthInfo();
  const selectedFacilityId = getSelectedFacility();
  
  console.log('[Dashboard] Initial authInfo from hook:', authInfo);
  console.log('[Dashboard] Selected facility ID:', selectedFacilityId);
  
  // Use state and effect to ensure token is available after mount
  const [token, setToken] = useState<string | null>(null);
  const [tokenReady, setTokenReady] = useState(false);
  
  useEffect(() => {
    // Increase delay to ensure localStorage is fully synchronized
    // Sometimes it takes longer for state updates to propagate
    const timer = setTimeout(() => {
      const authToken = getToken();
      setToken(authToken);
      setTokenReady(true);
      console.log('[Dashboard] ✅ Token ready from localStorage:', authToken ? `present (${authToken.substring(0, 20)}...)` : 'MISSING ⚠️');
      console.log('[Dashboard] Auth info:', authInfo);
    }, 200);  // Increased from 50ms to 200ms
    
    return () => clearTimeout(timer);
  }, []);
  
  // If no facilityId, show error - shouldn't happen if auth is working
  if (!selectedFacilityId) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Error</AlertTitle>
          <AlertDescription>
            Missing facility selection. Please select a facility from the menu.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  
  const [dashboardKPIs, setDashboardKPIs] = useState<any>(null);
  const [kpisError, setKpisError] = useState<string | null>(null);
  const [kpisSource, setKpisSource] = useState<'backend' | 'mock' | 'no-data'>('no-data');
  const [loading, setLoading] = useState(true);
  const [etiologyData, setEtiologyData] = useState<any[]>(woundEtiologyData);
  const [etiologySource, setEtiologySource] = useState<'backend' | 'mock' | 'no-data'>('mock');
  const [etiologyLoading, setEtiologyLoading] = useState(true);
  const [woundReductionDataState, setWoundReductionDataState] = useState<any[]>(woundReductionData);
  const [reductionSource, setReductionSource] = useState<'backend' | 'mock' | 'no-data'>('mock');
  const [reductionLoading, setReductionLoading] = useState(true);
  const [healingStatusDataState, setHealingStatusDataState] = useState<any[]>(healingStatusData);
  const [healingStatusSource, setHealingStatusSource] = useState<'backend' | 'mock' | 'no-data'>('mock');
  const [healingStatusLoading, setHealingStatusLoading] = useState(true);
  const [woundsByStatusDataState, setWoundsByStatusDataState] = useState<any[]>([]);
  const [woundsByStatusSource, setWoundsByStatusSource] = useState<'backend' | 'mock' | 'no-data'>('no-data');
  const [woundsByStatusLoading, setWoundsByStatusLoading] = useState(true);
  const [queryPeriod, setQueryPeriod] = useState<string>('Last 30 days');
  const [etiologyChartKey, setEtiologyChartKey] = useState(0);

  useEffect(() => {
    if (!tokenReady) {
      console.log('[Dashboard] Waiting for token to be ready...');
      return; // Don't fetch until token is ready
    }
    
    const fetchKPIs = async () => {
      try {
        const facilityId = selectedFacilityId;
        if (!facilityId) {
          console.warn('[Dashboard] No facilityId found');
          setDashboardKPIs(null);
          setKpisSource('no-data');
          setLoading(false);
          return;
        }

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "X-Facility-Id": facilityId,
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
          console.log('[Dashboard/KPIs] Including Authorization header');
        } else {
          console.warn('[Dashboard/KPIs] ⚠️ NO TOKEN AVAILABLE!');
        }

        console.log('[Dashboard/KPIs] Fetching with selectedFacilityId:', facilityId);
        const response = await fetch(LOCAL_API.DASHBOARD_KPIS, { 
          method: "GET",
          headers 
        });
        
        // Check if response is ok before parsing JSON
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();

        if (response.ok && result.status && result.data) {
          setDashboardKPIs(result.data);
          setKpisSource('backend');
          setKpisError(null);
          // Update queryPeriod from backend response
          if (result.period) {
            setQueryPeriod(result.period);
            console.log('[Dashboard] KPI period from backend:', result.period);
          }
        } else {
          console.warn('[Dashboard] Backend returned no data');
          setDashboardKPIs(null);
          setKpisSource('no-data');
          setKpisError('No KPI data available');
        }
      } catch (error) {
        console.error('[Dashboard] Error fetching KPIs:', error);
        setDashboardKPIs(null);
        setKpisSource('no-data');
        setKpisError('Failed to load KPI data');
      } finally {
        setLoading(false);
      }
    };

    fetchKPIs();
  }, [authInfo.facilityId, tokenReady]);

  // Fetch wound etiology data
  useEffect(() => {
    const fetchEtiologyData = async () => {
      setEtiologyLoading(true);
      try {
        const facilityId = authInfo.facilityId;
        if (!facilityId) {
          console.warn('[Dashboard] No facilityId for etiology');
          setEtiologySource('no-data');
          setEtiologyLoading(false);
          return;
        }

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "X-Facility-Id": facilityId,
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(LOCAL_API.DASHBOARD_WOUND_ETIOLOGY, { 
          method: "GET",
          headers 
        });
        
        if (!response.ok) {
          console.warn('[Dashboard] Etiology endpoint error');
          setEtiologySource('no-data');
          setEtiologyData([]);
          setEtiologyLoading(false);
          return;
        }
        
        const result = await response.json();

        if (result.status && Array.isArray(result.data)) {
          if (result.data.length > 0) {
            console.log('[Dashboard] Loaded etiology data from backend');
            setEtiologyData(result.data);
            setEtiologySource('backend');
          } else {
            // Backend returned empty array - use mock data as fallback
            console.warn('[Dashboard] Backend returned empty etiology data, using mock data');
            setEtiologyData(woundEtiologyData);
            setEtiologySource('mock');
          }
        } else {
          setEtiologyData(woundEtiologyData);
          setEtiologySource('mock');
        }
      } catch (error) {
        console.error('[Dashboard] Error fetching etiology data:', error);
        // Use mock data as fallback
        setEtiologyData(woundEtiologyData);
        setEtiologySource('mock');
      } finally {
        setEtiologyLoading(false);
      }
    };

    if (!tokenReady) {
      console.log('[Dashboard] Etiology: Waiting for token to be ready');
      return;
    }
    fetchEtiologyData();
  }, [authInfo.facilityId, tokenReady]);

  // Trigger animation when etiology data finishes loading
  useEffect(() => {
    if (!etiologyLoading && etiologyData.length > 0) {
      setEtiologyChartKey(prev => prev + 1);
    }
  }, [etiologyLoading, etiologyData.length]);

  // Fetch wound reduction data
  useEffect(() => {
    const fetchReductionData = async () => {
      setReductionLoading(true);
      try {
        const facilityId = authInfo.facilityId;
        if (!facilityId) {
          console.warn('[Dashboard] No facilityId for wound reduction');
          setReductionSource('no-data');
          setReductionLoading(false);
          return;
        }

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "X-Facility-Id": facilityId,
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(LOCAL_API.DASHBOARD_WOUND_REDUCTION, { 
          method: "GET",
          headers 
        });
        
        if (!response.ok) {
          console.warn('[Dashboard] Wound reduction endpoint error');
          setWoundReductionDataState([]);
          setReductionSource('no-data');
          setReductionLoading(false);
          return;
        }
        
        const result = await response.json();

        if (result.status && Array.isArray(result.data)) {
          if (result.data.length > 0) {
            console.log('[Dashboard] Loaded wound reduction data from backend');
            setWoundReductionDataState(result.data);
            setReductionSource('backend');
          } else {
            console.warn('[Dashboard] Backend returned empty wound reduction data');
            setWoundReductionDataState([]);
            setReductionSource('no-data');
          }
        } else {
          setWoundReductionDataState([]);
          setReductionSource('no-data');
        }
      } catch (error) {
        console.error('[Dashboard] Error fetching wound reduction data:', error);
        setWoundReductionDataState([]);
        setReductionSource('no-data');
      } finally {
        setReductionLoading(false);
      }
    };

    if (!tokenReady) {
      console.log('[Dashboard] Reduction: Waiting for token to be ready');
      return;
    }
    fetchReductionData();
  }, [authInfo.facilityId, tokenReady]);

  // Fetch healing status data
  useEffect(() => {
    const fetchHealingStatusData = async () => {
      setHealingStatusLoading(true);
      try {
        const facilityId = authInfo.facilityId;
        if (!facilityId) {
          console.warn('[Dashboard] No facilityId for healing status');
          setHealingStatusSource('no-data');
          setHealingStatusLoading(false);
          return;
        }

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "X-Facility-Id": facilityId,
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(LOCAL_API.DASHBOARD_HEALING_STATUS, { 
          method: "GET",
          headers 
        });
        
        if (!response.ok) {
          console.warn('[Dashboard] Healing status endpoint error');
          setHealingStatusDataState([]);
          setHealingStatusSource('no-data');
          setHealingStatusLoading(false);
          return;
        }
        
        const result = await response.json();

        if (result.status && Array.isArray(result.data)) {
          if (result.data.length > 0) {
            console.log('[Dashboard] Loaded healing status data from backend');
            setHealingStatusDataState(result.data);
            setHealingStatusSource('backend');
          } else {
            console.warn('[Dashboard] Backend returned empty healing status data');
            setHealingStatusDataState([]);
            setHealingStatusSource('no-data');
          }
        } else {
          setHealingStatusDataState([]);
          setHealingStatusSource('no-data');
        }
      } catch (error) {
        console.error('[Dashboard] Error fetching healing status data:', error);
        setHealingStatusDataState([]);
        setHealingStatusSource('no-data');
      } finally {
        setHealingStatusLoading(false);
      }
    };

    if (!tokenReady) {
      console.log('[Dashboard] Healing Status: Waiting for token to be ready');
      return;
    }
    fetchHealingStatusData();
  }, [authInfo.facilityId, tokenReady]);

  // Fetch wounds by status data using report API
  // No fallback to mock data - show no-data component if backend returns empty
  useEffect(() => {
    const fetchWoundsByStatusData = async () => {
      setWoundsByStatusLoading(true);
      try {
        const facilityId = authInfo.facilityId;
        
        if (!facilityId) {
          console.warn('[Dashboard] No facilityId for wounds by status');
          setWoundsByStatusDataState([]);
          setWoundsByStatusSource('no-data');
          setWoundsByStatusLoading(false);
          return;
        }

        // Use the new /api/report endpoint to fetch rptWoundsByStatus
        console.log('[Dashboard] Fetching wounds by status using /api/report endpoint for facility:', facilityId);
        
        const reportHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Facility-Id': facilityId,
        };
        if (token) {
          reportHeaders['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(LOCAL_API.REPORT, {
          method: 'POST',
          headers: reportHeaders,
          body: JSON.stringify({
            entity: 'Report',
            reportName: 'rptWoundsByStatus',
            facilityId: facilityId,
            status: 'Active',
            email: authInfo.email,
            token: authInfo.token,
          }),
        });
        
        // Check if response is ok before parsing JSON
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('[Dashboard] Report API response:', result);
        console.log('[Dashboard] Response status:', result.status);
        console.log('[Dashboard] Response data:', result.data);
        console.log('[Dashboard] Data is array?', Array.isArray(result.data));
        console.log('[Dashboard] Data length:', result.data?.length);

        if (result.status && Array.isArray(result.data) && result.data.length > 0) {
          console.log('[Dashboard] Loaded wounds by status data from report API:', result.data);
          setWoundsByStatusDataState(result.data);
          setWoundsByStatusSource('backend');
        } else if (result.status === false) {
          // Backend returned an error (e.g., authentication failed, server error)
          console.log('[Dashboard] Backend error:', result.error);
          setWoundsByStatusDataState([]);
          setWoundsByStatusSource('mock');
        } else {
          // Backend returned success but with no data (empty array)
          console.log('[Dashboard] No wounds by status data available from backend');
          setWoundsByStatusDataState([]);
          setWoundsByStatusSource('no-data');
        }
      } catch (error) {
        // Network error or other exception
        console.error('[Dashboard] Error fetching wounds by status from report API:', error);
        setWoundsByStatusDataState([]);
        setWoundsByStatusSource('mock');
      } finally {
        setWoundsByStatusLoading(false);
      }
    };

    if (!tokenReady) {
      console.log('[Dashboard] Wounds by Status: Waiting for token to be ready');
      return;
    }
    fetchWoundsByStatusData();
  }, [authInfo.facilityId, authInfo.email, authInfo.token, tokenReady]);

  // Get KPI values from the object
  // Note: Backend returns objects with structure: { value, trend, label, period }
  // Use nullish coalescing (??) with 0 as default, not || which treats 0 as falsy
  const activeWounds = dashboardKPIs?.activeWounds?.value ?? 0;
  const healingRate = dashboardKPIs?.healingRate?.value ?? 0;
  const reportsGenerated = dashboardKPIs?.reportsGenerated?.value ?? 0;
  const criticalCases = dashboardKPIs?.criticalCases?.value ?? 0;

  return (
    <div className="space-y-8">
      {/* Dashboard Header */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground tracking-tight">
                {authInfo.entityName ? `${authInfo.entityName} Dashboard` : 'Facility Dashboard'}
              </h1>
              {authInfo.facilityId && (
                <span className="text-xs font-semibold bg-primary/10 text-primary px-3 py-1.5 rounded-full">
                  ID: {authInfo.facilityId}
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-2">Overview of wound care performance and active cases.</p>
          </div>
          <DataSourceBadge source={kpisSource} />
        </div>
      </div>

      {/* Facility Info Banner */}
      <FacilityInfoBanner />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Active Wounds */}
        <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow relative min-h-[140px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Wounds</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          {loading ? (
            <CardContent className="flex items-center justify-center py-8">
              <EcgLoader title="Loading Active Wounds..." minHeight="min-h-[80px]" />
            </CardContent>
          ) : dashboardKPIs ? (
            <CardContent className="flex flex-col justify-between pb-0">
              <div className="text-4xl font-bold">{activeWounds}</div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">{queryPeriod}</p>
                <DataSourceBadge source={kpisSource} showLabel={false} />
              </div>
            </CardContent>
          ) : (
            <CardContent className="flex flex-col items-center justify-center py-6 pb-0">
              <AlertCircle className="h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground text-center">No data available</p>
              <div className="flex items-center justify-between mt-2 w-full">
                <p className="text-xs text-muted-foreground">{queryPeriod}</p>
                <DataSourceBadge source={kpisSource} showLabel={false} />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Healing Rate */}
        <Card className="border-l-4 border-l-chart-2 shadow-sm hover:shadow-md transition-shadow relative min-h-[140px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Healing Rate</CardTitle>
            <Users className="h-4 w-4 text-chart-2" />
          </CardHeader>
          {loading ? (
            <CardContent className="flex items-center justify-center py-8">
              <EcgLoader title="Loading Healing Rate..." minHeight="min-h-[80px]" />
            </CardContent>
          ) : dashboardKPIs ? (
            <CardContent className="flex flex-col justify-between pb-0">
              <div className="text-4xl font-bold">{healingRate}%</div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">{queryPeriod}</p>
                <DataSourceBadge source={kpisSource} showLabel={false} />
              </div>
            </CardContent>
          ) : (
            <CardContent className="flex flex-col items-center justify-center py-6 pb-0">
              <AlertCircle className="h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground text-center">No data available</p>
              <div className="flex items-center justify-between mt-2 w-full">
                <p className="text-xs text-muted-foreground">{queryPeriod}</p>
                <DataSourceBadge source={kpisSource} showLabel={false} />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Reports Generated */}
        <Card className="border-l-4 border-l-chart-3 shadow-sm hover:shadow-md transition-shadow relative min-h-[140px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reports Generated</CardTitle>
            <FileText className="h-4 w-4 text-chart-3" />
          </CardHeader>
          {loading ? (
            <CardContent className="flex items-center justify-center py-8">
              <EcgLoader title="Loading Reports..." minHeight="min-h-[80px]" />
            </CardContent>
          ) : dashboardKPIs ? (
            <CardContent className="flex flex-col justify-between pb-0">
              <div className="text-4xl font-bold">{reportsGenerated}</div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">{queryPeriod}</p>
                <DataSourceBadge source={kpisSource} showLabel={false} />
              </div>
            </CardContent>
          ) : (
            <CardContent className="flex flex-col items-center justify-center py-6 pb-0">
              <AlertCircle className="h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground text-center">No data available</p>
              <div className="flex items-center justify-between mt-2 w-full">
                <p className="text-xs text-muted-foreground">{queryPeriod}</p>
                <DataSourceBadge source={kpisSource} showLabel={false} />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Critical Cases */}
        <Card className="border-l-4 border-l-destructive shadow-sm hover:shadow-md transition-shadow relative min-h-[140px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Cases</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          {loading ? (
            <CardContent className="flex items-center justify-center py-8">
              <EcgLoader title="Loading Critical Cases..." minHeight="min-h-[80px]" />
            </CardContent>
          ) : dashboardKPIs ? (
            <CardContent className="flex flex-col justify-between pb-0">
              <div className="text-4xl font-bold">{criticalCases}</div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">{queryPeriod}</p>
                <DataSourceBadge source={kpisSource} showLabel={false} />
              </div>
            </CardContent>
          ) : (
            <CardContent className="flex flex-col items-center justify-center py-6 pb-0">
              <AlertCircle className="h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground text-center">No data available</p>
              <div className="flex items-center justify-between mt-2 w-full">
                <p className="text-xs text-muted-foreground">{queryPeriod}</p>
                <DataSourceBadge source={kpisSource} showLabel={false} />
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Wound Etiology - Pie Chart */}
        <Card className="col-span-3 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex-1">
              <CardTitle>Wound Etiology Distribution</CardTitle>
              <CardDescription>Distribution of wound types across all active patients</CardDescription>
            </div>
            <DataSourceBadge source={etiologySource} showLabel={false} />
          </CardHeader>
          <CardContent className="pl-2 pr-2">
            {etiologyLoading ? (
              <EcgLoader title="Loading Wound Etiology Distribution..." minHeight="min-h-[330px]" />
            ) : etiologyData && etiologyData.length > 0 ? (
              <div className="flex h-[330px] w-full gap-4 pl-1.25">
                {/* Legend on the left with scroll */}
                <div className="w-24 overflow-y-auto flex-shrink-0 py-8">
                  <div className="space-y-2">
                    {etiologyData.map((entry, index) => (
                      <div key={`legend-${index}`} className="flex items-center gap-2 whitespace-nowrap">
                        <div 
                          className="w-3 h-3 rounded-sm flex-shrink-0" 
                          style={{ backgroundColor: entry.fill }}
                        />
                        <span className="truncate text-xs">{entry.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Chart */}
                <div className="flex-1 min-w-0" key={`chart-container-${etiologyChartKey}`}>
                  <ResponsiveContainer width="100%" height="100%" key={`responsive-${etiologyChartKey}`}>
                    <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }} key={`piechart-${etiologyChartKey}`}>
                      <Pie
                        data={etiologyData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={105}
                        paddingAngle={5}
                        dataKey="value"
                        isAnimationActive={true}
                        animationBegin={0}
                        animationDuration={800}
                        animationEasing="ease-out"
                      >
                        {etiologyData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                        itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : etiologySource === 'no-data' ? (
              <NoDataComponent title="No Data Available" description="No wound etiology data found for this facility" />
            ) : (
              <div className="flex h-[330px] w-full items-center justify-center">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-sm">No wound etiology data available for this period</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Average Reduction - Column Chart */}
        <Card className="col-span-4 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex-1">
              <CardTitle>Average Wound Reduction</CardTitle>
              <CardDescription>Month over month percentage reduction in wound area</CardDescription>
            </div>
            <DataSourceBadge source={reductionSource} showLabel={false} />
          </CardHeader>
          <CardContent className="pl-2">
            {reductionLoading ? (
              <EcgLoader title="Loading Average Wound Reduction..." minHeight="min-h-[300px]" />
            ) : woundReductionDataState && woundReductionDataState.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={woundReductionDataState}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--accent))' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar 
                    dataKey="reduction" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]} 
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
              </div>
            ) : reductionSource === 'no-data' ? (
              <NoDataComponent title="No Data Available" description="No wound reduction data found for this facility" />
            ) : (
              <div className="flex h-[300px] w-full items-center justify-center">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-sm">No wound reduction data available for this period</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Healing Status - Column Chart (Requested as Column, so Vertical bars) */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex-1">
              <CardTitle>Wound Healing Status</CardTitle>
              <CardDescription>Current status breakdown of all active wounds</CardDescription>
            </div>
            <DataSourceBadge source={healingStatusSource} showLabel={false} />
          </CardHeader>
          <CardContent>
            {healingStatusLoading ? (
              <EcgLoader title="Loading Wound Healing Status..." minHeight="min-h-[300px]" />
            ) : healingStatusDataState && healingStatusDataState.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={healingStatusDataState}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="status" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--accent))' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar dataKey="percentage" radius={[4, 4, 0, 0]} barSize={50}>
                    {healingStatusDataState.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              </div>
            ) : healingStatusSource === 'no-data' ? (
              <NoDataComponent title="No Data Available" description="No healing status data found for this facility" />
            ) : (
              <div className="flex h-[300px] w-full items-center justify-center">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-sm">No healing status data available for this period</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Wounds by Status - Bar Chart (Requested as Bar, so Horizontal bars) */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex-1">
              <CardTitle>Wounds by Status</CardTitle>
              <CardDescription>Total count of wounds in each administrative status</CardDescription>
            </div>
            <DataSourceBadge source={woundsByStatusSource} showLabel={false} />
          </CardHeader>
          <CardContent className="p-0">
            {woundsByStatusLoading ? (
              <EcgLoader title="Loading Wounds by Status..." minHeight="min-h-[400px]" />
            ) : woundsByStatusDataState && woundsByStatusDataState.length > 0 ? (
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={woundsByStatusDataState} layout="vertical" margin={{ top: 5, right: 100, left: 80, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis 
                      dataKey="status" 
                      type="category"
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      width={75}
                    />
                    <Tooltip 
                      cursor={{ fill: 'hsl(var(--accent))' }}
                      contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                      formatter={(value: any) => `${value} wounds`}
                    />
                    <Bar 
                      dataKey="count" 
                      fill="hsl(var(--chart-5))" 
                      radius={[0, 4, 4, 0]} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-[400px] w-full items-center justify-center">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-sm">No wounds by status data available for this period</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
