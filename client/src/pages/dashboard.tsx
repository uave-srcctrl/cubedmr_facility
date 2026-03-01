import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line
} from "recharts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  dashboardKPIs as mockDashboardKPIs
} from "@/lib/mockData";
import { ArrowUpRight, Activity, Users, FileText, AlertCircle, Loader2, Calendar as CalendarIcon, RefreshCcw } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useEnabledDates } from "@/hooks/use-enabled-dates";
import { useCriticalCases, useReportsGenerated, useWoundsByEtiology, useWoundsByHealingStatus, useWoundsByDisposition } from "@/hooks/use-patients";
import { useSettings } from "@/hooks/use-settings";
import { LOCAL_API } from "@/lib/api-config";
import { DataSourceBadge } from "@/components/data-source-badge";
import { NoDataComponent } from "@/components/no-data-component-card";
import { NoFacilityData } from "@/components/no-facility-data";
import { FacilityInfoBanner } from "@/components/facility-info-banner";
import { useFacilityHasData } from "@/hooks/use-facility-has-data";
import { EcgLoader } from "@/components/ecg-loader";
import { CriticalCasesModal } from "@/components/critical-cases-modal";
import { ReportsGeneratedModal } from "@/components/reports-generated-modal";
import { WoundsByEtiologyModal } from "@/components/wounds-by-etiology-modal";
import { WoundsByStatusModal } from "@/components/wounds-by-status-modal";
import { cn, normalizeEtiology } from "@/lib/utils";
import { format } from "date-fns";
import { useState, useEffect, useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { onAuthEvent, AUTH_EVENTS } from "@/lib/auth-events";
import { usePersistedDates } from "@/hooks/use-persisted-dates";

export default function Dashboard() {
  console.log('[Dashboard] 🎯 Dashboard component mounted!');
  
  const { getAuthInfo, getToken, getSelectedFacility } = useAuth();
  const authInfo = getAuthInfo();
  
  // Use state for facilityId to support reactive updates
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(() => getSelectedFacility());
  
  // Listen for facility changes
  useEffect(() => {
    console.log('[Dashboard] Setting up facility change listener');
    
    const unsubscribe = onAuthEvent(AUTH_EVENTS.FACILITY_CHANGED, (newFacilityId: string) => {
      console.log('[Dashboard] 🔄 Facility changed event received:', newFacilityId);
      setSelectedFacilityId(newFacilityId);
    });
    
    return unsubscribe;
  }, []);
  
  // Settings hook for component visibility
  const { isComponentEnabled } = useSettings();
  
  // Check if facility has wound encounter data
  const { hasData: facilityHasData, facilityName } = useFacilityHasData();
  
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
  const [etiologySource, setEtiologySource] = useState<'backend' | 'mock' | 'no-data'>('mock');
  const [reductionSource, setReductionSource] = useState<'backend' | 'mock' | 'no-data'>('mock');
  const [healingStatusSource, setHealingStatusSource] = useState<'backend' | 'mock' | 'no-data'>('mock');
  const [woundsByStatusDataState, setWoundsByStatusDataState] = useState<any[]>([]);
  const [woundsByStatusSource, setWoundsByStatusSource] = useState<'backend' | 'mock' | 'no-data'>('no-data');
  const [woundsByStatusLoading, setWoundsByStatusLoading] = useState(true);
  
  // isFetching states for smooth transitions (show opacity while refetching)
  const [kpisFetching, setKpisFetching] = useState(false);
  const [woundsStatusFetching, setWoundsStatusFetching] = useState(false);
  
  // Critical cases modal state
  const [criticalCasesModalOpen, setCriticalCasesModalOpen] = useState(false);
  
  // Reports generated modal state
  const [reportsModalOpen, setReportsModalOpen] = useState(false);
  
  // Wounds by etiology modal state
  const [etiologyModalOpen, setEtiologyModalOpen] = useState(false);
  const [selectedEtiology, setSelectedEtiology] = useState<string | null>(null);
  const [pressedEtiologyIndex, setPressedEtiologyIndex] = useState<number | null>(null);
  const [hiddenEtiologies, setHiddenEtiologies] = useState<Set<string>>(new Set());
  
  // Healing status chart state
  const [hiddenHealingStatuses, setHiddenHealingStatuses] = useState<Set<string>>(new Set());
  const [pressedHealingStatusIndex, setPressedHealingStatusIndex] = useState<number | null>(null);
  const [healingStatusModalOpen, setHealingStatusModalOpen] = useState(false);
  const [selectedHealingStatus, setSelectedHealingStatus] = useState<string | null>(null);
  
  // Wounds by status chart state
  const [hiddenWoundsByStatus, setHiddenWoundsByStatus] = useState<Set<string>>(new Set());
  const [pressedWoundsByStatusIndex, setPressedWoundsByStatusIndex] = useState<number | null>(null);
  const [dispositionModalOpen, setDispositionModalOpen] = useState(false);
  const [selectedDisposition, setSelectedDisposition] = useState<string | null>(null);
  
  // Persisted date picker state
  const {
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    startDateStr,
    endDateStr,
    hasPersistedDates
  } = usePersistedDates({ facilityId: selectedFacilityId });
  
  // Get enabled dates from backend
  const { data: enabledDates = [], isLoading: enabledDatesLoading } = useEnabledDates(selectedFacilityId || '');
  
  // Get critical cases data - pass date range to filter by last encounter in range
  const { data: criticalCasesData, isLoading: criticalCasesLoading, refetch: refetchCriticalCases } = useCriticalCases(
    selectedFacilityId || '',
    startDateStr,
    endDateStr
  );
  
  // Get wounds by etiology data - only fetch when etiology is selected
  const { data: woundsByEtiologyData, isLoading: woundsByEtiologyLoading, refetch: refetchWoundsByEtiology } = useWoundsByEtiology(
    selectedFacilityId || '',
    selectedEtiology,
    startDateStr,
    endDateStr
  );
  
  // Get wounds by healing status data - only fetch when healing status is selected
  const { data: woundsByHealingStatusData, isLoading: woundsByHealingStatusLoading, refetch: refetchWoundsByHealingStatus } = useWoundsByHealingStatus(
    selectedFacilityId || '',
    selectedHealingStatus,
    startDateStr,
    endDateStr
  );
  
  // Get wounds by disposition data - only fetch when disposition is selected
  const { data: woundsByDispositionData, isLoading: woundsByDispositionLoading, refetch: refetchWoundsByDisposition } = useWoundsByDisposition(
    selectedFacilityId || '',
    selectedDisposition,
    startDateStr,
    endDateStr
  );
  
  // Calculate first and last encounter dates from enabled dates
  const { lastEncounterDate, firstEncounterDate } = useMemo(() => {
    if (enabledDates.length === 0) return { lastEncounterDate: null, firstEncounterDate: null };
    const sorted = [...enabledDates].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    // Parse dates manually to avoid timezone issues
    const parseDate = (dateStr: string) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    };
    return {
      firstEncounterDate: parseDate(sorted[0]),
      lastEncounterDate: parseDate(sorted[sorted.length - 1])
    };
  }, [enabledDates]);

  // Calculate visible KPI cards count for dynamic grid
  const visibleKpiCards = useMemo(() => {
    const cards = ['card-active-wounds', 'card-healing-rate', 'card-reports-generated', 'card-critical-cases'];
    return cards.filter(card => isComponentEnabled('dashboard', card)).length;
  }, [isComponentEnabled]);

  // Calculate visible charts count for row 1 (etiology + reduction)
  const visibleChartsRow1 = useMemo(() => {
    const charts = ['chart-wound-etiology', 'chart-wound-reduction'];
    return charts.filter(chart => isComponentEnabled('dashboard', chart)).length;
  }, [isComponentEnabled]);

  // Calculate visible charts count for row 2 (healing-status + wounds-by-status)
  const visibleChartsRow2 = useMemo(() => {
    const charts = ['chart-healing-status', 'chart-wounds-by-status'];
    return charts.filter(chart => isComponentEnabled('dashboard', chart)).length;
  }, [isComponentEnabled]);

  // Dynamic grid classes based on visible component count
  const kpiGridClass = useMemo(() => {
    if (visibleKpiCards <= 1) return 'grid gap-4 grid-cols-1';
    if (visibleKpiCards === 2) return 'grid gap-4 grid-cols-1 md:grid-cols-2';
    if (visibleKpiCards === 3) return 'grid gap-4 grid-cols-1 md:grid-cols-3';
    return 'grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
  }, [visibleKpiCards]);

  const chartsRow1GridClass = useMemo(() => {
    if (visibleChartsRow1 <= 1) return 'grid gap-4 grid-cols-1';
    return 'grid gap-4 md:grid-cols-2';
  }, [visibleChartsRow1]);

  const chartsRow2GridClass = useMemo(() => {
    if (visibleChartsRow2 <= 1) return 'grid gap-4 grid-cols-1';
    return 'grid gap-4 md:grid-cols-2';
  }, [visibleChartsRow2]);
  
  // Initialize dates when enabled dates load (only if no persisted dates)
  useEffect(() => {
    if (hasPersistedDates) return; // Don't override persisted dates
    if (lastEncounterDate && !endDate) {
      setEndDate(lastEncounterDate);
    }
    if (lastEncounterDate && !startDate) {
      setStartDate(lastEncounterDate);
    }
  }, [lastEncounterDate, hasPersistedDates]);
  
  // Note: Auto-swap of dates (if start > end) is now handled by usePersistedDates hook

  // Get reports generated data (after dates are computed)
  const { data: reportsData, isLoading: reportsLoading, refetch: refetchReports } = useReportsGenerated(
    selectedFacilityId || '',
    startDateStr || null,
    endDateStr || null
  );

  useEffect(() => {
    if (!tokenReady) {
      console.log('[Dashboard] Waiting for token to be ready...');
      return; // Don't fetch until token is ready
    }
    
    // Wait for dates to be initialized
    if (!startDateStr || !endDateStr) {
      console.log('[Dashboard] Waiting for dates to be initialized...');
      return;
    }
    
    const fetchKPIs = async () => {
      setKpisFetching(true);
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

        console.log('[Dashboard/KPIs] Fetching with selectedFacilityId:', facilityId, 'dates:', startDateStr, '-', endDateStr);
        const kpiUrl = `${LOCAL_API.DASHBOARD_KPIS}?startDate=${startDateStr}&endDate=${endDateStr}`;
        const response = await fetch(kpiUrl, { 
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
        setKpisFetching(false);
      }
    };

    fetchKPIs();
  }, [selectedFacilityId, tokenReady, startDateStr, endDateStr]);

  // Fetch wound etiology data using React Query with keepPreviousData for smooth transitions
  // No fallback to mock data - show no-data component if backend returns empty
  const { 
    data: etiologyData = [], 
    isLoading: etiologyLoading,
    isFetching: etiologyFetching 
  } = useQuery({
    queryKey: ['dashboardEtiology', selectedFacilityId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!selectedFacilityId) return [];
      
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Facility-Id": selectedFacilityId,
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const etiologyUrl = `${LOCAL_API.DASHBOARD_WOUND_ETIOLOGY}?startDate=${startDateStr}&endDate=${endDateStr}`;
      const response = await fetch(etiologyUrl, { method: "GET", headers });
      
      if (!response.ok) {
        setEtiologySource('no-data');
        return [];
      }
      
      const result = await response.json();
      if (result.status && Array.isArray(result.data) && result.data.length > 0) {
        setEtiologySource('backend');
        // Normalize etiology names for consistent display
        return result.data.map((item: { name: string; value: number; fill: string }) => ({
          ...item,
          name: normalizeEtiology(item.name)
        }));
      }
      setEtiologySource('no-data');
      return [];
    },
    enabled: !!selectedFacilityId && !!startDateStr && !!endDateStr && tokenReady,
    placeholderData: keepPreviousData,
  });

  // Interface for wound reduction median data
  interface WeeklyTrendData {
    week: string;
    median: number;
    avg: number;
  }
  
  interface WoundReductionMedianData {
    median_days: number;
    avg_days: number;
    min_days: number;
    max_days: number;
    total_wounds: number;
    wounds_reduced: number;
    wounds_increased: number;
    wounds_stable: number;
    weeklyTrend?: WeeklyTrendData[];
  }

  // Fetch wound reduction median data using React Query with keepPreviousData for smooth transitions
  const { 
    data: woundReductionMedianData, 
    isLoading: reductionLoading,
    isFetching: reductionFetching 
  } = useQuery<WoundReductionMedianData | null>({
    queryKey: ['dashboardReductionMedian', selectedFacilityId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!selectedFacilityId) return null;
      
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Facility-Id": selectedFacilityId,
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const reductionUrl = `${LOCAL_API.DASHBOARD_WOUND_REDUCTION_MEDIAN}?startDate=${startDateStr}&endDate=${endDateStr}`;
      const response = await fetch(reductionUrl, { method: "GET", headers });
      
      if (!response.ok) {
        setReductionSource('no-data');
        return null;
      }
      
      const result = await response.json();
      if (result.status && result.data) {
        setReductionSource('backend');
        return result.data as WoundReductionMedianData;
      }
      setReductionSource('no-data');
      return null;
    },
    enabled: !!selectedFacilityId && !!startDateStr && !!endDateStr && tokenReady,
    placeholderData: keepPreviousData,
  });

  // Fetch healing status data using React Query with keepPreviousData for smooth transitions
  const { 
    data: healingStatusDataState = [], 
    isLoading: healingStatusLoading,
    isFetching: healingFetching 
  } = useQuery({
    queryKey: ['dashboardHealingStatus', selectedFacilityId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!selectedFacilityId) return [];
      
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Facility-Id": selectedFacilityId,
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const healingStatusUrl = `${LOCAL_API.DASHBOARD_HEALING_STATUS}?startDate=${startDateStr}&endDate=${endDateStr}`;
      const response = await fetch(healingStatusUrl, { method: "GET", headers });
      
      if (!response.ok) {
        setHealingStatusSource('no-data');
        return [];
      }
      
      const result = await response.json();
      if (result.status && Array.isArray(result.data) && result.data.length > 0) {
        setHealingStatusSource('backend');
        return result.data;
      }
      setHealingStatusSource('no-data');
      return [];
    },
    enabled: !!selectedFacilityId && !!startDateStr && !!endDateStr && tokenReady,
    placeholderData: keepPreviousData,
  });

  // Fetch wounds by status data using report API
  // No fallback to mock data - show no-data component if backend returns empty
  useEffect(() => {
    // Wait for dates to be initialized
    if (!startDateStr || !endDateStr) {
      return;
    }
    
    const fetchWoundsByStatusData = async () => {
      setWoundsStatusFetching(true);
      // Only show loader on initial load, not on refetch  
      if (woundsByStatusDataState.length === 0) {
        setWoundsByStatusLoading(true);
      }
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
            startDate: startDateStr,
            endDate: endDateStr,
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
        setWoundsStatusFetching(false);
      }
    };

    if (!tokenReady) {
      console.log('[Dashboard] Wounds by Status: Waiting for token to be ready');
      return;
    }
    fetchWoundsByStatusData();
  }, [authInfo.facilityId, authInfo.email, authInfo.token, tokenReady, startDateStr, endDateStr]);

  // Get KPI values from the object
  // Note: Backend returns objects with structure: { value, trend, label, period }
  // Use nullish coalescing (??) with 0 as default, not || which treats 0 as falsy
  const activeWounds = dashboardKPIs?.activeWounds?.value ?? 0;
  const healingRate = dashboardKPIs?.healingRate?.value ?? 0;
  const reportsGenerated = dashboardKPIs?.reportsGenerated?.value ?? 0;
  // Use critical cases count from the dedicated hook for consistency with the modal
  // Falls back to dashboard KPI value if hook data is not available
  const criticalCases = criticalCasesData?.total_wounds ?? dashboardKPIs?.criticalCases?.value ?? 0;

  // Show NoFacilityData if the selected facility has no wound encounters
  if (!facilityHasData) {
    return (
      <div className="space-y-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Dashboard</h1>
          </div>
          <p className="text-muted-foreground mt-1">Overview of wound care performance and active cases.</p>
        </div>
        <NoFacilityData facilityName={facilityName} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Dashboard Header */}
      <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground tracking-tight">
                Dashboard
              </h1>
              {authInfo.facilityId && (
                <span className="text-xs font-semibold bg-primary/10 text-primary px-3 py-1.5 rounded-full">
                  ID: {authInfo.facilityId}
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-1">Overview of wound care performance and active cases.</p>
          </div>
          <div className="flex flex-col items-start gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <DatePicker 
                date={startDate}
                setDate={setStartDate}
                label="Start Date"
                enabledDates={enabledDates}
                isLoading={enabledDatesLoading}
                disabled={enabledDatesLoading || !enabledDates.length}
              />
              <span className="text-muted-foreground">-</span>
              <DatePicker 
                date={endDate}
                setDate={setEndDate}
                label="End Date"
                enabledDates={enabledDates}
                isLoading={enabledDatesLoading}
                disabled={enabledDatesLoading || !enabledDates.length}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  // Reset to default dates
                  if (lastEncounterDate && firstEncounterDate) {
                    setEndDate(lastEncounterDate);
                    setStartDate(firstEncounterDate);
                  }
                }}
                disabled={enabledDatesLoading || !enabledDates.length}
              >
                <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
              <DataSourceBadge source={kpisSource} />
            </div>
            {/* Date Range Info */}
            {enabledDates.length > 0 && firstEncounterDate && lastEncounterDate && (
              <p className="text-xs text-muted-foreground mt-[5px]">
                Data available from {format(firstEncounterDate, 'MMM dd, yyyy')} to {format(lastEncounterDate, 'MMM dd, yyyy')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Facility Info Banner - Hidden */}
      {/* <FacilityInfoBanner /> */}

      {/* KPI Cards Section */}
      {isComponentEnabled('dashboard', 'kpi-cards') && (
      <div className={kpiGridClass}>
        {/* Active Wounds */}
        {isComponentEnabled('dashboard', 'card-active-wounds') && (
        <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow relative min-h-[140px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Wounds</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          {loading || kpisFetching ? (
            <CardContent className="flex flex-col items-center justify-center py-6 pb-0">
              <EcgLoader size="sm" className="h-8" />
            </CardContent>
          ) : dashboardKPIs ? (
            <CardContent className="flex flex-col justify-between pb-0">
              <div className="text-4xl font-bold">{activeWounds}</div>
              <div className="flex items-center justify-end mt-2">
                <DataSourceBadge source={kpisSource} showLabel={false} />
              </div>
            </CardContent>
          ) : (
            <CardContent className="flex flex-col items-center justify-center py-6 pb-0">
              <AlertCircle className="h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground text-center">No data available</p>
              <div className="flex items-center justify-end mt-2 w-full">
                <DataSourceBadge source={kpisSource} showLabel={false} />
              </div>
            </CardContent>
          )}
        </Card>
        )}

        {/* Healing Rate */}
        {isComponentEnabled('dashboard', 'card-healing-rate') && (
        <Card className="border-l-4 border-l-chart-2 shadow-sm hover:shadow-md transition-shadow relative min-h-[140px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Healing Rate</CardTitle>
            <Users className="h-4 w-4 text-chart-2" />
          </CardHeader>
          {loading || kpisFetching ? (
            <CardContent className="flex flex-col items-center justify-center py-6 pb-0">
              <EcgLoader size="sm" className="h-8" />
            </CardContent>
          ) : dashboardKPIs ? (
            <CardContent className="flex flex-col justify-between pb-0">
              <div className="text-4xl font-bold">{healingRate}%</div>
              <div className="flex items-center justify-end mt-2">
                <DataSourceBadge source={kpisSource} showLabel={false} />
              </div>
            </CardContent>
          ) : (
            <CardContent className="flex flex-col items-center justify-center py-6 pb-0">
              <AlertCircle className="h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground text-center">No data available</p>
              <div className="flex items-center justify-end mt-2 w-full">
                <DataSourceBadge source={kpisSource} showLabel={false} />
              </div>
            </CardContent>
          )}
        </Card>
        )}

        {/* Reports Generated */}
        {isComponentEnabled('dashboard', 'card-reports-generated') && (
        <Card 
          className="border-l-4 border-l-chart-3 shadow-sm hover:shadow-md transition-shadow relative min-h-[140px] cursor-pointer"
          onClick={() => {
            setReportsModalOpen(true);
            refetchReports();
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reports Generated</CardTitle>
            <FileText className="h-4 w-4 text-chart-3" />
          </CardHeader>
          {loading || kpisFetching ? (
            <CardContent className="flex flex-col items-center justify-center py-6 pb-0">
              <EcgLoader size="sm" className="h-8" />
            </CardContent>
          ) : dashboardKPIs ? (
            <CardContent className="flex flex-col justify-between pb-0">
              <div className="text-4xl font-bold">{reportsGenerated}</div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">Click for details</span>
                <DataSourceBadge source={kpisSource} showLabel={false} />
              </div>
            </CardContent>
          ) : (
            <CardContent className="flex flex-col items-center justify-center py-6 pb-0">
              <AlertCircle className="h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground text-center">No data available</p>
              <div className="flex items-center justify-end mt-2 w-full">
                <DataSourceBadge source={kpisSource} showLabel={false} />
              </div>
            </CardContent>
          )}
        </Card>
        )}

        {/* Critical Cases */}
        {isComponentEnabled('dashboard', 'card-critical-cases') && (
        <Card 
          className="border-l-4 border-l-destructive shadow-sm hover:shadow-md transition-shadow relative min-h-[140px] cursor-pointer"
          onClick={() => {
            setCriticalCasesModalOpen(true);
            refetchCriticalCases(); // Ensure fresh data when modal opens
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Cases</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          {loading || kpisFetching ? (
            <CardContent className="flex flex-col items-center justify-center py-6 pb-0">
              <EcgLoader size="sm" className="h-8" />
            </CardContent>
          ) : dashboardKPIs ? (
            <CardContent className="flex flex-col justify-between pb-0">
              <div className="text-4xl font-bold">{criticalCases}</div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">Click for details</span>
                <DataSourceBadge source={kpisSource} showLabel={false} />
              </div>
            </CardContent>
          ) : (
            <CardContent className="flex flex-col items-center justify-center py-6 pb-0">
              <AlertCircle className="h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground text-center">No data available</p>
              <div className="flex items-center justify-end mt-2 w-full">
                <DataSourceBadge source={kpisSource} showLabel={false} />
              </div>
            </CardContent>
          )}
        </Card>
        )}
      </div>
      )}

      {/* Charts Section */}
      {isComponentEnabled('dashboard', 'charts-section') && (
      <>
      <div className={chartsRow1GridClass}>
        {/* Wound Etiology - Pie Chart */}
        {isComponentEnabled('dashboard', 'chart-wound-etiology') && (
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex-1">
              <CardTitle>Wound Etiology Distribution</CardTitle>
              <CardDescription>Distribution of wound types across all active patients</CardDescription>
            </div>
            <DataSourceBadge source={etiologySource} showLabel={false} />
          </CardHeader>
          <CardContent className="pl-2 pr-2">
            {etiologyLoading && !etiologyData?.length ? (
              <EcgLoader title="Loading Wound Etiology Distribution..." minHeight="min-h-[400px]" />
            ) : etiologyData && etiologyData.length > 0 ? (
              <div className="flex h-[400px] w-full gap-2 pl-1">
                {/* Legend on the left with scroll */}
                <div className="w-[120px] overflow-y-auto flex-shrink-0 py-4">
                  <div className="space-y-2">
                    {etiologyData.map((entry, index) => {
                      const isHidden = hiddenEtiologies.has(entry.name);
                      return (
                        <div 
                          key={`legend-${index}`} 
                          className="flex items-center gap-2 whitespace-nowrap cursor-pointer hover:bg-muted/50 rounded p-1 -m-1 transition-colors"
                          onClick={() => {
                            setHiddenEtiologies(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(entry.name)) {
                                newSet.delete(entry.name);
                              } else {
                                newSet.add(entry.name);
                              }
                              return newSet;
                            });
                          }}
                        >
                          <div 
                            className="w-3 h-3 rounded-sm flex-shrink-0" 
                            style={{ backgroundColor: isHidden ? 'transparent' : entry.fill, border: isHidden ? `2px solid ${entry.stroke || entry.fill}` : `1px solid ${entry.stroke || entry.fill}` }}
                          />
                          <span className={`truncate text-xs ${isHidden ? 'line-through text-muted-foreground' : ''}`}>{entry.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Chart */}
                <div className="flex-1 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <Pie
                        data={etiologyData.filter(entry => !hiddenEtiologies.has(entry.name))}
                        cx="50%"
                        cy="50%"
                        innerRadius={100}
                        outerRadius={160}
                        paddingAngle={5}
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={800}
                        animationEasing="ease-out"
                        isAnimationActive={true}
                        onClick={(data, index) => {
                          if (data && data.name) {
                            setPressedEtiologyIndex(index);
                            setTimeout(() => {
                              setPressedEtiologyIndex(null);
                              setSelectedEtiology(data.name);
                              setEtiologyModalOpen(true);
                            }, 150);
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {etiologyData.filter(entry => !hiddenEtiologies.has(entry.name)).map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.fill}
                            stroke={entry.stroke || entry.fill}
                            strokeWidth={1}
                            style={{ 
                              cursor: 'pointer',
                              outline: 'none',
                              transform: pressedEtiologyIndex === index ? 'scale(0.92)' : 'scale(1)',
                              transformOrigin: 'center',
                              transformBox: 'fill-box',
                              transition: 'transform 0.15s ease-out'
                            }} 
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip 
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
              <div className="flex h-[400px] w-full items-center justify-center">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-sm">No wound etiology data available for this period</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* Wound Reduction Median - Combined Card */}
        {isComponentEnabled('dashboard', 'chart-wound-reduction') && (
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex-1">
              <CardTitle>Wound Reduction Median</CardTitle>
              <CardDescription>Median statistics and weekly trend progression</CardDescription>
            </div>
            <DataSourceBadge source={reductionSource} showLabel={false} />
          </CardHeader>
          <CardContent className="p-4">
            {reductionLoading && !woundReductionMedianData ? (
              <EcgLoader title="Loading Wound Reduction Median..." minHeight="min-h-[400px]" />
            ) : woundReductionMedianData ? (
              <div className="space-y-4">
                {/* Top Row: Statistical Overview */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3">Statistical Overview</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="bg-primary/10 rounded-lg p-3 text-center border">
                          <p className="text-xl font-bold text-primary">{woundReductionMedianData.median_days?.toFixed(1) || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">Median Days</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>The middle value of healing days when data is sorted</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="bg-secondary/50 rounded-lg p-3 text-center border">
                          <p className="text-xl font-bold">{woundReductionMedianData.avg_days?.toFixed(1) || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">Average Days</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>Mean number of days for wound healing</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="border rounded-lg p-3 text-center">
                          <p className="text-lg font-semibold">{woundReductionMedianData.min_days?.toFixed(1) || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">Min Days</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>Shortest healing time recorded</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="border rounded-lg p-3 text-center">
                          <p className="text-lg font-semibold">{woundReductionMedianData.max_days?.toFixed(1) || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">Max Days</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>Longest healing time recorded</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="bg-green-500/10 rounded-lg p-3 text-center border">
                          <p className="text-base font-bold text-green-600">{woundReductionMedianData.wounds_reduced || 0}</p>
                          <p className="text-xs text-muted-foreground">Improving</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>Wounds showing size reduction</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="bg-yellow-500/10 rounded-lg p-3 text-center border">
                          <p className="text-base font-bold text-yellow-600">{woundReductionMedianData.wounds_stable || 0}</p>
                          <p className="text-xs text-muted-foreground">Stable</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>Wounds with no significant change</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="bg-red-500/10 rounded-lg p-3 text-center border">
                          <p className="text-base font-bold text-red-600">{woundReductionMedianData.wounds_increased || 0}</p>
                          <p className="text-xs text-muted-foreground">Worsening</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>Wounds showing size increase</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                
                {/* Bottom Row: Reduction Trend Chart */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3">Weekly Median/Avg Progression</p>
                  {woundReductionMedianData.weeklyTrend && woundReductionMedianData.weeklyTrend.length > 0 ? (
                    <div className="h-[220px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={woundReductionMedianData.weeklyTrend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis 
                            dataKey="week" 
                            stroke="hsl(var(--muted-foreground))" 
                            fontSize={11} 
                            tickLine={false} 
                            axisLine={false}
                          />
                          <YAxis 
                            stroke="hsl(var(--muted-foreground))" 
                            fontSize={11} 
                            tickLine={false} 
                            axisLine={false}
                            tickFormatter={(value) => value.toFixed(1)}
                          />
                          <RechartsTooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '6px'
                            }}
                            formatter={(value: number) => value.toFixed(2)}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="median" 
                            name="Median" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="avg" 
                            name="Average" 
                            stroke="hsl(var(--secondary-foreground))" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ fill: 'hsl(var(--secondary-foreground))', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex h-[220px] w-full items-center justify-center">
                      <p className="text-muted-foreground text-sm">No trend data available</p>
                    </div>
                  )}
                </div>
              </div>
            ) : reductionSource === 'no-data' ? (
              <NoDataComponent title="No Data" description="No wound reduction median data found" />
            ) : (
              <div className="flex h-[400px] w-full items-center justify-center">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-sm">No data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        )}
      </div>

      <div className={chartsRow2GridClass}>
        {/* Healing Status - Column Chart (Requested as Column, so Vertical bars) */}
        {isComponentEnabled('dashboard', 'chart-healing-status') && (
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex-1">
              <CardTitle>Wound Healing Status</CardTitle>
              <CardDescription>Current status breakdown of all active wounds</CardDescription>
            </div>
            <DataSourceBadge source={healingStatusSource} showLabel={false} />
          </CardHeader>
          <CardContent>
            {healingStatusLoading && !healingStatusDataState?.length ? (
              <EcgLoader title="Loading Wound Healing Status..." minHeight="min-h-[300px]" />
            ) : healingStatusDataState && healingStatusDataState.length > 0 ? (
              <div className="flex h-[300px] w-full gap-2">
                {/* Legend on the left */}
                <div className="w-24 overflow-y-auto flex-shrink-0 py-4">
                  <div className="space-y-2">
                    {(() => {
                      // Color mapping for healing status - pastel fill with solid border
                      const healingColors: Record<string, { fill: string; stroke: string }> = {
                        'Improving': { fill: '#d1fae5', stroke: '#10b981' },      // Green pastel
                        'Stable': { fill: '#dbeafe', stroke: '#3b82f6' },         // Blue pastel
                        'Deteriorated': { fill: '#fee2e2', stroke: '#ef4444' },   // Red pastel
                        'Deteriorating': { fill: '#fee2e2', stroke: '#ef4444' },  // Red pastel
                        'New': { fill: '#fef9c3', stroke: '#eab308' },            // Yellow pastel
                      };
                      return healingStatusDataState.map((entry, index) => {
                        const isHidden = hiddenHealingStatuses.has(entry.status);
                        const colors = healingColors[entry.status] || { fill: '#e5e7eb', stroke: '#6b7280' };
                        return (
                          <div 
                            key={`legend-${index}`} 
                            className="flex items-center gap-2 whitespace-nowrap cursor-pointer hover:bg-muted/50 rounded p-1 -m-1 transition-colors"
                            onClick={() => {
                              setHiddenHealingStatuses(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(entry.status)) {
                                  newSet.delete(entry.status);
                                } else {
                                  newSet.add(entry.status);
                                }
                                return newSet;
                              });
                            }}
                          >
                            <div 
                              className="w-3 h-3 rounded-sm flex-shrink-0" 
                              style={{ backgroundColor: isHidden ? 'transparent' : colors.fill, border: `1px solid ${colors.stroke}` }}
                            />
                            <span className={`truncate text-xs ${isHidden ? 'line-through text-muted-foreground' : ''}`}>{entry.status}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
                {/* Chart */}
                <div className="flex-1 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={healingStatusDataState.filter(entry => !hiddenHealingStatuses.has(entry.status))}>
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
                  <RechartsTooltip 
                    cursor={{ fill: 'hsl(var(--accent))' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar 
                    dataKey="percentage" 
                    radius={[4, 4, 0, 0]} 
                    barSize={50}
                    isAnimationActive={true}
                    animationDuration={800}
                    animationEasing="ease-out"
                  >
                    {(() => {
                      const healingColors: Record<string, { fill: string; stroke: string }> = {
                        'Improving': { fill: '#d1fae5', stroke: '#10b981' },
                        'Stable': { fill: '#dbeafe', stroke: '#3b82f6' },
                        'Deteriorated': { fill: '#fee2e2', stroke: '#ef4444' },
                        'Deteriorating': { fill: '#fee2e2', stroke: '#ef4444' },
                        'New': { fill: '#fef9c3', stroke: '#eab308' },
                      };
                      return healingStatusDataState.filter(entry => !hiddenHealingStatuses.has(entry.status)).map((entry, index) => {
                        const colors = healingColors[entry.status] || { fill: '#e5e7eb', stroke: '#6b7280' };
                        return (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={colors.fill}
                            stroke={colors.stroke}
                            strokeWidth={1}
                            style={{ 
                              cursor: 'pointer',
                              outline: 'none',
                              transform: pressedHealingStatusIndex === index ? 'scale(0.92)' : 'scale(1)',
                              transformOrigin: 'center',
                              transformBox: 'fill-box',
                              transition: 'transform 0.15s ease-out'
                            }}
                            onClick={() => {
                              setPressedHealingStatusIndex(index);
                              setTimeout(() => {
                                setPressedHealingStatusIndex(null);
                                setSelectedHealingStatus(entry.status);
                                setHealingStatusModalOpen(true);
                              }, 150);
                            }}
                          />
                        );
                      });
                    })()}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              </div>
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
        )}

        {/* Wounds by Status - Bar Chart (Requested as Bar, so Horizontal bars) */}
        {isComponentEnabled('dashboard', 'chart-wounds-by-status') && (
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex-1">
              <CardTitle>Wounds by Status</CardTitle>
              <CardDescription>Total count of wounds in each administrative status</CardDescription>
            </div>
            <DataSourceBadge source={woundsByStatusSource} showLabel={false} />
          </CardHeader>
          <CardContent className="p-0">
            {woundsByStatusLoading && !woundsByStatusDataState?.length ? (
              <EcgLoader title="Loading Wounds by Status..." minHeight="min-h-[400px]" />
            ) : woundsByStatusDataState && woundsByStatusDataState.length > 0 ? (
              <div className="flex h-[400px] w-full gap-1 pl-[25px]">
                {/* Legend on the left - compact */}
                <div className="w-[60px] overflow-y-auto flex-shrink-0 py-4">
                  <div className="space-y-1">
                    {(() => {
                      // Color mapping for wounds by status - pastel fill with solid border
                      const statusColors: Record<string, { fill: string; stroke: string }> = {
                        'Active': { fill: '#ffedd5', stroke: '#f97316' },        // Orange pastel
                        'Resolved': { fill: '#d1fae5', stroke: '#10b981' },      // Green pastel
                        'Expired': { fill: '#e5e7eb', stroke: '#6b7280' },       // Gray pastel
                        'Discharged': { fill: '#ede9fe', stroke: '#8b5cf6' },    // Purple pastel
                        'Hospitalized Wound Related': { fill: '#fee2e2', stroke: '#ef4444' },    // Red pastel
                        'Hospitalized Not Wound Related': { fill: '#dbeafe', stroke: '#3b82f6' }, // Blue pastel
                        'Rescheduled': { fill: '#fef9c3', stroke: '#eab308' },   // Yellow pastel
                        'Sign Off': { fill: '#ccfbf1', stroke: '#14b8a6' },      // Teal pastel
                      };
                      return woundsByStatusDataState.map((entry, index) => {
                        const isHidden = hiddenWoundsByStatus.has(entry.status || entry.name);
                        const statusKey = entry.status || entry.name;
                        const colors = statusColors[statusKey] || { fill: '#e5e7eb', stroke: '#6b7280' };
                        return (
                          <div 
                            key={`legend-${index}`} 
                            className="flex items-center gap-1 cursor-pointer hover:bg-muted/50 rounded p-0.5 transition-colors"
                            onClick={() => {
                              setHiddenWoundsByStatus(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(statusKey)) {
                                  newSet.delete(statusKey);
                                } else {
                                  newSet.add(statusKey);
                                }
                                return newSet;
                              });
                            }}
                            title={statusKey}
                          >
                            <div 
                              className="w-2.5 h-2.5 rounded-sm flex-shrink-0" 
                              style={{ backgroundColor: isHidden ? 'transparent' : colors.fill, border: `1px solid ${colors.stroke}` }}
                            />
                            <span className={`truncate text-[10px] ${isHidden ? 'line-through text-muted-foreground' : ''}`}>{statusKey}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
                {/* Chart - maximized width */}
                <div className="flex-1 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={woundsByStatusDataState.filter(entry => !hiddenWoundsByStatus.has(entry.status || entry.name))} 
                    layout="vertical" 
                    margin={{ top: 5, right: 25, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis 
                      dataKey="status" 
                      type="category"
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                      width={130}
                      tickFormatter={(value) => value.length > 18 ? value.substring(0, 16) + '...' : value}
                    />
                    <RechartsTooltip 
                      cursor={{ fill: 'hsl(var(--accent))' }}
                      contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                      formatter={(value: any) => `${value} wounds`}
                    />
                    <Bar 
                      dataKey="count" 
                      radius={[0, 4, 4, 0]}
                      isAnimationActive={true}
                      animationDuration={800}
                      animationEasing="ease-out"
                    >
                      {(() => {
                        const statusColors: Record<string, { fill: string; stroke: string }> = {
                          'Active': { fill: '#ffedd5', stroke: '#f97316' },
                          'Resolved': { fill: '#d1fae5', stroke: '#10b981' },
                          'Expired': { fill: '#e5e7eb', stroke: '#6b7280' },
                          'Discharged': { fill: '#ede9fe', stroke: '#8b5cf6' },
                          'Hospitalized Wound Related': { fill: '#fee2e2', stroke: '#ef4444' },
                          'Hospitalized Not Wound Related': { fill: '#dbeafe', stroke: '#3b82f6' },
                          'Rescheduled': { fill: '#fef9c3', stroke: '#eab308' },
                          'Sign Off': { fill: '#ccfbf1', stroke: '#14b8a6' },
                        };
                        return woundsByStatusDataState.filter(entry => !hiddenWoundsByStatus.has(entry.status || entry.name)).map((entry, index) => {
                          const statusKey = entry.status || entry.name;
                          const colors = statusColors[statusKey] || { fill: '#e5e7eb', stroke: '#6b7280' };
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={colors.fill}
                              stroke={colors.stroke}
                              strokeWidth={1}
                              style={{ 
                                cursor: 'pointer',
                                outline: 'none',
                                transform: pressedWoundsByStatusIndex === index ? 'scale(0.92)' : 'scale(1)',
                                transformOrigin: 'center',
                                transformBox: 'fill-box',
                                transition: 'transform 0.15s ease-out'
                              }}
                              onClick={() => {
                                setPressedWoundsByStatusIndex(index);
                                setTimeout(() => {
                                  setPressedWoundsByStatusIndex(null);
                                  setSelectedDisposition(statusKey);
                                  setDispositionModalOpen(true);
                                }, 150);
                              }}
                            />
                          );
                        });
                      })()}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                </div>
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
        )}
      </div>
      </>
      )}
      
      {/* Critical Cases Modal */}
      <CriticalCasesModal
        criticalPatients={criticalCasesData?.data || []}
        totalWounds={criticalCasesData?.total_wounds || 0}
        totalPatients={criticalCasesData?.total_patients || 0}
        facilityId={selectedFacilityId || ''}
        isLoading={criticalCasesLoading}
        open={criticalCasesModalOpen}
        onOpenChange={setCriticalCasesModalOpen}
        onRefetch={refetchCriticalCases}
        startDate={startDateStr}
        endDate={endDateStr}
      />
      
      {/* Reports Generated Modal */}
      <ReportsGeneratedModal
        reportPatients={reportsData?.data || []}
        totalEncounters={reportsData?.total_encounters || 0}
        totalPatients={reportsData?.total_patients || 0}
        isLoading={reportsLoading}
        open={reportsModalOpen}
        onOpenChange={setReportsModalOpen}
        dateRange={startDateStr && endDateStr ? { start: startDateStr, end: endDateStr } : undefined}
      />
      
      {/* Wounds by Etiology Modal */}
      <WoundsByEtiologyModal
        patients={woundsByEtiologyData?.data || []}
        totalWounds={woundsByEtiologyData?.total_wounds || 0}
        totalPatients={woundsByEtiologyData?.total_patients || 0}
        etiology={selectedEtiology || ''}
        facilityId={selectedFacilityId || ''}
        isLoading={woundsByEtiologyLoading}
        open={etiologyModalOpen}
        onOpenChange={setEtiologyModalOpen}
        onRefetch={refetchWoundsByEtiology}
        startDate={startDateStr}
        endDate={endDateStr}
      />
      
      {/* Wounds by Healing Status Modal */}
      <WoundsByStatusModal
        patients={woundsByHealingStatusData?.data || []}
        totalWounds={woundsByHealingStatusData?.total_wounds || 0}
        totalPatients={woundsByHealingStatusData?.total_patients || 0}
        statusValue={selectedHealingStatus || ''}
        statusType="healingStatus"
        facilityId={selectedFacilityId || ''}
        isLoading={woundsByHealingStatusLoading}
        open={healingStatusModalOpen}
        onOpenChange={setHealingStatusModalOpen}
        onRefetch={refetchWoundsByHealingStatus}
        startDate={startDateStr}
        endDate={endDateStr}
      />
      
      {/* Wounds by Disposition Modal */}
      <WoundsByStatusModal
        patients={woundsByDispositionData?.data || []}
        totalWounds={woundsByDispositionData?.total_wounds || 0}
        totalPatients={woundsByDispositionData?.total_patients || 0}
        statusValue={selectedDisposition || ''}
        statusType="disposition"
        facilityId={selectedFacilityId || ''}
        isLoading={woundsByDispositionLoading}
        open={dispositionModalOpen}
        onOpenChange={setDispositionModalOpen}
        onRefetch={refetchWoundsByDisposition}
        startDate={startDateStr}
        endDate={endDateStr}
      />
    </div>
  );
}

function DatePicker({ 
  date, 
  setDate, 
  label, 
  enabledDates,
  isLoading,
  disabled
}: { 
  date: Date | undefined, 
  setDate: (d: Date | undefined) => void, 
  label: string, 
  enabledDates?: string[],
  isLoading?: boolean,
  disabled?: boolean
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[200px] justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {isLoading ? "Loading..." : date ? format(date, "PPP") : <span>{label}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[288px] p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
          defaultMonth={date}
          enabledDates={enabledDates}
          className="w-full"
        />
      </PopoverContent>
    </Popover>
  );
}
