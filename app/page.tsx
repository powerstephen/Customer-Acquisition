"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Plus, Trash2, Gauge, DollarSign, Users, AlertTriangle, Brain, Zap, SlidersHorizontal, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";

// --- Recharts: client-only (prevents SSR crashes)
const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false });
const BarChart            = dynamic(() => import("recharts").then(m => m.BarChart), { ssr: false });
const Bar                 = dynamic(() => import("recharts").then(m => m.Bar), { ssr: false });
const XAxis               = dynamic(() => import("recharts").then(m => m.XAxis), { ssr: false });
const YAxis               = dynamic(() => import("recharts").then(m => m.YAxis), { ssr: false });
const Tooltip             = dynamic(() => import("recharts").then(m => m.Tooltip), { ssr: false });
const CartesianGrid       = dynamic(() => import("recharts").then(m => m.CartesianGrid), { ssr: false });

// ---------- Types ----------
type Offer = { id: string; name: string; asp: number; gm: number; share: number };
type HeadcountRow = { id: string; role: string; fte: number; focusHrs: number; util: number; contractors: number };
type FunnelCounts = { awareness: number; lead: number; qualified: number; booked: number; show: number; proposal: number; closeWon: number };
type CycleQuality = { bookedToShowDays: number; showToProposalDays: number; proposalToCloseDays: number; noShowRate: number; proposalWin: number };
type PostClose = { onboardingToAhaDays: number; m1Retention: number; m2Retention: number };
type BacklogItem = { id: string; stage: string; units: number };
type Cash = { cac: number; dso: number; paybackDays: number; prepayShare: number };
type StageRow = { id: string; stage: string; unit: string; owner: string; fte: number; focusHrs: number; util: number; stdRate: number; yield: number };

// ---------- Helpers ----------
const fmt = (n: number, d = 0) => Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: d }) : "";
const safe = (n: number, alt = 0) => (Number.isFinite(n) && !Number.isNaN(n) ? n : alt);
const sum = (arr: number[]) => arr.reduce((a, b) => a + safe(b), 0);
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// ---------- Defaults ----------
const DEFAULT_STAGES: StageRow[] = [
  { id: "s1",  stage: "Awareness",          unit: "lead",    owner: "Marketing",    fte: 0, focusHrs: 0, util: 0.85, stdRate: 0,    yield: 1 },
  { id: "s2",  stage: "Lead",               unit: "lead",    owner: "Marketing/SDR",fte: 0, focusHrs: 0, util: 0.85, stdRate: 0,    yield: 1 },
  { id: "s3",  stage: "Qualified",          unit: "lead",    owner: "SDR",          fte: 0, focusHrs: 0, util: 0.85, stdRate: 0,    yield: 1 },
  { id: "s4",  stage: "Booked",             unit: "meeting", owner: "SDR",          fte: 0, focusHrs: 0, util: 0.85, stdRate: 0,    yield: 1 },
  { id: "s5",  stage: "Show",               unit: "meeting", owner: "AE",           fte: 0, focusHrs: 0, util: 0.85, stdRate: 0,    yield: 1 },
  { id: "s6",  stage: "Proposal",           unit: "proposal",owner: "AE/RevOps",    fte: 1, focusHrs: 20, util: 0.85, stdRate: 1,   yield: 0.95 },
  { id: "s7",  stage: "CloseWon",           unit: "deal",    owner: "AE",           fte: 0, focusHrs: 0, util: 0.85, stdRate: 0,    yield: 1 },
  { id: "s8",  stage: "Onboarding",         unit: "client",  owner: "Delivery/CS",  fte: 0, focusHrs: 0, util: 0.85, stdRate: 0,    yield: 1 },
  { id: "s9",  stage: "Aha",                unit: "client",  owner: "Delivery/CS",  fte: 0, focusHrs: 0, util: 0.85, stdRate: 0,    yield: 1 },
  { id: "s10", stage: "Delivery",           unit: "client",  owner: "Delivery",     fte: 0, focusHrs: 0, util: 0.85, stdRate: 0,    yield: 1 },
  { id: "s11", stage: "Renewal/Expansion",  unit: "client",  owner: "CS",           fte: 0, focusHrs: 0, util: 0.85, stdRate: 0,    yield: 1 },
];

export default function ChiefOfStaffCockpit() {
  // Scope
  const [days, setDays] = useState<number>(90);
  const weeks = useMemo(() => safe(days / 7, 0), [days]);

  // Offers
  const [offers, setOffers] = useState<Offer[]>([{ id: "o1", name: "Core", asp: 5000, gm: 0.7, share: 1 }]);

  // Headcount summary
  const [headcount, setHeadcount] = useState<HeadcountRow[]>([
    { id: "h1", role: "Marketing",  fte: 0, focusHrs: 0, util: 0.7, contractors: 0 },
    { id: "h2", role: "SDR/BDR",    fte: 0, focusHrs: 0, util: 0.7, contractors: 0 },
    { id: "h3", role: "Sales AE",   fte: 0, focusHrs: 0, util: 0.7, contractors: 0 },
    { id: "h4", role: "RevOps",     fte: 0, focusHrs: 0, util: 0.7, contractors: 0 },
    { id: "h5", role: "Delivery",   fte: 0, focusHrs: 0, util: 0.7, contractors: 0 },
    { id: "h6", role: "CS/Success", fte: 0, focusHrs: 0, util: 0.7, contractors: 0 },
  ]);

  // Funnel & quality
  const [funnel, setFunnel] = useState<FunnelCounts>({ awareness: 0, lead: 0, qualified: 0, booked: 0, show: 0, proposal: 0, closeWon: 0 });
  const [cq, setCQ] = useState<CycleQuality>({ bookedToShowDays: 0, showToProposalDays: 0, proposalToCloseDays: 0, noShowRate: 0.0, proposalWin: 0.0 });
  const [post, setPost] = useState<PostClose>({ onboardingToAhaDays: 0, m1Retention: 0.0, m2Retention: 0.0 });

  // Backlog & cash
  const [backlog, setBacklog] = useState<BacklogItem[]>(DEFAULT_STAGES.map(s => ({ id: s.id, stage: s.stage, units: 0 })));
  const [cash, setCash] = useState<Cash>({ cac: 0, dso: 0, paybackDays: 0, prepayShare: 0 });

  // Stages (value stream)
  const [stages, setStages] = useState<StageRow[]>(DEFAULT_STAGES);

  // ---------- Derived (core) ----------
  const totalFTE = useMemo(() => sum(headcount.map(h => h.fte + h.contractors)), [headcount]);

  const weightedASP = useMemo(() => sum(offers.map(o => o.asp * o.share)), [offers]);
  const weightedGM  = useMemo(() => sum(offers.map(o => o.gm  * o.share)) / (sum(offers.map(o => o.share)) || 1), [offers]);

  // funnel conversions (products down the stream)
  const cAwareLead  = useMemo(() => (funnel.awareness ? safe(funnel.lead     / funnel.awareness, 0) : 0), [funnel]);
  const cLeadQual   = useMemo(() => (funnel.lead       ? safe(funnel.qualified/ funnel.lead,       0) : 0), [funnel]);
  const cQualBooked = useMemo(() => (funnel.qualified  ? safe(funnel.booked   / funnel.qualified,  0) : 0), [funnel]);
  const cBookedShow = useMemo(() => (funnel.booked     ? safe(funnel.show     / funnel.booked,     0) : 0), [funnel]);
  const cShowProp   = useMemo(() => (funnel.show       ? safe(funnel.proposal / funnel.show,       0) : 0), [funnel]);
  const cPropClose  = useMemo(() => (funnel.proposal   ? safe(funnel.closeWon / funnel.proposal,   0) : 0), [funnel]);

  const prodFromAw  = useMemo(
    () => [cAwareLead, cLeadQual, cQualBooked, cBookedShow, cShowProp, cPropClose].reduce((a, b) => a * (Number.isFinite(b) && b > 0 ? b : 1), 1),
    [cAwareLead, cLeadQual, cQualBooked, cBookedShow, cShowProp, cPropClose]
  );

  // capacity per stage (units per week)
  const capsPerWeek = useMemo(
    () => stages.map(s => ({ stage: s.stage, cap: safe(s.fte * s.focusHrs * s.util * s.stdRate * s.yield) })),
    [stages]
  );

  // downstream conversion multiplier to CloseWon from each stage
  const downstreamProduct = useMemo(() => {
    const map: Record<string, number> = {
      Awareness: prodFromAw,
      Lead:       safe(cLeadQual * cQualBooked * cBookedShow * cShowProp * cPropClose, 1),
      Qualified:  safe(cQualBooked * cBookedShow * cShowProp * cPropClose, 1),
      Booked:     safe(cBookedShow * cShowProp * cPropClose, 1),
      Show:       safe(cShowProp * cPropClose, 1),
      Proposal:   safe(cPropClose, 1),
      CloseWon:   1, Onboarding: 1, Aha: 1, Delivery: 1, "Renewal/Expansion": 1,
    };
    const m: Record<string, number> = {};
    stages.forEach(s => { m[s.stage] = map[s.stage] ?? 1; });
    return m;
  }, [stages, prodFromAw, cLeadQual, cQualBooked, cBookedShow, cShowProp, cPropClose]);

  // deals/wk the system could push if limited by each stage
  const dealsPerWeekFromStage = useMemo(
    () => stages.map((s, i) => ({ stage: s.stage, dealsPerWeek: (capsPerWeek[i]?.cap ?? 0) * (downstreamProduct[s.stage] ?? 1) })),
    [stages, capsPerWeek, downstreamProduct]
  );

  // choose constraint over pre-close stages
  const systemDealsPerWeek = useMemo(() => {
    const relevant = dealsPerWeekFromStage.filter(d =>
      ["Awareness","Lead","Qualified","Booked","Show","Proposal","CloseWon"].includes(d.stage)
    );
    const min = relevant.length ? relevant.reduce((a, b) => a.dealsPerWeek < b.dealsPerWeek ? a : b) : { stage: "—", dealsPerWeek: 0 };
    return { value: min.dealsPerWeek, stage: min.stage, index: stages.findIndex(s => s.stage === min.stage) };
  }, [dealsPerWeekFromStage, stages]);

  // 90d economics
  const deals90d = useMemo(() => safe(systemDealsPerWeek.value * weeks), [systemDealsPerWeek, weeks]);
  const rev90d   = useMemo(() => safe(deals90d * weightedASP), [deals90d, weightedASP]);
  const gp90d    = useMemo(() => safe(rev90d * weightedGM), [rev90d, weightedGM]);
  const rfteCeil = useMemo(() => totalFTE > 0 ? gp90d / totalFTE : 0, [gp90d, totalFTE]);

  // cash overlay
  const gpPerDay = useMemo(() => days > 0 ? gp90d / days : 0, [gp90d, days]);
  const gp30     = useMemo(() => gpPerDay * 30, [gpPerDay]);
  const gp30CAC  = useMemo(() => cash.cac > 0 ? gp30 / cash.cac : 0, [gp30, cash.cac]);
  const cashFlag = useMemo(() => gp30CAC > 0 && gp30CAC < 3, [gp30CAC]);

  // backlog weeks (for flags)
  const backlogWeeks = useMemo(
    () => stages.map((s, i) => {
      const cap = capsPerWeek[i]?.cap ?? 0;
      const units = backlog[i]?.units ?? 0;
      const weeksOf = cap > 0 ? units / cap : 0;
      return { stage: s.stage, units, cap, weeksOf };
    }),
    [stages, backlog, capsPerWeek]
  );

  // ---------- Prescriptions (auto) ----------
  const constrIdx = systemDealsPerWeek.index;
  const constrStage = constrIdx >= 0 ? stages[constrIdx] : undefined;
  const constrBacklog = constrIdx >= 0 ? backlogWeeks[constrIdx] : undefined;
  const isUtilHigh = constrStage ? constrStage.util > 0.85 : false;
  const isCapLow   = constrStage ? (capsPerWeek[constrIdx]?.cap ?? 0) <= 0 : false;
  const isBacklogHigh = (constrBacklog?.weeksOf ?? 0) > 1;

  const prescriptions = useMemo(() => {
    const ideas: { title: string; detail: string }[] = [];
    if (!constrStage) return ideas;

    // Exploit (fastest/cheapest)
    ideas.push({
      title: "Exploit: Standardize & pre-bake",
      detail: `Add templates/SOPs to raise ${constrStage.stage} StdRate or Yield by +10–20%. Small tweaks here lift total ceiling.`,
    });
    if (isBacklogHigh) {
      ideas.push({
        title: "Exploit: Clear the queue",
        detail: `Limit WIP and batch work at ${constrStage.stage}. Pull policy from downstream; get a daily 30-min unblock standup.`,
      });
    }

    // Subordinate
    ideas.push({
      title: "Subordinate: Calendar to the constraint",
      detail: `Move upstream/downstream meetings to feed ${constrStage.stage} smoothly. Protect maker time (90-120 min blocks).`,
    });

    // Elevate (costly: use only if needed)
    if (isUtilHigh) {
      ideas.push({
        title: "Elevate: Specialize or automation first (before hiring)",
        detail: `Split high-context from low-context tasks at ${constrStage.stage}. Automate prep; outsource low-complexity work.`,
      });
    } else if (isCapLow) {
      ideas.push({
        title: "Elevate: Add fractional capacity",
        detail: `Temporary contractor or overtime on ${constrStage.stage} to de-risk. Check cash: GP30/CAC should be ≥ 3 before hiring.`,
      });
    }
    return ideas;
  }, [constrStage, isBacklogHigh, isUtilHigh, isCapLow]);

  // ---------- What-if Simulator (focused on the constraint) ----------
  const [sim, setSim] = useState<{ fte?: number; focusHrs?: number; util?: number; stdRate?: number; yield?: number }>({});
  const simStages = useMemo<StageRow[]>(() => {
    if (constrIdx < 0) return stages;
    const s = stages[constrIdx];
    const patched: StageRow = {
      ...s,
      fte: sim.fte ?? s.fte,
      focusHrs: sim.focusHrs ?? s.focusHrs,
      util: sim.util ?? s.util,
      stdRate: sim.stdRate ?? s.stdRate,
      yield: sim.yield ?? s.yield,
    };
    return stages.map((x, i) => (i === constrIdx ? patched : x));
  }, [stages, sim, constrIdx]);

  const simCaps = useMemo(
    () => simStages.map(s => ({ stage: s.stage, cap: safe(s.fte * s.focusHrs * s.util * s.stdRate * s.yield) })),
    [simStages]
  );
  const simDealsPerWeekFromStage = useMemo(
    () => simStages.map((s, i) => ({ stage: s.stage, dealsPerWeek: (simCaps[i]?.cap ?? 0) * (downstreamProduct[s.stage] ?? 1) })),
    [simStages, simCaps, downstreamProduct]
  );
  const simSystem = useMemo(() => {
    const relevant = simDealsPerWeekFromStage.filter(d =>
      ["Awareness","Lead","Qualified","Booked","Show","Proposal","CloseWon"].includes(d.stage)
    );
    const min = relevant.length ? relevant.reduce((a, b) => a.dealsPerWeek < b.dealsPerWeek ? a : b) : { stage: "—", dealsPerWeek: 0 };
    return { value: min.dealsPerWeek, stage: min.stage };
  }, [simDealsPerWeekFromStage]);

  const simDeals90 = useMemo(() => safe(simSystem.value * weeks), [simSystem, weeks]);
  const simRev90   = useMemo(() => safe(simDeals90 * weightedASP), [simDeals90, weightedASP]);
  const simGP90    = useMemo(() => safe(simRev90 * weightedGM), [simRev90, weightedGM]);
  // If FTE increases at constraint, reflect it in denominator (approx: only count delta fte at that stage)
  const deltaFTE   = useMemo(() => Math.max(0, (sim.fte ?? (constrStage?.fte ?? 0)) - (constrStage?.fte ?? 0)), [sim.fte, constrStage]);
  const simRFTE    = useMemo(() => (totalFTE + deltaFTE) > 0 ? simGP90 / (totalFTE + deltaFTE) : 0, [simGP90, totalFTE, deltaFTE]);

  // ---------- UI helpers ----------
  const updateStage  = (id: string, patch: Partial<StageRow>) => setStages(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  const updateOffer  = (id: string, patch: Partial<Offer>)    => setOffers(prev => prev.map(o => o.id === id ? { ...o, ...patch } : o));
  const addOffer     = () => setOffers(prev => [...prev, { id: uid(), name: "", asp: 0, gm: 0.7, share: 0 }]);
  const removeOffer  = (id: string) => setOffers(prev => prev.filter(o => o.id !== id));
  const setBacklogUnits = (id: string, units: number) => setBacklog(prev => prev.map(b => b.id === id ? { ...b, units } : b));

  // ---------- Render ----------
  return (
    <main className="mx-auto max-w-7xl p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">CoS Cockpit — R/FTE Bottleneck Mapper</h1>
          <div className="flex gap-2">
            <Badge className={cashFlag ? "bg-red-600 text-white" : ""}>GP30/CAC: {fmt(gp30CAC, 2)} {cashFlag ? "(Cash-constrained)" : ""}</Badge>
            <Badge>Ceiling: {fmt(systemDealsPerWeek.value, 2)} deals/wk @ {systemDealsPerWeek.stage}</Badge>
          </div>
        </div>
        <p className="text-gray-600">One-pager for throughput, constraint, and the quickest ways to unlock growth.</p>
      </motion.div>

      {/* Executive tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <div className="text-xs text-gray-500">Throughput ceiling</div>
          <div className="text-2xl font-semibold">{fmt(systemDealsPerWeek.value,2)} /wk</div>
          <div className="text-xs">Bottleneck: <b>{systemDealsPerWeek.stage}</b></div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-gray-500">GP (90d)</div>
          <div className="text-2xl font-semibold">${fmt(gp90d,0)}</div>
          <div className="text-xs">Rev mix ASP: ${fmt(weightedASP,0)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-gray-500">R/FTE ceiling</div>
          <div className="text-2xl font-semibold">${fmt(rfteCeil,0)}</div>
          <div className="text-xs">Total FTE: {fmt(totalFTE,2)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-gray-500">Cash signal (GP30/CAC)</div>
          <div className={`text-2xl font-semibold ${cashFlag ? "text-red-600" : "text-emerald-600"}`}>{fmt(gp30CAC,2)}</div>
          <div className="text-xs">{cashFlag ? "Treat cash as constraint" : "Cash ok (≥ 3 preferred)"}</div>
        </CardContent></Card>
      </div>

      {/* Bottleneck & prescriptions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><Gauge className="h-5 w-5"/>Capacity by Stage</CardTitle></CardHeader>
          <CardContent>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stages.map((s, i) => ({ name: s.stage, capacity: capsPerWeek[i]?.cap ?? 0 }))}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="capacity" fill="#4f46e5" radius={[8,8,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-xs text-gray-500">Capacity/wk = FTE × FocusHrs × Util × StdRate × Yield</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5"/>Recommended Moves</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {prescriptions.map((p, i) => (
              <div key={i} className="rounded-xl border p-3 bg-gray-50">
                <div className="font-medium">{p.title}</div>
                <div className="text-sm text-gray-700">{p.detail}</div>
              </div>
            ))}
            {prescriptions.length === 0 && <div className="text-sm text-gray-500">Provide a bit of data to see targeted actions.</div>}
          </CardContent>
        </Card>
      </div>

      {/* What-if simulator (constraint only) */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5"/>What-If on Constraint</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {!constrStage ? (
            <div className="text-sm text-gray-500">We’ll show controls here once a pre-close bottleneck appears.</div>
          ) : (
            <>
              <div className="text-sm">Tuning <b>{constrStage.stage}</b> — adjust one or more levers below.</div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <div>
                  <Label>FTE</Label>
                  <Input type="number" value={sim.fte ?? constrStage.fte} onChange={e => setSim(s => ({ ...s, fte: parseFloat(e.target.value) || 0 }))}/>
                </div>
                <div>
                  <Label>FocusHrs</Label>
                  <Input type="number" value={sim.focusHrs ?? constrStage.focusHrs} onChange={e => setSim(s => ({ ...s, focusHrs: parseFloat(e.target.value) || 0 }))}/>
                </div>
                <div>
                  <Label>Util (0..1)</Label>
                  <Input type="number" step={0.01} value={sim.util ?? constrStage.util} onChange={e => setSim(s => ({ ...s, util: parseFloat(e.target.value) || 0 }))}/>
                </div>
                <div>
                  <Label>StdRate</Label>
                  <Input type="number" value={sim.stdRate ?? constrStage.stdRate} onChange={e => setSim(s => ({ ...s, stdRate: parseFloat(e.target.value) || 0 }))}/>
                </div>
                <div>
                  <Label>Yield (0..1)</Label>
                  <Input type="number" step={0.01} value={sim.yield ?? constrStage.yield} onChange={e => setSim(s => ({ ...s, yield: parseFloat(e.target.value) || 0 }))}/>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="rounded-xl bg-gray-50 p-3">
                  <div className="text-xs text-gray-500">Current ceiling</div>
                  <div className="text-xl font-semibold">{fmt(systemDealsPerWeek.value,2)} /wk</div>
                  <div className="text-xs">@ {systemDealsPerWeek.stage}</div>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3">
                  <div className="text-xs text-emerald-700">Simulated ceiling</div>
                  <div className="text-xl font-semibold text-emerald-700">{fmt(simSystem.value,2)} /wk</div>
                  <div className="text-xs text-emerald-700">Δ {fmt(simSystem.value - systemDealsPerWeek.value,2)} /wk</div>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <div className="text-xs text-gray-500">GP (90d) — current</div>
                  <div className="text-xl font-semibold">${fmt(gp90d,0)}</div>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3">
                  <div className="text-xs text-emerald-700">GP (90d) — simulated</div>
                  <div className="text-xl font-semibold text-emerald-700">${fmt(simGP90,0)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-xl bg-gray-50 p-3">
                  <div className="text-xs text-gray-500">R/FTE — current</div>
                  <div className="text-xl font-semibold">${fmt(rfteCeil,0)}</div>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3">
                  <div className="text-xs text-emerald-700">R/FTE — simulated</div>
                  <div className="text-xl font-semibold text-emerald-700">${fmt(simRFTE,0)}</div>
                  <div className="text-xs text-emerald-700">FTE delta counted: +{fmt(deltaFTE,2)}</div>
                </div>
                <div className="rounded-xl bg-indigo-50 p-3">
                  <div className="text-xs text-indigo-700">Quick win</div>
                  <div className="text-sm text-indigo-800 flex items-center gap-1">
                    <TrendingUp className="h-4 w-4"/> Try +10% StdRate and +0.05 Yield before adding FTE.
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Inputs (kept compact) */}
      <Tabs defaultValue="inputs" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger>Inputs</TabsTrigger>
          <TabsTrigger>Stages</TabsTrigger>
          <TabsTrigger>Backlog</TabsTrigger>
          <TabsTrigger>Cash</TabsTrigger>
        </TabsList>

        {/* Inputs */}
        <TabsContent>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5"/>Scope & Offers</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Days</Label>
                <Input type="number" value={days} onChange={e => setDays(parseFloat(e.target.value) || 0)} />
                <p className="text-xs text-gray-500">Weeks in window: {fmt(weeks, 2)}</p>
              </div>
              <Separator/>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Offers</Label>
                  <Button size="sm" onClick={addOffer}><Plus className="h-4 w-4 mr-1"/>Add</Button>
                </div>
                {offers.map(o => (
                  <div key={o.id} className="grid grid-cols-12 gap-2 items-center">
                    <Input className="col-span-4" placeholder="Name" value={o.name} onChange={e => updateOffer(o.id, { name: e.target.value })}/>
                    <Input className="col-span-2" type="number" placeholder="ASP" value={o.asp} onChange={e => updateOffer(o.id, { asp: parseFloat(e.target.value) || 0 })}/>
                    <Input className="col-span-2" type="number" step={0.01} placeholder="GM (0..1)" value={o.gm} onChange={e => updateOffer(o.id, { gm: parseFloat(e.target.value) || 0 })}/>
                    <Input className="col-span-2" type="number" step={0.01} placeholder="Share (0..1)" value={o.share} onChange={e => updateOffer(o.id, { share: parseFloat(e.target.value) || 0 })}/>
                    <Button className="col-span-2" variant="ghost" onClick={() => removeOffer(o.id)}><Trash2 className="h-4 w-4"/></Button>
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 rounded-lg bg-gray-100">Weighted ASP: <b>${fmt(weightedASP, 2)}</b></div>
                  <div className="p-2 rounded-lg bg-gray-100">Weighted GM: <b>{fmt(sum(offers.map(o => o.gm * o.share)) / (sum(offers.map(o => o.share)) || 1), 2)}</b></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stages */}
        <TabsContent>
          <Card>
            <CardHeader><CardTitle>Stage Rates & Capacity (per week)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {stages.map((s, i) => (
                <div key={s.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-2 font-medium">{s.stage}</div>
                  <Input className="col-span-1" value={s.unit} onChange={e => updateStage(s.id, { unit: e.target.value })} />
                  <Input className="col-span-2" value={s.owner} onChange={e => updateStage(s.id, { owner: e.target.value })} />
                  <Input className="col-span-1" type="number" value={s.fte} onChange={e => updateStage(s.id, { fte: parseFloat(e.target.value) || 0 })} />
                  <Input className="col-span-1" type="number" value={s.focusHrs} onChange={e => updateStage(s.id, { focusHrs: parseFloat(e.target.value) || 0 })} />
                  <Input className="col-span-1" type="number" step={0.01} value={s.util} onChange={e => updateStage(s.id, { util: parseFloat(e.target.value) || 0 })} />
                  <Input className="col-span-1" type="number" value={s.stdRate} onChange={e => updateStage(s.id, { stdRate: parseFloat(e.target.value) || 0 })} />
                  <Input className="col-span-1" type="number" step={0.01} value={s.yield} onChange={e => updateStage(s.id, { yield: parseFloat(e.target.value) || 0 })} />
                  <div className="col-span-2 text-right text-sm">
                    <div className="rounded bg-gray-100 px-2 py-1">cap: <b>{fmt(capsPerWeek[i]?.cap ?? 0, 2)}</b></div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backlog */}
        <TabsContent>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5"/>Backlog Health</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {stages.map((s, i) => (
                <div key={s.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-3 font-medium">{s.stage}</div>
                  <Input className="col-span-3" type="number" value={backlog[i]?.units ?? 0} onChange={e => setBacklogUnits(s.id, parseFloat(e.target.value) || 0)} />
                  <div className="col-span-3 text-sm">Weekly cap: <b>{fmt(capsPerWeek[i]?.cap ?? 0,2)}</b></div>
                  <div className="col-span-3 text-sm">
                    Weeks of backlog: <b>{fmt((backlogWeeks[i]?.weeksOf ?? 0),2)}</b>{" "}
                    {(backlogWeeks[i]?.weeksOf ?? 0) > 1 ? (
                      <span className="text-red-600">({"\\u003e"}1 week)</span>
                    ) : (
                      <span className="text-emerald-600">({"\\u2264"}1 week)</span>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cash */}
        <TabsContent>
          <Card>
            <CardHeader><CardTitle>Cash Terms</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><Label>CAC</Label><Input type="number" value={cash.cac} onChange={e => setCash({ ...cash, cac: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>DSO (days)</Label><Input type="number" value={cash.dso} onChange={e => setCash({ ...cash, dso: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Payback (days)</Label><Input type="number" value={cash.paybackDays} onChange={e => setCash({ ...cash, paybackDays: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Prepay share (0..1)</Label><Input type="number" step={0.01} value={cash.prepayShare} onChange={e => setCash({ ...cash, prepayShare: parseFloat(e.target.value) || 0 })} /></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader><CardTitle>Assumptions & Equations</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          <div>Stage capacity/wk = FTE × FocusHrs × Util × StdRate × Yield</div>
          <div>Deals ceiling from stage = Capacity × downstream conversion product to Close</div>
          <div>Rev(90d) = Deals(90d) × Weighted ASP; GP(90d) = Rev × Weighted GM</div>
          <div>R/FTE ceiling = GP(90d) ÷ Total FTE</div>
          <div>Cash flag if GP(30d) ÷ CAC &lt; 3</div>
        </CardContent>
      </Card>
    </main>
  );
}
