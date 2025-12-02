import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { etiologyListData, woundEtiologyData } from "@/lib/mockData";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

export default function EtiologyReport() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Wound Etiology Distribution</h1>
        <p className="text-muted-foreground mt-1">Breakdown of wound types by classification and frequency</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle>Visual Distribution</CardTitle>
                <CardDescription>Proportion of wound types</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                        data={woundEtiologyData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={2}
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
                {etiologyListData.map((item) => (
                  <TableRow key={item.type}>
                    <TableCell className="font-medium">{item.type}</TableCell>
                    <TableCell className="text-right">{item.count}</TableCell>
                    <TableCell className="text-right">{item.percentage}%</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{etiologyListData.reduce((acc, curr) => acc + curr.count, 0)}</TableCell>
                    <TableCell className="text-right">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
