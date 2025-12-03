import { useState } from "react";
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
  const [date, setDate] = useState<Date>(new Date('2025-11-16'));

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['etiologyReport', format(date, 'yyyy-MM-dd')],
    queryFn: async () => {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const params = new URLSearchParams({
        entity: 'Report',
        reportName: 'rptEtiologyDistribution',
        facilityId: '5',
        dos: formattedDate
      });
      
      const response = await fetch(`https://cubed-mr.app/api/report?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }
      
      const result = await response.json();
      // Handle if result is wrapped in { data: ... } or is array directly
      // Also normalize keys if needed. Assuming API returns array of objects.
      return Array.isArray(result) ? result : (result.data || []);
    }
  });

  // Process data for charts and tables
  // We expect the API to return objects. We might need to map keys if they differ.
  // Based on user prompt: "Wound Etiology", "Count", "Percentage"
  const processedData = (data || []).map((item: any) => ({
    name: item.woundEtiology || item['Wound Etiology'] || item.name || 'Unknown',
    value: Number(item.count || item.Count || item.value || 0),
    percentage: Number(item.percentage || item.Percentage || 0),
    fill: COLORS[0] // Placeholder, will assign in render
  })).map((item: any, index: number) => ({
    ...item,
    fill: COLORS[index % COLORS.length]
  }));

  const totalCount = processedData.reduce((acc: number, curr: any) => acc + curr.value, 0);

  return (
    <div className="space-y-8">
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
                  "w-[240px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

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
                <CardHeader>
                    <CardTitle>Visual Distribution</CardTitle>
                    <CardDescription>Proportion of wound types for {format(date, 'PPP')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                            data={processedData}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={120}
                            paddingAngle={2}
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
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card>
            <CardHeader>
                <CardTitle>Detailed Etiology Count</CardTitle>
                <CardDescription>Specific count and percentage for each wound type</CardDescription>
            </CardHeader>
            <CardContent>
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
                        <TableCell className="text-right">{item.percentage}%</TableCell>
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
