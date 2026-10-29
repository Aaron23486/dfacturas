import type { DispatchListItem } from "@/types/dispatch";

// Filtros y orden del historial de despachos.

export type FilterKey =
  "factura" | "compania" | "ruta" | "estado" | "responsable" | "transportista";

export type Filters = Record<FilterKey, string>;

export type SortKey = "iniciada" | "terminada" | "duracion";

export type SortDirection = "asc" | "desc";

export interface SortState {
  key: SortKey;
  direction: SortDirection;
}

export const EMPTY_FILTERS: Filters = {
  factura: "",
  compania: "",
  ruta: "",
  estado: "",
  responsable: "",
  transportista: "",
};

function timestamp(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const time = new Date(value).getTime();

  return Number.isNaN(time) ? null : time;
}

function startOf(row: DispatchListItem): number | null {
  return timestamp(row.fecha_hora_inicio);
}

// Para cancelados cuenta la cancelación; para despachados, el final.
function endOf(row: DispatchListItem): number | null {
  return timestamp(
    row.estado === "PEDIDO_CANCELADO"
      ? row.fecha_hora_cancelacion
      : row.fecha_hora_final,
  );
}

function durationOf(row: DispatchListItem): number | null {
  const start = startOf(row);
  const end = endOf(row);

  return start === null || end === null ? null : Math.max(0, end - start);
}

function sortValue(row: DispatchListItem, key: SortKey): number | null {
  switch (key) {
    case "iniciada":
      return startOf(row);
    case "terminada":
      return endOf(row);
    case "duracion":
      return durationOf(row);
  }
}

// Filtra por texto (sin distinguir mayúsculas) y ordena; sin orden se conserva el original.
// Los valores vacíos quedan siempre al final.
export function filterAndSortDispatches(
  rows: DispatchListItem[],
  filters: Filters,
  sort: SortState | null,
): DispatchListItem[] {
  const has = (value: string | number | null | undefined, query: string) =>
    String(value ?? "")
      .toLocaleLowerCase("es")
      .includes(query.trim().toLocaleLowerCase("es"));

  const filtered = rows.filter(
    (row) =>
      has(row.factura, filters.factura) &&
      has(row.compania_nombre, filters.compania) &&
      has(row.ruta_numero, filters.ruta) &&
      has(row.estado, filters.estado) &&
      has(row.responsable_nombre, filters.responsable) &&
      has(row.transportista_nombre, filters.transportista),
  );

  if (!sort) {
    return filtered;
  }

  return [...filtered].sort((a, b) => {
    const aValue = sortValue(a, sort.key);
    const bValue = sortValue(b, sort.key);

    if (aValue === null && bValue === null) return 0;
    if (aValue === null) return 1;
    if (bValue === null) return -1;

    const result = aValue - bValue;

    return sort.direction === "asc" ? result : -result;
  });
}
