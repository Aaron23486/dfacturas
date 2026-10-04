import type { DispatchStatus } from "@/types/dispatch";

export const DISPATCH_STATUS_LABELS: Record<DispatchStatus, string> = {
  ATENDIENDO: "Atendiendo",
  DESPACHADA: "Despachada",
  PEDIDO_CANCELADO: "Pedido cancelado",
};

export const DISPATCH_STATUS_CLASSNAME: Record<DispatchStatus, string> = {
  ATENDIENDO: "border-yellow-300 bg-yellow-50 text-yellow-900",
  DESPACHADA: "border-green-300 bg-green-50 text-green-900",
  PEDIDO_CANCELADO: "border-red-300 bg-red-50 text-red-900",
};
