import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line
} from "recharts";
import { 
  woundEtiologyData, 
  woundReductionData, 
  healingStatusData, 
  woundsByStatusData 
} from "@/lib/mockData";
import { ArrowUpRight, Activity, Users, FileText, AlertCircle } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Facility Dashboard</h1>
        <p className="text-muted-foreground mt-2">Overview of wound care performance and active cases.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Wounds</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <span className="text-emerald-600 flex items-center mr-1 font-medium">
                <ArrowUpRight className="h-3 w-3 mr-0.5" /> +4%
              </span>
              from last month
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-chart-2 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Healing Rate</CardTitle>
            <Users className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">72%</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <span className="text-emerald-600 flex items-center mr-1 font-medium">
                <ArrowUpRight className="h-3 w-3 mr-0.5" /> +2.5%
              </span>
              improvement
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-chart-3 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reports Generated</CardTitle>
            <FileText className="h-4 w-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">128</div>
            <p className="text-xs text-muted-foreground mt-1">
              In the last 30 days
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-destructive shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Cases</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground mt-1">
              Requiring immediate attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Wound Etiology - Pie Chart */}
        <Card className="col-span-3 shadow-sm">
          <CardHeader>
            <CardTitle>Wound Etiology Distribution</CardTitle>
            <CardDescription>Distribution of wound types across all active patients</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={woundEtiologyData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {woundEtiologyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                    itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Average Reduction - Column Chart */}
        <Card className="col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle>Average Wound Reduction</CardTitle>
            <CardDescription>Month over month percentage reduction in wound area</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={woundReductionData}>
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
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Healing Status - Column Chart (Requested as Column, so Vertical bars) */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Wound Healing Status</CardTitle>
            <CardDescription>Current status breakdown of all active wounds</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={healingStatusData}>
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
                    {healingStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Wounds by Status - Bar Chart (Requested as Bar, so Horizontal bars) */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Wounds by Status</CardTitle>
            <CardDescription>Total count of wounds in each administrative status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={woundsByStatusData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="status" 
                    type="category"
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    width={100}
                  />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--accent))' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="hsl(var(--chart-5))" 
                    radius={[0, 4, 4, 0]} 
                    barSize={30}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
