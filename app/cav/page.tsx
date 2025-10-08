"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Database,
  Target,
  DollarSign,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
} from "lucide-react";

/* ---------------- Helpers ---------------- */
const weeksIn = (days: number) => (days > 0 ? days / 7 : 0);
const safe = (n: number, alt = 0) => (Number.isFinite(n) && !Number.isNaN(n) ? n : alt);
const fmtNum = (n: number, d = 0) =>
  Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: d }) : "-";
const fmtPct = (n: number, d = 2) => `${(safe(n, 0) * 100).toFixed(d)}%`;
const eur = (n: number, d = 0) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: d }).format(safe(n, 0));
const monthsFromDays = (d: number) => d / 30.0;

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

function PercentInput({ value, onChange, className }: { value: number; onChange: (v: number) => void; className?: string }) {
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
function DecimalInput({ value, onChange, className, step = 0.01 }:{
  value: number; onChange: (v: number)=>void; className?: string; step?: number;
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

/* ---------------- Data shapes ---------------- */
type CavInputs = {
  days: number;              // window (90 default)

  // TOFU volume
  leads90: number;

  // Funnel conversion rates
  mqlRate: number;           // Leads -> MQL
  sqlRate: number;           // MQL -> SQL
  salRate: number;           // SQL -> SAL (accepted by sales)
  oppRate: number;           // SAL -> Opportunity
  winRate: number;           // Opp -> Won

  activationRate: number;    // Won -> Activated (first value)

  // Commercials
  acvEUR: number;            // Annual Contract Value (ARR per new customer)
  gm: number;                // Gross Margin
  salesCycleDays: number;

  // Growth quality
  churnMonthly: number;      // Monthly logo churn (as decimal)
  timeToValueDays: number;   // TTV

  // Unit economics
  CAC: number;               // fully loaded CAC per new customer
  headcount: number;
};

type Scenario = { name: string; inputs: CavInputs; };
type Benchmarks = {
  // Volume target & conversion targets (+ activation)
  leads90: number;
  mqlRate: number;
  sqlRate: number;
  salRate: number;
  oppRate: number;
  winRate: number;
  activationRate: number;

  // Targets for ACV and cycle (lower better for cycle)
  acvEUR: number;
  salesCycleDays: number;
};

/* ---------------- Presets (illustrative) ---------------- */
const PREV: Scenario = {
  name: "Prev 90d",
  inputs: {
    days: 90,
    leads90: 1250,
    mqlRate: 0.45,
    sqlRate: 0.60,
    salRate: 0.75,
    oppRate: 0.55,
    winRate: 0.36,
    activationRate: 0.82,
    acvEUR: 12000,
    gm: 0.80,
    salesCycleDays: 45,
    churnMonthly: 0.018,
    timeToValueDays: 10,
    CAC: 2400,
    headcount: 55,
  },
};

const CURR: Scenario = {
  name: "Current 90d (illustrative)",
  inputs: {
    days: 90,
    leads90: 1400,
    mqlRate: 0.42,
    sqlRate: 0.55,
    salRate: 0.72,
    oppRate: 0.50,
    winRate: 0.28,
    activationRate: 0.78,
    acvEUR: 12500,
    gm: 0.81,
    salesCycleDays: 42,
    churnMonthly: 0.02,
    timeToValueDays: 12,
    CAC: 2300,
    headcount: 58,
  },
};

const DEFAULT_BENCH: Benchmarks = {
  leads90: PREV.inputs.leads90,
  mqlRate: PREV.inputs.mqlRate,
  sqlRate: PREV.inputs.sqlRate,
  salRate: PREV.inputs.salRate,
  oppRate: PREV.inputs.oppRate,
  winRate: PREV.inputs.winRate,
  activationRate: PREV.inputs.activationRate,
  acvEUR: PREV.inputs.acvEUR,
  salesCycleDays: PREV.inputs.salesCycleDays,
};

/* ---------------- Core math ---------------- */
function computeCAV(inp: CavInputs) {
  const w = weeksIn(inp.days);
  const leadsPerWeek = w > 0 ? inp.leads90 / w : 0;

  // Stage counts per week
  const mqlPerWeek = leadsPerWeek * inp.mqlRate;
  const sqlPerWeek = mqlPerWeek * inp.sqlRate;
  const salPerWeek = sqlPerWeek * inp.salRate;
  const oppPerWeek = salPerWeek * inp.oppRate;
  const wonPerWeek = oppPerWeek * inp.winRate;
  const activatedPerWeek = wonPerWeek * inp.activationRate;

  // Acquisition Velocity (customers/week) = won per week (or activated if you prefer)
  const customersPerWeek = wonPerWeek;

  // Sales Velocity € / week (classic formula adjusted to weekly flow):
  // (Opportunities per time * WinRate * ACV) / SalesCycleTime
  const salesVelocityPerWeekEUR =
    (oppPerWeek * inp.winRate * inp.acvEUR) / (inp.salesCycleDays / 7 || 1);

  // New ARR over window
  const newARR90 = customersPerWeek * w * inp.acvEUR;

  // GP on new ARR (strictly SaaS GP often ~ ACV * GM, shown over 12 mo; here we just show 90d ARR flow * GM)
  const gpOn90dARR = newARR90 * inp.gm;

  // CAC payback (months) ~ CAC / (GM * ACV / 12)
  const monthlyGrossMarginPerCust = (inp.acvEUR * inp.gm) / 12;
  const paybackMonths = monthlyGrossMarginPerCust > 0 ? inp.CAC / monthlyGrossMarginPerCust : Infinity;

  // LTV (simple) ~ (GM * ACV per year) * (1 / churnMonthly)
  const ltv = inp.churnMonthly > 0 ? (inp.acvEUR * inp.gm) / inp.churnMonthly : Infinity;
  const ltvToCAC = inp.CAC > 0 ? ltv / inp.CAC : Infinity;

  return {
    weeks: w,
    leadsPerWeek,
    mqlPerWeek,
    sqlPerWeek,
    salPerWeek,
    oppPerWeek,
    wonPerWeek,
    activatedPerWeek,

    customersPerWeek,
    salesVelocityPerWeekEUR,
    newARR90,
    gpOn90dARR,
    paybackMonths,
    ltvToCAC,
  };
}

/* ---------------- Page ---------------- */
export default function AcquisitionVelocity() {
  const [curr, setCurr] = useState<CavInputs>(CURR.inputs);
  const [prev, setPrev] = useState<CavInputs>(PREV.inputs);
  const [bench, setBench] = useState<Benchmarks>(DEFAULT_BENCH);

  const C = useMemo(() => computeCAV(curr), [curr]);
  const P = useMemo(() => computeCAV(prev), [prev]);

  // Bench attainment ratios
  const rLeads = bench.leads90 > 0 ? curr.leads90 / bench.leads90 : NaN;
  const rMQL = bench.mqlRate > 0 ? curr.mqlRate / bench.mqlRate : NaN;
  const rSQL = bench.sqlRate > 0 ? curr.sqlRate / bench.sqlRate : NaN;
  const rSAL = bench.salRate > 0 ? curr.salRate / bench.salRate : NaN;
  const rOPP = bench.oppRate > 0 ? curr.oppRate / bench.oppRate : NaN;
  const rWIN = bench.winRate > 0 ? curr.winRate / bench.winRate : NaN;
  const rACT = bench.activationRate > 0 ? curr.activationRate / bench.activationRate : NaN;
  // Lower is better for cycle; attainment = target / actual
  const rCYCLE = Number.isFinite(curr.salesCycleDays) && curr.salesCycleDays > 0
    ? (bench.salesCycleDays || curr.salesCycleDays) / curr.salesCycleDays
    : NaN;
  const rACV = bench.acvEUR > 0 ? curr.acvEUR / bench.acvEUR : NaN;

  // Deltas vs previous
  const dLeads = deltaPct(curr.leads90, prev.leads90);
  const dWin = deltaPct(curr.winRate, prev.winRate);
  const dACV = deltaPct(curr.acvEUR, prev.acvEUR);
  const dVelocityEUR = deltaPct(C.salesVelocityPerWeekEUR, P.salesVelocityPerWeekEUR);
  const dCustPerWk = deltaPct(C.customersPerWeek, P.customersPerWeek);
  const dPayback = deltaPct(P.paybackMonths, C.paybackMonths); // inverted (down is good); we show sign via text
  const dLTVtoCAC = deltaPct(C.ltvToCAC, P.ltvToCAC);

  // Impact simulation (restore weakest to benchmark, see New ARR uplift)
  function simulateWith(target: Partial<CavInputs>) {
    const sim = computeCAV({ ...curr, ...target });
    return { newARR90: sim.newARR90 };
  }
  function impactFor(key: "leads"|"mql"|"sql"|"sal"|"opp"|"win"|"act"|"acv"|"cycle") {
    switch (key) {
      case "leads": {
        const need = Math.max(curr.leads90, bench.leads90);
        const sim = simulateWith({ leads90: need });
        return sim.newARR90 - C.newARR90;
      }
      case "mql": {
        const sim = simulateWith({ mqlRate: Math.max(curr.mqlRate, bench.mqlRate) });
        return sim.newARR90 - C.newARR90;
      }
      case "sql": {
        const sim = simulateWith({ sqlRate: Math.max(curr.sqlRate, bench.sqlRate) });
        return sim.newARR90 - C.newARR90;
      }
      case "sal": {
        const sim = simulateWith({ salRate: Math.max(curr.salRate, bench.salRate) });
        return sim.newARR90 - C.newARR90;
      }
      case "opp": {
        const sim = simulateWith({ oppRate: Math.max(curr.oppRate, bench.oppRate) });
        return sim.newARR90 - C.newARR90;
      }
      case "win": {
        const sim = simulateWith({ winRate: Math.max(curr.winRate, bench.winRate) });
        return sim.newARR90 - C.newARR90;
      }
      case "act": {
        const sim = simulateWith({ activationRate: Math.max(curr.activationRate, bench.activationRate) });
        return sim.newARR90 - C.newARR90;
      }
      case "acv": {
        const sim = simulateWith({ acvEUR: Math.max(curr.acvEUR, bench.acvEUR) });
        return sim.newARR90 - C.newARR90;
      }
      case "cycle": {
        // cycle: lower is better -> restore to min(curr, benchTarget)
        const sim = simulateWith({ salesCycleDays: Math.min(curr.salesCycleDays, bench.salesCycleDays || curr.salesCycleDays) });
        return sim.newARR90 - C.newARR90;
      }
    }
  }

  const stages = [
    { key: "leads", label: "Leads", ratio: rLeads, txt: `${fmtNum(curr.leads90)} vs ${fmtNum(bench.leads90)}`, impact: impactFor("leads") },
    { key: "mql", label: "MQL", ratio: rMQL, txt: `${fmtPct(curr.mqlRate)} vs ${fmtPct(bench.mqlRate)}`, impact: impactFor("mql") },
    { key: "sql", label: "SQL", ratio: rSQL, txt: `${fmtPct(curr.sqlRate)} vs ${fmtPct(bench.sqlRate)}`, impact: impactFor("sql") },
    { key: "sal", label: "SAL", ratio: rSAL, txt: `${fmtPct(curr.salRate)} vs ${fmtPct(bench.salRate)}`, impact: impactFor("sal") },
    { key: "opp", label: "Opp", ratio: rOPP, txt: `${fmtPct(curr.oppRate)} vs ${fmtPct(bench.oppRate)}`, impact: impactFor("opp") },
    { key: "win", label: "Won", ratio: rWIN, txt: `${fmtPct(curr.winRate)} vs ${fmtPct(bench.winRate)}`, impact: impactFor("win") },
    { key: "act", label: "Activation", ratio: rACT, txt: `${fmtPct(curr.activationRate)} vs ${fmtPct(bench.activationRate)}`, impact: impactFor("act") },
    { key: "acv", label: "ACV (€)", ratio: rACV, txt: `${eur(curr.acvEUR,0)} vs ${eur(bench.acvEUR,0)}`, impact: impactFor("acv") },
    { key: "cycle", label: "Sales Cycle", ratio: rCYCLE, txt: `${fmtNum(curr.salesCycleDays,0)}d vs ${fmtNum(bench.salesCycleDays ?? curr.salesCycleDays,0)}d`, impact: impactFor("cycle") },
  ];

  // Bottleneck = greatest ARR uplift if fixed
  const topImpact = stages
    .filter(s => Number.isFinite(s.impact))
    .sort((a,b) => (b.impact as number) - (a.impact as number))[0];

  // Best performing metric = highest attainment
  const bestMetric = [...stages]
    .filter(s => Number.isFinite(s.ratio))
    .sort((a,b) => (b.ratio as number) - (a.ratio as number))[0];

  const loadPresets = () => {
    setCurr(CURR.inputs);
    setPrev(PREV.inputs);
    setBench(DEFAULT_BENCH);
  };

  return (
    <main className="mx-auto max-w-7xl p-6 space-y-6">
      {/* Title & banner */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">⚡ Customer Acquisition Velocity (SaaS)</h2>
          <Button onClick={loadPresets} className="flex items-center gap-2">
            <Database className="h-4 w-4" /> Load example data
          </Button>
        </div>

        {/* Green banner with bigger uplift text */}
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div className="font-semibold text-emerald-900 text-lg md:text-xl">
              Current bottleneck:&nbsp;
              {topImpact ? <span className="font-bold">{topImpact.label}</span> : <span className="font-bold">—</span>}
            </div>
            <div className="text-base md:text-lg font-semibold text-emerald-900">
              {topImpact ? <>Largest uplift if fixed: {eur(topImpact.impact ?? 0, 0)} <span className="font-normal text-emerald-900/90">(90d New ARR)</span></> : "—"}
            </div>
          </div>
          <div className="text-[12px] text-emerald-900/90 mt-1">
            Acquisition Velocity: <b>{fmtNum(C.customersPerWeek,2)} customers/week</b> • Sales Velocity: <b>{eur(C.salesVelocityPerWeekEUR,0)}/week</b>
          </div>
        </div>
      </motion.div>

      {/* -------- 8 Widgets (big numbers) -------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Acquisition Velocity" main={fmtNum(C.customersPerWeek,2) + " /wk"} sub="Won customers per week" mainClass="text-2xl md:text-3xl" />
        <KpiCard title="Sales Velocity" main={eur(C.salesVelocityPerWeekEUR,0) + "/wk"} sub="(Opp * Win% * ACV) / Cycle" mainClass="text-2xl md:text-3xl" delta={dVelocityEUR} />
        <KpiCard title="CAC Payback" main={`${fmtNum(curr.CAC > 0 ? C.paybackMonths : 0,1)} mo`} sub="Lower is better" mainClass="text-2xl md:text-3xl" />
        <KpiCard title="LTV : CAC" main={Number.isFinite(C.ltvToCAC) ? fmtNum(C.ltvToCAC,2) : "∞"} sub="Target ≥ 3.0x" mainClass="text-2xl md:text-3xl" delta={dLTVtoCAC} />
        <KpiCard title="Best Performing Metric" main={bestMetric ? bestMetric.label : "—"} sub={bestMetric ? bestMetric.txt : "Set benchmarks"} mainClass="text-lg md:text-xl" />
        <KpiCard title="Win Rate" main={fmtPct(curr.winRate)} sub="Opp → Won" mainClass="text-2xl md:text-3xl" delta={dWin} />
        <KpiCard title="ACV (€)" main={eur(curr.acvEUR,0)} sub="Avg annual contract value" mainClass="text-2xl md:text-3xl" delta={dACV} />
        <KpiCard title="New ARR (90d)" main={eur(C.newARR90,0)} sub="Flow from new customers" mainClass="text-2xl md:text-3xl" />
      </div>

      {/* -------- Full Funnel vs Benchmark -------- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Full Funnel vs Benchmark</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {stages.map((row) => {
            const ratio = row.ratio;
            const widthPct = Number.isFinite(ratio) ? Math.min(100, Math.max(0, ratio * 100)) : 0;
            const color = !Number.isFinite(ratio) ? "#9ca3af" : ratio >= 1 ? "#059669" : ratio >= 0.95 ? "#f59e0b" : "#dc2626";
            const badge =
              !Number.isFinite(ratio) ? { label: "—", cls: "bg-gray-100 text-gray-700 border-gray-200" } :
              ratio >= 1 ? { label: "On / Above", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" } :
              ratio >= 0.95 ? { label: "Slightly Below", cls: "bg-amber-100 text-amber-700 border-amber-200" } :
              { label: "Below Target", cls: "bg-red-100 text-red-700 border-red-200" };

            return (
              <div key={row.key} className="grid grid-cols-12 items-center gap-3">
                <div className="col-span-2 text-sm font-medium">{row.label}</div>
                <div className="col-span-6">
                  <div className="w-full h-3 rounded bg-gray-200 overflow-hidden">
                    <div className="h-3" style={{ width: `${widthPct}%`, background: color }} />
                  </div>
                  <div className="text-[11px] text-gray-600 mt-1">Attainment: {Number.isFinite(ratio) ? (ratio*100).toFixed(0) : "—"}% of target</div>
                </div>
                <div className="col-span-4 text-right text-sm">
                  <div className="font-medium">{row.txt}</div>
                  <span className={`mt-1 inline-block rounded-full px-2 py-[2px] text-[10px] border ${badge.cls}`}>{badge.label}</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* -------- Stage Focus — Top 2 Uplifts -------- */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Stage Focus — Biggest 90d New-ARR Uplifts</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          {[...stages].sort((a,b)=> (b.impact as number)-(a.impact as number)).slice(0,2).map((r)=>(
            <div key={r.key} className="rounded-xl border p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">{r.label}</div>
              </div>
              <div className="text-sm mt-1 text-center">
                If restored to target → <b>{eur((r.impact as number) || 0, 0)}</b> New ARR uplift (90d)
              </div>
              <div className="text-xs text-gray-600 text-center">
                Now: {r.txt}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* -------- Inputs — Current | % Change | Previous -------- */}
      <InputsTable curr={curr} prev={prev} setCurr={setCurr} setPrev={setPrev} />

      {/* -------- Benchmarks / Targets -------- */}
      <BenchmarksCard bench={bench} setBench={setBench} />
    </main>
  );
}

/* ---------- small presentational helpers ---------- */
function KpiCard({
  title, main, sub, delta, mainClass = "text-lg"
}: { title: string; main: string; sub?: string; delta?: number | null; mainClass?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-xs text-gray-500">{title}</CardTitle></CardHeader>
      <CardContent className="pt-0">
        <div className={`${mainClass} font-semibold`}>{main}</div>
        {sub && <div className="text-[12px] text-gray-600 mt-1">{sub}</div>}
        {typeof delta !== "undefined" && <div className="text-[12px] mt-1">Δ vs previous: <DeltaTag value={delta ?? null} /></div>}
      </CardContent>
    </Card>
  );
}

function InputsTable({
  curr, prev, setCurr, setPrev,
}: {
  curr: CavInputs; prev: CavInputs;
  setCurr: (v: CavInputs) => void; setPrev: (v: CavInputs) => void;
}) {
  return (
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

                { k: "Leads → MQL", t: "pct", getC: () => curr.mqlRate, setC: (v:number)=> setCurr({ ...curr, mqlRate: v }), getP: () => prev.mqlRate, setP: (v:number)=> setPrev({ ...prev, mqlRate: v }), goodUp: true },
                { k: "MQL → SQL", t: "pct", getC: () => curr.sqlRate, setC: (v:number)=> setCurr({ ...curr, sqlRate: v }), getP: () => prev.sqlRate, setP: (v:number)=> setPrev({ ...prev, sqlRate: v }), goodUp: true },
                { k: "SQL → SAL", t: "pct", getC: () => curr.salRate, setC: (v:number)=> setCurr({ ...curr, salRate: v }), getP: () => prev.salRate, setP: (v:number)=> setPrev({ ...prev, salRate: v }), goodUp: true },
                { k: "SAL → Opp", t: "pct", getC: () => curr.oppRate, setC: (v:number)=> setCurr({ ...curr, oppRate: v }), getP: () => prev.oppRate, setP: (v:number)=> setPrev({ ...prev, oppRate: v }), goodUp: true },
                { k: "Opp → Won", t: "pct", getC: () => curr.winRate, setC: (v:number)=> setCurr({ ...curr, winRate: v }), getP: () => prev.winRate, setP: (v:number)=> setPrev({ ...prev, winRate: v }), goodUp: true },
                { k: "Won → Activation", t: "pct", getC: () => curr.activationRate, setC: (v:number)=> setCurr({ ...curr, activationRate: v }), getP: () => prev.activationRate, setP: (v:number)=> setPrev({ ...prev, activationRate: v }), goodUp: true },

                { k: "ACV (€)", t: "eur", getC: () => curr.acvEUR, setC: (v:number)=> setCurr({ ...curr, acvEUR: v }), getP: () => prev.acvEUR, setP: (v:number)=> setPrev({ ...prev, acvEUR: v }), goodUp: true },
                { k: "Sales Cycle (days)", t: "int", getC: () => curr.salesCycleDays, setC: (v:number)=> setCurr({ ...curr, salesCycleDays: Math.max(0, Math.round(v)) }), getP: () => prev.salesCycleDays, setP: (v:number)=> setPrev({ ...prev, salesCycleDays: Math.max(0, Math.round(v)) }), goodUp: false },

                { k: "Gross Margin", t: "pct", getC: () => curr.gm, setC: (v:number)=> setCurr({ ...curr, gm: v }), getP: () => prev.gm, setP: (v:number)=> setPrev({ ...prev, gm: v }), goodUp: true },
                { k: "Monthly Churn", t: "pct", getC: () => curr.churnMonthly, setC: (v:number)=> setCurr({ ...curr, churnMonthly: v }), getP: () => prev.churnMonthly, setP: (v:number)=> setPrev({ ...prev, churnMonthly: v }), goodUp: false },
                { k: "Time to Value (days)", t: "int", getC: () => curr.timeToValueDays, setC: (v:number)=> setCurr({ ...curr, timeToValueDays: Math.max(0, Math.round(v)) }), getP: () => prev.timeToValueDays, setP: (v:number)=> setPrev({ ...prev, timeToValueDays: Math.max(0, Math.round(v)) }), goodUp: false },

                { k: "CAC (€)", t: "eur", getC: () => curr.CAC, setC: (v:number)=> setCurr({ ...curr, CAC: v }), getP: () => prev.CAC, setP: (v:number)=> setPrev({ ...prev, CAC: v }), goodUp: false },
                { k: "Headcount", t: "int", getC: () => curr.headcount, setC: (v:number)=> setCurr({ ...curr, headcount: Math.max(0, Math.round(v)) }), getP: () => prev.headcount, setP: (v:number)=> setPrev({ ...prev, headcount: Math.max(0, Math.round(v)) }), goodUp: null },
              ] as const).map((row, i) => {
                const prevVal = row.getP();
                const currVal = row.getC();
                const pct = Number.isFinite(prevVal) && Math.abs(prevVal) > 1e-9
                  ? (currVal - prevVal) / Math.abs(prevVal)
                  : null;
                let good: null | boolean = null;
                // @ts-ignore
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
          Edit inline; % Change turns green when moving in the “good” direction.
        </p>
      </CardContent>
    </Card>
  );
}

function BenchmarksCard({ bench, setBench }: { bench: Benchmarks; setBench: (b: Benchmarks) => void }) {
  return (
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
          <div className="font-medium mt-4 mb-2">Commercial Targets</div>
          <div className="grid grid-cols-2 gap-3 items-center text-sm">
            <Label>ACV Target (€)</Label>
            <Input
              type="number"
              className="text-center"
              value={bench.acvEUR}
              onChange={(e) => setBench({ ...bench, acvEUR: parseFloat(e.target.value || "0") })}
            />
            <Label>Sales Cycle Target (days)</Label>
            <Input
              type="number"
              className="text-center"
              value={bench.salesCycleDays}
              onChange={(e) => setBench({ ...bench, salesCycleDays: parseInt(e.target.value || "0", 10) })}
            />
          </div>
        </div>
        <div>
          <div className="font-medium mb-2">Conversion Targets</div>
          <div className="grid grid-cols-2 gap-3 items-center text-sm">
            <Label>Lead → MQL</Label><PercentInput value={bench.mqlRate} onChange={(v) => setBench({ ...bench, mqlRate: v })} />
            <Label>MQL → SQL</Label><PercentInput value={bench.sqlRate} onChange={(v) => setBench({ ...bench, sqlRate: v })} />
            <Label>SQL → SAL</Label><PercentInput value={bench.salRate} onChange={(v) => setBench({ ...bench, salRate: v })} />
            <Label>SAL → Opp</Label><PercentInput value={bench.oppRate} onChange={(v) => setBench({ ...bench, oppRate: v })} />
            <Label>Opp → Won</Label><PercentInput value={bench.winRate} onChange={(v) => setBench({ ...bench, winRate: v })} />
            <Label>Won → Activation</Label><PercentInput value={bench.activationRate} onChange={(v) => setBench({ ...bench, activationRate: v })} />
          </div>
        </div>
        <div className="text-xs text-gray-600 md:col-span-2 text-center">
          Bars use these targets. Green ≥100%, Amber 95–99%, Red &lt;95% of target. (Sales Cycle is inverted: lower is better.)
        </div>
      </CardContent>
    </Card>
  );
}
