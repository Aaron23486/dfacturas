import type { DispatchStatus } from "@/types/dispatch";

export type DashboardCrossFilters = {
  companiaId: string | null;
  responsableId: string | null;
  rutaId: string | null;
  estado: DispatchStatus | null;
};

export type DashboardDatum = {
  id: string;
  label: string;
  value: number;
};

export type DashboardRouteTimeDatum = DashboardDatum & {
  dispatches: number;
};

export type DashboardMetrics = {
  total: number;
  despachadas: number;
  canceladas: number;
  pendientes: number;
  promedioMinutos: number;
  maximoMinutos: number;
  rutaTop: string;
};

export type DashboardAnalytics = {
  metrics: DashboardMetrics;
  companias: DashboardDatum[];
  responsables: DashboardDatum[];
  rutas: DashboardDatum[];
  estados: DashboardDatum[];
  comparativaMensual: DashboardDatum[];
  promedioRuta: DashboardRouteTimeDatum[];
};

export type DashboardExportRow = {
  factura: string;
  estado: string;
  responsable: string;
  transportista: string;
  placa: string;
  compania: string;
  ruta: string;
  detalle: string;
  fecha_inicio: string;
  fecha_final: string;
  fecha_cancelacion: string;
  duracion_minutos: number | null;
};

export const EMPTY_DASHBOARD_FILTERS: DashboardCrossFilters = {
  companiaId: null,
  responsableId: null,
  rutaId: null,
  estado: null,
};
