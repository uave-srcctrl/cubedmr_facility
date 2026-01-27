import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2, AlertCircle, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { FacilityInfoBanner } from "@/components/facility-info-banner";
import { DataSourceBadge } from "@/components/data-source-badge";
import { EcgLoader } from "@/components/ecg-loader";
import { LOCAL_API, getFacilityId } from "@/lib/api-config";
import { normalizeFieldNamesArray } from "@/lib/field-mapper";

// Colors for the chart
const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#8884d8",
  "#82ca9d",
  "#ffc658"
];

interface EtiologyItem {
  woundEtiology: string;
  count: number;
  percentage: number;
}

export default function EtiologyReport() {
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

  const facilityName = authInfo.entityName || authInfo.email?.split('@')[0] || "Facility";
  const token = getToken();
  
  const [date, setDate] = useState<Date>(new Date());
  const [dataSource, setDataSource] = useState<'backend' | 'mock'>('mock');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['etiologyReport', format(date, 'yyyy-MM-dd'), facilityId],
    queryFn: async () => {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const url = `${LOCAL_API.ETIOLOGY_DISTRIBUTION}?date=${formattedDate}`;
      
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
      console.log('[EtiologyReport] Received response:', result);
      
      // Handle if result is wrapped in array or object
      // etiology returns an array of items (not a single object like wound-outcome)
      let data;
      if (result.status === false) {
        throw new Error(result.error || "Failed to fetch etiology data");
      }
      
      if (Array.isArray(result.data)) {
        data = result.data;
      } else if (result.data && Array.isArray(result.data)) {
        data = result.data;
      } else if (Array.isArray(result)) {
        data = result;
      } else {
        data = [];
      }
      // Normalize field names from backend format
      return normalizeFieldNamesArray(data);
    }
  });

  // Track data source based on response - use useEffect to properly update state
  useEffect(() => {
    if (!isLoading && !error && data && data.length > 0) {
      // Data loaded successfully from backend
      setDataSource('backend');
    } else if (error) {
      // Error occurred, using mock
      setDataSource('mock');
    }
  }, [data, error, isLoading]);

  // Process data for charts and tables
  // We expect the API to return objects. We might need to map keys if they differ.
  // Based on user prompt: "Wound Etiology", "Count", "Percentage"
  const processedData = (data || []).map((item: any) => {
    let etiologyName = item.woundEtiology || item['Wound Etiology'] || item.name || 'Unknown';
    // Replace 'null' string with 'Other'
    if (etiologyName === 'null' || etiologyName === null) {
      etiologyName = 'Other';
    }
    return {
      name: etiologyName,
      value: Number(item.count || item.Count || item.value || 0),
      percentage: Number(item.percentage || item.Percentage || 0),
      fill: COLORS[0] // Placeholder, will assign in render
    };
  }).map((item: any, index: number) => ({
    ...item,
    fill: COLORS[index % COLORS.length]
  }));

  const totalCount = processedData.reduce((acc: number, curr: any) => acc + curr.value, 0);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Wound Etiology Distribution</h1>
              <p className="text-muted-foreground mt-1">Breakdown of wound types by classification and frequency</p>
          </div>
          
          <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[288px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[288px] p-0" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
                className="w-full"
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>
      </div>
      
      <FacilityInfoBanner facilityId={facilityId} facilityName={facilityName} />

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error fetching report</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "An unknown error occurred while loading the data. Please check your connection or try again."}
          </AlertDescription>
        </Alert>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center h-[400px] space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading report data...</p>
        </div>
      ) : processedData.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Data Available</AlertTitle>
          <AlertDescription>
            No records found for the selected date ({format(date, 'PPP')}). Try selecting a different date.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader className="relative pb-2">
                    <CardTitle>Visual Distribution</CardTitle>
                    <CardDescription>Proportion of wound types for {format(date, 'PPP')}</CardDescription>
                    <div className="absolute top-4 right-4">
                        <DataSourceBadge source={dataSource} showLabel={false} />
                    </div>
                </CardHeader>
                <CardContent className="relative pl-2 pr-2">
                    {isLoading ? (
                        <EcgLoader title="Loading Visual Distribution..." minHeight="min-h-[330px]" />
                    ) : (
                        <div className="flex h-[330px] w-full gap-4 pl-1.25">
                        {/* Legend on the left with scroll */}
                        <div className="w-24 overflow-y-auto flex-shrink-0 py-8">
                            <div className="space-y-2">
                                {processedData.map((entry: any, index: number) => (
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
                        <div className="flex-1 min-w-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                                    <Pie
                                        data={processedData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={90}
                                        outerRadius={135}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {processedData.map((entry: any, index: number) => (
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
                    )}
                </CardContent>
            </Card>

            <Card>
            <CardHeader className="relative pb-2">
                <CardTitle>Detailed Etiology Count</CardTitle>
                <CardDescription>Specific count and percentage for each wound type</CardDescription>
                <div className="absolute top-4 right-4">
                    <DataSourceBadge source={dataSource} showLabel={false} />
                </div>
            </CardHeader>
            <CardContent className="relative pb-0">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead className="w-[50%]">Wound Etiology</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Percentage</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {processedData.map((item: any) => (
                    <TableRow key={item.name}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right">{item.value}</TableCell>
                        <TableCell className="text-right">{item.percentage.toFixed(2)}%</TableCell>
                    </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right">{totalCount}</TableCell>
                        <TableCell className="text-right">100%</TableCell>
                    </TableRow>
                </TableBody>
                </Table>
            </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}
