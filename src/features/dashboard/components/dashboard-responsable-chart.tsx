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

function DashboardResponsableChartComponent({
  data,
  selectedId,
  onSelect,
}: Props) {
  const total = useMemo(
    () => data.reduce((sum, item) => sum + item.value, 0),
    [data]
  );

  const chartHeight = Math.max(165, Math.min(205, data.length * 28));

  return (
    <section
      data-dashboard-interactive="true"
      className="rounded-2xl border border-white/8 bg-[#0B1626]/72 p-3 shadow-[0_16px_50px_rgba(0,0,0,.20)] backdrop-blur-xl"
    >
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-slate-100">
          Por responsable
        </h2>
        <p className="text-[10px] text-slate-600">
          Ranking de volumen atendido
        </p>
      </div>

      <div className="max-h-[205px] overflow-y-auto overflow-x-hidden">
        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 26, bottom: 4, left: 16 }}
            >
              <CartesianGrid
                horizontal={false}
                stroke="rgba(255,255,255,.045)"
              />
              <XAxis
                type="number"
                hide
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={122}
                tick={{
                  fill: "#64748b",
                  fontSize: 10,
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
                radius={[0, 7, 7, 0]}
                maxBarSize={14}
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
                {data.map((item) => (
                  <Cell
                    key={item.id}
                    fill={
                      selectedId === item.id
                        ? "#FBBF24"
                        : "#F59E0B"
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
      </div>
    </section>
  );
}

export const DashboardResponsableChart = memo(
  DashboardResponsableChartComponent
);
