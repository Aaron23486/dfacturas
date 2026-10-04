import { createClient } from "@/lib/supabase/client";
import { AppError } from "@/lib/errors/app-error";
import { appErrorFromSupabase } from "@/lib/errors/safe-error";

export async function createResponsable(input: { gafete: string; nombre_completo: string }) {
  const { error } = await createClient().from("responsables").insert({
    gafete: input.gafete.trim(),
    nombre: input.nombre_completo.trim(),
    activo: true,
  });
  if (error) throw new AppError("No se pudo crear el responsable.", "RESPONSABLE_CREATE_FAILED", error);
}

export async function updateResponsable(id: string, input: { gafete: string; nombre_completo: string; activo: boolean }) {
  const { error } = await createClient().from("responsables").update({
    gafete: input.gafete.trim(),
    nombre: input.nombre_completo.trim(),
    activo: input.activo,
  }).eq("id", id);
  if (error) throw new AppError("No se pudo actualizar el responsable.", "RESPONSABLE_UPDATE_FAILED", error);
}

export async function deleteResponsable(id: string) {
  const { error } = await createClient().rpc("compat_delete_responsable", { p_responsable_id: id });
  if (error) throw appErrorFromSupabase(error, "RESPONSABLE_DELETE_FAILED", "No se pudo eliminar el responsable.");
}

export async function createTransportistaWithPlate(input: { nombreCompleto: string; placa: string }): Promise<string> {
  const { data, error } = await createClient().rpc("compat_create_transportista_with_plate", {
    p_nombre_completo: input.nombreCompleto.trim(),
    p_placa: input.placa.trim().toUpperCase(),
  });
  if (error) throw appErrorFromSupabase(error, "TRANSPORTISTA_CREATE_FAILED", "No se pudo crear el transportista.");
  return String(data ?? "");
}

export async function updateTransportistaPlaca(input: { transportistaId: string; vehiculoId: string | null; nombreCompleto: string; placa: string; activo: boolean }) {
  const { error } = await createClient().rpc("compat_update_transportista_placa", {
    p_transportista_id: input.transportistaId,
    p_vehiculo_id: input.vehiculoId,
    p_nombre_completo: input.nombreCompleto.trim(),
    p_placa: input.placa.trim().toUpperCase(),
    p_activo: input.activo,
  });
  if (error) throw appErrorFromSupabase(error, "TRANSPORTISTA_UPDATE_FAILED", "No se pudo actualizar el transportista.");
}

export async function deleteTransportistaPlaca(input: { transportistaId: string; vehiculoId: string | null }) {
  const { error } = await createClient().rpc("compat_delete_transportista_placa", {
    p_transportista_id: input.transportistaId,
    p_vehiculo_id: input.vehiculoId,
  });
  if (error) throw appErrorFromSupabase(error, "TRANSPORTISTA_DELETE_FAILED", "No se pudo eliminar el transportista.");
}

export async function createCompania(nombre: string) {
  const { error } = await createClient().from("companias").insert({ nombre: nombre.trim(), activo: true });
  if (error) throw new AppError("No se pudo crear la compañía.", "COMPANIA_CREATE_FAILED", error);
}

export async function createRuta(companiaId: string, numero: number) {
  const { error } = await createClient().rpc("compat_create_or_reactivate_ruta", { p_compania_id: companiaId, p_numero: numero });
  if (error) throw new AppError("No se pudo crear la ruta.", "RUTA_CREATE_FAILED", error);
}

export async function deleteCompaniaConfig(id: string): Promise<string> {
  const { data, error } = await createClient().rpc("compat_delete_compania", { p_compania_id: id });
  if (error) throw appErrorFromSupabase(error, "COMPANIA_DELETE_FAILED", "No se pudo eliminar la compañía.");
  return String(data ?? "DELETED");
}

export async function deleteRutaConfig(id: string): Promise<string> {
  const { data, error } = await createClient().rpc("compat_delete_ruta", { p_ruta_id: id });
  if (error) throw appErrorFromSupabase(error, "RUTA_DELETE_FAILED", "No se pudo eliminar la ruta.");
  return String(data ?? "DELETED");
}
