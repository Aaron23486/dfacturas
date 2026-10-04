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

const STATUS_COLORS: Record<string, string> = {
  DESPACHADA: "#34d399",
  ATENDIENDO: "#fbbf24",
  PEDIDO_CANCELADO: "#fb7185",
};

type Props = {
  data: DashboardDatum[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

function DashboardStatusDonutComponent({
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
          Distribución por estado
        </h2>
        <p className="text-[10px] text-slate-600">
          Estado actual de las facturas del período
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
              innerRadius={50}
              outerRadius={74}
              cornerRadius={6}
              paddingAngle={4}
              stroke="rgba(255,255,255,.05)"
              strokeWidth={1}
              isAnimationActive
              animationDuration={280}
              onClick={(entry) => {
                const datum = entry as unknown as DashboardDatum;
                onSelect(datum.id);
              }}
            >
              {data.map((item) => {
                const dimmed =
                  selectedId !== null && selectedId !== item.id;

                return (
                  <Cell
                    key={item.id}
                    fill={STATUS_COLORS[item.id] ?? "#F59E0B"}
                    opacity={dimmed ? 0.25 : 0.95}
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
              ESTADOS
            </text>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        {data.map((item) => (
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
                backgroundColor:
                  STATUS_COLORS[item.id] ?? "#F59E0B",
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

export const DashboardStatusDonut = memo(
  DashboardStatusDonutComponent
);
