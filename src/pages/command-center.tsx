import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Thermometer,
  Droplets,
  Flame,
  Sprout,
  Sun,
  RefreshCw,
  Zap,
  Settings2,
  Leaf,
  Heart,
  AlertTriangle,
  Activity as ActivityIcon,
  CircleAlert,
} from "lucide-react";

// --- SMART MOCK SENSORS (Simulating Live IoT Data) ---
let MOCK_METRICS = [
  { category: "temperature", metric: "Shed Climate", value: 24.5, unit: "°C", status: "optimal" },
  { category: "humidity", metric: "Air Moisture", value: 65, unit: "%", status: "optimal" },
  { category: "biogas", metric: "Digester", value: 82, unit: "%", status: "optimal" },
  { category: "hydroponic", metric: "pH Level", value: 6.2, unit: "pH", status: "optimal" },
  { category: "solar", metric: "Battery", value: 94, unit: "%", status: "optimal" },
];

// --- EXPANDED HERD DATA ---
let MOCK_HERD = [
  { id: 1, tag: "COW-001", name: "Bessie", breed: "Holstein", ageMonths: 48, weightKg: 650, milkYieldAvg: 24.5, lastCheckup: new Date().toISOString(), healthStatus: "healthy" },
  { id: 2, tag: "COW-002", name: "Daisy", breed: "Jersey", ageMonths: 36, weightKg: 450, milkYieldAvg: 18.2, lastCheckup: new Date().toISOString(), healthStatus: "attention" },
  { id: 3, tag: "COW-003", name: "Bella", breed: "Holstein", ageMonths: 52, weightKg: 680, milkYieldAvg: 26.1, lastCheckup: new Date().toISOString(), healthStatus: "healthy" },
  { id: 4, tag: "COW-004", name: "Luna", breed: "Guernsey", ageMonths: 24, weightKg: 410, milkYieldAvg: 15.5, lastCheckup: new Date().toISOString(), healthStatus: "healthy" },
  { id: 5, tag: "COW-005", name: "Chloe", breed: "Jersey", ageMonths: 40, weightKg: 460, milkYieldAvg: 19.0, lastCheckup: new Date().toISOString(), healthStatus: "critical" },
  { id: 6, tag: "COW-006", name: "Stella", breed: "Holstein", ageMonths: 30, weightKg: 600, milkYieldAvg: 22.8, lastCheckup: new Date().toISOString(), healthStatus: "healthy" },
  { id: 7, tag: "COW-007", name: "Penny", breed: "Brown Swiss", ageMonths: 60, weightKg: 700, milkYieldAvg: 21.0, lastCheckup: new Date().toISOString(), healthStatus: "attention" },
  { id: 8, tag: "COW-008", name: "Ruby", breed: "Holstein", ageMonths: 45, weightKg: 640, milkYieldAvg: 25.3, lastCheckup: new Date().toISOString(), healthStatus: "healthy" },
];

// --- PERSISTENT TARGET SETTINGS ---
const DEFAULT_TARGETS = [
  { category: "temperature", targetMin: 15, targetMax: 28, autoAdjust: "on" },
  { category: "humidity", targetMin: 40, targetMax: 80, autoAdjust: "on" },
  { category: "biogas", targetMin: 50, targetMax: 100, autoAdjust: "on" },
  { category: "hydroponic", targetMin: 5.5, targetMax: 6.5, autoAdjust: "on" },
  { category: "solar", targetMin: 40, targetMax: 100, autoAdjust: "off" },
];

function getSavedTargets() {
  try {
    const saved = localStorage.getItem("dairy_targets");
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return DEFAULT_TARGETS;
}

const CATEGORY_META: Record<
  string,
  { label: string; icon: React.ElementType; description: string; min: number; max: number; step: number }
> = {
  temperature: { label: "Shed Temperature", icon: Thermometer, description: "Cattle shed climate", min: 10, max: 40, step: 0.5 },
  humidity: { label: "Humidity", icon: Droplets, description: "Moisture in cattle shed air", min: 20, max: 95, step: 1 },
  biogas: { label: "Biogas Output", icon: Flame, description: "Digester production capacity", min: 30, max: 100, step: 1 },
  hydroponic: { label: "Hydroponic Fodder", icon: Sprout, description: "Nutrient solution pH", min: 4, max: 8, step: 0.1 },
  solar: { label: "Solar Power", icon: Sun, description: "Battery storage charge", min: 30, max: 100, step: 1 },
};

const STATUS_TONE: Record<string, { badge: string; bar: string; text: string; ring: string }> = {
  optimal: {
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    bar: "bg-emerald-500",
    text: "text-emerald-700",
    ring: "ring-emerald-200",
  },
  warning: {
    badge: "bg-amber-100 text-amber-900 border-amber-200",
    bar: "bg-amber-500",
    text: "text-amber-700",
    ring: "ring-amber-200",
  },
  critical: {
    badge: "bg-rose-100 text-rose-900 border-rose-200",
    bar: "bg-rose-500",
    text: "text-rose-700",
    ring: "ring-rose-200",
  },
};

function MetricCard({
  metric,
  target,
  onConfigure,
}: {
  metric: any;
  target: any;
  onConfigure: () => void;
}) {
  const meta = CATEGORY_META[metric.category] ?? {
    label: metric.category,
    icon: ActivityIcon,
    description: metric.metric,
    min: 0,
    max: 100,
    step: 1,
  };
  const tone = STATUS_TONE[metric.status] ?? STATUS_TONE.optimal;
  const Icon = meta.icon;
  const min = target ? target.targetMin : meta.min;
  const max = target ? target.targetMax : meta.max;
  const span = Math.max(max - min, 0.001);
  const lowBound = min - span * 0.2;
  const highBound = max + span * 0.2;
  const fillPct = Math.min(
    100,
    Math.max(0, ((metric.value - lowBound) / (highBound - lowBound)) * 100),
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`rounded-md p-2 ${tone.badge}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">{meta.label}</CardTitle>
              <CardDescription className="text-xs">{meta.description}</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onConfigure} aria-label="Configure">
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-end justify-between gap-2">
          <div>
            <div className="text-3xl font-bold tracking-tight">
              {metric.value.toFixed(metric.unit === "pH" ? 2 : 1)}
              <span className="ml-1 text-base font-medium text-muted-foreground">{metric.unit}</span>
            </div>
            <Badge variant="outline" className={`mt-1 ${tone.badge}`}>
              {metric.status}
            </Badge>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div>Target</div>
            <div className="font-medium text-foreground">
              {min}–{max} {metric.unit}
            </div>
            {target?.autoAdjust === "on" ? (
              <Badge variant="outline" className="mt-1 bg-emerald-50 text-emerald-800 border-emerald-200">
                <Zap className="mr-1 h-3 w-3" /> Auto
              </Badge>
            ) : (
              <Badge variant="outline" className="mt-1">
                Manual
              </Badge>
            )}
          </div>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className={`h-full ${tone.bar}`} style={{ width: `${fillPct}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>{lowBound.toFixed(1)}</span>
          <span className={tone.text}>now</span>
          <span>{highBound.toFixed(1)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function ConfigureTargetDialog({
  open,
  onOpenChange,
  category,
  target,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  category: string;
  target: any;
}) {
  const meta = CATEGORY_META[category] ?? { min: 0, max: 100, step: 1, label: category };
  const [range, setRange] = React.useState<[number, number]>([
    target?.targetMin ?? meta.min,
    target?.targetMax ?? meta.max,
  ]);
  const [auto, setAuto] = React.useState<boolean>((target?.autoAdjust ?? "on") === "on");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  React.useEffect(() => {
    if (target) {
      setRange([target.targetMin, target.targetMax]);
      setAuto(target.autoAdjust === "on");
    }
  }, [target]);

  const update = useMutation({
    mutationFn: async (payload: any) => {
      await new Promise(r => setTimeout(r, 400));
      
      const { category, targetMin, targetMax, autoAdjust } = payload.data;
      const currentTargets = getSavedTargets();
      const targetIndex = currentTargets.findIndex((t: any) => t.category === category);
      
      if (targetIndex > -1) {
        currentTargets[targetIndex] = { ...currentTargets[targetIndex], targetMin, targetMax, autoAdjust };
        localStorage.setItem("dairy_targets", JSON.stringify(currentTargets)); // Save to persistence
      }
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["command-center-snapshot"] });
      toast({ title: "Target updated and saved successfully" });
      onOpenChange(false);
    },
    onError: () => toast({ title: "Failed to update target", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure {meta.label}</DialogTitle>
          <DialogDescription>
            Set the safe range for animal welfare. Auto-adjust will react when readings drift outside.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Safe range</Label>
              <span className="text-sm font-medium">
                {range[0]} – {range[1]} {target?.unit ?? ""}
              </span>
            </div>
            <Slider
              min={meta.min}
              max={meta.max}
              step={meta.step}
              value={range}
              onValueChange={(v) => setRange([v[0], v[1]] as [number, number])}
              minStepsBetweenThumbs={1}
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>{meta.min}</span>
              <span>{meta.max}</span>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="auto-adjust" className="text-sm font-medium">Auto-adjust</Label>
              <p className="text-xs text-muted-foreground">Engage controls when readings drift</p>
            </div>
            <Switch id="auto-adjust" checked={auto} onCheckedChange={setAuto} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() =>
              update.mutate({
                data: {
                  category,
                  targetMin: range[0],
                  targetMax: range[1],
                  autoAdjust: auto ? "on" : "off",
                },
              })
            }
            disabled={update.isPending}
          >
            {update.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CommandCenterPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [configCategory, setConfigCategory] = React.useState<string | null>(null);

  const { data: snapshot, isLoading: snapLoading } = useQuery({
    queryKey: ["command-center-snapshot"],
    queryFn: async () => ({
      metrics: [...MOCK_METRICS],
      targets: getSavedTargets(), // Load from persistence
      herdSummary: { healthy: 145, attention: 12, critical: 2, avgYield: 22.4 }
    })
  });

  const { data: herd = [] } = useQuery({
    queryKey: ["herd"],
    queryFn: async () => [...MOCK_HERD]
  });

  // Smart Auto-Adjust 
  const autoAdjust = useMutation({
    mutationFn: async () => {
      await new Promise(r => setTimeout(r, 800));
      let adjustedCount = 0;
      const currentTargets = getSavedTargets();
      
      MOCK_METRICS.forEach(metric => {
        const target = currentTargets.find((t: any) => t.category === metric.category);
        if (target && target.autoAdjust === "on") {
          if (metric.value < target.targetMin) {
            metric.value = target.targetMin + (CATEGORY_META[metric.category]?.step || 1);
            metric.status = "optimal";
            adjustedCount++;
          } else if (metric.value > target.targetMax) {
            metric.value = target.targetMax - (CATEGORY_META[metric.category]?.step || 1);
            metric.status = "optimal";
            adjustedCount++;
          }
        }
      });
      return { adjustedCount };
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["command-center-snapshot"] });
      toast({
        title: "Auto-adjust complete",
        description: data.adjustedCount === 0
          ? "All metrics are within target. No action needed."
          : `${data.adjustedCount} metric(s) adjusted toward safe ranges.`,
      });
    },
  });

  const targetByCat = React.useMemo(() => {
    const m = new Map<string, any>();
    for (const t of snapshot?.targets ?? []) m.set(t.category, t);
    return m;
  }, [snapshot]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ActivityIcon className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Live farm monitoring, herd health, and auto-adjust controls.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["command-center-snapshot"] })
            }
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button
            onClick={() => autoAdjust.mutate()}
            disabled={autoAdjust.isPending}
          >
            <Zap className="mr-2 h-4 w-4" />
            {autoAdjust.isPending ? "Adjusting..." : "Run Auto-Adjust"}
          </Button>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {snapLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="mt-1 h-3 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-1/2" />
                  <Skeleton className="mt-3 h-2 w-full" />
                </CardContent>
              </Card>
            ))
          : snapshot?.metrics.map((m: any) => (
              <MetricCard
                key={m.category}
                metric={m}
                target={targetByCat.get(m.category)}
                onConfigure={() => setConfigCategory(m.category)}
              />
            ))}
      </div>

      {/* Herd Management */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Leaf className="h-5 w-5 text-primary" />
                Herd Management
              </CardTitle>
              <CardDescription>
                Health snapshot of every animal in the herd.
              </CardDescription>
            </div>
            {snapshot?.herdSummary && (
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200">
                  <Heart className="mr-1 h-3 w-3" /> {snapshot.herdSummary.healthy} healthy
                </Badge>
                <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-200">
                  <CircleAlert className="mr-1 h-3 w-3" /> {snapshot.herdSummary.attention} attention
                </Badge>
                <Badge variant="outline" className="bg-rose-50 text-rose-900 border-rose-200">
                  <AlertTriangle className="mr-1 h-3 w-3" /> {snapshot.herdSummary.critical} critical
                </Badge>
                <Badge variant="outline">
                  Avg yield {snapshot.herdSummary.avgYield.toFixed(1)} L/day
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Tag</th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Breed</th>
                  <th className="px-3 py-2 font-medium">Age</th>
                  <th className="px-3 py-2 font-medium">Weight</th>
                  <th className="px-3 py-2 font-medium">Yield/day</th>
                  <th className="px-3 py-2 font-medium">Last Checkup</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {herd.map((h: any) => {
                  const tone = STATUS_TONE[h.healthStatus === "healthy" ? "optimal" : h.healthStatus === "attention" ? "warning" : "critical"];
                  return (
                    <tr key={h.id} className="border-b last:border-0">
                      <td className="px-3 py-2 font-mono text-xs">{h.tag}</td>
                      <td className="px-3 py-2 font-medium">{h.name}</td>
                      <td className="px-3 py-2">{h.breed}</td>
                      <td className="px-3 py-2">{h.ageMonths} mo</td>
                      <td className="px-3 py-2">{h.weightKg.toFixed(0)} kg</td>
                      <td className="px-3 py-2">{h.milkYieldAvg.toFixed(1)} L</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {new Date(h.lastCheckup).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className={tone.badge}>
                          {h.healthStatus}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {configCategory && (
        <ConfigureTargetDialog
          open={!!configCategory}
          onOpenChange={(v) => !v && setConfigCategory(null)}
          category={configCategory}
          target={targetByCat.get(configCategory)}
        />
      )}
    </div>
  );
}