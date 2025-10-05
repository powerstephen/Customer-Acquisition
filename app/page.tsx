"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import {
  Plus, Trash2, Gauge, DollarSign, Users, AlertTriangle,
  Brain, SlidersHorizontal, TrendingUp, Download, Upload, Database
} from "lucide-react";
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

// ---------- Presets (illustrative numbers) ----------
type Preset = {
  name: string;
  days: number;
  offers: Offer[];
  headcount: HeadcountRow[];
  funnel: FunnelCounts;
  stages: StageRow[];
  backlog: BacklogItem[];
  cash: Cash;
};
const PRESETS: Record<string, Preset> = {
  cargo_like: {
    name: "Cargo-like (illustrative)",
    days: 90,
    offers: [
      { id: "o1", name: "Marketplace SaaS", asp: 6500, gm: 0.78, share: 0.7 },
      { id: "o2", name: "Enterprise Add-on", asp: 18000, gm: 0.72, share: 0.3 },
    ],
    headcount: [
      { id: "h1", role: "Marketing", fte: 2, focusHrs: 18, util: 0.7, contractors: 0.5 },
      { id: "h2", role: "SDR/BDR",  fte: 2, focusHrs: 22, util: 0.75, contractors: 0 },
      { id: "h3", role: "Sales AE", fte: 2, focusHrs: 22, util: 0.8, contractors: 0 },
      { id: "h4", role: "RevOps",   fte: 1, focusHrs: 18, util: 0.75, contractors: 0 },
      { id: "h5", role: "Delivery", fte: 2, focusHrs: 25, util: 0.8, contractors: 0.5 },
      { id: "h6", role: "CS",       fte: 2, focusHrs: 20, util: 0.75, contractors: 0 },
    ],
    funnel: { awareness: 20000, lead: 1200, qualified: 420, booked: 260, show: 210, proposal: 140, closeWon: 70 },
    stages: [
      { ...DEFAULT_STAGES[0], fte: 2, focusHrs: 18, util: 0.7,  stdRate: 15, yield: 1   }, // awareness ops rate = 15 leads/hr eq
      { ...DEFAULT_STAGES[1], fte: 2, focusHrs: 22, util: 0.75, stdRate: 2,  yield: 0.9 }, // lead handling
      { ...DEFAULT_STAGES[2], fte: 2, focusHrs: 22, util: 0.8,  stdRate: 1.2,yield: 0.9 },
      { ...DEFAULT_STAGES[3], fte: 2, focusHrs: 22, util: 0.8,  stdRate: 8,  yield: 0.9 }, // bookings per hr
      { ...DEFAULT_STAGES[4], fte: 2, focusHrs: 22, util: 0.8,  stdRate: 6,  yield: 0.88},
      { ...DEFAULT_STAGES[5], fte: 1, focusHrs: 20, util: 0.85, stdRate: 4,  yield: 0.9 },
      { ...DEFAULT_STAGES[6], fte: 2, focusHrs: 22, util: 0.85, stdRate: 2.5,yield: 0.95},
      { ...DEFAULT_STAGES[7], fte: 2, focusHrs: 25, util: 0.8,  stdRate: 4,  yield: 0.95},
      { ...DEFAULT_STAGES[8], fte: 2, focusHrs: 20, util: 0.8,  stdRate: 4,  yield: 0.95},
      { ...DEFAULT_STAGES[9], fte: 2, focusHrs: 22, util: 0.8,  stdRate: 6,  yield: 0.95},
      { ...DEFAULT_STAGES[10],fte: 2, focusHrs: 20, util: 0.8,  stdRate: 6,  yield: 0.95},
    ],
    backlog: DEFAULT_STAGES.map(s => ({ id: s.id, stage: s.stage, units: 0 })),
    cash: { cac: 1800, dso: 28, paybackDays: 75, prepayShare: 0.25 },
  },
  saas_mid: {
    name: "SaaS Mid-Market (generic)",
    days: 90,
    offers: [{ id: "o1", name: "Core SaaS", asp: 5000, gm: 0.75, share: 1 }],
    headcount: [
      { id: "h1", role: "Marketing", fte: 1, focusHrs: 18, util: 0.7, contractors: 0 },
      { id: "h2", role: "SDR",       fte: 1, focusHrs: 20, util: 0.75, contractors: 0 },
      { id: "h3", role: "AE",        fte: 1, focusHrs: 22, util: 0.8, contractors: 0 },
      { id: "h4", role: "CS/PS",     fte: 1, focusHrs: 20, util: 0.75, contractors: 0 },
    ],
    funnel: { awareness: 8000, lead: 500, qualified: 200, booked: 120, show: 90, proposal: 60, closeWon: 30 },
    stages: [
      { ...DEFAULT_STAGES[0], fte: 1, focusHrs: 18, util: 0.7,  stdRate: 10, yield: 1 },
      { ...DEFAULT_STAGES[1], fte: 1, focusHrs: 20, util: 0.75, stdRate: 1.5,yield: 0.9 },
      { ...DEFAULT_STAGES[2], fte: 1, focusHrs: 20, util: 0.8,  stdRate: 1,  yield: 0.9 },
      { ...DEFAULT_STAGES[3], fte: 1, focusHrs: 20, util: 0.8,  stdRate: 6,  yield: 0.9 },
      { ...DEFAULT_STAGES[4], fte: 1, focusHrs: 20, util: 0.8,  stdRate: 4,  yield: 0.88 },
      { ...DEFAULT_STAGES[5], fte: 1, focusHrs: 20, util: 0.85, stdRate: 3,  yield: 0.9 },
      { ...DEFAULT_STAGES[6], fte: 1, focusHrs: 20, util: 0.85, stdRate: 2,  yield: 0.95 },
      ...DEFAULT_STAGES.slice(7), // keep delivery defaults
    ],
    backlog: DEFAULT_STAGES.map(s => ({ id: s.id, stage: s.stage, units: 0 })),
    cash: { cac: 1500, dso: 30, paybackDays: 90, prepayShare: 0.2 },
  },
  marketplace_seed: {
    name: "Marketplace Seed (lean)",
    days: 60,
    offers: [{ id: "o1", name: "Starter", asp: 2500, gm: 0.7, share: 1 }],
    headcount: [
      { id: "h1", role: "Founder-led Sales", fte: 1, focusHrs: 25, util: 0.75, contractors: 0 },
      { id: "h2", role: "Ops",               fte: 0.5, focusHrs: 20, util: 0.75, contractors: 0 },
    ],
    funnel: { awareness: 2000, lead: 160, qualified: 70, booked: 40, show: 30, proposal: 18, closeWon: 9 },
    stages: [
      { ...DEFAULT_STAGES[0], fte: 0.5, focusHrs: 15, util: 0.7, stdRate: 8, yield: 1 },
      { ...DEFAULT_STAGES[1], fte: 0.5, focusHrs: 15, util: 0.75, stdRate: 1, yield: 0.9 },
      { ...DEFAULT_STAGES[2], fte: 0.5, focusHrs: 15, util: 0.8, stdRate: 0.8, yield: 0.9 },
      { ...DEFAULT_STAGES[3], fte: 0.5, focusHrs: 15, util: 0.8, stdRate: 4, yield: 0.9 },
      { ...DEFAULT_STAGES[4], fte: 0.5, focusHrs: 15, util: 0.8, stdRate: 3, yield: 0.88 },
      { ...DEFAULT_STAGES[5], fte: 0.5, focusHrs: 15, util: 0.85, stdRate: 2, yield: 0.9 },
      { ...DEFAULT_STAGES[6], fte: 0.5, focusHrs: 15, util: 0.85, stdRate: 1.2, yield: 0.95 },
      ...DEFAULT_STAGES.slice(7),
    ],
    backlog: DEFAULT_STAGES.map(s => ({ id: s.id, stage: s.stage, units: 0 })),
    cash: { cac: 800, dso: 20, paybackDays: 60, prepayShare: 0.35 },
  }
};

// ---------- Component ----------
export default function RFTEWithPresets() {
  // State
  const [days, setDays] = useState<number>(PRESETS.cargo_like.days);
  const [offers, setOffers] = useState<Offer[]>(PRESETS.cargo_like.offers);
  const [headcount, setHeadcount] = useState<HeadcountRow[]>(PRESETS.cargo_like.headcount);
  const [funnel, setFunnel] = useState<FunnelCounts>(PRESETS.cargo_like.funnel);
  const [stages, setStages] = useState<StageRow[]>(PRESETS.cargo_like.stages);
  const [backlog, setBacklog] = useState<BacklogItem[]>(PRESETS.cargo_like.backlog);
  const [cash, setCash] = useState<Cash>(PRESETS.cargo_like.cash);

  const [presetKey, setPresetKey] = useState<string>("cargo_like");

  // Derived
  const weeks = useMemo(() => safe(days / 7, 0), [days]);
  const totalFTE = useMemo(() => sum(headcount.map(h => h.fte + h.contractors)), [headcount]);
  const weightedASP = useMemo(() => sum(offers.map(o => o.asp * o.share)), [offers]);
  const weightedGM  = useMemo(() => sum(offers.map(o => o.gm  * o.share)) / (sum(offers.map(o => o.share)) || 1), [offers]);

  // conversions (from funnel)
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

  // downstream multiplier to CloseWon from each stage
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

  // deals/wk if limited by each stage
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
    return { value: min.dealsPerWeek, stage: min.stage };
  }, [dealsPerWeekFromStage]);

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

  // backlog weeks
  const backlogWeeks = useMemo(
    () => stages.map((s, i) => {
      const cap = capsPerWeek[i]?.cap ?? 0;
      const units = backlog[i]?.units ?? 0;
      const weeksOf = cap > 0 ? units / cap : 0;
      return { stage: s.stage, units, cap, weeksOf };
    }),
    [stages, backlog, capsPerWeek]
  );

  // Preset loader
  const applyPreset = (key: string) => {
    const p = PRESETS[key];
    if (!p) return;
    setPresetKey(key);
    setDays(p.days);
    setOffers(p.offers);
    setHeadcount(p.headcount);
    setFunnel(p.funnel);
    setStages(p.stages);
    setBacklog(p.backlog);
    setCash(p.cash);
  };

  // UI helpers
  const updateStage  = (id: string, patch: Partial<StageRow>) => setStages(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  const updateOffer  = (id: string, patch: Partial<Offer>)    => setOffers(prev => prev.map(o => o.id === id ? { ...o, ...patch } : o));
  const addOffer     = () => setOffers(prev => [...prev, { id: uid(), name: "", asp: 0, gm: 0.7, share: 0 }]);
  const removeOffer  = (id: string) => setOffers(prev => prev.filter(o => o.id !== id));
  const setBacklogUnits = (id: string, units: number) => setBacklog(prev => prev.map(b => b.id === id ? { ...b, units } : b));

  // Quick table rows
  const quickRows = [
    { label: "Window (days)",     value: days, onChange: (v: number) => setDays(v) },
    { label: "CAC",               value: cash.cac, onChange: (v: number) => setCash({ ...cash, cac: v }) },
    { label: "DSO (days)",        value: cash.dso, onChange: (v: number) => setCash({ ...cash, dso: v }) },
    { label: "Payback (days)",    value: cash.paybackDays, onChange: (v: number) => setCash({ ...cash, paybackDays: v }) },
    { label: "Prepay share (0..1)", value: cash.prepayShare, onChange: (v: number) => setCash({ ...cash, prepayShare: v }) },
    { label: "Awareness → Lead",  value: cAwareLead, onChange: (v: number) => setFunnel({ ...funnel, lead: v * (funnel.awareness || 0) }) },
    { label: "Lead → Qualified",  value: cLeadQual, onChange: (v: number) => setFunnel({ ...funnel, qualified: v * (funnel.lead || 0) }) },
    { label: "Qualified → Booked",value: cQualBooked, onChange: (v: number) => setFunnel({ ...funnel, booked: v * (funnel.qualified || 0) }) },
    { label: "Booked → Show",     value: cBookedShow, onChange: (v: number) => setFunnel({ ...funnel, show: v * (funnel.booked || 0) }) },
    { label: "Show → Proposal",   value: cShowProp, onChange: (v: number) => setFunnel({ ...funnel, proposal: v * (funnel.show || 0) }) },
    { label: "Proposal → Close",  value: cPropClose, onChange: (v: number) => setFunnel({ ...funnel, closeWon: v * (funnel.proposal || 0) }) },
  ] as const;

  return (
    <main className="mx-auto max-w-7xl p-6 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">R/FTE Bottleneck Mapper — with Presets</h1>
          <div className="flex items-center gap-2">
            <select
              value={presetKey}
              onChange={(e) => applyPreset(e.target.value)}
              className="h-10 rounded-2xl border border-gray-200 bg-white px-3 text-sm shadow-sm"
              aria-label="Select preset"
            >
              {Object.entries(PRESETS).map(([k, p]) => (
                <option key={k} value={k}>{p.name}</option>
              ))}
            </select>
            <Button onClick={() => applyPreset(presetKey)} className="flex items-center gap-1"><Database className="h-4 w-4"/> Load Preset</Button>
          </div>
        </div>
        <p className="text-gray-600">Use a preset to see live figures, then tweak quickly in the table below.</p>
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

      {/* Capacity by Stage */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Gauge className="h-5 w-5"/>Capacity by Stage</CardTitle></CardHeader>
        <CardContent>
          <div style={{ height: 200 }}>
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

      {/* Quick Inputs Table */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5"/>Quick Inputs Table</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {quickRows.map((r, idx) => (
              <div key={idx} className="rounded-xl border p-3 bg-white">
                <div className="text-xs text-gray-500 mb-1">{r.label}</div>
                <Input type="number" step={r.label.includes("→") ? 0.01 : 1}
                  value={r.value}
                  onChange={(e) => r.onChange(parseFloat(e.target.value) || 0)} />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            Conversion cells expect decimal ratios (e.g., 0.35). Table writes back to funnel counts based on current upstream totals.
          </p>
        </CardContent>
      </Card>

      {/* Tabs: Offers / Stages / Backlog / Cash */}
      <Tabs defaultValue="offers" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger>Offers</TabsTrigger>
          <TabsTrigger>Stages</TabsTrigger>
          <TabsTrigger>Backlog</TabsTrigger>
          <TabsTrigger>Cash</TabsTrigger>
        </TabsList>

        {/* Offers */}
        <TabsContent>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5"/>Offers</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">Weighted ASP & GM used in 90d economics.</div>
                <Button size="sm" onClick={addOffer}><Plus className="h-4 w-4 mr-1"/>Add Offer</Button>
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
              <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                <div className="p-2 rounded-lg bg-gray-100">Weighted ASP: <b>${fmt(weightedASP, 2)}</b></div>
                <div className="p-2 rounded-lg bg-gray-100">Weighted GM: <b>{fmt(sum(offers.map(o => o.gm * o.share)) / (sum(offers.map(o => o.share)) || 1), 2)}</b></div>
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

      {/* Export */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5"/>Export JSON</CardTitle></CardHeader>
        <CardContent>
          <pre className="text-xs whitespace-pre-wrap p-3 rounded bg-gray-100 overflow-x-auto">
            {JSON.stringify({
              preset: PRESETS[presetKey]?.name,
              inputs_pack: {
                scope: { days, weeks, totalFTE: totalFTE },
                offers, headcount, funnel, stages, backlog, cash,
              },
              ceiling_pack: {
                capacitiesPerWeek: capsPerWeek,
                dealsPerWeekFromStage,
                system_constraint_candidate: systemDealsPerWeek.stage,
                dealsPerWeek: systemDealsPerWeek.value,
                rev90d, gp90d, r_fte_ceiling: rfteCeil,
                gp30_over_cac: gp30CAC, cash_flag: cashFlag,
              }
            }, null, 2)}
          </pre>
        </CardContent>
      </Card>

      {/* Footer note */}
      <p className="text-xs text-gray-500">
        Note: Presets are illustrative, not company-reported numbers. Use the quick table to align with your actual data.
      </p>
    </main>
  );
}
