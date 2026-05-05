import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { getCustomers, getCollections, getSales, getPayments } from "@/lib/db";
import { addDoc, collection } from "firebase/firestore"; 
import { db } from "@/lib/firebase"; 
import { GoogleGenerativeAI } from "@google/generative-ai"; // <-- 1. NEW GEMINI IMPORT
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, formatLitres, formatDate } from "@/lib/format";
import { 
  Droplets, 
  IndianRupee, 
  Users, 
  CreditCard,
  Activity,
  ShoppingCart,
  Bot 
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button"; 
import { Input } from "@/components/ui/input";   
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";    

// Unified hook to fetch all user data from Firestore and calculate stats
function useDashboardData() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["dashboard-data", user?.uid],
    queryFn: async () => {
      if (!user?.uid) throw new Error("No user authenticated");

      const [customers, collections, sales, payments] = await Promise.all([
        getCustomers(),
        getCollections(),
        getSales(),
        getPayments()
      ]) as [any[], any[], any[], any[]];

      const totalLitresThisMonth = collections.reduce((sum, c) => sum + (Number(c.litres) || 0), 0);
      const revenueThisMonth = sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
      
      const suppliers = customers.filter(c => c.type === 'supplier').length;
      const buyers = customers.filter(c => c.type === 'buyer').length;
      
      const totalSales = sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
      const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const pendingPaymentsAmount = Math.max(0, totalSales - totalPaid);

      const milkTypes: Record<string, number> = {};
      collections.forEach(c => {
        const type = c.milkType || 'Mixed'; 
        milkTypes[type] = (milkTypes[type] || 0) + (Number(c.litres) || 0);
      });
      const milkTypeBreakdown = Object.entries(milkTypes).map(([label, value]) => ({ label, value }));

      const supplierTotals: Record<string, number> = {};
      collections.forEach(c => {
        const name = c.customerName || 'Unknown Supplier'; 
        supplierTotals[name] = (supplierTotals[name] || 0) + (Number(c.litres) || 0);
      });
      const topSuppliers = Object.entries(supplierTotals)
        .map(([customerName, totalLitres]) => ({ customerName, totalLitres }))
        .sort((a, b) => b.totalLitres - a.totalLitres)
        .slice(0, 5);

      const recentCollections = collections.map(c => ({
        id: c.id,
        type: 'collection',
        customerName: c.customerName || 'Supplier',
        description: 'Milk Collection',
        date: c.date || new Date().toISOString(),
        amount: Number(c.litres) || 0
      }));
      
      const recentSales = sales.map(s => ({
        id: s.id,
        type: 'sale',
        customerName: s.buyerName || 'Buyer',
        description: 'Milk Sale',
        date: s.date || new Date().toISOString(),
        amount: Number(s.total) || 0
      }));

      const recentActivity = [...recentCollections, ...recentSales]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      const trendMap: Record<string, { date: string, collections: number, revenue: number }> = {};
      const today = new Date();
      
      for (let i = 13; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        trendMap[dateStr] = { date: dateStr, collections: 0, revenue: 0 };
      }

      collections.forEach(c => {
        if (c.date) {
          const dateStr = c.date.split('T')[0];
          if (trendMap[dateStr]) {
            trendMap[dateStr].collections += (Number(c.litres) || 0);
          }
        }
      });

      sales.forEach(s => {
        if (s.date) {
          const dateStr = s.date.split('T')[0];
          if (trendMap[dateStr]) {
            trendMap[dateStr].revenue += (Number(s.total) || 0);
          }
        }
      });

      const trendArray = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

      return {
        summary: {
          totalLitresThisMonth,
          totalLitresPreviousMonth: 0,
          revenueThisMonth,
          revenuePreviousMonth: 0,
          activeCustomers: customers.length,
          suppliers,
          buyers,
          pendingPaymentsAmount,
          pendingSalesCount: sales.filter(s => s.status !== 'paid').length
        },
        milkTypeBreakdown: milkTypeBreakdown.length > 0 ? milkTypeBreakdown : [],
        topSuppliers: topSuppliers.length > 0 ? topSuppliers : [],
        recentActivity: recentActivity.length > 0 ? recentActivity : [],
        collectionsTrend: trendArray.map(t => ({ date: t.date, value: t.collections })),
        revenueTrend: trendArray.map(t => ({ date: t.date, value: t.revenue }))
      };
    },
    enabled: !!user?.uid 
  });
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function Dashboard() {
  const { data, isLoading } = useDashboardData();
  const { user, role, lastLoginAt } = useAuth();
  const { toast } = useToast();

  const [aiPrompt, setAiPrompt] = React.useState("");
  const [isProcessing, setIsProcessing] = React.useState(false);

  const summary = data?.summary;
  const collectionsTrend = data?.collectionsTrend || [];
  const revenueTrend = data?.revenueTrend || [];
  const milkTypeBreakdown = data?.milkTypeBreakdown || [];
  const topSuppliers = data?.topSuppliers || [];
  const recentActivity = data?.recentActivity || [];

  const greetingName = user?.displayName || user?.email?.split("@")[0] || "there";
  const lastLoginLabel = lastLoginAt
    ? new Date(lastLoginAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Just now";

  // --- 2. NEW REAL AI BRAIN LOGIC (Gemini) ---
  const handleAIAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    
    setIsProcessing(true);
    toast({ title: "🤖 Gemini is thinking...", description: "Analyzing your command." });

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API key is missing! Please complete Step 2.");
      }
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
      });

      const prompt = `
        You are a dairy farm logistics assistant. Extract the intent from the following user command.
        Return ONLY a JSON object matching this exact structure, with no other text:
        {
          "action": "collection" | "payment" | "unknown",
          "customerName": "Extracted name or null",
          "litres": number (use 0 if not mentioned),
          "amount": number (use 0 if not mentioned)
        }
        User Command: "${aiPrompt}"
      `;

      const result = await model.generateContent(prompt);
      const aiDecision = JSON.parse(result.response.text());
      
      const customers = (await getCustomers()) as any[]; 
      
      const supplier = customers.find((c: any) => 
        aiDecision.customerName && 
        c.name?.toLowerCase().includes(aiDecision.customerName.toLowerCase().split(' ')[0])
      );

      if (aiDecision.action === "collection" && aiDecision.litres > 0 && supplier) {
        await addDoc(collection(db, "collections"), {
          customerId: supplier.id,
          customerName: supplier.name,
          date: new Date().toISOString(),
          shift: new Date().getHours() < 12 ? "morning" : "evening",
          milkType: "cow", 
          litres: aiDecision.litres,
          ratePerLitre: supplier.ratePerLitre || 50,
          amount: aiDecision.litres * (supplier.ratePerLitre || 50),
          createdAt: new Date().toISOString()
        });
        
        toast({ title: "✅ Success!", description: `Logged ${aiDecision.litres}L collection for ${supplier.name}.` });
        setAiPrompt("");
        setTimeout(() => window.location.reload(), 1500); 
        return;
      } 
      
      if (aiDecision.action === "payment" && aiDecision.amount > 0 && supplier) {
        await addDoc(collection(db, "payments"), {
          customerId: supplier.id,
          customerName: supplier.name,
          date: new Date().toISOString(),
          amount: aiDecision.amount,
          method: "cash",
          notes: "Logged via AI Copilot",
          createdAt: new Date().toISOString()
        });
        
        toast({ title: "✅ Payment Saved!", description: `Recorded ₹${aiDecision.amount} payment from ${supplier.name}.` });
        setAiPrompt("");
        setTimeout(() => window.location.reload(), 1500); 
        return;
      }

      if (!supplier && aiDecision.customerName) {
        toast({ title: "Customer Not Found", description: `Couldn't find '${aiDecision.customerName}' in your database.`, variant: "destructive" });
      } else {
        toast({ title: "🤔 Incomplete Command", description: "Make sure to include a name and an amount/litres.", variant: "destructive" });
      }

    } catch (error: any) {
      console.error(error);
      toast({ title: "Error", description: error.message || "Failed to connect to AI.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-dashboard-greeting">
            Welcome back, {greetingName}
          </h1>
          <p className="mt-2 text-muted-foreground">Overview of your dairy operations.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="uppercase tracking-wide" data-testid="badge-dashboard-role">
            {role || "User"}
          </Badge>
          <span data-testid="text-last-login">Last sign-in: {lastLoginLabel}</span>
        </div>
      </div>

      {/* AI Logistics Copilot */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <form onSubmit={handleAIAssistant} className="flex gap-3 items-center">
            <div className="bg-primary/10 p-2 rounded-full hidden sm:block flex-shrink-0">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <Input 
              placeholder="Ask AI: 'Ramesh dropped off 42 liters' or 'Anita paid us 500 rupees'..." 
              className="bg-background"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              disabled={isProcessing}
            />
            <Button type="submit" disabled={isProcessing || !aiPrompt}>
              {isProcessing ? "Thinking..." : "Execute"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Litres This Month</CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {summary?.totalLitresThisMonth ? formatLitres(summary.totalLitresThisMonth) : "0 L"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Prev: {summary?.totalLitresPreviousMonth ? formatLitres(summary.totalLitresPreviousMonth) : "0 L"}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue This Month</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {summary?.revenueThisMonth ? formatCurrency(summary.revenueThisMonth) : formatCurrency(0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Prev: {summary?.revenuePreviousMonth ? formatCurrency(summary.revenuePreviousMonth) : formatCurrency(0)}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{summary?.activeCustomers || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary?.suppliers || 0} Suppliers, {summary?.buyers || 0} Buyers
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {summary?.pendingPaymentsAmount ? formatCurrency(summary.pendingPaymentsAmount) : formatCurrency(0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across {summary?.pendingSalesCount || 0} pending sales
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trends */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Collections Trend (14 Days)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full"><Skeleton className="h-full w-full" /></div>
            ) : collectionsTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={collectionsTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tickFormatter={(val) => new Date(val).getDate().toString()} tick={{ fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(val) => `${val}L`} tick={{ fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))", color: "hsl(var(--popover-foreground))", borderRadius: "var(--radius)" }}
                    labelFormatter={(val) => formatDate(val)}
                  />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Revenue Trend (14 Days)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {isLoading ? (
               <div className="flex items-center justify-center h-full"><Skeleton className="h-full w-full" /></div>
            ) : revenueTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tickFormatter={(val) => new Date(val).getDate().toString()} tick={{ fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(val) => `₹${val/1000}k`} tick={{ fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))", color: "hsl(var(--popover-foreground))", borderRadius: "var(--radius)" }}
                    labelFormatter={(val) => formatDate(val)}
                    formatter={(val: number) => [formatCurrency(val), "Revenue"]}
                  />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Breakdowns & Activity */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Milk Types</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px]">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : milkTypeBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={milkTypeBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    nameKey="label"
                  >
                    {milkTypeBreakdown.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                     contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))", color: "hsl(var(--popover-foreground))", borderRadius: "var(--radius)" }}
                     formatter={(val: number) => [`${val} L`, "Litres"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Top Suppliers</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px]">
            {isLoading ? (
               <Skeleton className="h-full w-full" />
            ) : topSuppliers.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSuppliers} layout="vertical" margin={{ top: 0, right: 0, left: 30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="customerName" tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))", color: "hsl(var(--popover-foreground))", borderRadius: "var(--radius)" }}
                    cursor={{ fill: "hsl(var(--muted))" }}
                    formatter={(val: number) => [`${val} L`, "Litres"]}
                  />
                  <Bar dataKey="totalLitres" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto max-h-[250px]">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-start gap-4">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity: any) => (
                  <div key={activity.id} className="flex items-start gap-3 text-sm">
                    <div className="mt-0.5 rounded-full bg-muted p-1.5 text-muted-foreground">
                      {activity.type === 'collection' ? <Droplets className="h-3 w-3" /> :
                       activity.type === 'sale' ? <ShoppingCart className="h-3 w-3" /> :
                       <CreditCard className="h-3 w-3" />}
                    </div>
                    <div className="flex-1 space-y-1 leading-none">
                      <p className="font-medium">{activity.customerName}</p>
                      <p className="text-muted-foreground text-xs">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(activity.date)}</p>
                    </div>
                    <div className="font-medium text-xs">
                      {activity.type === 'collection' ? formatLitres(activity.amount) : formatCurrency(activity.amount)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">No activity yet</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}