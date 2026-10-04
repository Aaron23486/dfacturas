import type { Dispatch } from "./dispatch.types";
import type { DispatchScanContext } from "./dispatch.types";

export function resolveDispatchScan(
  dispatch: Dispatch | null,
): DispatchScanContext {
  if (dispatch === null || dispatch.deletedAt !== null) {
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
