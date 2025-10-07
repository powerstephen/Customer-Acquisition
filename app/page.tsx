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
  TrendingUp,
  Target,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Gauge,
} from "lucide-react";

/* ---------------- Helpers ---------------- */
const weeksIn = (days: number) => (days > 0 ? days / 7 : 0);
const safe = (n: number, alt = 0) => (Number.isFinite(n) && !Number.isNaN(n) ? n : alt);
const fmtNum = (n: number, d = 0) =>
  Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: d }) : "-";
const fmtPct = (n: number, d = 2) => `${(safe(n, 0) * 100).toFixed(d)}%`;
const eur = (n: number, d = 0) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: d }).format(safe(n, 0));
const pp = (n: number) => `${(n * 100).toFixed(1)} pp`;

function DecimalInput({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  className?: string;
}) {
  const to2 = (v: number) => (Number.isFinite(v) ? Number(v.toFixed(2)) : 0);
  return (
    <Input
      type="number"
      step={0.01}
      inputMode="decimal"
      className={className}
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
  value: number;
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
        className={className}
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
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">%</span>
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
  ratio >= 1 ? "#059669" : ratio >= 0.95 ? "#f59e0b" : "#dc2626"; // green / amber / red

function benchBadge(ratio: number) {
  if (!Number.isFinite(ratio)) return { label: "—", className: "bg-gray-100 text-gray-700 border border-gray-200" };
  if (ratio >= 1.0) return { label: "On / Above Target", className: "bg-emerald-100 text-emerald-700 border border-emerald-200" };
  if (ratio >= 0.95) return { label: "Slightly Below", className: "bg-amber-100 text-amber-700 border border-amber-200" };
  return { label: "Below Target", className: "bg-red-100 text-red-700 border border-red-200" };
}

/* ---------------- Data shapes ---------------- */
type CoSInputs = {
  days: number;

  // Commercial & Sales
  leads90: number;
  qualifiedRate: number; // Lead -> Qualified
  bookRate: number; // Qualified -> Booked
  showRate: number; // Booked -> Show
  proposalRate: number; // Show -> Proposal
  winRate: number; // Proposal -> Won
  aspEUR: number; // €
  gm: number; // 0..1
  salesCycleDays: number;
  noShowRate: number;

  // Delivery / Product
  onboardingsPerWeek: number; // capacity
  onboardingDaysAvg: number;
  activeForwarders: number;
  activeAirlines: number;

  // Cash / Resourcing
  CAC: number; // €
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
};

/* ---------------- Presets (illustrative) ---------------- */
const PREV: Scenario = {
  name: "Prev 90d (baseline)",
  inputs: {
    days: 90,
    leads90: 1250, // your example
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
    leads90: 1300, // above target to show green
    qualifiedRate: 0.304, // ~95% of 0.32 → amber
    bookRate: 0.65,
    showRate: 0.85,
    proposalRate: 0.70,
    winRate: 0.20, // big drop from 0.36 → red
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
};

/* ---------------- Core math ---------------- */
function computeKPIs(inp: CoSInputs) {
  const w = weeksIn(inp.days);
  const leadsPerWeek = w > 0 ? inp.leads90 / w : 0;

  // Stage rates
  const rLQ = inp.qualifiedRate;
  const rQB = inp.bookRate;
  const rBS = inp.showRate;
  const rSP = inp.proposalRate;
  const rPW = inp.winRate;

  // Per week through the funnel
  const qualPerWeek = leadsPerWeek * rLQ;
  const bookPerWeek = qualPerWeek * rQB;
  const showPerWeek = bookPerWeek * rBS;
  const propPerWeek = showPerWeek * rSP;
  const wonPerWeek = propPerWeek * rPW;

  // Delivery capacity (onboarding)
  const delPerWeek = inp.onboardingsPerWeek;

  // Required per week at each stage to saturate Delivery
  const reqWon = delPerWeek;
  const reqProp = rPW > 0 ? reqWon / rPW : 0;
  const reqShow = rSP * rPW > 0 ? reqWon / (rSP * rPW) : 0;
  const reqBook = rBS * rSP * rPW > 0 ? reqWon / (rBS * rSP * rPW) : 0;
  const reqQual = rQB * rBS * rSP * rPW > 0 ? reqWon / (rQB * rBS * rSP * rPW) : 0;
  const downFromLead = rLQ * rQB * rBS * rSP * rPW;
  const reqLead = downFromLead > 0 ? reqWon / downFromLead : 0;

  // Demand vs Delivery
  const demandDealsPerWeek = wonPerWeek;
  const deliveryDealsPerWeek = delPerWeek;
  const dealsPerWeekCeil = Math.min(demandDealsPerWeek, deliveryDealsPerWeek);

  // Economics
  const rev90 = dealsPerWeekCeil * w * inp.aspEUR;
  const gp90 = rev90 * inp.gm;
  const rfteCeil = inp.headcount > 0 ? gp90 / inp.headcount : 0;
  const gp30 = (inp.days > 0 ? gp90 / inp.days : 0) * 30;
  const gp30OverCAC = inp.CAC > 0 ? gp30 / inp.CAC : 0;

  return {
    weeks: w,
    // actuals per week
    leadsPerWeek, qualPerWeek, bookPerWeek, showPerWeek, propPerWeek, wonPerWeek, delPerWeek,
    // required per week
    reqLead, reqQual, reqBook, reqShow, reqProp, reqWon,
    // ceilings & econ
    demandDealsPerWeek, deliveryDealsPerWeek, dealsPerWeekCeil,
    rev90, gp90, rfteCeil, gp30OverCAC,
  };
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

/* ---------------- Page ---------------- */
export default function ChiefOfStaffCockpit() {
  const [curr, setCurr] = useState<CoSInputs>(CURR.inputs);
  const [prev, setPrev] = useState<CoSInputs>(PREV.inputs);
  const [bench, setBench] = useState<Benchmarks>(DEFAULT_BENCH);

  const C = useMemo(() => computeKPIs(curr), [curr]);
  const P = useMemo(() => computeKPIs(prev), [prev]);

  // top-widget deltas
  const dGP90 = deltaPct(C.gp90, P.gp90);
  const dRfte = deltaPct(C.rfteCeil, P.rfteCeil);
  const dGP30 = deltaPct(C.gp30OverCAC, P.gp30OverCAC);
  const dDealsCeil = deltaPct(C.dealsPerWeekCeil, P.dealsPerWeekCeil);

  const loadPresets = () => {
    setCurr(CURR.inputs);
    setPrev(PREV.inputs);
    setBench(DEFAULT_BENCH);
  };

  /* ---------- Benchmark ratios (used for LEFT bars & RIGHT badges) ---------- */
  const leadsBenchRatio = bench.leads90 > 0 ? curr.leads90 / bench.leads90 : NaN;
  const lqBenchRatio = bench.qualifiedRate > 0 ? curr.qualifiedRate / bench.qualifiedRate : NaN;
  const qbBenchRatio = bench.bookRate > 0 ? curr.bookRate / bench.bookRate : NaN;
  const bsBenchRatio = bench.showRate > 0 ? curr.showRate / bench.showRate : NaN;
  const spBenchRatio = bench.proposalRate > 0 ? curr.proposalRate / bench.proposalRate : NaN;
  const pwBenchRatio = bench.winRate > 0 ? curr.winRate / bench.winRate : NaN;

  /* ---------- NEW: Throughput impact if stage is lifted to benchmark ---------- */
  function simulateWith(target: Partial<CoSInputs>) {
    const sim: CoSInputs = { ...curr, ...target };
    const S = computeKPIs(sim);
    return { gp90: S.gp90, dealsPerWeekCeil: S.dealsPerWeekCeil };
  }

  function impactForStage(key: "leads" | "qual" | "book" | "show" | "prop" | "won") {
    switch (key) {
      case "leads": {
        const need = Math.max(curr.leads90, bench.leads90);
        const sim = simulateWith({ leads90: need });
        return { deltaGP90: sim.gp90 - C.gp90, newDeals: sim.dealsPerWeekCeil };
      }
      case "qual": {
        const rate = Math.max(curr.qualifiedRate, bench.qualifiedRate);
        const sim = simulateWith({ qualifiedRate: rate });
        return { deltaGP90: sim.gp90 - C.gp90, newDeals: sim.dealsPerWeekCeil };
      }
      case "book": {
        const rate = Math.max(curr.bookRate, bench.bookRate);
        const sim = simulateWith({ bookRate: rate });
        return { deltaGP90: sim.gp90 - C.gp90, newDeals: sim.dealsPerWeekCeil };
      }
      case "show": {
        const rate = Math.max(curr.showRate, bench.showRate);
        const sim = simulateWith({ showRate: rate });
        return { deltaGP90: sim.gp90 - C.gp90, newDeals: sim.dealsPerWeekCeil };
      }
      case "prop": {
        const rate = Math.max(curr.proposalRate, bench.proposalRate);
        const sim = simulateWith({ proposalRate: rate });
        return { deltaGP90: sim.gp90 - C.gp90, newDeals: sim.dealsPerWeekCeil };
      }
      case "won": {
        const rate = Math.max(curr.winRate, bench.winRate);
        const sim = simulateWith({ winRate: rate });
        return { deltaGP90: sim.gp90 - C.gp90, newDeals: sim.dealsPerWeekCeil };
      }
    }
  }

  const funnelRows = [
    {
      key: "leads",
      label: "Leads",
      leftRatio: leadsBenchRatio, // LEFT bar now uses BENCH RATIO (not coverage)
      rightText: `${fmtNum(curr.leads90)} vs ${fmtNum(bench.leads90)} (${(leadsBenchRatio * 100).toFixed(0)}%)`,
      rateText: "—",
    },
    {
      key: "qual",
      label: "Qualified",
      leftRatio: lqBenchRatio,
      rightText: `${fmtPct(curr.qualifiedRate)} vs ${fmtPct(bench.qualifiedRate)} (${(lqBenchRatio * 100).toFixed(0)}%)`,
      rateText: "Lead→Qualified",
    },
    {
      key: "book",
      label: "Booked",
      leftRatio: qbBenchRatio,
      rightText: `${fmtPct(curr.bookRate)} vs ${fmtPct(bench.bookRate)} (${(qbBenchRatio * 100).toFixed(0)}%)`,
      rateText: "Qualified→Booked",
    },
    {
      key: "show",
      label: "Show",
      leftRatio: bsBenchRatio,
      rightText: `${fmtPct(curr.showRate)} vs ${fmtPct(bench.showRate)} (${(bsBenchRatio * 100).toFixed(0)}%)`,
      rateText: "Booked→Show",
    },
    {
      key: "prop",
      label: "Proposal",
      leftRatio: spBenchRatio,
      rightText: `${fmtPct(curr.proposalRate)} vs ${fmtPct(bench.proposalRate)} (${(spBenchRatio * 100).toFixed(0)}%)`,
      rateText: "Show→Proposal",
    },
    {
      key: "won",
      label: "Won",
      leftRatio: pwBenchRatio,
      rightText: `${fmtPct(curr.winRate)} vs ${fmtPct(bench.winRate)} (${(pwBenchRatio * 100).toFixed(0)}%)`,
      rateText: "Proposal→Won",
    },
    {
      key: "onb",
      label: "Onboarded",
      leftRatio: 1,
      rightText: `${fmtNum(C.delPerWeek, 2)}/wk capacity`,
      rateText: "—",
    },
  ].map((r) => {
    const badge = benchBadge(r.leftRatio);
    const impact = r.key === "onb" ? { deltaGP90: 0, newDeals: C.dealsPerWeekCeil } : impactForStage(r.key as any);
    return { ...r, badge, impact };
  });

  // pick top 2 with largest positive impact if lifted to benchmark
  const topImpacts = funnelRows
    .filter((r) => ["leads", "qual", "book", "show", "prop", "won"].includes(r.key))
    .sort((a, b) => (b.impact.deltaGP90) - (a.impact.deltaGP90))
    .slice(0, 2);

  const advice = (() => {
    if (C.deliveryDealsPerWeek + 1e-9 < C.demandDealsPerWeek) {
      return [
        "Exploit: automate pre-boarding & checklists to cut onboarding days by 20%.",
        "Subordinate: hold net new starts if onboarding backlog > 1 week; protect CS focus time.",
        "Elevate: temporary PS/CS capacity (+2 onboardings/wk) or targeted outsourcing.",
      ];
    }
    return [
      "Exploit: improve ICP filtering & landing pages to raise Lead→Qualified.",
      "Subordinate: SDRs prioritize high-fit accounts; reduce no-shows with tighter reminders/SMS.",
      "Elevate: partnerships/referrals; goal +15% Qualified volume at same CAC.",
    ];
  })();

  return (
    <main className="mx-auto max-w-7xl p-6 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Chief of Staff Cockpit — Cargo.one</h1>
          <div className="flex items-center gap-2">
            <Button onClick={loadPresets} className="flex items-center gap-2">
              <Database className="h-4 w-4" /> Load example data
            </Button>
          </div>
        </div>
        <p className="text-gray-600">
          Top KPIs, Benchmark-aware Funnel (left bars now match right badges), and estimated 90-day GP impact if a weak stage is lifted to target.
        </p>
      </motion.div>

      {/* -------- Top Widgets (2 rows of 4) -------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Row 1 */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-gray-500">Constraint</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="text-base font-semibold">
              {C.deliveryDealsPerWeek + 1e-9 < C.demandDealsPerWeek ? "Delivery (Onboarding)" : "Demand (Leads/Conversion)"}
            </div>
            <div className="text-[11px] text-gray-600">
              Dem {fmtNum(C.demandDealsPerWeek,2)}/wk vs Del {fmtNum(C.deliveryDealsPerWeek,2)}/wk
            </div>
            <div className="text-[11px] mt-1">Δ Deals Ceiling: <DeltaTag value={dDealsCeil} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-gray-500">Throughput Ceiling (GP 90d)</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-semibold">{eur(C.gp90, 0)}</div>
            <div className="text-[11px] text-gray-600">Deals/wk: {fmtNum(C.dealsPerWeekCeil,2)}</div>
            <div className="text-[11px] mt-1">Δ vs prev: <DeltaTag value={dGP90} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-gray-500">R/FTE Ceiling</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-semibold">{eur(C.rfteCeil, 0)}</div>
            <div className="text-[11px] text-gray-600">HC: {fmtNum(curr.headcount,0)}</div>
            <div className="text-[11px] mt-1">Δ vs prev: <DeltaTag value={dRfte} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-gray-500">Cash Efficiency (GP30/CAC)</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className={`text-lg font-semibold ${C.gp30OverCAC < 3 && C.gp30OverCAC > 0 ? "text-red-600" : "text-emerald-600"}`}>
              {fmtNum(C.gp30OverCAC,2)}
            </div>
            <div className="text-[11px] text-gray-600">{"<3 ⇒ cash constraint"}</div>
          </CardContent>
        </Card>

        {/* Row 2 */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-gray-500">Qualified Rate (MQL→SQL)</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">{fmtPct(curr.qualifiedRate)}</div>
              <BarChart3 className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="mt-1"><MiniBar pct={curr.qualifiedRate} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-gray-500">Win Rate (Proposal→Won)</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">{fmtPct(curr.winRate)}</div>
              <Target className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="mt-1"><MiniBar pct={curr.winRate} color="#16a34a" /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-gray-500">ASP</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-semibold">{eur(curr.aspEUR, 0)}</div>
            <div className="text-[11px] text-gray-600">GM: {fmtPct(curr.gm)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-gray-500">Onboardings Capacity</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">{fmtNum(curr.onboardingsPerWeek,2)}/wk</div>
              <Gauge className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="text-[11px] text-gray-600">Avg Days: {fmtNum(curr.onboardingDaysAvg,0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* -------- Benchmark-aware Funnel (LEFT bars now = benchmark attainment) -------- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Full Funnel vs Benchmark</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {funnelRows.map((row) => {
            const widthPct = Math.min(100, Math.max(0, row.leftRatio * 100));
            const color = covColor(row.leftRatio);
            return (
              <div key={row.label} className="grid grid-cols-12 items-center gap-3">
                <div className="col-span-2 text-sm font-medium">{row.label}</div>
                <div className="col-span-6">
                  <div className="w-full h-3 rounded bg-gray-200 overflow-hidden">
                    <div className="h-3" style={{ width: `${widthPct}%`, background: color }} />
                  </div>
                  <div className="text-[11px] text-gray-600 mt-1">Attainment: {(row.leftRatio * 100).toFixed(0)}% of target</div>
                </div>
                <div className="col-span-4 text-right text-sm">
                  <div className="font-medium">{row.rateText !== "—" ? `${row.rateText}: ` : ""}{row.rightText}</div>
                  <span className={`mt-1 inline-block rounded-full px-2 py-[2px] text-[10px] border ${row.badge.className}`}>{row.badge.label}</span>
                </div>
              </div>
            );
          })}
          <div className="text-xs text-gray-600">
            Left bars & badges both reflect **Current vs Benchmark**. (We can add a thin marker for capacity if you still want that overlay.)
          </div>
        </CardContent>
      </Card>

      {/* -------- Stage Focus (Top Throughput Impacts if lifted to Benchmark) -------- */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Stage Focus — Impact on 90d GP if fixed to Target</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          {topImpacts.map((r) => (
            <div key={r.key} className="rounded-xl border p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">{r.label}</div>
                <span className={`rounded-full px-2 py-[2px] text-[10px] ${r.badge.className}`}>{r.badge.label}</span>
              </div>
              <div className="text-sm mt-1">
                If restored to target → <b>{eur(r.impact.deltaGP90, 0)}</b> GP uplift over 90d
              </div>
              <div className="text-xs text-gray-600">
                New deals ceiling: {fmtNum(r.impact.newDeals,2)}/wk (subject to Delivery capacity).
              </div>
            </div>
          ))}
          {topImpacts.length === 0 && (
            <div className="text-sm text-gray-600">No material gains from lifting stages to target (likely Delivery constrained).</div>
          )}
        </CardContent>
      </Card>

      {/* -------- Prescription -------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Lead / Rate Guidance</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div>Prioritize stages with the **largest GP uplift** above.</div>
            <div>If Delivery is the constraint, first **reduce onboarding days** or add **temporary capacity**.</div>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Prescription (TOC)</CardTitle></CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 text-sm space-y-1">
              {[
                "Exploit: fix defects/templates before adding headcount.",
                "Subordinate: protect calendars around the constraint; avoid flooding a bottleneck.",
                "Elevate: only then automate/specialize/outsource/hire.",
              ].map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* -------- Inputs side-by-side + Comparison Table -------- */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" />Inputs — Current vs Previous (side by side)</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Current */}
            <div>
              <div className="font-medium mb-2">Current 90d (EUR)</div>
              <div className="grid grid-cols-2 gap-3 items-center text-sm">
                <Label>Window (days)</Label><Input type="number" value={curr.days} onChange={(e) => setCurr({ ...curr, days: parseInt(e.target.value || "0", 10) })} />
                <Label>Leads (90d)</Label><Input type="number" value={curr.leads90} onChange={(e) => setCurr({ ...curr, leads90: parseInt(e.target.value || "0", 10) })} />
                <Label>Lead → Qualified</Label><PercentInput value={curr.qualifiedRate} onChange={(v) => setCurr({ ...curr, qualifiedRate: v })} />
                <Label>Qualified → Booked</Label><PercentInput value={curr.bookRate} onChange={(v) => setCurr({ ...curr, bookRate: v })} />
                <Label>Booked → Show</Label><PercentInput value={curr.showRate} onChange={(v) => setCurr({ ...curr, showRate: v })} />
                <Label>Show → Proposal</Label><PercentInput value={curr.proposalRate} onChange={(v) => setCurr({ ...curr, proposalRate: v })} />
                <Label>Proposal → Won</Label><PercentInput value={curr.winRate} onChange={(v) => setCurr({ ...curr, winRate: v })} />
                <Label>ASP (€)</Label><DecimalInput value={curr.aspEUR} onChange={(v) => setCurr({ ...curr, aspEUR: v })} />
                <Label>Gross Margin</Label><PercentInput value={curr.gm} onChange={(v) => setCurr({ ...curr, gm: v })} />
                <Label>Sales Cycle (days)</Label><Input type="number" value={curr.salesCycleDays} onChange={(e) => setCurr({ ...curr, salesCycleDays: parseInt(e.target.value || "0", 10) })} />
                <Label>No-Show Rate</Label><PercentInput value={curr.noShowRate} onChange={(v) => setCurr({ ...curr, noShowRate: v })} />
                <Label>Onboardings / week</Label><DecimalInput value={curr.onboardingsPerWeek} onChange={(v) => setCurr({ ...curr, onboardingsPerWeek: v })} />
                <Label>Onboarding Days (avg)</Label><Input type="number" value={curr.onboardingDaysAvg} onChange={(e) => setCurr({ ...curr, onboardingDaysAvg: parseInt(e.target.value || "0", 10) })} />
                <Label>CAC (€)</Label><DecimalInput value={curr.CAC} onChange={(v) => setCurr({ ...curr, CAC: v })} />
                <Label>Payback (days)</Label><Input type="number" value={curr.paybackDays} onChange={(e) => setCurr({ ...curr, paybackDays: parseInt(e.target.value || "0", 10) })} />
                <Label>DSO (days)</Label><Input type="number" value={curr.DSO} onChange={(e) => setCurr({ ...curr, DSO: parseInt(e.target.value || "0", 10) })} />
                <Label>Headcount</Label><Input type="number" value={curr.headcount} onChange={(e) => setCurr({ ...curr, headcount: parseInt(e.target.value || "0", 10) })} />
              </div>
            </div>

            {/* Previous */}
            <div>
              <div className="font-medium mb-2">Previous 90d (Baseline)</div>
              <div className="grid grid-cols-2 gap-3 items-center text-sm">
                <Label>Window (days)</Label><Input type="number" value={prev.days} onChange={(e) => setPrev({ ...prev, days: parseInt(e.target.value || "0", 10) })} />
                <Label>Leads (90d)</Label><Input type="number" value={prev.leads90} onChange={(e) => setPrev({ ...prev, leads90: parseInt(e.target.value || "0", 10) })} />
                <Label>Lead → Qualified</Label><PercentInput value={prev.qualifiedRate} onChange={(v) => setPrev({ ...prev, qualifiedRate: v })} />
                <Label>Qualified → Booked</Label><PercentInput value={prev.bookRate} onChange={(v) => setPrev({ ...prev, bookRate: v })} />
                <Label>Booked → Show</Label><PercentInput value={prev.showRate} onChange={(v) => setPrev({ ...prev, showRate: v })} />
                <Label>Show → Proposal</Label><PercentInput value={prev.proposalRate} onChange={(v) => setPrev({ ...prev, proposalRate: v })} />
                <Label>Proposal → Won</Label><PercentInput value={prev.winRate} onChange={(v) => setPrev({ ...prev, winRate: v })} />
                <Label>ASP (€)</Label><DecimalInput value={prev.aspEUR} onChange={(v) => setPrev({ ...prev, aspEUR: v })} />
                <Label>Gross Margin</Label><PercentInput value={prev.gm} onChange={(v) => setPrev({ ...prev, gm: v })} />
                <Label>Sales Cycle (days)</Label><Input type="number" value={prev.salesCycleDays} onChange={(e) => setPrev({ ...prev, salesCycleDays: parseInt(e.target.value || "0", 10) })} />
                <Label>No-Show Rate</Label><PercentInput value={prev.noShowRate} onChange={(v) => setPrev({ ...prev, noShowRate: v })} />
                <Label>Onboardings / week</Label><DecimalInput value={prev.onboardingsPerWeek} onChange={(v) => setPrev({ ...prev, onboardingsPerWeek: v })} />
                <Label>Onboarding Days (avg)</Label><Input type="number" value={prev.onboardingDaysAvg} onChange={(e) => setPrev({ ...prev, onboardingDaysAvg: parseInt(e.target.value || "0", 10) })} />
                <Label>CAC (€)</Label><DecimalInput value={prev.CAC} onChange={(v) => setPrev({ ...prev, CAC: v })} />
                <Label>Payback (days)</Label><Input type="number" value={prev.paybackDays} onChange={(e) => setPrev({ ...prev, paybackDays: parseInt(e.target.value || "0", 10) })} />
                <Label>DSO (days)</Label><Input type="number" value={prev.DSO} onChange={(e) => setPrev({ ...prev, DSO: parseInt(e.target.value || "0", 10) })} />
                <Label>Headcount</Label><Input type="number" value={prev.headcount} onChange={(e) => setPrev({ ...prev, headcount: parseInt(e.target.value || "0", 10) })} />
              </div>
            </div>
          </div>

          {/* Comparison table */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2">Metric</th>
                  <th className="text-right p-2">Prev</th>
                  <th className="text-right p-2">Current</th>
                  <th className="text-right p-2">% Change</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { k: "Leads (90d)", prev: prev.leads90, curr: curr.leads90, fmt: (n:number)=>fmtNum(n,0), pct: (curr.leads90 - prev.leads90) / Math.max(1, prev.leads90) },
                  { k: "Lead→Qualified", prev: prev.qualifiedRate, curr: curr.qualifiedRate, fmt: (n:number)=>fmtPct(n), pct: (curr.qualifiedRate - prev.qualifiedRate) / Math.max(1e-9, prev.qualifiedRate) },
                  { k: "Qualified→Booked", prev: prev.bookRate, curr: curr.bookRate, fmt: (n:number)=>fmtPct(n), pct: (curr.bookRate - prev.bookRate) / Math.max(1e-9, prev.bookRate) },
                  { k: "Booked→Show", prev: prev.showRate, curr: curr.showRate, fmt: (n:number)=>fmtPct(n), pct: (curr.showRate - prev.showRate) / Math.max(1e-9, prev.showRate) },
                  { k: "Show→Proposal", prev: prev.proposalRate, curr: curr.proposalRate, fmt: (n:number)=>fmtPct(n), pct: (curr.proposalRate - prev.proposalRate) / Math.max(1e-9, prev.proposalRate) },
                  { k: "Proposal→Won", prev: prev.winRate, curr: curr.winRate, fmt: (n:number)=>fmtPct(n), pct: (curr.winRate - prev.winRate) / Math.max(1e-9, prev.winRate) },
                  { k: "Onboardings / wk", prev: prev.onboardingsPerWeek, curr: curr.onboardingsPerWeek, fmt: (n:number)=>fmtNum(n,2), pct: (curr.onboardingsPerWeek - prev.onboardingsPerWeek) / Math.max(1e-9, prev.onboardingsPerWeek) },
                  { k: "ASP (€)", prev: prev.aspEUR, curr: curr.aspEUR, fmt: (n:number)=>eur(n,0), pct: (curr.aspEUR - prev.aspEUR) / Math.max(1e-9, prev.aspEUR) },
                  { k: "Gross Margin", prev: prev.gm, curr: curr.gm, fmt: (n:number)=>fmtPct(n), pct: (curr.gm - prev.gm) / Math.max(1e-9, prev.gm) },
                  { k: "Sales Cycle (days)", prev: prev.salesCycleDays, curr: curr.salesCycleDays, fmt: (n:number)=>fmtNum(n,0), pct: (curr.salesCycleDays - prev.salesCycleDays) / Math.max(1e-9, prev.salesCycleDays) },
                  { k: "CAC (€)", prev: prev.CAC, curr: curr.CAC, fmt: (n:number)=>eur(n,0), pct: (curr.CAC - prev.CAC) / Math.max(1e-9, prev.CAC) },
                ].map((row, i) => {
                  const pctStr = Number.isFinite(row.pct) ? (row.pct * 100).toFixed(1) + "%" : "—";
                  const good = row.k === "Sales Cycle (days)" || row.k === "CAC (€)" ? row.pct < 0 : row.pct >= 0;
                  return (
                    <tr key={i} className="border-t">
                      <td className="p-2">{row.k}</td>
                      <td className="p-2 text-right">{row.fmt(row.prev as number)}</td>
                      <td className="p-2 text-right">{row.fmt(row.curr as number)}</td>
                      <td className={`p-2 text-right ${good ? "text-emerald-700" : "text-red-700"}`}>{pctStr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* -------- Benchmarks / Targets (edit) -------- */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" />Benchmarks / Targets</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="font-medium mb-2">Volume</div>
            <div className="grid grid-cols-2 gap-3 items-center text-sm">
              <Label>Leads Target (90d)</Label>
              <Input
                type="number"
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
          <div className="text-xs text-gray-600 md:col-span-2">
            Bars & badges use these targets. Green ≥100%, Amber 95–99%, Red &lt;95% of target.
          </div>
        </CardContent>
      </Card>

      <p className="text-[11px] text-gray-500">
        Tip: To focus the org, pick 1–2 red stages with the **largest € impact** and run a 2-week “Exploit + Subordinate” sprint before considering headcount.
      </p>
    </main>
  );
}
