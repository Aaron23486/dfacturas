import { AppError } from "@/lib/errors/app-error";

type ErrorLike = {
  message?: unknown;
  code?: unknown;
  details?: unknown;
  hint?: unknown;
};

const MESSAGE_MAP: Array<[RegExp, string]> = [
  [/AUTH_REQUIRED/i, "Debe iniciar sesión para continuar."],
  [/USER_INACTIVE/i, "La cuenta está desactivada."],
  [/INVALID_INVOICE/i, "La factura debe contener exactamente 20 dígitos."],
  [/RESPONSABLE_REQUIRED/i, "Debe seleccionar un responsable."],
  [/RESPONSABLE_INACTIVE_OR_NOT_FOUND/i, "El responsable seleccionado no está disponible."],
  [/COMPANIA_INACTIVE_OR_NOT_FOUND/i, "La compañía seleccionada no está disponible."],
  [/RUTA_INACTIVE_OR_NOT_FOUND/i, "La ruta seleccionada no está disponible."],
  [/RUTA_COMPANIA_REQUIRED/i, "Debe seleccionar una compañía para la ruta."],
  [/RUTA_COMPANIA_MISMATCH/i, "La ruta no pertenece a la compañía seleccionada."],
  [/TRANSPORTISTA_REQUIRED/i, "Debe seleccionar un transportista."],
  [/TRANSPORTISTA_INACTIVE_OR_NOT_FOUND/i, "El transportista seleccionado no está disponible."],
  [/VEHICULO_INACTIVE_OR_NOT_FOUND/i, "La placa seleccionada no está disponible."],
  [/VEHICULO_WITHOUT_TRANSPORTISTA/i, "No puede seleccionar una placa sin transportista."],
  [/VEHICULO_REQUIRED/i, "El transportista seleccionado requiere una placa activa."],
  [/CLIENTE_RETIRA_WITH_VEHICLE/i, "CLIENTE RETIRA no debe tener una placa asociada."],
  [/CANCEL_REASON_REQUIRED/i, "Debe indicar el motivo de cancelación."],
  [/DELETE_REASON_REQUIRED/i, "Debe indicar el motivo de eliminación."],
  [/DETAIL_TOO_LONG/i, "El detalle no puede superar 1000 caracteres."],
  [/DELETE_REASON_TOO_LONG/i, "El motivo de eliminación no puede superar 1000 caracteres."],
  [/ALREADY_DISPATCHED/i, "La factura ya fue despachada."],
  [/DISPATCH_CANCELLED/i, "La factura está cancelada."],
  [/DISPATCH_ALREADY_CANCELLED/i, "La factura ya está cancelada."],
  [/DISPATCH_STATE_CHANGED/i, "El estado del despacho cambió. Actualice la vista e inténtelo nuevamente."],
  [/INVALID_DISPATCH_STATE/i, "El despacho se encuentra en un estado no válido para esta operación."],
  [/DISPATCH_NOT_FOUND/i, "No se encontró el despacho solicitado."],
  [/ADMIN_REQUIRED/i, "Esta operación requiere permisos de administrador."],
  [/ROUTE_DATA_INVALID/i, "Los datos de la ruta no son válidos."],
  [/Permisos insuficientes/i, "No tiene permisos para realizar esta operación."],
  [/Ruta no encontrada o inactiva/i, "La ruta seleccionada no está disponible."],
  [/Transportista no encontrado o inactivo/i, "El transportista seleccionado no está disponible."],
  [/Responsable no encontrado o inactivo/i, "El responsable seleccionado no está disponible."],
  [/Compania no encontrada o inactiva/i, "La compañía seleccionada no está disponible."],
  [/El transportista seleccionado no tiene una placa activa asociada/i, "El transportista seleccionado no tiene una placa activa asociada."],
  [/La ruta no pertenece a la compania seleccionada/i, "La ruta no pertenece a la compañía seleccionada."],
];

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function safeErrorMessage(error: unknown, fallback: string): string {
  if (!error) return fallback;

  const candidate = error as ErrorLike;
  const message = stringValue(candidate.message);
  const code = stringValue(candidate.code);
  const details = stringValue(candidate.details);
  const combined = `${message}\n${code}\n${details}`;

  for (const [pattern, safeMessage] of MESSAGE_MAP) {
    if (pattern.test(combined)) return safeMessage;
  }

  if (code === "23505") return "Ya existe un registro con esos datos.";
  if (code === "23503") return "La operación no puede completarse porque existen datos relacionados.";
  if (code === "23514" || code === "22023") return "Los datos no cumplen las reglas del sistema.";
  if (code === "42501") return "No tiene permisos para realizar esta operación.";
  if (/failed to fetch|network|fetch failed/i.test(message)) {
    return "No se pudo conectar con el servicio. Inténtelo nuevamente.";
  }

  return fallback;
}

export function appErrorFromSupabase(
  error: unknown,
  code: string,
  fallback: string
): AppError {
  return new AppError(safeErrorMessage(error, fallback), code, error);
}
