import { normalizeInvoice } from "@/domain/dispatch/invoice.rules";
import { resolveDispatchScan } from "@/domain/dispatch/scan.rules";
import {
  findLatestDispatchByFactura,
  scanDispatch,
} from "@/repositories/dispatch.repository";
import type { CreateDispatchInput } from "@/types/dispatch";
import type { ProcessScanResult, ScanDispatchContext } from "@/types/scan";

export async function inspectFacturaScan(
  factura: string,
): Promise<ScanDispatchContext | null> {
  const normalized = normalizeInvoice(factura);
  if (!normalized) throw new Error("La factura es obligatoria.");
  return findLatestDispatchByFactura(
    normalized,
  ) as Promise<ScanDispatchContext | null>;
}

export async function processFacturaScan(
  factura: string,
  createInput: CreateDispatchInput | null,
  prefetchedContext?: ScanDispatchContext | null,
): Promise<ProcessScanResult> {
  const normalized = normalizeInvoice(factura);
  if (!normalized) throw new Error("La factura es obligatoria.");

  const current =
    prefetchedContext === undefined
      ? await inspectFacturaScan(normalized)
      : prefetchedContext;

  const decision = resolveDispatchScan(current);

  switch (decision.kind) {
    case "CANCELLED":
      return { kind: "BLOCKED_CANCELLED", dispatch: decision.dispatch };

    case "ALREADY_DISPATCHED":
      return {
        kind: "BLOCKED_ALREADY_DISPATCHED",
        dispatch: decision.dispatch,
      };

    case "IN_PROGRESS": {
      await scanDispatch({ factura: normalized });
      const finalized = await inspectFacturaScan(normalized);
      if (!finalized)
        throw new Error("No se pudo recuperar el despacho finalizado.");
      return { kind: "FINALIZED", dispatch: finalized };
    }

    case "AVAILABLE": {
      if (!createInput)
        throw new Error(
          "Se requiere el contexto de despacho para crear una factura nueva.",
        );
      await scanDispatch({ ...createInput, factura: normalized });
      const created = await inspectFacturaScan(normalized);
      if (!created) throw new Error("No se pudo recuperar el despacho creado.");
      return { kind: "CREATED_ATTENDING", dispatch: created };
    }
  }
}
