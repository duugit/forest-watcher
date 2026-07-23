import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Play, Satellite, TreePine, TrendingDown, TrendingUp, Wifi } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Myanmar Deforestation Monitor | AI Satellite Analysis" },
      {
        name: "description",
        content:
          "Real-time AI-powered deforestation detection dashboard for Myanmar using Google Earth Engine satellite imagery and land-cover classification.",
      },
      { property: "og:title", content: "Myanmar Deforestation Monitor" },
      {
        property: "og:description",
        content:
          "Real-time AI-powered deforestation detection for Myanmar with side-by-side satellite comparison and land-cover analytics.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

type RegionKey = "sagaing" | "tanintharyi" | "shan";

const REGIONS: Record<RegionKey, { label: string; center: [number, number]; zoom: number }> = {
  sagaing: { label: "Sagaing (Katha District)", center: [96.35, 24.17], zoom: 9 },
  tanintharyi: { label: "Tanintharyi (Dawei)", center: [98.2, 14.08], zoom: 9 },
  shan: { label: "Shan State (Taunggyi)", center: [97.03, 20.78], zoom: 9 },
};

const CLASS_COLORS = {
  dense: "#0B5345",
  forest: "#1E8449",
  grass: "#7DCEA0",
  water: "#2E86C1",
  bare: "#A04000",
} as const;

type Metrics = {
  loss: number;
  gain: number;
  classes: { name: string; km2: number; color: string }[];
};

const INITIAL_METRICS: Metrics = {
  loss: 0,
  gain: 0,
  classes: [
    { name: "Dense Forest", km2: 0, color: CLASS_COLORS.dense },
    { name: "Forest", km2: 0, color: CLASS_COLORS.forest },
    { name: "Grass/Veg", km2: 0, color: CLASS_COLORS.grass },
    { name: "Water", km2: 0, color: CLASS_COLORS.water },
    { name: "Bare Soil", km2: 0, color: CLASS_COLORS.bare },
  ],
};

function mockMetricsFor(region: RegionKey): Metrics {
  const seeds: Record<RegionKey, Metrics> = {
    sagaing: {
      loss: 4821,
      gain: 612,
      classes: [
        { name: "Dense Forest", km2: 412.8, color: CLASS_COLORS.dense },
        { name: "Forest", km2: 289.4, color: CLASS_COLORS.forest },
        { name: "Grass/Veg", km2: 178.2, color: CLASS_COLORS.grass },
        { name: "Water", km2: 42.6, color: CLASS_COLORS.water },
        { name: "Bare Soil", km2: 137.9, color: CLASS_COLORS.bare },
      ],
    },
    tanintharyi: {
      loss: 6234,
      gain: 421,
      classes: [
        { name: "Dense Forest", km2: 521.1, color: CLASS_COLORS.dense },
        { name: "Forest", km2: 342.8, color: CLASS_COLORS.forest },
        { name: "Grass/Veg", km2: 96.4, color: CLASS_COLORS.grass },
        { name: "Water", km2: 78.9, color: CLASS_COLORS.water },
        { name: "Bare Soil", km2: 189.3, color: CLASS_COLORS.bare },
      ],
    },
    shan: {
      loss: 3105,
      gain: 892,
      classes: [
        { name: "Dense Forest", km2: 298.7, color: CLASS_COLORS.dense },
        { name: "Forest", km2: 401.2, color: CLASS_COLORS.forest },
        { name: "Grass/Veg", km2: 245.9, color: CLASS_COLORS.grass },
        { name: "Water", km2: 31.4, color: CLASS_COLORS.water },
        { name: "Bare Soil", km2: 89.6, color: CLASS_COLORS.bare },
      ],
    },
  };
  return seeds[region];
}

function Dashboard() {
  const [region, setRegion] = useState<RegionKey>("sagaing");
  const [pastDate, setPastDate] = useState<Date>(new Date(2012, 4, 12));
  const [classified, setClassified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<Metrics>(INITIAL_METRICS);
  const [sliderPct, setSliderPct] = useState(50);
  const [hasRun, setHasRun] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  // Init map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center: REGIONS[region].center,
      zoom: REGIONS[region].zoom,
      attributionControl: false,
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fly to region on change
  useEffect(() => {
    mapRef.current?.flyTo({ center: REGIONS[region].center, zoom: REGIONS[region].zoom });
  }, [region]);

  // Slider drag handlers
  useEffect(() => {
    function onMove(e: MouseEvent | TouchEvent) {
      if (!draggingRef.current || !stageRef.current) return;
      const rect = stageRef.current.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const pct = ((clientX - rect.left) / rect.width) * 100;
      setSliderPct(Math.max(2, Math.min(98, pct)));
    }
    function onUp() {
      draggingRef.current = false;
      document.body.style.userSelect = "";
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, []);

  function executeClassification() {
    setLoading(true);
    setHasRun(true);
    setTimeout(() => {
      setMetrics(mockMetricsFor(region));
      setClassified(true);
      setLoading(false);
    }, 1800);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <TreePine className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-serif text-xl font-bold leading-tight tracking-tight text-foreground">
                A Real-Time AI-Powered Deforestation Detection System
              </h1>
              <p className="text-xs text-muted-foreground">
                Using Satellite Imagery for Myanmar — MSc Thesis Dashboard
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="gap-2 border-emerald-500/40 bg-emerald-500/10 py-1.5 text-emerald-700 dark:text-emerald-400"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <Wifi className="h-3.5 w-3.5" />
            System Status: Connected to GEE Cloud Engine
          </Badge>
        </div>
      </header>

      {/* Body: 3-column */}
      <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[300px_1fr_340px]">
        {/* LEFT SIDEBAR */}
        <aside className="flex flex-col gap-4">
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Control Input Panel
            </h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Myanmar Region / Township</Label>
                <Select value={region} onValueChange={(v) => setRegion(v as RegionKey)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(REGIONS) as RegionKey[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {REGIONS[k].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Select Previous Comparison Map</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(pastDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={pastDate}
                      onSelect={(d) => d && setPastDate(d)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Current Comparison Map</Label>
                <Card className="border-dashed bg-muted/40 p-3">
                  <div className="flex items-center gap-2">
                    <Satellite className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Present Day — Today</div>
                      <div className="text-xs text-muted-foreground">Live GEE feed (locked)</div>
                    </div>
                  </div>
                </Card>
              </div>

              <Button
                onClick={executeClassification}
                disabled={loading}
                className="h-12 w-full bg-emerald-600 text-base font-semibold text-white shadow-md hover:bg-emerald-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-5 w-5" />
                    Execute AI Classification Engine
                  </>
                )}
              </Button>
            </div>
          </Card>

          <Card className="p-4 text-xs text-muted-foreground">
            <div className="mb-2 font-semibold text-foreground">Legend</div>
            <div className="space-y-1.5">
              {INITIAL_METRICS.classes.map((c) => (
                <div key={c.name} className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-sm"
                    style={{ backgroundColor: c.color }}
                  />
                  <span>{c.name}</span>
                </div>
              ))}
            </div>
          </Card>
        </aside>

        {/* CENTER STAGE */}
        <section
          ref={stageRef}
          className="relative overflow-hidden rounded-lg border border-border bg-card shadow-sm"
        >
          {/* Top toggle bar */}
          <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between border-b border-border/60 bg-background/85 px-4 py-2 backdrop-blur">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Comparison Map · {REGIONS[region].label}
            </div>
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "text-xs",
                  !classified ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                Raw Satellite
              </span>
              <Switch
                checked={classified}
                onCheckedChange={(v) => hasRun && setClassified(v)}
                disabled={!hasRun}
              />
              <span
                className={cn(
                  "text-xs",
                  classified ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                AI Classification
              </span>
            </div>
          </div>

          {/* Map */}
          <div ref={mapContainerRef} className="absolute inset-0" />

          {/* Past overlay (left of slider) */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-10 overflow-hidden"
            style={{ width: `${sliderPct}%` }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: classified
                  ? "linear-gradient(135deg, rgba(11,83,69,0.55), rgba(30,132,73,0.35), rgba(160,64,0,0.45))"
                  : "linear-gradient(135deg, rgba(90,60,20,0.25), rgba(50,40,30,0.15))",
              }}
            />
            <div className="absolute left-3 top-14 rounded-md bg-background/90 px-2.5 py-1 text-xs font-semibold shadow">
              Past · {format(pastDate, "MMM yyyy")}
            </div>
          </div>

          {/* Present overlay (right of slider) */}
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-10 overflow-hidden"
            style={{ width: `${100 - sliderPct}%` }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: classified
                  ? "linear-gradient(135deg, rgba(160,64,0,0.55), rgba(125,206,160,0.25), rgba(46,134,193,0.3))"
                  : "linear-gradient(135deg, rgba(120,90,40,0.2), rgba(60,50,40,0.1))",
              }}
            />
            <div className="absolute right-3 top-14 rounded-md bg-background/90 px-2.5 py-1 text-xs font-semibold shadow">
              Present · Today
            </div>
          </div>

          {/* Slider */}
          <div
            className="absolute inset-y-0 z-20 w-1 -translate-x-1/2 bg-white/90 shadow-[0_0_12px_rgba(0,0,0,0.35)]"
            style={{ left: `${sliderPct}%` }}
          >
            <button
              onMouseDown={() => {
                draggingRef.current = true;
                document.body.style.userSelect = "none";
              }}
              onTouchStart={() => {
                draggingRef.current = true;
              }}
              className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full border-2 border-white bg-primary text-primary-foreground shadow-lg hover:scale-110 transition-transform"
              aria-label="Drag to compare"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M8 6l-4 6 4 6M16 6l4 6-4 6" />
              </svg>
            </button>
          </div>

          {loading && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/70 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
                <div className="text-sm font-medium">Running AI classification on GEE...</div>
                <div className="text-xs text-muted-foreground">
                  Analyzing Landsat / Sentinel-2 tiles for {REGIONS[region].label}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* RIGHT SIDEBAR */}
        <aside className="flex flex-col gap-4">
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Analytics & Metrics
            </h2>

            <div className="grid gap-3">
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-red-700 dark:text-red-400">
                  <TrendingDown className="h-3.5 w-3.5" />
                  Total Forest Loss
                </div>
                <div className="mt-1.5 text-3xl font-bold tabular-nums text-red-700 dark:text-red-400">
                  {metrics.loss.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Hectares</div>
              </div>

              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Total Forest Gain
                </div>
                <div className="mt-1.5 text-3xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {metrics.gain.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Hectares</div>
              </div>
            </div>
          </Card>

          <Card className="flex-1 p-4">
            <div className="mb-1 text-sm font-semibold">Land Cover Breakdown</div>
            <div className="mb-3 text-xs text-muted-foreground">Area in square kilometers (km²)</div>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.classes} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    width={90}
                  />
                  <RTooltip
                    cursor={{ fill: "rgba(0,0,0,0.04)" }}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                    }}
                    formatter={(v: number) => [`${v} km²`, "Area"]}
                  />
                  <Bar dataKey="km2" radius={[0, 4, 4, 0]}>
                    {metrics.classes.map((c) => (
                      <Cell key={c.name} fill={c.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {!hasRun && (
              <div className="mt-2 rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                Run the AI Classification Engine to populate metrics.
              </div>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
