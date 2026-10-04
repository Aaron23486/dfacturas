"use client";

import { memo } from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  DashboardRouteTimeDatum,
} from "../domain/dashboard.types";

type Props = {
  data: DashboardRouteTimeDatum[];
};

function DashboardRouteTimeChartComponent({
  data,
}: Props) {
  return (
    <section
      data-dashboard-interactive="true"
      className="rounded-2xl border border-white/8 bg-[#0B1626]/72 p-3 shadow-[0_16px_50px_rgba(0,0,0,.20)] backdrop-blur-xl"
    >
      <div className="mb-2">
        <h2 className="text-sm font-semibold text-slate-100">
          Tiempo promedio — Top 10 rutas más despachadas
        </h2>

        <p className="text-[10px] text-slate-600">
          Las 10 rutas con mayor volumen de facturas despachadas en el período
        </p>
      </div>

      {data.length > 0 ? (
        <div className="h-[270px]">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={data}
              layout="vertical"
              margin={{
                top: 2,
                right: 70,
                bottom: 2,
                left: 14,
              }}
            >
              <CartesianGrid
                horizontal={false}
                stroke="rgba(255,255,255,.045)"
              />

              <XAxis
                type="number"
                tick={{
                  fill: "#475569",
                  fontSize: 9,
                }}
                axisLine={false}
                tickLine={false}
                unit=" min"
              />

              <YAxis
                type="category"
                dataKey="label"
                interval={0}
                width={88}
                tick={{
                  fill: "#94a3b8",
                  fontSize: 10,
                  fontWeight: 600,
                }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                cursor={{
                  fill: "rgba(245,158,11,.035)",
                }}
                content={({
                  active,
                  payload,
                }) => {
                  const item =
                    payload?.[0]?.payload as
                      | DashboardRouteTimeDatum
                      | undefined;

                  if (
                    !active ||
                    !item
                  ) {
                    return null;
                  }

                  return (
                    <div className="rounded-xl border border-white/10 bg-[#07111F]/95 px-3 py-2 shadow-[0_12px_30px_rgba(0,0,0,.35)] backdrop-blur-xl">
                      <p className="text-xs font-semibold text-slate-100">
                        {item.label}
                      </p>

                      <p className="mt-1 text-[11px] text-amber-400">
                        Promedio:{" "}
                        {Number(
                          item.value
                        ).toFixed(1)}{" "}
                        min
                      </p>

                      <p className="text-[10px] text-slate-500">
                        Despachos:{" "}
                        {item.dispatches}
                      </p>
                    </div>
                  );
                }}
              />

              <Bar
                dataKey="value"
                radius={[0, 7, 7, 0]}
                maxBarSize={14}
                fill="#F59E0B"
                isAnimationActive
                animationDuration={260}
              >
                <LabelList
                  dataKey="value"
                  position="right"
                  formatter={(
                    value: unknown
                  ) =>
                    `${Number(
                      value
                    ).toFixed(1)} min`
                  }
                  fill="#94a3b8"
                  fontSize={9}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="grid h-[270px] place-items-center">
          <p className="text-[10px] text-slate-600">
            No hay despachos finalizados con ruta durante este período.
          </p>
        </div>
      )}
    </section>
  );
}

export const DashboardRouteTimeChart =
  memo(
    DashboardRouteTimeChartComponent
  );