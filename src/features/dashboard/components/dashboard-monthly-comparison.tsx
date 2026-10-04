"use client";

import { memo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DashboardDatum } from "../domain/dashboard.types";

type Props = {
  data: DashboardDatum[];
  selectedMonthId: string | null;
  onSelectMonth: (monthId: string) => void;
};

function DashboardMonthlyComparisonComponent({
  data,
  selectedMonthId,
  onSelectMonth,
}: Props) {
  return (
    <section
      data-dashboard-interactive="true"
      className="rounded-2xl border border-white/8 bg-[#0B1626]/72 p-3 shadow-[0_16px_50px_rgba(0,0,0,.20)] backdrop-blur-xl"
    >
      <div className="mb-2">
        <h2 className="text-sm font-semibold text-slate-100">
          Comparativa de facturas — últimos 6 meses
        </h2>
        <p className="text-[10px] text-slate-600">
          Seleccione un mes para filtrar todo el Dashboard
        </p>
      </div>

      <div className="h-[210px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 12, right: 8, left: -18, bottom: 0 }}
          >
            <CartesianGrid
              vertical={false}
              stroke="rgba(255,255,255,.045)"
            />

            <XAxis
              dataKey="label"
              interval={0}
              tick={{ fill: "#64748b", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              allowDecimals={false}
              tick={{ fill: "#475569", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip
              cursor={{ fill: "rgba(245,158,11,.035)" }}
              content={({ active, payload }) => {
                const item = payload?.[0]?.payload as DashboardDatum | undefined;

                if (!active || !item) {
                  return null;
                }

                return (
                  <div className="rounded-xl border border-white/10 bg-[#07111F]/95 px-3 py-2 shadow-[0_12px_30px_rgba(0,0,0,.35)] backdrop-blur-xl">
                    <p className="text-xs font-semibold text-slate-100">
                      {item.label}
                    </p>
                    <p className="mt-1 text-[11px] text-amber-400">
                      {item.value} facturas
                    </p>
                    <p className="mt-0.5 text-[9px] text-slate-600">
                      Click para filtrar este mes
                    </p>
                  </div>
                );
              }}
            />

            <Bar
              dataKey="value"
              radius={[7, 7, 2, 2]}
              maxBarSize={54}
              isAnimationActive
              animationDuration={260}
              onClick={(entry) => {
                const datum = (
                  entry as unknown as { payload: DashboardDatum }
                ).payload;

                onSelectMonth(datum.id);
              }}
            >
              {data.map((item) => (
                <Cell
                  key={item.id}
                  fill={selectedMonthId === item.id ? "#FBBF24" : "#F59E0B"}
                  opacity={
                    selectedMonthId && selectedMonthId !== item.id ? 0.28 : 0.92
                  }
                  className="cursor-pointer"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export const DashboardMonthlyComparison = memo(
  DashboardMonthlyComparisonComponent
);
