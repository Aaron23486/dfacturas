"use client";

import { memo, useMemo } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import type { DashboardDatum } from "../domain/dashboard.types";
import { DashboardTooltip } from "./dashboard-tooltip";

const COLORS = [
  "#F59E0B",
  "#34d399",
  "#60a5fa",
  "#a78bfa",
  "#f59e0b",
  "#fb7185",
];

type Props = {
  data: DashboardDatum[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

function DashboardCompanyDonutComponent({
  data,
  selectedId,
  onSelect,
}: Props) {
  const total = useMemo(
    () => data.reduce((sum, item) => sum + item.value, 0),
    [data]
  );

  return (
    <section
      data-dashboard-interactive="true"
      className="rounded-2xl border border-white/8 bg-[#0B1626]/72 p-3 shadow-[0_16px_50px_rgba(0,0,0,.20)] backdrop-blur-xl"
    >
      <div className="mb-2">
        <h2 className="text-sm font-semibold text-slate-100">
          Por compañía
        </h2>
        <p className="text-[10px] text-slate-600">
          Distribución del volumen por compañía
        </p>
      </div>

      <div className="h-[175px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={72}
              paddingAngle={3}
              stroke="rgba(255,255,255,.06)"
              strokeWidth={1}
              isAnimationActive
              animationDuration={280}
              onClick={(entry) => {
                const datum = entry as unknown as DashboardDatum;
                onSelect(datum.id);
              }}
            >
              {data.map((item, index) => {
                const dimmed =
                  selectedId !== null && selectedId !== item.id;

                return (
                  <Cell
                    key={item.id}
                    fill={COLORS[index % COLORS.length]}
                    opacity={dimmed ? 0.28 : 0.95}
                    className="cursor-pointer outline-none transition-opacity"
                  />
                );
              })}
            </Pie>

            <Tooltip
              content={<DashboardTooltip total={total} />}
              cursor={false}
            />

            <text
              x="50%"
              y="47%"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#e2e8f0"
              fontSize="20"
              fontWeight="700"
            >
              {total}
            </text>

            <text
              x="50%"
              y="57%"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#64748b"
              fontSize="10"
            >
              TOTAL
            </text>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
        {data.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelect(item.id);
            }}
            className={[
              "inline-flex items-center gap-2 text-[10px] transition",
              selectedId && selectedId !== item.id
                ? "text-slate-600"
                : "text-slate-400 hover:text-slate-200",
            ].join(" ")}
          >
            <span
              className="size-2 rounded-full"
              style={{
                backgroundColor: COLORS[index % COLORS.length],
              }}
            />
            {item.label}
            <span className="font-semibold text-slate-300">
              {item.value}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export const DashboardCompanyDonut = memo(
  DashboardCompanyDonutComponent
);
