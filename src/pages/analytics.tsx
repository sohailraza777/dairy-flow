import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { getCollections, getSales, getCustomers } from "@/lib/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, formatLitres, formatDate } from "@/lib/format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Droplets, IndianRupee, PieChart as PieChartIcon, TrendingUp } from "lucide-react";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const STATUS_COLORS = {
  paid: "hsl(var(--chart-2))",
  pending: "hsl(var(--destructive))",
  partial: "hsl(var(--chart-4))"
};

export default function Analytics() {
  const [days, setDays] = React.useState<number>(14);

  // Unified Analytics Query
  const { data, isLoading } = useQuery({
    queryKey: ["analytics", days],
    queryFn: async () => {
      const [collections, sales, customers] = await Promise.all([
        getCollections(),
        getSales(),
        getCustomers()
      ]);

      // Filter data based on selected timeframe
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const filteredCollections = collections.filter(c => new Date(c.date) >= cutoffDate);
      const filteredSales = sales.filter(s => new Date(s.date) >= cutoffDate);

      // 1. Collections & Revenue Trend (Grouped by Date)
      const trendMap: Record<string, { date: string, value: number, revenue: number }> = {};
      
      filteredCollections.forEach(c => {
        const d = c.date.split('T')[0];
        if (!trendMap[d]) trendMap[d] = { date: d, value: 0, revenue: 0 };
        trendMap[d].value += (Number(c.litres) || 0);
      });

      filteredSales.forEach(s => {
        const d = s.date.split('T')[0];
        if (!trendMap[d]) trendMap[d] = { date: d, value: 0, revenue: 0 };
        trendMap[d].revenue += (Number(s.total) || 0);
      });

      const trendData = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

      // 2. Milk Type Breakdown
      const milkMap: Record<string, number> = {};
      filteredCollections.forEach(c => {
        const type = c.milkType || 'Mixed';
        milkMap[type] = (milkMap[type] || 0) + (Number(c.litres) || 0);
      });
      const milkTypeData = Object.entries(milkMap).map(([label, value]) => ({ label, value }));

      // 3. Payment Status Breakdown
      const statusMap: Record<string, number> = { paid: 0, pending: 0, partial: 0 };
      filteredSales.forEach(s => {
        const status = s.status || 'pending';
        statusMap[status] = (statusMap[status] || 0) + 1;
      });
      const paymentStatusData = Object.entries(statusMap).map(([label, value]) => ({ label, value }));

      // 4. Top Suppliers
      const supplierMap: Record<string, { customerName: string, totalLitres: number, totalAmount: number }> = {};
      filteredCollections.forEach(c => {
        if (!supplierMap[c.uid]) {
          supplierMap[c.uid] = { customerName: c.customerName || 'Unknown', totalLitres: 0, totalAmount: 0 };
        }
        supplierMap[c.uid].totalLitres += (Number(c.litres) || 0);
        supplierMap[c.uid].totalAmount += (Number(c.amount) || 0);
      });

      const topSuppliersData = Object.values(supplierMap)
        .sort((a, b) => b.totalLitres - a.totalLitres)
        .slice(0, 10);

      return {
        collectionsTrend: trendData.map(t => ({ date: t.date, value: t.value })),
        revenueTrend: trendData.map(t => ({ date: t.date, value: t.revenue })),
        milkTypeBreakdown: milkTypeData,
        paymentStatus: paymentStatusData,
        topSuppliers: topSuppliersData
      };
    }
  });

  const collectionsTrend = data?.collectionsTrend || [];
  const revenueTrend = data?.revenueTrend || [];
  const milkTypeBreakdown = data?.milkTypeBreakdown || [];
  const paymentStatus = data?.paymentStatus || [];
  const topSuppliers = data?.topSuppliers || [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Deep dive into your dairy operations.</p>
        </div>
        <div className="flex items-center gap-2 bg-card border rounded-lg p-1">
          <span className="text-sm font-medium px-2">Timeframe:</span>
          <Select value={days.toString()} onValueChange={(val) => setDays(parseInt(val))}>
            <SelectTrigger className="w-[120px] border-none shadow-none h-8 bg-transparent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="14">Last 14 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-primary" />
              Collections Trend
            </CardTitle>
            <CardDescription>Volume of milk collected over time</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : collectionsTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={collectionsTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tickFormatter={(val) => new Date(val).getDate().toString()} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(val) => `${val}L`} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--popover))", borderRadius: "var(--radius)" }}
                    labelFormatter={(val) => formatDate(val)}
                  />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-primary" />
              Revenue Trend
            </CardTitle>
            <CardDescription>Income from sales over time</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {isLoading ? (
               <Skeleton className="h-full w-full" />
            ) : revenueTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tickFormatter={(val) => new Date(val).getDate().toString()} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(val) => `₹${val/1000}k`} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--popover))", borderRadius: "var(--radius)" }}
                    labelFormatter={(val) => formatDate(val)}
                  />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--chart-2))" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary" />
              Milk Type Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col sm:flex-row items-center gap-8">
            <div className="h-[200px] w-[200px] shrink-0">
              {isLoading ? (
                <Skeleton className="h-full w-full rounded-full" />
              ) : milkTypeBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={milkTypeBreakdown}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={90}
                      paddingAngle={5} dataKey="value" nameKey="label"
                    >
                      {milkTypeBreakdown.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data</div>
              )}
            </div>
            <div className="flex-1 w-full space-y-4">
              {!isLoading && milkTypeBreakdown.map((item, i) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="capitalize text-sm font-medium">{item.label}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{formatLitres(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary" />
              Payment Status
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col sm:flex-row items-center gap-8">
            <div className="h-[200px] w-[200px] shrink-0">
              {isLoading ? (
                <Skeleton className="h-full w-full rounded-full" />
              ) : paymentStatus.some(s => s.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentStatus}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={90}
                      paddingAngle={5} dataKey="value" nameKey="label"
                    >
                      {paymentStatus.map((entry) => (
                        <Cell key={`cell-${entry.label}`} fill={STATUS_COLORS[entry.label as keyof typeof STATUS_COLORS] || COLORS[0]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data</div>
              )}
            </div>
            <div className="flex-1 w-full space-y-4">
              {!isLoading && paymentStatus.map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[item.label as keyof typeof STATUS_COLORS] || COLORS[0] }} />
                    <span className="capitalize text-sm font-medium">{item.label}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{item.value} sales</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Top Suppliers
          </CardTitle>
          <CardDescription>Highest volume suppliers over selected period</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          {isLoading ? (
             <Skeleton className="h-full w-full" />
          ) : topSuppliers.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topSuppliers}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="customerName" tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" tickFormatter={(val) => `${val}L`} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(val) => `₹${val/1000}k`} tickLine={false} axisLine={false} />
                <RechartsTooltip formatter={(val: number, name: string) => [name === 'totalLitres' ? `${val} L` : formatCurrency(val), name === 'totalLitres' ? 'Litres' : 'Amount']} />
                <Bar yAxisId="left" dataKey="totalLitres" name="Litres" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="totalAmount" name="Amount" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data available</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}