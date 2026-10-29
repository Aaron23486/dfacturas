import { cancelDispatchSchema } from "@/schemas/dispatch.schema";
import {
  cancelDispatch,
  editDispatch,
  listDispatches,
  softDeleteDispatch,
  updateDispatchDetail,
} from "@/repositories/dispatch.repository";
import type { CancelDispatchInput, EditDispatchInput } from "@/types/dispatch";

export async function registerCancelledDispatch(
  input: CancelDispatchInput,
  userId: string,
) {
  void userId;
  const parsed = cancelDispatchSchema.parse(input);
  return cancelDispatch(parsed);
}

export async function correctDispatch(id: string, input: EditDispatchInput) {
  return editDispatch(id, input);
}

export async function correctDispatchDetail(
  id: string,
  detalle: string | null,
) {
  return updateDispatchDetail(id, detalle);
}

export async function deleteDispatch(id: string, motivo?: string) {
  return softDeleteDispatch(id, motivo);
}

export { listDispatches };
