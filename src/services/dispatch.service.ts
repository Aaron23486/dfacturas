import { cancelDispatchSchema, scanFacturaSchema } from "@/schemas/dispatch.schema";
import { cancelDispatch, editDispatch, findLatestDispatchByFactura, listDispatches, softDeleteDispatch, updateDispatchDetail } from "@/repositories/dispatch.repository";
import { evaluateFactura } from "@/features/despachos/domain/dispatch.rules";
import type { CancelDispatchInput, EditDispatchInput } from "@/types/dispatch";

export async function scanFactura(factura: string) {
  const parsed = scanFacturaSchema.parse({ factura });
  return evaluateFactura(await findLatestDispatchByFactura(parsed.factura));
}

export async function registerCancelledDispatch(input: CancelDispatchInput, userId: string) {
  void userId;
  const parsed = cancelDispatchSchema.parse(input);
  return cancelDispatch(parsed);
}

export async function correctDispatch(id: string, input: EditDispatchInput) {
  return editDispatch(id, input);
}

export async function correctDispatchDetail(id: string, detalle: string | null) {
  return updateDispatchDetail(id, detalle);
}

export async function deleteDispatch(id: string, motivo?: string) {
  return softDeleteDispatch(id, motivo);
}

export { listDispatches };
