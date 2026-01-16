import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity, Users, Stethoscope, Loader2, AlertCircle, RefreshCcw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { FacilityInfoBanner } from "@/components/facility-info-banner";
import { DataSourceBadge } from "@/components/data-source-badge";
import { LOCAL_API, getFacilityId } from "@/lib/api-config";

export default function AcuityReport() {
  const { getAuthInfo, getToken } = useAuth();
  const authInfo = getAuthInfo();
  const facilityId = getFacilityId(authInfo.entityId);
  
  // If no facilityId, show error - shouldn't happen if auth is working
  if (!facilityId) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Error</AlertTitle>
          <AlertDescription>
            Missing facility information. Please log in again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const token = getToken();
  const [dataSource, setDataSource] = useState<'backend' | 'mock'>('mock');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['facilityAcuityIndex', facilityId],
    queryFn: async () => {
      const url = LOCAL_API.FACILITY_ACUITY_INDEX;
      
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Facility-Id": facilityId,
      };
      
      // Add authentication header if available
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(url, { 
        method: "GET",
        headers 
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('[AcuityReport] Received response:', result);
      
      // Handle different response formats
      if (result.status === false) {
        throw new Error(result.error || "Failed to fetch acuity data");
      }
      
      // Extract data from different response structures
      const data = result.data || result;
      return Array.isArray(data) ? data : (data.data || [data] || []);
    }
  });

  // Update data source based on whether data was successfully fetched from backend
  useEffect(() => {
    if (!isLoading && !error && data && Array.isArray(data) && data.length > 0) {
      // Data loaded successfully from backend
      setDataSource('backend');
    } else if (error || (isLoading === false && !data)) {
      // Error occurred or no data, using mock
      setDataSource('mock');
    }
  }, [data, error, isLoading]);

  // Process data - assuming the API returns an array of historical data or a single object.
  // If it's an array, we take the latest for the cards and use the array for the chart.
  // If it's a single object, we might not have trend data, or the trend data is nested.
  
  let currentData = {
    acuityIndex: 0,
    activeWounds: 0,
    activePatients: 0
  };
  
  let trendData: any[] = [];

  if (data) {
    if (Array.isArray(data)) {
        // Data is an array of acuity records (one per week)
        // Each record contains: { week, patients, wounds, Facility Acuity Index }
        if (data.length > 0) {
            const latest = data[data.length - 1];
            
            // Map the backend field names to our expected field names
            const acuityIndexValue = latest["Facility Acuity Index"] 
              ? parseFloat(latest["Facility Acuity Index"]) 
              : 0;
            
            currentData = {
                acuityIndex: acuityIndexValue,
                activeWounds: latest.wounds || 0,
                activePatients: latest.patients || 0
            };
            
            // Map for chart - use week numbers from the data
            trendData = data.map((item) => ({
                week: `W${item.week || 'N/A'}`,
                index: item["Facility Acuity Index"] 
                  ? parseFloat(item["Facility Acuity Index"]) 
                  : 0
            }));
        }
    } else {
        // Single object response
        currentData = {
            acuityIndex: data.acuityIndex || data.AcuityIndex || data["Facility Acuity Index"] || 0,
            activeWounds: data.activeWounds || data.ActiveWounds || data.wounds || 0,
            activePatients: data.activePatients || data.ActivePatients || data.patients || 0
        };
        
        // If the single object has a 'trend' or 'history' field
        if (Array.isArray(data.trend)) {
            trendData = data.trend;
        } else if (Array.isArray(data.history)) {
            trendData = data.history;
        } else {
            // No trend data available, maybe just show a single point or nothing
            trendData = [{ week: 'Current', index: currentData.acuityIndex }];
        }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Facility Acuity Index</h1>
            <p className="text-muted-foreground mt-1">Measurement of wound care complexity and patient load</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        </Button>
      </div>

      {/* Facility Info Banner */}
      <FacilityInfoBanner />

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error fetching report</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "An unknown error occurred while loading the data."}
          </AlertDescription>
        </Alert>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center h-[400px] space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading acuity data...</p>
        </div>
      ) : !data ? (
         <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Data</AlertTitle>
          <AlertDescription>No acuity data available for this facility.</AlertDescription>
        </Alert>
      ) : (
        <>
            <div className="grid gap-3 md:grid-cols-3">
                <Card className="flex flex-col h-[148px]">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Facility Acuity Index</CardTitle>
                        <Stethoscope className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent className="flex-grow flex items-center">
                        <div className="text-3xl font-bold">{typeof currentData.acuityIndex === 'number' ? currentData.acuityIndex.toFixed(1) : currentData.acuityIndex}</div>
                    </CardContent>
                    <CardContent className="flex items-center justify-between pt-0 pb-2">
                        <p className="text-xs text-muted-foreground">Current Score</p>
                        {data && <DataSourceBadge source={dataSource} showLabel={false} />}
                    </CardContent>
                </Card>
                <Card className="flex flex-col h-[148px]">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Active Wounds</CardTitle>
                        <Activity className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent className="flex-grow flex items-center">
                        <div className="text-3xl font-bold">{currentData.activeWounds}</div>
                    </CardContent>
                    <CardContent className="flex justify-end pt-0 pb-2">
                        {data && <DataSourceBadge source={dataSource} showLabel={false} />}
                    </CardContent>
                </Card>
                <Card className="flex flex-col h-[148px]">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Active Patients</CardTitle>
                        <Users className="h-4 w-4 text-chart-2" />
                    </CardHeader>
                    <CardContent className="flex-grow flex items-center">
                        <div className="text-3xl font-bold">{currentData.activePatients}</div>
                    </CardContent>
                    <CardContent className="flex justify-end pt-0 pb-2">
                        {data && <DataSourceBadge source={dataSource} showLabel={false} />}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div className="flex flex-col gap-0.5">
                        <CardTitle className="text-base">Acuity Index Trend</CardTitle>
                        <CardDescription className="text-xs">Tracking complexity over time</CardDescription>
                    </div>
                    {data && <DataSourceBadge source={dataSource} showLabel={false} />}
                </CardHeader>
                <CardContent>
                    <div className="h-[322px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
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
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </>
      )}
    </div>
  );
}
