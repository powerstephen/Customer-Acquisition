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
import { ResponsiveContainer, Bar, BarChart, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";


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


const DEFAULT_STAGES: StageRow[] = [
{ id: "s1", stage: "Awareness", unit: "lead", owner: "Marketing", fte: 0, focusHrs: 0, util: 0.85, stdRate: 0, yield: 1 },
{ id: "s2", stage: "Lead", unit: "lead", owner: "Marketing/SDR", fte: 0, focusHrs: 0, util: 0.85, stdRate: 0, yield: 1 },
{ id: "s3", stage: "Qualified", unit: "lead", owner: "SDR", fte: 0, focusHrs: 0, util: 0.85, stdRate: 0, yield: 1 },
{ id: "s4", stage: "Booked", unit: "meeting", owner: "SDR", fte: 0, focusHrs: 0, util: 0.85, stdRate: 0, yield: 1 },
{ id: "s5", stage: "Show", unit: "meeting", owner: "AE", fte: 0, focusHrs: 0, util: 0.85, stdRate: 0, yield: 1 },
{ id: "s6", stage: "Proposal", unit: "proposal", owner: "AE/RevOps", fte: 1, focusHrs: 20, util: 0.85, stdRate: 1, yield: 0.95 },
{ id: "s7", stage: "CloseWon", unit: "deal", owner: "AE", fte: 0, focusHrs: 0, util: 0.85, stdRate: 0, yield: 1 },
{ id: "s8", stage: "Onboarding", unit: "client", owner: "Delivery/CS", fte: 0, focusHrs: 0, util: 0.85, stdRate: 0, yield: 1 },
{ id: "s9", stage: "Aha", unit: "client", owner: "Delivery/CS", fte: 0, focusHrs: 0, util: 0.85, stdRate: 0, yield: 1 },
{ id: "s10", stage: "Delivery", unit: "client", owner: "Delivery", fte: 0, focusHrs: 0, util: 0.85, stdRate: 0, yield: 1 },
{ id: "s11", stage: "Renewal/Expansion", unit: "client", owner: "CS", fte: 0, focusHrs: 0, util: 0.85, stdRate: 0, yield: 1 },
];


export default function RFTEBottleneckMapper() {
// Scope
const [days, setDays] = useState<number>(90);
const weeks = useMemo(() => safe(days / 7, 0), [days]);


// Offers
const [offers, setOffers] = useState<Offer[]>([{ id: "o1", name: "Core", asp: 5000, gm: 0.7, share: 1 }]);


// Headcount
const [headcount, setHeadcount] = useState<HeadcountRow[]>([
{ id: "h1", role: "Marketing", fte: 0, focusHrs: 0, util: 0.7, contractors: 0 },
{ id: "h2", role: "SDR/BDR", fte: 0, focusHrs: 0, util: 0.7, contractors: 0 },
{ id: "h3", role: "Sales AE", fte: 0, focusHrs: 0, util: 0.7, contractors: 0 },
{ id: "h4", role: "RevOps", fte: 0, focusHrs: 0, util: 0.7, contractors: 0 },
{ id: "h5", role: "Delivery", fte: 0, focusHrs: 0, util: 0.7, contractors: 0 },
{ id: "h6", role: "CS/Success", fte: 0, focusHrs: 0, util: 0.7, contractors: 0 },
]);


// Funnel & quality
const [funnel, setFunnel] = useState<FunnelCounts>({ awareness: 0, lead: 0, qualified: 0, booked: 0, show: 0, proposal: 0, closeWon: 0 });
const [cq, setCQ] = useState<CycleQuality>({ bookedToShowDays: 0, showToProposalDays: 0, proposalToCloseDays: 0, noShowRate: 0.0, proposalWin: 0.0 });
}
