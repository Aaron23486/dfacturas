import type { DispatchStatus } from "./dispatch.constants";

// Lo mínimo que la regla necesita de un despacho guardado.
export type ScannableDispatch = {
  estado: DispatchStatus;
  deleted_at: string | null;
};

export type DispatchScanDecision<T extends ScannableDispatch> =
  | {
      kind: "AVAILABLE";
      dispatch: null;
    }
  | {
      kind: "IN_PROGRESS" | "ALREADY_DISPATCHED" | "CANCELLED";
      dispatch: T;
    };

// Primer escaneo inicia, segundo finaliza; despachadas y canceladas se bloquean.
export function resolveDispatchScan<T extends ScannableDispatch>(
  dispatch: T | null,
): DispatchScanDecision<T> {
  if (dispatch === null || dispatch.deleted_at !== null) {
    return {
      kind: "AVAILABLE",
      dispatch: null,
    };
  }

  switch (dispatch.estado) {
    case "PEDIDO_CANCELADO":
      return {
        kind: "CANCELLED",
        dispatch,
      };

    case "DESPACHADA":
      return {
        kind: "ALREADY_DISPATCHED",
        dispatch,
      };

    case "ATENDIENDO":
      return {
        kind: "IN_PROGRESS",
        dispatch,
      };
  }
}
