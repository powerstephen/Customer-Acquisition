"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  AlertTriangle,
  Database,
  Target,
  DollarSign,
  Activity,
  BarChart3,
  Gauge,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

/* ---------------- Helpers ---------------- */
const weeksIn = (days: number) => (days > 0 ? days / 7 : 0);
const safe = (n: number, alt = 0) => (Number.isFinite(n) && !Number.isNaN(n) ? n : alt);
const fmtNum = (n: number, d = 0) =>
  Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: d }) : "-";
const fmtPct = (n: number, d = 2) => `${(safe(n, 0) * 100).toFixed(d)}%`;
const eur = (n: number, d = 0) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: d }).format(safe(n, 0));

function DecimalInput({
  value,
  onChange,
  className,
  step = 0.01,
}: {
  value: number;
  onChange: (v: number) => void;
  className?: string;
  step?: number;
}) {
  const to2 = (v: number) => (Number.isFinite(v) ? Number(v.toFixed(2)) : 0);
  return (
    <Input
      type="number"
      step={step}
      inputMode="decimal"
      className={`text-center ${className ?? ""}`}
      value={to2(value)}
      onChange={(e) => {
        const raw = parseFloat(e.target.value);
        onChange(Number.isFinite(raw) ? raw : 0);
      }}
      onBlur={(e) => {
        const raw = parseFloat(e.target.value);
        const n = Number.isFinite(raw) ? raw : 0;
        e.currentTarget.value = to2(n).toString();
        onChange(to2(n));
      }}
    />
  );
}

function PercentInput({
  value,
  onChange,
  className,
}: {
  value: number; // 0..1
  onChange: (v: number) => void;
  className?: string;
}) {
  const display = Number.isFinite(value) ? Number((value * 100).toFixed(2)) : 0;
  return (
    <div className="relative">
      <Input
        type="number"
        step={0.01}
        min={0}
        max={100}
        inputMode="decimal"
        className={`text-center pr-6 ${className ?? ""}`}
        value={display}
        onChange={(e) => {
          const raw = parseFloat(e.target.value);
          const dec = (Number.isFinite(raw) ? raw : 0) / 100;
          onChange(Number(dec.toFixed(4)));
        }}
        onBlur={(e) => {
          const raw = parseFloat(e.target.value);
          const dec = (Number.isFinite(raw) ? raw : 0) / 100;
          e.currentTarget.value = Math.max(0, Math.min(100, dec * 100)).toFixed(2);
          onChange(Number(dec.toFixed(4)));
        }}
      />
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">%</span>
    </div>
  );
}

function MiniBar({ pct, color = "#4f46e5" }: { pct: number; color?: string }) {
  const w = Math.max(0, Math.min(100, pct * 100));
  return (
    <div className="w-full h-2 rounded bg-gray-200 overflow-hidden">
      <div className="h-full" style={{ width: `${w}%`, background: color }} />
    </div>
  );
}
const covColor = (ratio: number) =>
  ratio >= 1 ? "#059669" : ratio >= 0.95 ? "#f59e0b" : "#dc2626";

function benchBadge(ratio: number) {
  if (!Number.isFinite(ratio)) return { label: "—", className: "bg-gray-100 text-gray-700 border border-gray-200" };
  if (ratio >= 1.0) return { label: "On / Above Target", className: "bg-emerald-100 text-emerald-700 border border-emerald-200" };
  if (ratio >= 0.95) return { label: "Slightly Below", className: "bg-amber-100 text-amber-700 border border-amber-200" };
  return { label: "Below Target", className: "bg-red-100 text-red-700 border border-red-200" };
}

function deltaPct(curr: number, prev: number) {
  if (!Number.isFinite(prev) || prev === 0) return null;
  return (curr - prev) / Math.abs(prev);
}

function DeltaTag({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-gray-400">—</span>;
  const up = value > 0;
  const color = up ? "text-emerald-600" : "text-red-600";
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${color}`}>
      <Icon className="h-3 w-3" />
      {(Math.abs(value) * 100).toFixed(1)}%
    </span>
  );
}

/* ---------------- Data shapes ---------------- */
type CoSInputs = {
  days: number;

  leads90: number;
  qualifiedRate: number;
  bookRate: number;
  showRate: number;
  proposalRate: number;
  winRate: number;
  aspEUR: number;
  gm: number;
  salesCycleDays: number;
  noShowRate: number;

  onboardingsPerWeek: number;
  onboardingDaysAvg: number;
  activeForwarders: number;
  activeAirlines: number;

  CAC: number;
  paybackDays: number;
  DSO: number;
  headcount: number;
};

type Scenario = { name: string; inputs: CoSInputs; };

type Benchmarks = {
  leads90: number;
  qualifiedRate: number;
  bookRate: number;
  showRate: number;
  proposalRate: number;
  winRate: number;
  aspEUR: number; // NEW: AOV/ASP target
};

/* ---------------- Presets (illustrative) ---------------- */
const PREV: Scenario = {
  name: "Prev 90d (baseline)",
  inputs: {
    days: 90,
    leads90: 1250,
    qualifiedRate: 0.32,
    bookRate: 0.62,
    showRate: 0.82,
    proposalRate: 0.72,
    winRate: 0.36,
    aspEUR: 7800,
    gm: 0.73,
    salesCycleDays: 46,
    noShowRate: 0.18,
    onboardingsPerWeek: 6.5,
    onboardingDaysAvg: 14,
    activeForwarders: 430,
    activeAirlines: 55,
    CAC: 1900,
    paybackDays: 82,
    DSO: 34,
    headcount: 82,
  },
};

const CURR: Scenario = {
  name: "Current 90d (illustrative)",
  inputs: {
    days: 90,
    leads90: 1300,
    qualifiedRate: 0.304,
    bookRate: 0.65,
    showRate: 0.85,
    proposalRate: 0.70,
    winRate: 0.20,
    aspEUR: 8000,
    gm: 0.75,
    salesCycleDays: 42,
    noShowRate: 0.15,
    onboardingsPerWeek: 7.5,
    onboardingDaysAvg: 12,
    activeForwarders: 480,
    activeAirlines: 60,
    CAC: 1800,
    paybackDays: 70,
    DSO: 32,
    headcount: 85,
  },
};

const DEFAULT_BENCH: Benchmarks = {
  leads90: PREV.inputs.leads90,
  qualifiedRate: PREV.inputs.qualifiedRate,
  bookRate: PREV.inputs.bookRate,
  showRate: PREV.inputs.showRate,
  proposalRate: PREV.inputs.proposalRate,
  winRate: PREV.inputs.winRate,
  aspEUR: PREV.inputs.aspEUR, // default ASP benchmark = previous
};

/* ---------------- Core math ---------------- */
function computeKPIs(inp: CoSInputs) {
  const w = weeksIn(inp.days);
  const leadsPerWeek = w > 0 ? inp.leads90 / w : 0;

  const rLQ = inp.qualifiedRate;
  const rQB = inp.bookRate;
  const rBS = inp.showRate;
  const rSP = inp.proposalRate;
  const rPW = inp.winRate;

  const qualPerWeek = leadsPerWeek * rLQ;
  const bookPerWeek = qualPerWeek * rQB;
  const showPerWeek = bookPerWeek * rBS;
  const propPerWeek = showPerWeek * rSP;
  const wonPerWeek = propPerWeek * rPW;

  const delPerWeek = inp.onboardingsPerWeek;

  // Required to saturate delivery
  const reqWon = delPerWeek;
  const reqProp = rPW > 0 ? reqWon / rPW : 0;
  const reqShow = rSP * rPW > 0 ? reqWon / (rSP * rPW) : 0;
  const reqBook = rBS * rSP * rPW > 0 ? reqWon / (rBS * rSP * rPW) : 0;
  const reqQual = rQB * rBS * rSP * rPW > 0 ? reqWon / (rQB * rBS * rSP * rPW) : 0;
  const downFromLead = rLQ * rQB * rBS * rSP * rPW;
  const reqLead = downFromLead > 0 ? reqWon / downFromLead : 0;

  const demandDealsPerWeek = wonPerWeek;
  const deliveryDealsPerWeek = delPerWeek;
  const dealsPerWeekCeil = Math.min(demandDealsPerWeek, deliveryDealsPerWeek);

  const rev90 = dealsPerWeekCeil * w * inp.aspEUR;
  const gp90 = rev90 * inp.gm;
  const rfteCeil = inp.headcount > 0 ? gp90 / inp.headcount : 0;
  const gp30 = (inp.days > 0 ? gp90 / inp.days : 0) * 30;
  const gp30OverCAC = inp.CAC > 0 ? gp30 / inp.CAC : 0;

  return {
    weeks: w,
    leadsPerWeek,
    qualPerWeek,
    bookPerWeek,
    showPerWeek,
    propPerWeek,
    wonPerWeek,
    delPerWeek,

    reqLead,
    reqQual,
    reqBook,
    reqShow,
    reqProp,
    reqWon,

    demandDealsPerWeek,
    deliveryDealsPerWeek,
    dealsPerWeekCeil,
    rev90,
    gp90,
    rfteCeil,
    gp30OverCAC,
  };
}

/* ---------------- Page ---------------- */
export default function ChiefOfStaffCockpit() {
  const [curr, setCurr] = useState<CoSInputs>(CURR.inputs);
  const [prev, setPrev] = useState<CoSInputs>(PREV.inputs);
  const [bench, setBench] = useState<Benchmarks>(DEFAULT_BENCH);

  const C = useMemo(() => computeKPIs(curr), [curr]);
  const P = useMemo(() => computeKPIs(prev), [prev]);

  // Funnel benchmark ratios (for bars/badges)
  const leadsBenchRatio = bench.leads90 > 0 ? curr.leads90 / bench.leads90 : NaN;
  const lqBenchRatio = bench.qualifiedRate > 0 ? curr.qualifiedRate / bench.qualifiedRate : NaN;
  const qbBenchRatio = bench.bookRate > 0 ? curr.bookRate / bench.bookRate : NaN;
  const bsBenchRatio = bench.showRate > 0 ? curr.showRate / bench.showRate : NaN;
  const spBenchRatio = bench.proposalRate > 0 ? curr.proposalRate / bench.proposalRate : NaN;
  const pwBenchRatio = bench.winRate > 0 ? curr.winRate / bench.winRate : NaN;

  // Deltas for widget comparisons vs previous
  const dQualifiedRate = deltaPct(curr.qualifiedRate, prev.qualifiedRate);
  const dWinRate = deltaPct(curr.winRate, prev.winRate);
  const dASP = deltaPct(curr.aspEUR, prev.aspEUR);
  const dOnboardings = deltaPct(curr.onboardingsPerWeek, prev.onboardingsPerWeek);

  const dGP90 = deltaPct(C.gp90, P.gp90);
  const dDealsCeil = deltaPct(C.dealsPerWeekCeil, P.dealsPerWeekCeil);

  const loadPresets = () => {
    setCurr(CURR.inputs);
    setPrev(PREV.inputs);
    setBench(DEFAULT_BENCH);
  };

  // Impact simulation for picking demand bottleneck (argmax uplift)
  function simulateWith(target: Partial<CoSInputs>) {
    const sim: CoSInputs = { ...curr, ...target };
    const S = computeKPIs(sim);
    return { gp90: S.gp90, dealsPerWeekCeil: S.dealsPerWeekCeil };
  }
  function impactForStage(key: "leads" | "qual" | "book" | "show" | "prop" | "won") {
    const maxRate = (a: number, b: number) => Math.max(a, b);
    switch (key) {
      case "leads": {
        const need = Math.max(curr.leads90, bench.leads90);
        const sim = simulateWith({ leads90: need });
        return { deltaGP90: sim.gp90 - C.gp90, newDeals: sim.dealsPerWeekCeil };
      }
      case "qual": {
        const sim = simulateWith({ qualifiedRate: maxRate(curr.qualifiedRate, bench.qualifiedRate) });
        return { deltaGP90: sim.gp90 - C.gp90, newDeals: sim.dealsPerWeekCeil };
      }
      case "book": {
        const sim = simulateWith({ bookRate: maxRate(curr.bookRate, bench.bookRate) });
        return { deltaGP90: sim.gp90 - C.gp90, newDeals: sim.dealsPerWeekCeil };
      }
      case "show": {
        const sim = simulateWith({ showRate: maxRate(curr.showRate, bench.showRate) });
        return { deltaGP90: sim.gp90 - C.gp90, newDeals: sim.dealsPerWeekCeil };
      }
      case "prop": {
        const sim = simulateWith({ proposalRate: maxRate(curr.proposalRate, bench.proposalRate) });
        return { deltaGP90: sim.gp90 - C.gp90, newDeals: sim.dealsPerWeekCeil };
      }
      case "won": {
        const sim = simulateWith({ winRate: maxRate(curr.winRate, bench.winRate) });
        return { deltaGP90: sim.gp90 - C.gp90, newDeals: sim.dealsPerWeekCeil };
      }
    }
  }

  const funnelRows = [
    { key: "leads", label: "Leads", ratio: leadsBenchRatio, text: `${fmtNum(curr.leads90)} vs ${fmtNum(bench.leads90)} (${(leadsBenchRatio * 100).toFixed(0)}%)`, rateText: "—" },
    { key: "qual", label: "Qualified", ratio: lqBenchRatio, text: `${fmtPct(curr.qualifiedRate)} vs ${fmtPct(bench.qualifiedRate)} (${(lqBenchRatio * 100).toFixed(0)}%)`, rateText: "Lead→Qualified" },
    { key: "book", label: "Booked", ratio: qbBenchRatio, text: `${fmtPct(curr.bookRate)} vs ${fmtPct(bench.bookRate)} (${(qbBenchRatio * 100).toFixed(0)}%)`, rateText: "Qualified→Booked" },
    { key: "show", label: "Show", ratio: bsBenchRatio, text: `${fmtPct(curr.showRate)} vs ${fmtPct(bench.showRate)} (${(bsBenchRatio * 100).toFixed(0)}%)`, rateText: "Booked→Show" },
    { key: "prop", label: "Proposal", ratio: spBenchRatio, text: `${fmtPct(curr.proposalRate)} vs ${fmtPct(bench.proposalRate)} (${(spBenchRatio * 100).toFixed(0)}%)`, rateText: "Show→Proposal" },
    { key: "won", label: "Won", ratio: pwBenchRatio, text: `${fmtPct(curr.winRate)} vs ${fmtPct(bench.winRate)} (${(pwBenchRatio * 100).toFixed(0)}%)`, rateText: "Proposal→Won" },
  ].map((r) => ({ ...r, badge: benchBadge(r.ratio), impact: impactForStage(r.key as any) }));

  // Pick demand bottleneck as stage with max GP uplift if restored to benchmark
  const demandImpacts = [
    { stage: "Leads", key: "leads" as const, ...impactForStage("leads") },
    { stage: "Lead→Qualified", key: "qual" as const, ...impactForStage("qual") },
    { stage: "Qualified→Booked", key: "book" as const, ...impactForStage("book") },
    { stage: "Booked→Show", key: "show" as const, ...impactForStage("show") },
    { stage: "Show→Proposal", key: "prop" as const, ...impactForStage("prop") },
    { stage: "Proposal→Won", key: "won" as const, ...impactForStage("won") },
  ];
  const topDemandImpact = demandImpacts.reduce((a, b) => (b.deltaGP90 > a.deltaGP90 ? b : a), demandImpacts[0]);

  const isDeliveryConstrained = C.deliveryDealsPerWeek + 1e-9 < C.demandDealsPerWeek;

  const topImpacts = [...funnelRows]
    .sort((a, b) => b.impact.deltaGP90 - a.impact.deltaGP90)
    .slice(0, 2);

  return (
    <main className="mx-auto max-w-7xl p-6 space-y-6">
      {/* Header area (page controls) */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight">⚡ Throughput Funnel Analysis</h2>
          <div className="flex items-center gap-2">
            <Button onClick={loadPresets} className="flex items-center gap-2">
              <Database className="h-4 w-4" /> Load example data
            </Button>
          </div>
        </div>

        {/* Dynamic Constraint Banner (subtitle) */}
        <div className="mt-3 rounded-lg border bg-gray-50 px-4 py-3">
          {isDeliveryConstrained ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-sm md:text-base font-medium">
                Current bottleneck: <span className="text-red-700">Delivery (Onboarding)</span>
              </div>
              <div className="text-xs text-gray-600">
                Demand {fmtNum(C.demandDealsPerWeek,2)}/wk vs Delivery {fmtNum(C.deliveryDealsPerWeek,2)}/wk
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-sm md:text-base font-medium">
                Current bottleneck: <span className="text-amber-700">Demand — {topDemandImpact.stage}</span>
              </div>
              <div className="text-xs text-gray-600">
                Largest uplift if fixed: {eur(topDemandImpact.deltaGP90, 0)} (90d GP)
              </div>
            </div>
          )}
        </div>

        <p className="text-gray-600 mt-2">
          Benchmark-aware funnel, constraint detection (live), and estimated 90-day GP impact for the weakest stages.
        </p>
      </motion.div>

      {/* -------- Top Widgets (2 rows of 4) -------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Constraint card */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-gray-500">Constraint</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="text-base font-semibold">
              {isDeliveryConstrained ? "Delivery (Onboarding)" : `Demand — ${topDemandImpact.stage}`}
            </div>
            <div className="text-[11px] text-gray-600">
              {isDeliveryConstrained
                ? `Dem ${fmtNum(C.demandDealsPerWeek,2)}/wk vs Del ${fmtNum(C.deliveryDealsPerWeek,2)}/wk`
                : `Fix to benchmark ⇒ ${eur(topDemandImpact.deltaGP90, 0)} GP uplift (90d)`}
            </div>
            <div className="text-[11px] mt-1">Δ Deals Ceiling: <DeltaTag value={dDealsCeil} /></div>
          </CardContent>
        </Card>

        {/* Throughput ceiling */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-gray-500">Throughput Ceiling (GP 90d)</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-semibold">{eur(C.gp90, 0)}</div>
            <div className="text-[11px] text-gray-600">Deals/wk: {fmtNum(C.dealsPerWeekCeil,2)}</div>
            <div className="text-[11px] mt-1">Δ vs previous: <DeltaTag value={dGP90} /></div>
          </CardContent>
        </Card>

        {/* R/FTE */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-gray-500">R/FTE Ceiling</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-semibold">{eur(C.rfteCeil, 0)}</div>
            <div className="text-[11px] text-gray-600">HC: {fmtNum(curr.headcount,0)}</div>
            <div className="text-[11px] text-gray-500">Driven by deals ceiling & GM</div>
          </CardContent>
        </Card>

        {/* Cash efficiency */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-gray-500">Cash Efficiency (GP30/CAC)</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className={`text-lg font-semibold ${C.gp30OverCAC < 3 && C.gp30OverCAC > 0 ? "text-red-600" : "text-emerald-600"}`}>
              {fmtNum(C.gp30OverCAC,2)}
            </div>
            <div className="text-[11px] text-gray-600">{"<3 => cash constraint"}</div>
          </CardContent>
        </Card>

        {/* Row 2 — widgets with comparisons */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-gray-500">Qualified Rate (MQL→SQL)</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-baseline justify-between">
              <div className="text-lg font-semibold">{fmtPct(curr.qualifiedRate)}</div>
              <div className="text-[11px] text-gray-600 flex items-center gap-1">
                vs prev <DeltaTag value={dQualifiedRate} />
              </div>
            </div>
            <div className="mt-1"><MiniBar pct={curr.qualifiedRate} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-gray-500">Win Rate (Proposal→Won)</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-baseline justify-between">
              <div className="text-lg font-semibold">{fmtPct(curr.winRate)}</div>
              <div className="text-[11px] text-gray-600 flex items-center gap-1">
                vs prev <DeltaTag value={dWinRate} />
              </div>
            </div>
            <div className="mt-1"><MiniBar pct={curr.winRate} color="#16a34a" /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-gray-500">ASP</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-baseline justify-between">
              <div className="text-lg font-semibold">{eur(curr.aspEUR, 0)}</div>
              <div className="text-[11px] text-gray-600 flex items-center gap-1">
                vs prev <DeltaTag value={dASP} />
              </div>
            </div>
            <div className="text-[11px] text-gray-600">GM: {fmtPct(curr.gm)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-gray-500">Onboardings Capacity</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-baseline justify-between">
              <div className="text-lg font-semibold">{fmtNum(curr.onboardingsPerWeek,2)}/wk</div>
              <div className="text-[11px] text-gray-600 flex items-center gap-1">
                vs prev <DeltaTag value={dOnboardings} />
              </div>
            </div>
            <div className="text-[11px] text-gray-600">Avg Days: {fmtNum(curr.onboardingDaysAvg,0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* -------- Full Funnel vs Benchmark -------- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Full Funnel vs Benchmark</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "leads", label: "Leads", ratio: leadsBenchRatio, text: `${fmtNum(curr.leads90)} vs ${fmtNum(bench.leads90)} (${(leadsBenchRatio * 100).toFixed(0)}%)`, rateText: "—" },
            { key: "qual", label: "Qualified", ratio: lqBenchRatio, text: `${fmtPct(curr.qualifiedRate)} vs ${fmtPct(bench.qualifiedRate)} (${(lqBenchRatio * 100).toFixed(0)}%)`, rateText: "Lead→Qualified" },
            { key: "book", label: "Booked", ratio: qbBenchRatio, text: `${fmtPct(curr.bookRate)} vs ${fmtPct(bench.bookRate)} (${(qbBenchRatio * 100).toFixed(0)}%)`, rateText: "Qualified→Booked" },
            { key: "show", label: "Show", ratio: bsBenchRatio, text: `${fmtPct(curr.showRate)} vs ${fmtPct(bench.showRate)} (${(bsBenchRatio * 100).toFixed(0)}%)`, rateText: "Booked→Show" },
            { key: "prop", label: "Proposal", ratio: spBenchRatio, text: `${fmtPct(curr.proposalRate)} vs ${fmtPct(bench.proposalRate)} (${(spBenchRatio * 100).toFixed(0)}%)`, rateText: "Show→Proposal" },
            { key: "won", label: "Won", ratio: pwBenchRatio, text: `${fmtPct(curr.winRate)} vs ${fmtPct(bench.winRate)} (${(pwBenchRatio * 100).toFixed(0)}%)`, rateText: "Proposal→Won" },
          ].map((row) => {
            const widthPct = Math.min(100, Math.max(0, row.ratio * 100));
            const color = covColor(row.ratio);
            const badge = benchBadge(row.ratio);
            return (
              <div key={row.label} className="grid grid-cols-12 items-center gap-3">
                <div className="col-span-2 text-sm font-medium">{row.label}</div>
                <div className="col-span-6">
                  <div className="w-full h-3 rounded bg-gray-200 overflow-hidden">
                    <div className="h-3" style={{ width: `${widthPct}%`, background: color }} />
                  </div>
                  <div className="text-[11px] text-gray-600 mt-1">Attainment: {(row.ratio * 100).toFixed(0)}% of target</div>
                </div>
                <div className="col-span-4 text-right text-sm">
                  <div className="font-medium">{row.rateText !== "—" ? `${row.rateText}: ` : ""}{row.text}</div>
                  <span className={`mt-1 inline-block rounded-full px-2 py-[2px] text-[10px] border ${badge.className}`}>{badge.label}</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* -------- Stage Focus — Impact on 90d GP -------- */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Stage Focus — Impact on 90d GP if fixed to Target</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          {topImpacts.map((r) => (
            <div key={r.key} className="rounded-xl border p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">{r.label}</div>
                <span className={`rounded-full px-2 py-[2px] text-[10px] ${r.badge.className}`}>{r.badge.label}</span>
              </div>
              <div className="text-sm mt-1 text-center">
                If restored to target → <b>{eur(r.impact.deltaGP90, 0)}</b> GP uplift over 90d
              </div>
              <div className="text-xs text-gray-600 text-center">
                New deals ceiling: {fmtNum(r.impact.newDeals,2)}/wk (subject to Delivery capacity).
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* -------- Inputs — Single Comparison Table (center-aligned & editable) -------- */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" />Inputs — Current 90 | % Change | Previous 90</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">Metric</th>
                  <th className="p-2 text-center">Current 90</th>
                  <th className="p-2 text-center">% Change</th>
                  <th className="p-2 text-center">Previous 90</th>
                </tr>
              </thead>
              <tbody>
                {([
                  { k: "Window (days)", t: "int", getC: () => curr.days, setC: (v:number)=> setCurr({ ...curr, days: Math.max(1, Math.round(v)) }), getP: () => prev.days, setP: (v:number)=> setPrev({ ...prev, days: Math.max(1, Math.round(v)) }) },
                  { k: "Leads (90d)", t: "int", getC: () => curr.leads90, setC: (v:number)=> setCurr({ ...curr, leads90: Math.max(0, Math.round(v)) }), getP: () => prev.leads90, setP: (v:number)=> setPrev({ ...prev, leads90: Math.max(0, Math.round(v)) }), goodUp: true },
                  { k: "Lead → Qualified", t: "pct", getC: () => curr.qualifiedRate, setC: (v:number)=> setCurr({ ...curr, qualifiedRate: v }), getP: () => prev.qualifiedRate, setP: (v:number)=> setPrev({ ...prev, qualifiedRate: v }), goodUp: true },
                  { k: "Qualified → Booked", t: "pct", getC: () => curr.bookRate, setC: (v:number)=> setCurr({ ...curr, bookRate: v }), getP: () => prev.bookRate, setP: (v:number)=> setPrev({ ...prev, bookRate: v }), goodUp: true },
                  { k: "Booked → Show", t: "pct", getC: () => curr.showRate, setC: (v:number)=> setCurr({ ...curr, showRate: v }), getP: () => prev.showRate, setP: (v:number)=> setPrev({ ...prev, showRate: v }), goodUp: true },
                  { k: "Show → Proposal", t: "pct", getC: () => curr.proposalRate, setC: (v:number)=> setCurr({ ...curr, proposalRate: v }), getP: () => prev.proposalRate, setP: (v:number)=> setPrev({ ...prev, proposalRate: v }), goodUp: true },
                  { k: "Proposal → Won", t: "pct", getC: () => curr.winRate, setC: (v:number)=> setCurr({ ...curr, winRate: v }), getP: () => prev.winRate, setP: (v:number)=> setPrev({ ...prev, winRate: v }), goodUp: true },
                  { k: "ASP (€)", t: "eur", getC: () => curr.aspEUR, setC: (v:number)=> setCurr({ ...curr, aspEUR: v }), getP: () => prev.aspEUR, setP: (v:number)=> setPrev({ ...prev, aspEUR: v }), goodUp: true },
                  { k: "Gross Margin", t: "pct", getC: () => curr.gm, setC: (v:number)=> setCurr({ ...curr, gm: v }), getP: () => prev.gm, setP: (v:number)=> setPrev({ ...prev, gm: v }), goodUp: true },
                  { k: "Sales Cycle (days)", t: "int", getC: () => curr.salesCycleDays, setC: (v:number)=> setCurr({ ...curr, salesCycleDays: Math.max(0, Math.round(v)) }), getP: () => prev.salesCycleDays, setP: (v:number)=> setPrev({ ...prev, salesCycleDays: Math.max(0, Math.round(v)) }), goodUp: false },
                  { k: "No-Show Rate", t: "pct", getC: () => curr.noShowRate, setC: (v:number)=> setCurr({ ...curr, noShowRate: v }), getP: () => prev.noShowRate, setP: (v:number)=> setPrev({ ...prev, noShowRate: v }), goodUp: false },
                  { k: "Onboardings / wk", t: "num", getC: () => curr.onboardingsPerWeek, setC: (v:number)=> setCurr({ ...curr, onboardingsPerWeek: v }), getP: () => prev.onboardingsPerWeek, setP: (v:number)=> setPrev({ ...prev, onboardingsPerWeek: v }), goodUp: true },
                  { k: "Onboarding Days (avg)", t: "int", getC: () => curr.onboardingDaysAvg, setC: (v:number)=> setCurr({ ...curr, onboardingDaysAvg: Math.max(0, Math.round(v)) }), getP: () => prev.onboardingDaysAvg, setP: (v:number)=> setPrev({ ...prev, onboardingDaysAvg: Math.max(0, Math.round(v)) }), goodUp: false },
                  { k: "CAC (€)", t: "eur", getC: () => curr.CAC, setC: (v:number)=> setCurr({ ...curr, CAC: v }), getP: () => prev.CAC, setP: (v:number)=> setPrev({ ...prev, CAC: v }), goodUp: false },
                  { k: "Payback (days)", t: "int", getC: () => curr.paybackDays, setC: (v:number)=> setCurr({ ...curr, paybackDays: Math.max(0, Math.round(v)) }), getP: () => prev.paybackDays, setP: (v:number)=> setPrev({ ...prev, paybackDays: Math.max(0, Math.round(v)) }), goodUp: false },
                  { k: "DSO (days)", t: "int", getC: () => curr.DSO, setC: (v:number)=> setCurr({ ...curr, DSO: Math.max(0, Math.round(v)) }), getP: () => prev.DSO, setP: (v:number)=> setPrev({ ...prev, DSO: Math.max(0, Math.round(v)) }), goodUp: false },
                  { k: "Headcount", t: "int", getC: () => curr.headcount, setC: (v:number)=> setCurr({ ...curr, headcount: Math.max(0, Math.round(v)) }), getP: () => prev.headcount, setP: (v:number)=> setPrev({ ...prev, headcount: Math.max(0, Math.round(v)) }), goodUp: null },
                ] as const).map((row, i) => {
                  const prevVal = row.getP();
                  const currVal = row.getC();
                  const pct = Number.isFinite(prevVal) && Math.abs(prevVal) > 1e-9
                    ? (currVal - prevVal) / Math.abs(prevVal)
                    : null;
                  let good: null | boolean = null;
                  // @ts-ignore goodUp exists on certain rows
                  if (pct !== null) good = row.goodUp == null ? null : (row.goodUp ? pct >= 0 : pct < 0);
                  const pctStr = pct === null ? "—" : (pct * 100).toFixed(1) + "%";

                  return (
                    <tr key={i} className="border-t align-middle">
                      <td className="p-2 text-left">{row.k}</td>
                      <td className="p-2 text-center min-w-[160px]">
                        {row.t === "pct" ? (
                          <PercentInput value={currVal as number} onChange={(v) => row.setC(v)} />
                        ) : row.t === "eur" ? (
                          <DecimalInput value={currVal as number} onChange={(v) => row.setC(v)} />
                        ) : row.t === "num" ? (
                          <DecimalInput step={0.1} value={currVal as number} onChange={(v) => row.setC(v)} />
                        ) : (
                          <Input
                            type="number"
                            value={currVal as number}
                            onChange={(e) => row.setC(parseFloat(e.target.value))}
                            className="text-center"
                          />
                        )}
                      </td>
                      <td className={`p-2 text-center min-w-[120px] ${good === null ? "" : good ? "text-emerald-700" : "text-red-700"}`}>
                        {pctStr}
                      </td>
                      <td className="p-2 text-center min-w-[160px]">
                        {row.t === "pct" ? (
                          <PercentInput value={prevVal as number} onChange={(v) => row.setP(v)} />
                        ) : row.t === "eur" ? (
                          <DecimalInput value={prevVal as number} onChange={(v) => row.setP(v)} />
                        ) : row.t === "num" ? (
                          <DecimalInput step={0.1} value={prevVal as number} onChange={(v) => row.setP(v)} />
                        ) : (
                          <Input
                            type="number"
                            value={prevVal as number}
                            onChange={(e) => row.setP(parseFloat(e.target.value))}
                            className="text-center"
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-gray-500 mt-2 text-center">
            All numeric cells are center-aligned for quick scanning. Edit inline; % Change turns green when moving in the “good” direction.
          </p>
        </CardContent>
      </Card>

      {/* -------- Benchmarks / Targets -------- */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" />Benchmarks / Targets</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="font-medium mb-2">Volume</div>
            <div className="grid grid-cols-2 gap-3 items-center text-sm">
              <Label>Leads Target (90d)</Label>
              <Input
                type="number"
                className="text-center"
                value={bench.leads90}
                onChange={(e) => setBench({ ...bench, leads90: parseInt(e.target.value || "0", 10) })}
              />
            </div>
          </div>
          <div>
            <div className="font-medium mb-2">Conversion Targets</div>
            <div className="grid grid-cols-2 gap-3 items-center text-sm">
              <Label>Lead → Qualified</Label><PercentInput value={bench.qualifiedRate} onChange={(v) => setBench({ ...bench, qualifiedRate: v })} />
              <Label>Qualified → Booked</Label><PercentInput value={bench.bookRate} onChange={(v) => setBench({ ...bench, bookRate: v })} />
              <Label>Booked → Show</Label><PercentInput value={bench.showRate} onChange={(v) => setBench({ ...bench, showRate: v })} />
              <Label>Show → Proposal</Label><PercentInput value={bench.proposalRate} onChange={(v) => setBench({ ...bench, proposalRate: v })} />
              <Label>Proposal → Won</Label><PercentInput value={bench.winRate} onChange={(v) => setBench({ ...bench, winRate: v })} />
            </div>
          </div>

          <div>
            <div className="font-medium mb-2">Commercial Targets</div>
            <div className="grid grid-cols-2 gap-3 items-center text-sm">
              <Label>ASP Target (€)</Label>
              <Input
                type="number"
                className="text-center"
                value={bench.aspEUR}
                onChange={(e) => setBench({ ...bench, aspEUR: parseFloat(e.target.value || "0") })}
              />
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Use ASP target to catch mix/ICP or packaging issues (e.g., discounting dragging AOV).
            </div>
          </div>

          <div className="text-xs text-gray-600 md:col-span-2 text-center">
            Bars & badges use these targets. Green ≥100%, Amber 95–99%, Red &lt;95% of target.
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
