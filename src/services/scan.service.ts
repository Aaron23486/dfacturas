import { findLatestDispatchByFactura, scanDispatch } from "@/repositories/dispatch.repository";
import type { CreateDispatchInput } from "@/types/dispatch";
import type { ProcessScanResult, ScanDispatchContext } from "@/types/scan";

export async function inspectFacturaScan(factura: string): Promise<ScanDispatchContext | null> {
  const normalized = factura.trim();
  if (!normalized) throw new Error("La factura es obligatoria.");
  return findLatestDispatchByFactura(normalized) as Promise<ScanDispatchContext | null>;
}

export async function processFacturaScan(
  factura: string,
  createInput: CreateDispatchInput | null,
  userId: string,
  prefetchedContext?: ScanDispatchContext | null
): Promise<ProcessScanResult> {
  void userId;
  const normalized = factura.trim();
  if (!normalized) throw new Error("La factura es obligatoria.");

  const current = prefetchedContext === undefined ? await inspectFacturaScan(normalized) : prefetchedContext;

  if (current?.estado === "PEDIDO_CANCELADO") return { kind: "BLOCKED_CANCELLED", dispatch: current };
  if (current?.estado === "DESPACHADA") return { kind: "BLOCKED_ALREADY_DISPATCHED", dispatch: current };

  if (current?.estado === "ATENDIENDO") {
    await scanDispatch({ factura: normalized });
    const finalized = await inspectFacturaScan(normalized);
    if (!finalized) throw new Error("No se pudo recuperar el despacho finalizado.");
    return { kind: "FINALIZED", dispatch: finalized };
  }

  if (!createInput) throw new Error("Se requiere el contexto de despacho para crear una factura nueva.");
  await scanDispatch({ ...createInput, factura: normalized });
  const created = await inspectFacturaScan(normalized);
  if (!created) throw new Error("No se pudo recuperar el despacho creado.");
  return { kind: "CREATED_ATTENDING", dispatch: created };
}
