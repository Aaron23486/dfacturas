import { durationMinutes } from "@/lib/utils/date";
import type { Transportista } from "@/types/catalog";
import type { DailyKpis, DispatchListItem } from "@/types/dispatch";

// Selección de la pantalla de despacho que se recuerda entre visitas.
export interface PersistedContext {
  responsableId: string;
  companiaId: string;
  rutaId: string;
  transportistaId: string;
}

export const DISPATCH_CONTEXT_STORAGE_KEY = "facturacion-v2:dispatch-context";

export const EMPTY_CONTEXT: PersistedContext = {
  responsableId: "",
  companiaId: "",
  rutaId: "",
  transportistaId: "",
};

export function parsePersistedContext(raw: string | null): PersistedContext {
  try {
    return { ...EMPTY_CONTEXT, ...(JSON.parse(raw ?? "") as object) };
  } catch {
    return EMPTY_CONTEXT;
  }
}

export function isClienteRetira(
  transportista: Pick<Transportista, "nombre"> | null | undefined,
): boolean {
  return transportista?.nombre.trim().toUpperCase() === "CLIENTE RETIRA";
}

// Datos que faltan para registrar un escaneo nuevo, con los nombres que ve el usuario.
export function missingDispatchFields(
  values: PersistedContext & { factura: string },
  includeFactura = true,
): string[] {
  const missing: string[] = [];

  if (includeFactura && !values.factura.trim()) missing.push("Factura");
  if (!values.responsableId) missing.push("Responsable");
  if (!values.transportistaId) missing.push("Transportista");
  if (!values.companiaId) missing.push("Compañía");
  if (!values.rutaId) missing.push("Ruta");

  return missing;
}

// Indicadores del día que muestra el panel flotante de métricas.
export function calculateKpis(
  rows: DispatchListItem[],
  now: Date = new Date(),
): DailyKpis {
  const isToday = (value: string | null) => {
    if (!value) {
      return false;
    }

    const date = new Date(value);

    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  };

  const todayRows = rows.filter((row) => isToday(row.created_at));

  const dispatched = todayRows.filter((row) => row.estado === "DESPACHADA");

  const durations = dispatched
    .map((row) => durationMinutes(row.fecha_hora_inicio, row.fecha_hora_final))
    .filter((value): value is number => value !== null);

  const counts = new Map<string, number>();

  // El ranking operativo representa exclusivamente despachos finalizados.
  // PEDIDO_CANCELADO y ATENDIENDO no deben sumar al Top 1/2/3.
  for (const row of dispatched) {
    if (!row.responsable_nombre) {
      continue;
    }

    counts.set(
      row.responsable_nombre,
      (counts.get(row.responsable_nombre) ?? 0) + 1,
    );
  }

  return {
    despachadas: dispatched.length,
    atendiendo: todayRows.filter((row) => row.estado === "ATENDIENDO").length,
    finalizadas: dispatched.length,
    promedioMinutos: durations.length
      ? Math.round(
          durations.reduce((sum, value) => sum + value, 0) / durations.length,
        )
      : 0,
    top: [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([nombre, total]) => ({ nombre, total })),
  };
}
