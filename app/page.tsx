"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { AlertTriangle, Database, TrendingUp, Target, DollarSign, Activity, ArrowUpRight, ArrowDownRight } from "lucide-react";

/* ===================== Helpers ===================== */
const weeksIn = (days: number) => (days > 0 ? days / 7 : 0);
const safe = (n: number, alt = 0) => (Number.isFinite(n) && !Number.isNaN(n) ? n : alt);
const fmtNum = (n: number, d = 0) => (Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: d }) : "-");
const fmtPct = (n: number) => `${(safe(n, 0) * 100).toFixed(2)}%`;
const eur = (n: number, d = 0) => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: d }).format(safe(n, 0));

function DecimalInput({ value, onChange, className }: { value: number; onChange: (v: number) => void; className?: string }) {
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
        className={className}
        value={display}
        onChange={(e) => {
          const raw = parseFloat(e.target.value);
          const dec = (Number.isFinite(raw) ? raw : 0) / 100;
          onChange(Number(dec.toFixed(4))); // store more precise internally
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

/* ===================== Data Shapes ===================== */
type CoSInputs = {
  days: number;

  // Commercial & Sales
  leads90: number;
  qualifiedRate: number; // 0..1
  winRate: number; // 0..1
  aspEUR: number; // €
  gm: number; // 0..1
  salesCycleDays: number; // avg
  noShowRate: number; // 0..1

  // Delivery / Product
  onboardingsPerWeek: number;
  onboardingDaysAvg: number;
  activeForwarders: number;
  activeAirlines: number;

  // Cash / Finance / Resourcing
  CAC: number; // €
  paybackDays: number;
  DSO: number;
  headcount: number;
};

type Scenario = {
  name: string;
  inputs: CoSInputs;
};

/* ===================== Preset: Current vs Prev 90d (illustrative) ===================== */
const PRESET_PREV: Scenario = {
  name: "Prev 90d (baseline)",
  inputs: {
    days: 90,
    leads90: 1100,
    qualifiedRate: 0.32,
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

const PRESET_CURR: Scenario = {
  name: "Current 90d (illustrative)",
  inputs: {
    days: 90,
    leads90: 1200,
    qualifiedRate: 0.35,
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

/* ===================== Core Math ===================== */
function computeKPIs(inp: CoSInputs) {
  const w = weeksIn(inp.days);
  const leadsPerWeek = w > 0 ? inp.leads90 / w : 0;

  const qualified90 = inp.leads90 * inp.qualifiedRate;
  const won90 = qualified90 * inp.winRate;

  const dealsPerWeekDemand = w > 0 ? won90 / w : 0;
  const dealsPerWeekDelivery = inp.onboardingsPerWeek; // can you onboard what you close?

  // system ceiling is min(demand, delivery)
  const dealsPerWeekCeil = Math.min(dealsPerWeekDemand, dealsPerWeekDelivery);
  const constraint =
    dealsPerWeekDelivery + 1e-9 < dealsPerWeekDemand ? "Delivery (Onboarding)" : "Demand (Leads/Conversion)";

  // Revenue / GP ceilings (90d)
  const rev90 = dealsPerWeekCeil * w * inp.aspEUR;
  const gp90 = rev90 * inp.gm;
  const rfteCeil = inp.headcount > 0 ? gp90 / inp.headcount : 0;

  // GP30/CAC
  const gpPerDay = inp.days > 0 ? gp90 / inp.days : 0;
  const gp30 = gpPerDay * 30;
  const gp30OverCAC = inp.CAC > 0 ? gp30 / inp.CAC : 0;
  const cashFlag = gp30OverCAC > 0 && gp30OverCAC < 3;

  // Required leads to saturate Delivery (per week)
  const downstream = inp.qualifiedRate * inp.winRate;
  const reqLeadsPerWeek = downstream > 0 ? dealsPerWeekDelivery / downstream : 0;
  const leadGapPerWeek = reqLeadsPerWeek - leadsPerWeek;

  return {
    weeks: w,
    leadsPerWeek,
    qualified90,
    won90,
    dealsPerWeekDemand,
    dealsPerWeekDelivery,
    dealsPerWeekCeil,
    constraint,
    rev90,
    gp90,
    rfteCeil,
    gp30OverCAC,
    cashFlag,
    reqLeadsPerWeek,
    leadGapPerWeek,
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

/* ===================== UI ===================== */
export default function ChiefOfStaffCockpit() {
  const [curr, setCurr] = useState<CoSInputs>(PRESET_CURR.inputs);
  const [prev, setPrev] = useState<CoSInputs>(PRESET_PREV.inputs);

  const C = useMemo(() => computeKPIs(curr), [curr]);
  const P = useMemo(() => computeKPIs(prev), [prev]);

  // deltas vs baseline
  const dGP90 = deltaPct(C.gp90, P.gp90);
  const dRfte = deltaPct(C.rfteCeil, P.rfteCeil);
  const dGP30 = deltaPct(C.gp30OverCAC, P.gp30OverCAC);
  const dDealsCeil = deltaPct(C.dealsPerWeekCeil, P.dealsPerWeekCeil);

  // simple advice
  const advice = (() => {
    if (C.constraint.startsWith("Delivery")) {
      return [
        "Exploit: pre-boarding checklist and automation to cut onboarding days by 20%.",
        "Subordinate: throttle net new deals if backlog > 1 week; protect Delivery focus time.",
        "Elevate: temporary CS/PS contractor to lift onboardings/week by +2.",
      ];
    }
    // Demand
    return [
      "Exploit: shift budget to channels with higher Qualified%; enforce ICP on forms.",
      "Subordinate: SDRs prioritize high-fit sequences; cut no-show with tighter reminders.",
      "Elevate: partnership/referral lane; target +15% qualified volume.",
    ];
  })();

  const loadPresets = () => {
    setCurr(PRESET_CURR.inputs);
    setPrev(PRESET_PREV.inputs);
  };

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
        <p className="text-gray-600">Enter your last 90d data (Current vs Prev 90d). The cockpit names the constraint, shows the GP ceiling, cash efficiency, and concrete levers.</p>
      </motion.div>

      {/* ====== Summary Row ====== */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Constraint</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-semibold">{C.constraint}</div>
            <div className="text-xs text-gray-600">
              Demand {fmtNum(C.dealsPerWeekDemand,2)}/wk vs Delivery {fmtNum(C.dealsPerWeekDelivery,2)}/wk
            </div>
            <div className="text-xs mt-1">Δ vs prev: <DeltaTag value={dDealsCeil} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Throughput Ceiling (90d GP)</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-semibold">{eur(C.gp90, 0)}</div>
            <div className="text-xs text-gray-600">Ceiling deals/wk: {fmtNum(C.dealsPerWeekCeil,2)}</div>
            <div className="text-xs mt-1">Δ vs prev: <DeltaTag value={dGP90} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">R/FTE Ceiling</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-semibold">{eur(C.rfteCeil, 0)}</div>
            <div className="text-xs text-gray-600">Headcount: {fmtNum(curr.headcount,0)}</div>
            <div className="text-xs mt-1">Δ vs prev: <DeltaTag value={dRfte} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Cash Efficiency (GP30 / CAC)</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className={`text-2xl font-semibold ${C.gp30OverCAC < 3 && C.gp30OverCAC > 0 ? "text-red-600" : "text-emerald-600"}`}>
              {fmtNum(C.gp30OverCAC,2)}
            </div>
            <div className="text-xs text-gray-600">If &lt; 3, treat cash as a constraint.</div>
            <div className="text-xs mt-1">Δ vs prev: <DeltaTag value={dGP30} /></div>
          </CardContent>
        </Card>
      </div>

      {/* ====== Funnel Snapshot & Lead Gap ====== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" />Funnel Snapshot (Current)</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div>Leads (90d)</div><div className="text-right font-medium">{fmtNum(curr.leads90)}</div>
            <div>Qualified Rate</div><div className="text-right">{fmtPct(curr.qualifiedRate)}</div>
            <div>Win Rate</div><div className="text-right">{fmtPct(curr.winRate)}</div>
            <div>Leads/wk</div><div className="text-right">{fmtNum(C.leadsPerWeek,1)}</div>
            <div>Deals/wk (demand)</div><div className="text-right">{fmtNum(C.dealsPerWeekDemand,2)}</div>
            <div>Deals/wk (delivery)</div><div className="text-right">{fmtNum(C.dealsPerWeekDelivery,2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Lead Gap (to saturate Delivery)</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>Required leads/wk: <b>{fmtNum(C.reqLeadsPerWeek,1)}</b></div>
            <div>Actual leads/wk: <b>{fmtNum(C.leadsPerWeek,1)}</b></div>
            <div className={`rounded-lg p-2 ${C.leadGapPerWeek > 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
              {C.leadGapPerWeek > 0
                ? `Short by ~${fmtNum(C.leadGapPerWeek,1)} leads/wk to fill Delivery capacity.`
                : "Lead supply is sufficient to saturate Delivery."}
            </div>
            <div className="text-xs text-gray-600">Tip: raise Qualified% first — it reduces required leads faster than just adding volume.</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Prescription</CardTitle></CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 text-sm space-y-1">
              {advice.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
            <div className="text-[11px] text-gray-500 mt-2">Order of ops: Exploit → Subordinate → Elevate.</div>
          </CardContent>
        </Card>
      </div>

      {/* ====== Inputs (Current vs Prev 90d) ====== */}
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
                  <Label>Qualified Rate</Label><PercentInput value={curr.qualifiedRate} onChange={(v) => setCurr({ ...curr, qualifiedRate: v })} />
                  <Label>Win Rate</Label><PercentInput value={curr.winRate} onChange={(v) => setCurr({ ...curr, winRate: v })} />
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
                  <Label>Qualified Rate</Label><PercentInput value={prev.qualifiedRate} onChange={(v) => setPrev({ ...prev, qualifiedRate: v })} />
                  <Label>Win Rate</Label><PercentInput value={prev.winRate} onChange={(v) => setPrev({ ...prev, winRate: v })} />
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

      {/* ====== Tiny notes ====== */}
      <p className="text-[11px] text-gray-500">
        Constraint = min(Demand deals/wk, Delivery onboardings/wk). GP(90d) = deals_ceiling/wk × weeks × ASP × GM. GP30/CAC &lt; 3 ⇒ cash constraint.
      </p>
    </main>
  );
}
