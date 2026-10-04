import {
  Clock3,
  Medal,
  PackageCheck,
  PackageOpen,
  Timer,
} from "lucide-react";
import { formatToday } from "@/lib/utils/date";
import type { DailyKpis } from "@/types/dispatch";

export function DispatchKpis({
  data,
}: {
  data: DailyKpis;
}) {
  const metrics = [
    {
      label: "Despachadas",
      value: data.despachadas,
      icon: PackageCheck,
    },
    {
      label: "En proceso",
      value: data.atendiendo,
      icon: PackageOpen,
    },
    {
      label: "Finalizadas",
      value: data.finalizadas,
      icon: Clock3,
    },
    {
      label: "Promedio",
      value: `${data.promedioMinutos} min`,
      icon: Timer,
    },
  ];

  return (
    <section className="grid gap-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_1.8fr]">
      {metrics.map(({ label, value, icon: Icon }) => (
        <div
          key={label}
          className="flex min-h-14 items-center gap-3 rounded-xl border border-white/8 bg-[#0B1626]/70 px-3 py-2 shadow-[0_12px_30px_rgba(0,0,0,.16)] backdrop-blur-xl"
        >
          <div className="grid size-8 place-items-center rounded-lg border border-amber-500/15 bg-amber-500/[0.06] text-amber-400">
            <Icon className="size-4" />
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.08em] text-slate-500">
              {label}
            </p>
            <p className="text-base font-semibold text-slate-100">
              {value}
            </p>
          </div>
        </div>
      ))}

      <div className="flex min-h-14 items-center gap-3 rounded-xl border border-white/8 bg-[#0B1626]/70 px-3 py-2 shadow-[0_12px_30px_rgba(0,0,0,.16)] backdrop-blur-xl">
        <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-amber-400/15 bg-amber-400/[0.06] text-amber-300">
          <Medal className="size-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] uppercase tracking-[0.08em] text-slate-500">
              Top del día
            </p>
            <span className="text-[10px] text-slate-600">
              {formatToday()}
            </span>
          </div>

          <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-slate-300">
            <span>
              <b className="text-amber-400">Top 1</b> —{" "}
              {data.top[0]?.nombre ?? "-"}
            </span>
            <span>
              <b className="text-slate-300">Top 2</b> —{" "}
              {data.top[1]?.nombre ?? "-"}
            </span>
            <span>
              <b className="text-slate-400">Top 3</b> —{" "}
              {data.top[2]?.nombre ?? "-"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
