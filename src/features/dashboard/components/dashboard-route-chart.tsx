"use client";

import { memo, useMemo } from "react";
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
import { DashboardTooltip } from "./dashboard-tooltip";

type Props = {
  data: DashboardDatum[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

function DashboardRouteChartComponent({
  data,
  selectedId,
  onSelect,
}: Props) {
  const visibleData = useMemo(
    () => [...data].sort((a, b) => b.value - a.value).slice(0, 10),
    [data]
  );

  const total = useMemo(
    () => visibleData.reduce((sum, item) => sum + item.value, 0),
    [visibleData]
  );

  return (
    <section
      data-dashboard-interactive="true"
      className="rounded-2xl border border-white/8 bg-[#0B1626]/72 p-3 shadow-[0_16px_50px_rgba(0,0,0,.20)] backdrop-blur-xl"
    >
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-slate-100">
          Por ruta
        </h2>
        <p className="text-[10px] text-slate-600">
          Top 10 rutas por volumen de despacho
        </p>
      </div>

      <div className="h-[205px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={visibleData}
            margin={{ top: 12, right: 12, left: -18, bottom: 8 }}
          >
            <CartesianGrid
              vertical={false}
              stroke="rgba(255,255,255,.045)"
            />
            <XAxis
              dataKey="label"
              tick={{
                fill: "#64748b",
                fontSize: 10,
              }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{
                fill: "#475569",
                fontSize: 9,
              }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip
              content={<DashboardTooltip total={total} />}
              cursor={{ fill: "rgba(245,158,11,.035)" }}
            />

            <Bar
              dataKey="value"
              radius={[7, 7, 2, 2]}
              maxBarSize={30}
              isAnimationActive
              animationDuration={260}
              onClick={(entry) => {
                const datum = (
                  entry as unknown as {
                    payload: DashboardDatum;
                  }
                ).payload;
                onSelect(datum.id);
              }}
            >
              {visibleData.map((item) => (
                <Cell
                  key={item.id}
                  fill={
                    selectedId === item.id
                      ? "#FBBF24"
                      : "#D97706"
                  }
                  opacity={
                    selectedId && selectedId !== item.id
                      ? 0.22
                      : 0.9
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

export const DashboardRouteChart = memo(
  DashboardRouteChartComponent
);
