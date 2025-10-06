"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
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
const fmtPct = (n: number) => `${(safe(n, 0) * 100).toFixed(2)}%`;
const eur = (n: number, d = 0) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: d }).format(safe(n, 0));

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
          onChange(Number(dec.toFixed(4))); // store internally with a bit more precision
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
const barColor = (coverage: number) =>
  coverage >= 1 ? "#059669" : coverage >= 0.8 ? "#f59e0b" : "#dc2626"; // green / amber / red

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
  noShowRate: number; // optional display only

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

type Scenario = {
  name: string;
  inputs: CoSInputs;
};

/* ---------------- Presets (illustrative) ---------------- */
const PREV: Scenario = {
  name: "Prev 90d (baseline)",
  inputs: {
    days: 90,
    leads90: 1100,
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
    leads90: 1200,
    qualifiedRate: 0.35,
    bookRate: 0.65,
    showRate: 0.85,
    proposalRate: 0.70,
    winRate: 0.40,
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

  // Downstream products from each stage
  const downFromLead = rLQ * rQB * rBS * rSP * rPW;
  const downFromQual = rQB * rBS * rSP * rPW;
  const downFromBook = rBS * rSP * rPW;
  const downFromShow = rSP * rPW;
  const downFromProp = rPW;

  // Actual per week from leads
  const qualPerWeek = leadsPerWeek * rLQ;
  const bookPerWeek = qualPerWeek * rQB;
  const showPerWeek = bookPerWeek * rBS;
  const propPerWeek = showPerWeek * rSP;
  const wonPerWeek = propPerWeek * rPW;

  // Delivery capacity (onboarding)
  const delPerWeek = inp.onboardingsPerWeek;

  // Required per week at each stage to saturate Delivery
  const reqWon = delPerWeek; // assume all onboarded were won
  const reqProp = downFromProp > 0 ? reqWon / rPW : 0;
  const reqShow = downFromShow > 0 ? reqWon / (rSP * rPW) : 0;
  const reqBook = downFromBook > 0 ? reqWon / (rBS * rSP * rPW) : 0;
  const reqQual = downFromQual > 0 ? reqWon / (rQB * rBS * rSP * rPW) : 0;
  const reqLead = downFromLead > 0 ? reqWon / downFromLead : 0;

  // Demand vs Delivery ceiling
  const demandDealsPerWeek = wonPerWeek;
  const deliveryDealsPerWeek = delPerWeek;
  const dealsPerWeekCeil = Math.min(demandDealsPerWeek, deliveryDealsPerWeek);
  const constraint = deliveryDealsPerWeek + 1e-9 < demandDealsPerWeek ? "Delivery (Onboarding)" : "Demand (Leads/Conversion)";

  // 90d economics
  const rev90 = dealsPerWeekCeil * w * inp.aspEUR;
  const gp90 = rev90 * inp.gm;
  const rfteCeil = inp.headcount > 0 ? gp90 / inp.headcount : 0;
  const gp30 = (inp.days > 0 ? gp90 / inp.days : 0) * 30;
  const gp30OverCAC = inp.CAC > 0 ? gp30 / inp.CAC : 0;

  // Lead gap (to fill Delivery)
  const reqLeadsPerWeek = reqLead;
  const leadGapPerWeek = reqLeadsPerWeek - leadsPerWeek;

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
    constraint,
    rev90,
    gp90,
    rfteCeil,
    gp30OverCAC,
    qRate: rLQ,
    wRate: rPW,
    rQB, rBS, rSP,
    leadGapPerWeek,
    reqLeadsPerWeek,
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

  const C = useMemo(() => computeKPIs(curr), [curr]);
  const P = useMemo(() => computeKPIs(prev), [prev]);

  // deltas vs baseline
  const dGP90 = deltaPct(C.gp90, P.gp90);
  const dRfte = deltaPct(C.rfteCeil, P.rfteCeil);
  const dGP30 = deltaPct(C.gp30OverCAC, P.gp30OverCAC);
  const dDealsCeil = deltaPct(C.dealsPerWeekCeil, P.dealsPerWeekCeil);
  const dQRate = deltaPct(C.qRate, P.qRate);
  const dWRate = deltaPct(C.wRate, P.wRate);
  const dASP = deltaPct(curr.aspEUR, prev.aspEUR);
  const dOnb = deltaPct(curr.onboardingsPerWeek, prev.onboardingsPerWeek);

  const loadPresets = () => {
    setCurr(CURR.inputs);
    setPrev(PREV.inputs);
  };

  // coverage per stage (actual / required)
  const covLead = C.reqLead > 0 ? C.leadsPerWeek / C.reqLead : 0;
  const covQual = C.reqQual > 0 ? C.qualPerWeek / C.reqQual : 0;
  const covBook = C.reqBook > 0 ? C.bookPerWeek / C.reqBook : 0;
  const covShow = C.reqShow > 0 ? C.showPerWeek / C.reqShow : 0;
  const covProp = C.reqProp > 0 ? C.propPerWeek / C.reqProp : 0;
  const covWon  = C.reqWon  > 0 ? C.wonPerWeek  / C.reqWon  : 0;
  const covOnb  = 1; // delivery is the requirement anchor

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
        <p className="text-gray-600">Two rows of 4 widgets + full funnel vs required to saturate Delivery. Edit Current vs Prev 90d below.</p>
      </motion.div>

      {/* -------- Top Widgets (8 across 2 rows) -------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Row 1 */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-gray-500">Constraint</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="text-base font-semibold">{C.constraint}</div>
            <div className="text-[11px] text-gray-600">
              Dem {fmtNum(C.demandDealsPerWeek,2)}/wk vs Del {fmtNum(C.deliveryDealsPerWeek,2)}/wk
            </div>
            <div className="text-[11px] mt-1">Δ vs prev: <DeltaTag value={dDealsCeil} /></div>
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
            <div className="text-[11px] mt-1">Δ vs prev: <DeltaTag value={dGP30} /></div>
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
            <div className="text-[11px] mt-1">Δ vs prev: <DeltaTag value={dQRate} /></div>
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
            <div className="text-[11px] mt-1">Δ vs prev: <DeltaTag value={dWRate} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-gray-500">ASP</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-semibold">{eur(curr.aspEUR, 0)}</div>
            <div className="text-[11px] text-gray-600">GM: {fmtPct(curr.gm)}</div>
            <div className="text-[11px] mt-1">Δ vs prev: <DeltaTag value={dASP} /></div>
          </CardContent>
        </Card>

        {/* NEW: Lead Gap widget to keep 8 total */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-gray-500">Lead Gap (per week)</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className={`text-lg font-semibold ${C.leadGapPerWeek > 0 ? "text-amber-700" : "text-emerald-700"}`}>
              {C.leadGapPerWeek > 0 ? `-${fmtNum(C.leadGapPerWeek,1)} /wk` : `+${fmtNum(Math.abs(C.leadGapPerWeek),1)} /wk`}
            </div>
            <div className="text-[11px] text-gray-600">
              Req {fmtNum(C.reqLeadsPerWeek,1)} vs Actual {fmtNum(C.leadsPerWeek,1)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* -------- Full Funnel vs Required (color-coded) -------- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Full Funnel vs Required (per week)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: "Leads", actual: C.leadsPerWeek, req: C.reqLead, cov: covLead },
            { label: "Qualified", actual: C.qualPerWeek, req: C.reqQual, cov: covQual },
            { label: "Booked", actual: C.bookPerWeek, req: C.reqBook, cov: covBook },
            { label: "Show", actual: C.showPerWeek, req: C.reqShow, cov: covShow },
            { label: "Proposal", actual: C.propPerWeek, req: C.reqProp, cov: covProp },
            { label: "Won", actual: C.wonPerWeek, req: C.reqWon, cov: covWon },
            { label: "Onboarded", actual: C.delPerWeek, req: C.delPerWeek, cov: covOnb },
          ].map((row) => {
            const widthPct = Math.min(100, (row.actual / Math.max(1e-9, row.req)) * 100);
            const color = barColor(row.cov);
            return (
              <div key={row.label} className="grid grid-cols-12 items-center gap-3">
                <div className="col-span-2 text-sm">{row.label}</div>
                <div className="col-span-8">
                  <div className="w-full h-3 rounded bg-gray-200 overflow-hidden">
                    <div className="h-3" style={{ width: `${widthPct}%`, background: color }} />
                  </div>
                </div>
                <div className="col-span-2 text-right text-sm font-medium">
                  {fmtNum(row.actual, 2)}/wk <span className="text-gray-500">req {fmtNum(row.req, 2)}/wk</span>
                </div>
              </div>
            );
          })}
          <div className="text-xs text-gray-600">
            Color = Actual/wk ÷ Required/wk: green ≥ 100%, amber 80–99%, red &lt; 80%. Required is back-solved from Delivery capacity and downstream conversion.
          </div>
        </CardContent>
      </Card>

      {/* -------- Lead Gap & Prescription -------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Lead Gap (to fill Delivery)</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>Required leads/wk: <b>{fmtNum(C.reqLeadsPerWeek,1)}</b></div>
            <div>Actual leads/wk: <b>{fmtNum(C.leadsPerWeek,1)}</b></div>
            <div className={`rounded-lg p-2 ${C.leadGapPerWeek > 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
              {C.leadGapPerWeek > 0
                ? `Short by ~${fmtNum(C.leadGapPerWeek,1)} leads/wk to saturate Delivery.`
                : "Lead supply is sufficient to saturate Delivery."}
            </div>
            <div className="text-[11px] text-gray-600">Raising Qualified% or Win% reduces the required lead volume fastest.</div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Prescription</CardTitle></CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 text-sm space-y-1">
              {advice.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
            <div className="text-[11px] text-gray-500 mt-2">Order of ops: Exploit → Subordinate → Elevate. Show the math before hiring.</div>
          </CardContent>
        </Card>
      </div>

      {/* -------- Inputs (Current vs Prev 90d) -------- */}
      <Tabs defaultValue="current" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="current">Current 90d Inputs</TabsTrigger>
          <TabsTrigger value="prev">Prev 90d (Baseline)</TabsTrigger>
        </TabsList>

        {/* Current */}
        <TabsContent value="current">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" />Current Inputs (EUR)</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              {/* Commercial & Sales */}
              <div>
                <div className="font-medium mb-2">Commercial & Sales</div>
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
                </div>
              </div>

              {/* Delivery & Cash */}
              <div>
                <div className="font-medium mb-2">Delivery, Product & Cash</div>
                <div className="grid grid-cols-2 gap-3 items-center text-sm">
                  <Label>Onboardings / week</Label><DecimalInput value={curr.onboardingsPerWeek} onChange={(v) => setCurr({ ...curr, onboardingsPerWeek: v })} />
                  <Label>Onboarding Days (avg)</Label><Input type="number" value={curr.onboardingDaysAvg} onChange={(e) => setCurr({ ...curr, onboardingDaysAvg: parseInt(e.target.value || "0", 10) })} />
                  <Label>Active Forwarders</Label><Input type="number" value={curr.activeForwarders} onChange={(e) => setCurr({ ...curr, activeForwarders: parseInt(e.target.value || "0", 10) })} />
                  <Label>Active Airlines</Label><Input type="number" value={curr.activeAirlines} onChange={(e) => setCurr({ ...curr, activeAirlines: parseInt(e.target.value || "0", 10) })} />
                  <Label>CAC (€)</Label><DecimalInput value={curr.CAC} onChange={(v) => setCurr({ ...curr, CAC: v })} />
                  <Label>Payback (days)</Label><Input type="number" value={curr.paybackDays} onChange={(e) => setCurr({ ...curr, paybackDays: parseInt(e.target.value || "0", 10) })} />
                  <Label>DSO (days)</Label><Input type="number" value={curr.DSO} onChange={(e) => setCurr({ ...curr, DSO: parseInt(e.target.value || "0", 10) })} />
                  <Label>Headcount</Label><Input type="number" value={curr.headcount} onChange={(e) => setCurr({ ...curr, headcount: parseInt(e.target.value || "0", 10) })} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prev */}
        <TabsContent value="prev">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" />Prev 90d (Baseline) Inputs</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              {/* Commercial & Sales */}
              <div>
                <div className="font-medium mb-2">Commercial & Sales</div>
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
                </div>
              </div>

              {/* Delivery & Cash */}
              <div>
                <div className="font-medium mb-2">Delivery, Product & Cash</div>
                <div className="grid grid-cols-2 gap-3 items-center text-sm">
                  <Label>Onboardings / week</Label><DecimalInput value={prev.onboardingsPerWeek} onChange={(v) => setPrev({ ...prev, onboardingsPerWeek: v })} />
                  <Label>Onboarding Days (avg)</Label><Input type="number" value={prev.onboardingDaysAvg} onChange={(e) => setPrev({ ...prev, onboardingDaysAvg: parseInt(e.target.value || "0", 10) })} />
                  <Label>Active Forwarders</Label><Input type="number" value={prev.activeForwarders} onChange={(e) => setPrev({ ...prev, activeForwarders: parseInt(e.target.value || "0", 10) })} />
                  <Label>Active Airlines</Label><Input type="number" value={prev.activeAirlines} onChange={(e) => setPrev({ ...prev, activeAirlines: parseInt(e.target.value || "0", 10) })} />
                  <Label>CAC (€)</Label><DecimalInput value={prev.CAC} onChange={(v) => setPrev({ ...prev, CAC: v })} />
                  <Label>Payback (days)</Label><Input type="number" value={prev.paybackDays} onChange={(e) => setPrev({ ...prev, paybackDays: parseInt(e.target.value || "0", 10) })} />
                  <Label>DSO (days)</Label><Input type="number" value={prev.DSO} onChange={(e) => setPrev({ ...prev, DSO: parseInt(e.target.value || "0", 10) })} />
                  <Label>Headcount</Label><Input type="number" value={prev.headcount} onChange={(e) => setPrev({ ...prev, headcount: parseInt(e.target.value || "0", 10) })} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="text-[11px] text-gray-500">
        Required per stage is back-solved from onboarding capacity and downstream conversion. Color thresholds: green ≥ 100%, amber 80–99%, red &lt; 80%.
        GP30/CAC &lt; 3 ⇒ treat cash as a constraint.
      </p>
    </main>
  );
}
