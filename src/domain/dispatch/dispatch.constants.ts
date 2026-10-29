export const DISPATCH_STATUSES = [
  "ATENDIENDO",
  "DESPACHADA",
  "PEDIDO_CANCELADO",
] as const;

export type DispatchStatus = (typeof DISPATCH_STATUSES)[number];

export const INVOICE_LENGTH = 20;
