import { createClient } from "@/lib/supabase/client";
import { AppError } from "@/lib/errors/app-error";
import { appErrorFromSupabase } from "@/lib/errors/safe-error";
import type { CancelDispatchInput, CreateDispatchInput, DispatchListItem, DispatchRecord, EditDispatchInput } from "@/types/dispatch";

type RawJoin = DispatchRecord & {
  responsables: { nombre: string } | null;
  companias: { nombre: string } | null;
  rutas: { nombre: string } | null;
  transportistas: { nombre: string } | null;
  vehiculos: { placa: string } | null;
};

const join = `*, responsables(nombre), companias(nombre), rutas(nombre), transportistas(nombre), vehiculos(placa)`;

function routeNumber(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapRow(row: RawJoin): DispatchListItem {
  return {
    ...row,
    legacy_id: row.legacy_id ?? null,
    responsable_nombre: row.responsables?.nombre ?? null,
    compania_nombre: row.companias?.nombre ?? null,
    ruta_numero: routeNumber(row.rutas?.nombre),
    transportista_nombre: row.transportistas?.nombre ?? null,
    placa: row.vehiculos?.placa ?? null,
  };
}

export async function findLatestDispatchByFactura(factura: string): Promise<DispatchListItem | null> {
  const { data, error } = await createClient().from("despachos").select(join).eq("factura", factura).is("deleted_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new AppError("No se pudo consultar la factura.", "DISPATCH_LOOKUP_FAILED", error);
  return data ? mapRow(data as unknown as RawJoin) : null;
}

export async function findDispatchById(id: string): Promise<DispatchListItem | null> {
  const { data, error } = await createClient().from("despachos").select(join).eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) throw new AppError("No se pudo consultar el despacho.", "DISPATCH_LOOKUP_FAILED", error);
  return data ? mapRow(data as unknown as RawJoin) : null;
}

export async function listDispatches(limit = 300): Promise<DispatchListItem[]> {
  const { data, error } = await createClient().from("despachos").select(join).is("deleted_at", null).order("created_at", { ascending: false }).limit(limit);
  if (error) throw new AppError("No se pudo cargar el historial.", "DISPATCH_LIST_FAILED", error);
  return ((data ?? []) as unknown as RawJoin[]).map(mapRow);
}

export async function scanDispatch(input: CreateDispatchInput | { factura: string }): Promise<DispatchRecord> {
  const complete = "responsableId" in input;
  const { data, error } = await createClient().rpc("scan_dispatch", {
    p_factura: input.factura,
    p_responsable_id: complete ? input.responsableId || null : null,
    p_compania_id: complete ? input.companiaId || null : null,
    p_ruta_id: complete ? input.rutaId || null : null,
    p_transportista_id: complete ? input.transportistaId || null : null,
    p_vehiculo_id: complete ? input.vehiculoId || null : null,
    p_detalle: complete ? input.detalle ?? null : null,
  });
  if (error) throw appErrorFromSupabase(error, "DISPATCH_SCAN_FAILED", "No se pudo procesar el escaneo.");
  return data as DispatchRecord;
}

export async function cancelDispatch(input: CancelDispatchInput): Promise<DispatchRecord> {
  const { data, error } = await createClient().rpc("cancel_dispatch", {
    p_factura: input.factura,
    p_responsable_id: input.responsableId,
    p_motivo: input.detalle,
    p_compania_id: input.companiaId || null,
    p_ruta_id: input.rutaId || null,
    p_transportista_id: input.transportistaId || null,
    p_vehiculo_id: input.vehiculoId || null,
  });
  if (error) throw appErrorFromSupabase(error, "DISPATCH_CANCEL_FAILED", "No se pudo cancelar la factura.");
  return data as DispatchRecord;
}

export async function editDispatch(id: string, input: EditDispatchInput): Promise<void> {
  const { error } = await createClient().rpc("compat_update_dispatch", {
    p_dispatch_id: id,
    p_responsable_id: input.responsableId || null,
    p_compania_id: input.companiaId || null,
    p_ruta_id: input.rutaId || null,
    p_transportista_id: input.transportistaId || null,
    p_detalle: input.detalle ?? null,
  });
  if (error) throw appErrorFromSupabase(error, "DISPATCH_EDIT_FAILED", "No se pudo actualizar el despacho.");
}

export async function updateDispatchDetail(id: string, detalle: string | null): Promise<void> {
  const { error } = await createClient().rpc("compat_update_dispatch_detail", { p_dispatch_id: id, p_detalle: detalle });
  if (error) throw appErrorFromSupabase(error, "DISPATCH_DETAIL_UPDATE_FAILED", "No se pudo actualizar el detalle del despacho.");
}

export async function softDeleteDispatch(id: string, motivo?: string): Promise<void> {
  const { error } = await createClient().rpc("compat_soft_delete_dispatch", { p_dispatch_id: id, p_reason: motivo ?? null });
  if (error) throw appErrorFromSupabase(error, "DISPATCH_DELETE_FAILED", "No se pudo eliminar el despacho.");
}
