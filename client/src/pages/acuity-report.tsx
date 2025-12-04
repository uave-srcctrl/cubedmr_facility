import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity, Users, Stethoscope, Loader2, AlertCircle, RefreshCcw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AcuityReport() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['facilityAcuityIndex', '5'],
    queryFn: async () => {
      const facilityId = '5';
      const url = `https://cubed-mr.app/api/reports/facility-acuity-index/${facilityId}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }
      
      const result = await response.json();
      return Array.isArray(result) ? result : (result.data || result);
    }
  });

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
        // Sort by date if possible, assuming there is a date field like 'dos' or 'date'
        // If no date field, we take the array as is.
        // Assuming the last item is the most recent.
        if (data.length > 0) {
            const sortedData = [...data]; // Sort logic would go here if we knew the date field key
            const latest = sortedData[sortedData.length - 1];
            
            currentData = {
                acuityIndex: latest.acuityIndex || latest.AcuityIndex || 0,
                activeWounds: latest.activeWounds || latest.ActiveWounds || 0,
                activePatients: latest.activePatients || latest.ActivePatients || 0
            };
            
            // Map for chart
            trendData = sortedData.map((item, index) => ({
                week: item.dos ? new Date(item.dos).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : `W${index + 1}`,
                index: item.acuityIndex || item.AcuityIndex || 0
            }));
        }
    } else {
        // Single object
        currentData = {
            acuityIndex: data.acuityIndex || data.AcuityIndex || 0,
            activeWounds: data.activeWounds || data.ActiveWounds || 0,
            activePatients: data.activePatients || data.ActivePatients || 0
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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Facility Acuity Index</h1>
            <p className="text-muted-foreground mt-1">Measurement of wound care complexity and patient load</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        </Button>
      </div>

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
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-primary text-primary-foreground">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-primary-foreground/80">Facility Acuity Index</CardTitle>
                        <Stethoscope className="h-4 w-4 text-primary-foreground/80" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">{typeof currentData.acuityIndex === 'number' ? currentData.acuityIndex.toFixed(1) : currentData.acuityIndex}</div>
                        <p className="text-xs text-primary-foreground/60 mt-1">Current Score</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Active Wounds</CardTitle>
                        <Activity className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{currentData.activeWounds}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Active Patients</CardTitle>
                        <Users className="h-4 w-4 text-chart-2" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{currentData.activePatients}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Acuity Index Trend</CardTitle>
                    <CardDescription>Tracking complexity over time</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis 
                                    dataKey="week" 
                                    stroke="hsl(var(--muted-foreground))" 
                                    fontSize={12} 
                                    tickLine={false} 
                                    axisLine={false}
                                />
                                <YAxis 
                                    domain={['auto', 'auto']}
                                    stroke="hsl(var(--muted-foreground))" 
                                    fontSize={12} 
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
                                    strokeWidth={3} 
                                    dot={{ r: 6, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "hsl(var(--background))" }}
                                    activeDot={{ r: 8 }}
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
