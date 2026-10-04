import type { DispatchRecord, ScanDecision } from "@/types/dispatch";

export function evaluateFactura(dispatch: DispatchRecord | null): ScanDecision {
  if (!dispatch) return { kind: "AVAILABLE" };
  if (dispatch.estado === "PEDIDO_CANCELADO") return { kind: "CANCELLED", dispatch };
  if (dispatch.estado === "DESPACHADA") return { kind: "ALREADY_DISPATCHED", dispatch };
  return { kind: "IN_PROGRESS", dispatch };
}
