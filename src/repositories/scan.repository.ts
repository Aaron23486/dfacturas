import { findLatestDispatchByFactura, scanDispatch } from "@/repositories/dispatch.repository";
import type { ScanDispatchContext } from "@/types/scan";

export async function getFacturaScanContext(factura: string): Promise<ScanDispatchContext | null> {
  return findLatestDispatchByFactura(factura) as Promise<ScanDispatchContext | null>;
}

export async function finalizeDispatchByScan(dispatchId: string): Promise<ScanDispatchContext> {
  throw new Error(`finalizeDispatchByScan(${dispatchId}) no se utiliza en el flujo DFacturas seguro; use scan_dispatch.`);
}

export { scanDispatch };
