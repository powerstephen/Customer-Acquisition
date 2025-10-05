"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Plus, Trash2, Gauge, DollarSign, Users, AlertTriangle, Table as TableIcon } from "lucide-react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";

// --- Recharts: client-only (prevents SSR crashes/blank screen)
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
const pct = (n: number) => Number.isFinite(n) ? (n * 100).toFixed(1) + "%" : "";
const safe = (n: number, alt = 0) => (Number.isFinite(n) && !Number.isNaN(n) ? n : alt);
const sum = (arr: number[]) => arr.reduce((a, b) => a + safe(b), 0);
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36); // safe client ID

const DEFAULT_STAGES: StageRow[] = [
  { id: "s1", stage: "Awareness", unit: "lead", owner: "Marketing",    fte: 0, focusHrs: 0, util: 0.85, stdRate: 0,    yield: 1 },
  { id: "s2", stage: "Lead",      unit: "lead", owner: "Marketing/SDR", fte: 0, focusHrs: 0, util: 0.85, stdRate: 0,    yield: 1 },
  { id: "s3", stage: "Qualified", unit: "lead", owner: "SDR",          fte: 0, focusHrs: 0, util: 0.85, stdRate: 0,    yield: 1 },
  { id: "s4", stage: "Booked",    unit: "meeting", owner: "SDR",       fte: 0, focusHrs: 0, util: 0.85, stdRate: 0,    yield: 1 },
  { id: "s5", stage: "Show",      unit: "meeting", owner: "AE",        fte: 0, focusHrs: 0, util: 0.85, stdRate: 0,    yield: 1 },
  { id: "s6", stage: "Proposal",  unit: "proposal", owner: "AE/RevOps", fte: 1, focusHrs: 20, util: 0.85, stdRate: 1,  yield: 0.95 },
  { id: "s7", stage: "CloseWon",  unit: "deal", owner: "AE",           fte: 0, focusHrs: 0, util: 0.85, stdRate: 0,    yield: 1 },
  { id: "s8", stage: "Onboarding",unit: "client", owner: "Delivery/CS",fte: 0, focusHrs: 0, util: 0.85, stdRate: 0,    yield: 1 },
  { id: "s9", stage: "Aha",       unit: "client", owner: "Delivery/CS",fte: 0, focusHrs: 0, util: 0.85, stdRate: 0,    yield: 1 },
  { id: "s10", stage: "Delivery", unit: "client", owner: "Delivery",   fte: 0, focusHrs: 0, util: 0.85, stdRate: 0,    yield: 1 },
  { id: "s11", stage: "Renewal/Expansion", unit: "client", owner: "CS", fte: 0, focusHrs: 0, util: 0.85, stdRate: 0,   yield: 1 },
];

export default function RFTEBottleneckMapper() {
  // Scope
  const [days, setDays] = useState<number>(90);
  const weeks = useMemo(() => safe(days / 7, 0), [days]);

  // Offers
  const [offers, setOffers] = useState<Offer[]>([{ id: "o1", name: "Core", asp: 5000, gm: 0.7, share: 1 }]);

  // Headcount
  const [headcount, setHeadcount] = useState<HeadcountRow[]>([
    { id: "h1", role: "Marketing",   fte: 0, focusHrs: 0, util: 0.7, contractors: 0 },
    { id: "h2", role: "SDR/BDR",     fte: 0, focusHrs: 0, util: 0.7, contractors: 0 },
    { id: "h3", role: "Sales AE",    fte: 0, focusHrs: 0, util: 0.7, contractors: 0 },
    { id: "h4", role: "RevOps",      fte: 0, focusHrs: 0, util: 0.7, contractors: 0 },
    { id: "h5", role: "Delivery",    fte: 0, focusHrs: 0, util: 0.7, contractors: 0 },
    { id: "h6", role: "CS/Success",  fte: 0, focusHrs: 0, util: 0.7, contractors: 0 },
  ]);

  // Funnel & quality
  const [funnel, setFunnel] = useState<FunnelCounts>({ awareness: 0, lead: 0, qualified: 0, booked: 0, show: 0, proposal: 0, closeWon: 0 });
  const [cq, setCQ] = useState<CycleQuality>({ bookedToShowDays: 0, showToProposalDays: 0, proposalToCloseDays: 0, noShowRate: 0.0, proposalWin: 0.0 });
  const [post, setPost] = useState<PostClose>({ onboardingToAhaDays: 0, m1Retention: 0.0, m2Retention: 0.0 });

  // Backlog & Cash
  const [backlog, setBacklog] = useState<BacklogItem[]>(DEFAULT_STAGES.map(s => ({ id: s.id, stage: s.stage, units: 0 })));
  const [cash, setCash] = useState<Cash>({ cac: 0, dso: 0, paybackDays: 0, prepayShare: 0 });

  // Stages (VSM)
  const [stages, setStages] = useState<StageRow[]>(DEFAULT_STAGES);

  // ---------- Derived ----------
  const totalFTE = useMemo(() => sum(headcount.map(h => h.fte + h.contractors)), [headcount]);

  const weightedASP = useMemo(() => sum(offers.map(o => o.asp * o.share)), [offers]);
  const weightedGM = useMemo(() => sum(offers.map(o => o.gm * o.share)) / (sum(offers.map(o => o.share)) || 1), [offers]);

  // conversions
  const cAwareLead   = useMemo(() => (funnel.awareness ? safe(funnel.lead / funnel.awareness, 0) : 0), [funnel]);
  const cLeadQual    = useMemo(() => (funnel.lead ? safe(funnel.qualified / funnel.lead, 0) : 0), [funnel]);
  const cQualBooked  = useMemo(() => (funnel.qualified ? safe(funnel.booked / funnel.qualified, 0) : 0), [funnel]);
  const cBookedShow  = useMemo(() => (funnel.booked ? safe(funnel.show / funnel.booked, 0) : 0), [funnel]);
  const cShowProp    = useMemo(() => (funnel.show ? safe(funnel.proposal / funnel.show, 0) : 0), [funnel]);
  const cPropClose   = useMemo(() => (funnel.proposal ? safe(funnel.closeWon / funnel.proposal, 0) : 0), [funnel]);
  const prodFromAw   = useMemo(
    () => [cAwareLead, cLeadQual, cQualBooked, cBookedShow, cShowProp, cPropClose].reduce((a, b) => a * safe(b, 1), 1),
    [cAwareLead, cLeadQual, cQualBooked, cBookedShow, cShowProp, cPropClose]
  );

  // capacities
  const capsPerWeek = useMemo(
    () => stages.map(s => ({ stage: s.stage, cap: safe(s.fte * s.focusHrs * s.util * s.stdRate * s.yield) })),
    [stages]
  );

  const downstreamProduct = useMemo(() => {
    const map: Record<string, number> = {
      Awareness: prodFromAw,
      Lead: safe(cLeadQual * cQualBooked * cBookedShow * cShowProp * cPropClose, 1),
      Qualified: safe(cQualBooked * cBookedShow * cShowProp * cPropClose, 1),
      Booked: safe(cBookedShow * cShowProp * cPropClose, 1),
      Show: safe(cShowProp * cPropClose, 1),
      Proposal: safe(cPropClose, 1),
      CloseWon: 1, Onboarding: 1, Aha: 1, Delivery: 1, "Renewal/Expansion": 1,
    };
    const m: Record<string, number> = {};
    stages.forEach(s => { m[s.stage] = map[s.stage] ?? 1; });
    return m;
  }, [stages, prodFromAw, cLeadQual, cQualBooked, cBookedShow, cShowProp, cPropClose]);

  const dealsPerWeekFromStage = useMemo(
    () => stages.map((s, i) => ({ stage: s.stage, dealsPerWeek: (capsPerWeek[i]?.cap ?? 0) * (downstreamProduct[s.stage] ?? 1) })),
    [stages, capsPerWeek, downstreamProduct]
  );

  const systemDealsPerWeek = useMemo(() => {
    const preClose = dealsPerWeekFromStage.filter(d =>
      ["Awareness","Lead","Qualified","Booked","Show","Proposal","CloseWon"].includes(d.stage)
    );
    const min = preClose.length ? preClose.reduce((a, b) => a.dealsPerWeek < b.dealsPerWeek ? a : b) : { stage: "—", dealsPerWeek: 0 };
    return { value: min.dealsPerWeek, stage: min.stage };
  }, [dealsPerWeekFromStage]);

  const deals90d = useMemo(() => safe(systemDealsPerWeek.value * weeks), [systemDealsPerWeek, weeks]);
  const rev90d   = useMemo(() => safe(deals90d * weightedASP), [deals90d, weightedASP]);
  const gp90d    = useMemo(() => safe(rev90d * weightedGM), [rev90d, weightedGM]);
  const rfteCeil = useMemo(() => totalFTE > 0 ? gp90d / totalFTE : 0, [gp90d, totalFTE]);

  // cash overlay
  const gpPerDay = useMemo(() => days > 0 ? gp90d / days : 0, [gp90d, days]);
  const gp30     = useMemo(() => gpPerDay * 30, [gpPerDay]);
  const gp30CAC  = useMemo(() => cash.cac > 0 ? gp30 / cash.cac : 0, [gp30, cash.cac]);
  const cashFlag = useMemo(() => gp30CAC > 0 && gp30CAC < 3, [gp30CAC]);

  // flags & backlog
  const utilFlags = useMemo(
    () => stages.map(s => ({ stage: s.stage, util: s.util, flag: s.util > 0.85 ? "Constraint" : "Healthy" })),
    [stages]
  );
  const backlogWeeks = useMemo(
    () => stages.map((s, i) => {
      const cap = capsPerWeek[i]?.cap ?? 0;
      const units = backlog[i]?.units ?? 0;
      const weeksOf = cap > 0 ? units / cap : 0;
      return { stage: s.stage, units, cap, weeksOf };
    }),
    [stages, backlog, capsPerWeek]
  );

  // UI helpers
  const updateStage  = (id: string, patch: Partial<StageRow>) => setStages(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  const updateOffer  = (id: string, patch: Partial<Offer>) => setOffers(prev => prev.map(o => o.id === id ? { ...o, ...patch } : o));
  const addOffer     = () => setOffers(prev => [...prev, { id: uid(), name: "", asp: 0, gm: 0.7, share: 0 }]);
  const removeOffer  = (id: string) => setOffers(prev => prev.filter(o => o.id !== id));
  const setBacklogUnits = (id: string, units: number) => setBacklog(prev => prev.map(b => b.id === id ? { ...b, units } : b));

  return (
    <main className="mx-auto max-w-7xl p-6 space-y-6">
      {/* small banner to confirm client render */}
      <div className="rounded-xl bg-emerald-50 text-emerald-800 p-3 text-sm">
        UI mounted ✔ — {new Date().toISOString()}
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">R/FTE Bottleneck Mapper</h1>
          <div className="flex gap-2">
            <Badge className={cashFlag ? "bg-red-600 text-white" : ""}>GP30/CAC: {fmt(gp30CAC, 2)} {cashFlag ? "(Cash-constrained)" : ""}</Badge>
            <Badge>Ceiling: {fmt(systemDealsPerWeek.value, 2)} deals/wk @ {systemDealsPerWeek.stage}</Badge>
          </div>
        </div>
        <p className="text-gray-600">90-day window, detailed funnel. Fill inputs below; KPIs update live.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Gauge className="h-5 w-5"/>Window & Offers</CardTitle></CardHeader>
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

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5"/>Headcount (summary)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {headcount.map(h => (
              <div key={h.id} className="grid grid-cols-12 gap-2 items-center text-sm">
                <div className="col-span-3 font-medium">{h.role}</div>
                <Input className="col-span-2" type="number" value={h.fte} onChange={e => setHeadcount(prev => prev.map(x => x.id === h.id ? { ...x, fte: parseFloat(e.target.value) || 0 } : x))}/>
                <Input className="col-span-2" type="number" value={h.focusHrs} onChange={e => setHeadcount(prev => prev.map(x => x.id === h.id ? { ...x, focusHrs: parseFloat(e.target.value) || 0 } : x))}/>
                <Input className="col-span-2" type="number" step={0.01} value={h.util} onChange={e => setHeadcount(prev => prev.map(x => x.id === h.id ? { ...x, util: parseFloat(e.target.value) || 0 } : x))}/>
                <Input className="col-span-2" type="number" value={h.contractors} onChange={e => setHeadcount(prev => prev.map(x => x.id === h.id ? { ...x, contractors: parseFloat(e.target.value) || 0 } : x))}/>
              </div>
            ))}
            <div className="text-xs text-gray-500">Total FTE (incl. contractors): <b>{fmt(totalFTE,2)}</b></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5"/>KPIs</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <div className="flex justify-between text-sm"><span>Deals/week (ceiling)</span><b>{fmt(systemDealsPerWeek.value,2)} @ {systemDealsPerWeek.stage}</b></div>
            <div className="flex justify-between text-sm"><span>GP (90d)</span><b>${fmt(gp90d,0)}</b></div>
            <div className="flex justify-between text-sm"><span>R/FTE ceiling</span><b>${fmt(rfteCeil,0)}</b></div>
            <div className="flex justify-between text-sm"><span>GP30/CAC</span><b>{fmt(gp30CAC,2)} {cashFlag && <span className="text-red-600">(cash-constrained)</span>}</b></div>
            <Separator className="my-2"/>
            <div style={{ height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stages.map((s, i) => ({ name: s.stage, capacity: capsPerWeek[i]?.cap ?? 0 }))}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="name" hide/>
                  <YAxis hide/>
                  <Tooltip />
                  <Bar dataKey="capacity" fill="#4f46e5" radius={[8,8,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="funnel" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger>Funnel</TabsTrigger>
          <TabsTrigger>Stages (VSM)</TabsTrigger>
          <TabsTrigger>Backlog</TabsTrigger>
          <TabsTrigger>Cash</TabsTrigger>
          <TabsTrigger>Export JSON</TabsTrigger>
        </TabsList>

        {/* Funnel Tab */}
        <TabsContent>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><TableIcon className="h-5 w-5"/>90-day Funnel</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-7 gap-2">
                {(["awareness","lead","qualified","booked","show","proposal","closeWon"] as const).map(key => (
                  <div key={key}>
                    <Label className="capitalize">{key}</Label>
                    <Input type="number" value={Number(funnel[key])} onChange={e => setFunnel(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))} />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Booked → Show (days)</Label><Input type="number" value={cq.bookedToShowDays} onChange={e => setCQ({ ...cq, bookedToShowDays: parseFloat(e.target.value) || 0 })}/></div>
                <div><Label>Show → Proposal (days)</Label><Input type="number" value={cq.showToProposalDays} onChange={e => setCQ({ ...cq, showToProposalDays: parseFloat(e.target.value) || 0 })}/></div>
                <div><Label>Proposal → Close (days)</Label><Input type="number" value={cq.proposalToCloseDays} onChange={e => setCQ({ ...cq, proposalToCloseDays: parseFloat(e.target.value) || 0 })}/></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stages Tab */}
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

        {/* Backlog Tab (escaped text for > and ≤) */}
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

        {/* Cash Tab */}
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

        {/* Export Tab */}
        <TabsContent>
          <Card>
            <CardHeader><CardTitle>Export JSON</CardTitle></CardHeader>
            <CardContent>
              <pre className="text-xs whitespace-pre-wrap p-3 rounded bg-gray-100 overflow-x-auto">
                {JSON.stringify({
                  inputs_pack: {
                    scope: { days, weeks, totalFTE: totalFTE },
                    offers, headcount, funnel, cycleQuality: cq, postClose: post, backlog, cash,
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
