import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { acuityIndexData } from "@/lib/mockData";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity, Users, Stethoscope } from "lucide-react";

export default function AcuityReport() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Facility Acuity Index</h1>
        <p className="text-muted-foreground mt-1">Measurement of wound care complexity and patient load</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary text-primary-foreground">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-primary-foreground/80">Facility Acuity Index</CardTitle>
                <Stethoscope className="h-4 w-4 text-primary-foreground/80" />
            </CardHeader>
            <CardContent>
                <div className="text-4xl font-bold">{acuityIndexData.acuityIndex}</div>
                <p className="text-xs text-primary-foreground/60 mt-1">High Complexity</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Wounds</CardTitle>
                <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold">{acuityIndexData.activeWounds}</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Patients</CardTitle>
                <Users className="h-4 w-4 text-chart-2" />
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold">{acuityIndexData.activePatients}</div>
            </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Acuity Index Trend</CardTitle>
            <CardDescription>Tracking complexity over the last 4 weeks</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={acuityIndexData.trend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis 
                            dataKey="week" 
                            stroke="hsl(var(--muted-foreground))" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false}
                        />
                        <YAxis 
                            domain={[3, 5]}
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
    </div>
  );
}
