import type { DispatchListItem } from "@/types/dispatch";

// Despacho de ejemplo para pruebas; cada prueba cambia solo lo que necesita.
export function dispatchRow(
  overrides: Partial<DispatchListItem> = {},
): DispatchListItem {
  return {
    id: "d-1",
    legacy_id: null,
    factura: "99000000000000000001",
    estado: "DESPACHADA",
    responsable_id: "r-1",
    responsable_nombre: "Carlos Méndez",
    compania_id: "c-1",
    ruta_id: "ru-1",
    transportista_id: "t-1",
    vehiculo_id: "v-1",
    detalle: null,
    fecha_hora_inicio: "2026-10-29T14:00:00Z",
    fecha_hora_final: "2026-10-29T14:30:00Z",
    fecha_hora_cancelacion: null,
    creado_por: "u-1",
    created_at: "2026-10-29T14:00:00Z",
    updated_at: "2026-10-29T14:30:00Z",
    deleted_at: null,
    compania_nombre: "Nova Retail",
    ruta_numero: 5,
    transportista_nombre: "Daniela Rojas",
    placa: "DEM-102",
    ...overrides,
  };
}
