// --- Demand-stage coverage (actual / required to saturate delivery) ---
const demandCoverageMap: Record<string, number> = {
  "Leads": C.reqLead > 0 ? C.leadsPerWeek / C.reqLead : Infinity,
  "Lead→Qualified": C.reqQual > 0 ? C.qualPerWeek / C.reqQual : Infinity,
  "Qualified→Booked": C.reqBook > 0 ? C.bookPerWeek / C.reqBook : Infinity,
  "Booked→Show": C.reqShow > 0 ? C.showPerWeek / C.reqShow : Infinity,
  "Show→Proposal": C.reqProp > 0 ? C.propPerWeek / C.reqProp : Infinity,
  "Proposal→Won": C.reqWon > 0 ? C.wonPerWeek / C.reqWon : Infinity,
};
const funnelOrder = [
  "Leads",
  "Lead→Qualified",
  "Qualified→Booked",
  "Booked→Show",
  "Show→Proposal",
  "Proposal→Won",
];
const { name: demandStage, value: demandStageCoverage } = pickDemandConstraintOrdered(
  demandCoverageMap,
  funnelOrder
);

const isDeliveryConstrained = C.deliveryDealsPerWeek + 1e-9 < C.demandDealsPerWeek;

// --- Constraint Banner (subtitle) ---
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
        Current bottleneck: <span className="text-amber-700">Demand — {demandStage}</span>
      </div>
      <div className="text-xs text-gray-600">
        Coverage at weakest demand stage: {(Math.max(0, Math.min(1e3, demandStageCoverage)) * 100).toFixed(0)}%
      </div>
    </div>
  )}
</div>

// --- Constraint Card (top-left widget) ---
<Card>
  <CardHeader className="pb-2"><CardTitle className="text-xs text-gray-500">Constraint</CardTitle></CardHeader>
  <CardContent className="pt-0">
    <div className="text-base font-semibold">
      {isDeliveryConstrained ? "Delivery (Onboarding)" : `Demand — ${demandStage}`}
    </div>
    <div className="text-[11px] text-gray-600">
      {isDeliveryConstrained
        ? `Dem ${fmtNum(C.demandDealsPerWeek,2)}/wk vs Del ${fmtNum(C.deliveryDealsPerWeek,2)}/wk`
        : `Coverage at weakest stage: ${(Math.max(0, Math.min(1e3, demandStageCoverage)) * 100).toFixed(0)}%`}
    </div>
    <div className="text-[11px] mt-1">Δ Deals Ceiling: <DeltaTag value={dDealsCeil} /></div>
  </CardContent>
</Card>
