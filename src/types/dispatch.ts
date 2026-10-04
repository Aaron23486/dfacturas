export type DispatchStatus =
  | "ATENDIENDO"
  | "DESPACHADA"
  | "PEDIDO_CANCELADO";

export interface DispatchRecord {
  id: string;
  legacy_id: string | null;
  factura: string;
  estado: DispatchStatus;
  responsable_id: string | null;
  responsable_nombre?: string | null;
  compania_id: string | null;
  ruta_id: string | null;
  transportista_id: string | null;
  vehiculo_id: string | null;
  detalle: string | null;
  fecha_hora_inicio: string | null;
  fecha_hora_final: string | null;
  fecha_hora_cancelacion: string | null;
  creado_por: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DispatchListItem
  extends DispatchRecord {
  compania_nombre: string | null;
  ruta_numero: number | null;
  transportista_nombre: string | null;
  placa: string | null;
}

export interface CreateDispatchInput {
  factura: string;
  responsableId: string;
  companiaId: string;
  rutaId: string;
  transportistaId?: string | null;
  vehiculoId?: string | null;
  detalle?: string | null;
}

export interface CancelDispatchInput {
  factura: string;
  responsableId: string;
  detalle: string;
  companiaId?: string | null;
  rutaId?: string | null;
  transportistaId?: string | null;
  vehiculoId?: string | null;
}

export interface EditDispatchInput {
  responsableId: string;
  companiaId: string;
  rutaId: string;
  transportistaId: string;
  detalle?: string | null;
}

export type ScanDecision =
  | { kind: "AVAILABLE" }
  | {
      kind: "IN_PROGRESS";
      dispatch: DispatchRecord;
    }
  | {
      kind: "ALREADY_DISPATCHED";
      dispatch: DispatchRecord;
    }
  | {
      kind: "CANCELLED";
      dispatch: DispatchRecord;
    };

export interface DailyKpis {
  despachadas: number;
  atendiendo: number;
  finalizadas: number;
  promedioMinutos: number;
  top: Array<{
    nombre: string;
    total: number;
  }>;
}

export interface DashboardStats {
  total: number;
  despachadas: number;
  canceladas: number;
  promedioMinutos: number;
  minimoMinutos: number;
  maximoMinutos: number;
  rutaTop: string;
  companias: Array<{
    label: string;
    value: number;
  }>;
  responsables: Array<{
    label: string;
    value: number;
  }>;
  transportistas: Array<{
    label: string;
    value: number;
  }>;
  rutas: Array<{
    label: string;
    value: number;
  }>;
}
