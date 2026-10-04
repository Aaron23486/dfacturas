import type { DispatchRecord } from "@/types/dispatch";

export interface ScanDispatchContext extends DispatchRecord {
  responsable_nombre: string | null;
  compania_nombre: string | null;
  ruta_numero: number | null;
  transportista_nombre: string | null;
  placa: string | null;
}

export type ProcessScanResult =
  | {
      kind: "CREATED_ATTENDING";
      dispatch: DispatchRecord;
    }
  | {
      kind: "FINALIZED";
      dispatch: ScanDispatchContext;
    }
  | {
      kind: "BLOCKED_CANCELLED";
      dispatch: ScanDispatchContext;
    }
  | {
      kind: "BLOCKED_ALREADY_DISPATCHED";
      dispatch: ScanDispatchContext;
    };
