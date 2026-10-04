import type { DispatchStatus } from "./dispatch.constants";

export type DispatchId = string;

export type Dispatch = {
  id: DispatchId;
  factura: string;
  estado: DispatchStatus;

  responsableId: string | null;
  companiaId: string | null;
  rutaId: string | null;
  transportistaId: string | null;
  vehiculoId: string | null;

  detalle: string | null;

  fechaHoraInicio: string | null;
  fechaHoraFinal: string | null;
  fechaHoraCancelacion: string | null;

  creadoPor: string | null;

  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type DispatchScanContext =
  | {
      kind: "AVAILABLE";
      dispatch: null;
    }
  | {
      kind: "IN_PROGRESS";
      dispatch: Dispatch;
    }
  | {
      kind: "ALREADY_DISPATCHED";
      dispatch: Dispatch;
    }
  | {
      kind: "CANCELLED";
      dispatch: Dispatch;
    };
