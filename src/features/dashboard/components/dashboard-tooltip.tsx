"use client";

import type { DashboardDatum } from "../domain/dashboard.types";

type TooltipPayloadItem = {
  payload?: DashboardDatum;
  value?: number;
};

type DashboardTooltipProps = {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  total?: number;
};

export function DashboardTooltip({
  active,
  payload,
  total = 0,
}: DashboardTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0]?.payload;

  if (!item) {
    return null;
  }

  const percentage =
    total > 0
      ? ((item.value / total) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="rounded-xl border border-white/10 bg-[#07111F]/95 px-3 py-2 shadow-[0_12px_30px_rgba(0,0,0,.35)] backdrop-blur-xl">
      <p className="text-xs font-semibold text-slate-100">
        {item.label}
      </p>
      <p className="mt-1 text-[11px] text-amber-400">
        {item.value} despachos
      </p>
      <p className="text-[10px] text-slate-500">
        {percentage}%
      </p>
    </div>
  );
}
