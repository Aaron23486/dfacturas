"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CalendarDays, Download } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { safeErrorMessage } from "@/lib/errors/safe-error";
import type { DispatchStatus } from "@/types/dispatch";

import {
  EMPTY_DASHBOARD_FILTERS,
  type DashboardAnalytics,
  type DashboardCrossFilters,
  type DashboardExportRow,
} from "../domain/dashboard.types";

import { DashboardCompanyDonut } from "./dashboard-company-donut";
import { downloadDashboardXlsx } from "./dashboard-excel";
import { DashboardMonthlyComparison } from "./dashboard-monthly-comparison";
import { DashboardResponsableChart } from "./dashboard-responsable-chart";
import { DashboardRouteChart } from "./dashboard-route-chart";
import { DashboardRouteTimeChart } from "./dashboard-route-time-chart";
import { DashboardStatusDonut } from "./dashboard-status-donut";

type PeriodMode = "day" | "week" | "month" | "custom";

type StoredRange = {
  mode: PeriodMode;
  from: string;
  to: string;
};

const PERIODS = [
  { label: "Día", mode: "day" as const, days: 1 },
  { label: "Semana", mode: "week" as const, days: 7 },
  { label: "Mes", mode: "month" as const, days: 30 },
];

const EMPTY_ANALYTICS: DashboardAnalytics = {
  metrics: {
    total: 0,
    despachadas: 0,
    canceladas: 0,
    pendientes: 0,
    promedioMinutos: 0,
    maximoMinutos: 0,
    rutaTop: "-",
  },
  companias: [],
  responsables: [],
  rutas: [],
  estados: [],
  comparativaMensual: [],
  promedioRuta: [],
};

function toInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getPresetRange(days: number) {
  const end = new Date();
  const start = new Date();

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  return {
    from: toInputDate(start),
    to: toInputDate(end),
  };
}

function getMonthRange(monthId: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(monthId);

  if (!match) {
    throw new Error("El mes seleccionado no es válido.");
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;

  return {
    from: toInputDate(new Date(year, monthIndex, 1)),
    to: toInputDate(new Date(year, monthIndex + 1, 0)),
  };
}

function formatMinutes(value: number) {
  return Number.isFinite(value) ? `${Math.round(value)} min` : "0 min";
}

async function fetchDashboardAnalytics(
  from: string,
  to: string,
  filters: DashboardCrossFilters
): Promise<DashboardAnalytics> {
  const { data, error } = await createClient().rpc(
    "admin_dashboard_analytics",
    {
      p_from: from,
      p_to: to,
      p_compania_id: filters.companiaId,
      p_responsable_id: filters.responsableId,
      p_ruta_id: filters.rutaId,
      p_estado: filters.estado,
    }
  );

  if (error) {
    throw new Error(
      safeErrorMessage(error, "No se pudo cargar la analítica del dashboard.")
    );
  }

  return (data ?? EMPTY_ANALYTICS) as DashboardAnalytics;
}

async function fetchExportRows(
  from: string,
  to: string,
  filters: DashboardCrossFilters
): Promise<DashboardExportRow[]> {
  const { data, error } = await createClient().rpc(
    "admin_dashboard_export_rows",
    {
      p_from: from,
      p_to: to,
      p_compania_id: filters.companiaId,
      p_responsable_id: filters.responsableId,
      p_ruta_id: filters.rutaId,
      p_estado: filters.estado,
    }
  );

  if (error) {
    throw new Error(
      safeErrorMessage(error, "No se pudo preparar la exportación.")
    );
  }

  return (data ?? []) as DashboardExportRow[];
}

export function DashboardClient() {
  const initialRange = useMemo(() => getPresetRange(1), []);

  const [mode, setMode] = useState<PeriodMode>("day");
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [appliedFrom, setAppliedFrom] = useState(initialRange.from);
  const [appliedTo, setAppliedTo] = useState(initialRange.to);
  const [selectedMonthId, setSelectedMonthId] = useState<string | null>(null);
  const rangeBeforeMonthRef = useRef<StoredRange | null>(null);

  const [filters, setFilters] = useState<DashboardCrossFilters>(
    EMPTY_DASHBOARD_FILTERS
  );
  const [analytics, setAnalytics] =
    useState<DashboardAnalytics>(EMPTY_ANALYTICS);

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestIdRef.current;

    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);

      void fetchDashboardAnalytics(appliedFrom, appliedTo, filters)
        .then((result) => {
          if (requestId === requestIdRef.current) {
            setAnalytics(result);
          }
        })
        .catch((cause) => {
          if (requestId === requestIdRef.current) {
            setError(
              cause instanceof Error
                ? cause.message
                : "No se pudo cargar el dashboard."
            );
          }
        })
        .finally(() => {
          if (requestId === requestIdRef.current) {
            setLoading(false);
          }
        });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [appliedFrom, appliedTo, filters]);

  const metrics = useMemo(
    () => [
      ["Total", analytics.metrics.total],
      ["Despachadas", analytics.metrics.despachadas],
      ["Canceladas", analytics.metrics.canceladas],
      ["Pendientes", analytics.metrics.pendientes],
      ["Promedio", formatMinutes(analytics.metrics.promedioMinutos)],
      ["Máximo", formatMinutes(analytics.metrics.maximoMinutos)],
      ["Ruta top", analytics.metrics.rutaTop || "-"],
    ],
    [analytics.metrics]
  );

  const clearMonthSelection = useCallback(() => {
    setSelectedMonthId(null);
    rangeBeforeMonthRef.current = null;
  }, []);

  const selectPreset = useCallback(
    (nextMode: Exclude<PeriodMode, "custom">, nextDays: number) => {
      const nextRange = getPresetRange(nextDays);

      clearMonthSelection();
      setMode(nextMode);
      setFrom(nextRange.from);
      setTo(nextRange.to);
      setAppliedFrom(nextRange.from);
      setAppliedTo(nextRange.to);
      setError(null);
    },
    [clearMonthSelection]
  );

  const applyCustomRange = useCallback(() => {
    if (!from || !to) {
      setError("Seleccione una fecha Desde y una fecha Hasta.");
      return;
    }

    if (from > to) {
      setError("La fecha Desde no puede ser posterior a la fecha Hasta.");
      return;
    }

    clearMonthSelection();
    setMode("custom");
    setAppliedFrom(from);
    setAppliedTo(to);
    setError(null);
  }, [clearMonthSelection, from, to]);

  const selectMonth = useCallback(
    (monthId: string) => {
      if (selectedMonthId === monthId) {
        const previous = rangeBeforeMonthRef.current;

        if (previous) {
          setMode(previous.mode);
          setFrom(previous.from);
          setTo(previous.to);
          setAppliedFrom(previous.from);
          setAppliedTo(previous.to);
        }

        setSelectedMonthId(null);
        rangeBeforeMonthRef.current = null;
        return;
      }

      if (!selectedMonthId) {
        rangeBeforeMonthRef.current = {
          mode,
          from: appliedFrom,
          to: appliedTo,
        };
      }

      const monthRange = getMonthRange(monthId);

      setSelectedMonthId(monthId);
      setMode("custom");
      setFrom(monthRange.from);
      setTo(monthRange.to);
      setAppliedFrom(monthRange.from);
      setAppliedTo(monthRange.to);
      setError(null);
    },
    [appliedFrom, appliedTo, mode, selectedMonthId]
  );

  const toggleCompania = useCallback(
    (id: string) =>
      setFilters((current) => ({
        ...current,
        companiaId: current.companiaId === id ? null : id,
      })),
    []
  );

  const toggleResponsable = useCallback(
    (id: string) =>
      setFilters((current) => ({
        ...current,
        responsableId: current.responsableId === id ? null : id,
      })),
    []
  );

  const toggleRuta = useCallback(
    (id: string) =>
      setFilters((current) => ({
        ...current,
        rutaId: current.rutaId === id ? null : id,
      })),
    []
  );

  const toggleEstado = useCallback((id: string) => {
    const estado = id as DispatchStatus;

    setFilters((current) => ({
      ...current,
      estado: current.estado === estado ? null : estado,
    }));
  }, []);

  const clearCrossFilters = useCallback(() => {
    setFilters(EMPTY_DASHBOARD_FILTERS);
  }, []);

  const handleDashboardBackgroundClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      if (
        target.closest(
          '[data-dashboard-interactive="true"], button, input, a'
        )
      ) {
        return;
      }

      clearCrossFilters();
    },
    [clearCrossFilters]
  );

  const exportCurrent = useCallback(async () => {
    setExporting(true);
    setError(null);

    try {
      const rows = await fetchExportRows(appliedFrom, appliedTo, filters);

      downloadDashboardXlsx({
        rows,
        from: appliedFrom,
        to: appliedTo,
        filters,
        analytics,
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo exportar la información."
      );
    } finally {
      setExporting(false);
    }
  }, [analytics, appliedFrom, appliedTo, filters]);

  return (
    <div className="space-y-2" onClick={handleDashboardBackgroundClick}>
      <div
        data-dashboard-interactive="true"
        className="flex items-start justify-between gap-4"
      >
        <div>
          <h1 className="text-lg font-semibold text-slate-100">Dashboard</h1>
          <p className="text-xs text-slate-600">
            Analítica administrativa y comportamiento del flujo de despachos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void exportCurrent()}
          disabled={exporting}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 text-xs font-medium text-amber-400 transition hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download className="size-3.5" />
          {exporting ? "Exportando..." : "Exportar Excel"}
        </button>
      </div>

      <section
        data-dashboard-interactive="true"
        className="flex flex-wrap items-end gap-2 rounded-xl border border-white/8 bg-[#0B1626]/70 p-2.5 shadow-[0_12px_30px_rgba(0,0,0,.16)] backdrop-blur-xl"
      >
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((period) => (
            <button
              key={period.mode}
              type="button"
              onClick={() => selectPreset(period.mode, period.days)}
              className={[
                "h-8 rounded-lg border px-4 text-[11px] font-medium transition",
                mode === period.mode
                  ? "border-amber-400/40 bg-amber-500 text-slate-950"
                  : "border-white/8 bg-white/[0.025] text-slate-400 hover:border-amber-500/15 hover:bg-white/[0.06] hover:text-slate-200",
              ].join(" ")}
            >
              {period.label}
            </button>
          ))}
        </div>

        <div className="mx-1 hidden h-7 w-px bg-white/8 lg:block" />

        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-0.5">
            <label
              htmlFor="dashboard-from"
              className="block text-[9px] font-medium uppercase tracking-[0.06em] text-slate-600"
            >
              Desde
            </label>
            <input
              id="dashboard-from"
              type="date"
              value={from}
              max={to}
              onChange={(event) => setFrom(event.target.value)}
              className="h-8 rounded-lg border border-white/10 bg-[#07111F] px-3 text-[11px] text-slate-200 outline-none transition [color-scheme:dark] focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/10"
            />
          </div>

          <div className="space-y-0.5">
            <label
              htmlFor="dashboard-to"
              className="block text-[9px] font-medium uppercase tracking-[0.06em] text-slate-600"
            >
              Hasta
            </label>
            <input
              id="dashboard-to"
              type="date"
              value={to}
              min={from}
              onChange={(event) => setTo(event.target.value)}
              className="h-8 rounded-lg border border-white/10 bg-[#07111F] px-3 text-[11px] text-slate-200 outline-none transition [color-scheme:dark] focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/10"
            />
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={applyCustomRange}
            className={[
              "inline-flex h-8 items-center gap-2 rounded-lg border px-3 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
              mode === "custom"
                ? "border-amber-400/40 bg-amber-500 text-slate-950"
                : "border-amber-500/20 bg-amber-500/[0.06] text-amber-400 hover:bg-amber-500/10",
            ].join(" ")}
          >
            <CalendarDays className="size-3.5" />
            Aplicar rango
          </button>
        </div>
      </section>

      {error ? (
        <div
          data-dashboard-interactive="true"
          className="rounded-xl border border-red-400/20 bg-red-500/[0.08] p-2 text-xs text-red-300"
        >
          {error}
        </div>
      ) : null}

      <div
        data-dashboard-interactive="true"
        className={[
          "grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 transition-opacity duration-200",
          loading ? "opacity-65" : "opacity-100",
        ].join(" ")}
      >
        {metrics.map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-xl border border-white/8 bg-[#0B1626]/70 px-3 py-2 shadow-[0_12px_30px_rgba(0,0,0,.16)] backdrop-blur-xl"
          >
            <p className="text-[9px] uppercase tracking-[0.06em] text-slate-600">
              {label}
            </p>
            <p className="mt-0.5 text-base font-semibold text-slate-100">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div
        className={[
          "grid min-h-0 gap-2 xl:grid-cols-2 transition-opacity duration-200",
          loading ? "opacity-65" : "opacity-100",
        ].join(" ")}
      >
        <DashboardCompanyDonut
          data={analytics.companias}
          selectedId={filters.companiaId}
          onSelect={toggleCompania}
        />

        <DashboardStatusDonut
          data={analytics.estados}
          selectedId={filters.estado}
          onSelect={toggleEstado}
        />

        <DashboardResponsableChart
          data={analytics.responsables}
          selectedId={filters.responsableId}
          onSelect={toggleResponsable}
        />

        <DashboardRouteChart
          data={analytics.rutas}
          selectedId={filters.rutaId}
          onSelect={toggleRuta}
        />

        <DashboardMonthlyComparison
          data={analytics.comparativaMensual}
          selectedMonthId={selectedMonthId}
          onSelectMonth={selectMonth}
        />

        <DashboardRouteTimeChart
  data={analytics.promedioRuta}
/>
      </div>
    </div>
  );
}
