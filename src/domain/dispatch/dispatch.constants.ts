export const DISPATCH_STATUSES = [
  "ATENDIENDO",
  "DESPACHADA",
  "PEDIDO_CANCELADO",
] as const;

export type DispatchStatus = (typeof DISPATCH_STATUSES)[number];

export const USER_ROLES = ["ADMIN", "OPERATIVO"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const INVOICE_LENGTH = 20;

export const DISPATCH_STATUS_LABELS: Record<DispatchStatus, string> = {
  ATENDIENDO: "Atendiendo",
  DESPACHADA: "Despachada",
  PEDIDO_CANCELADO: "Pedido cancelado",
};
