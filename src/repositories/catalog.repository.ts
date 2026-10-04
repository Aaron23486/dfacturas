import { createClient } from "@/lib/supabase/client";
import { AppError } from "@/lib/errors/app-error";
import { appErrorFromSupabase } from "@/lib/errors/safe-error";
import type { TransportistaPlacaRow } from "@/types/admin";
import type { Compania, Responsable, Ruta, Transportista, Vehiculo } from "@/types/catalog";

type ResponsableRow = { id: string; gafete: string | null; nombre: string; activo: boolean; created_at?: string; updated_at?: string };
type RutaRow = { id: string; compania_id: string; nombre: string; activo: boolean; created_at?: string; updated_at?: string };
type TransportistaRow = { id: string; nombre: string; activo: boolean; es_cliente_retira: boolean; created_at?: string; updated_at?: string };

function mapResponsable(row: ResponsableRow): Responsable {
  return { id: row.id, legacy_id: null, gafete: row.gafete ?? "", nombre_completo: row.nombre, activo: row.activo, created_at: row.created_at, updated_at: row.updated_at };
}

function mapRuta(row: RutaRow): Ruta {
  const numero = Number(row.nombre);
  return { ...row, numero: Number.isFinite(numero) ? numero : 0 };
}

function mapTransportista(row: TransportistaRow): Transportista {
  return { id: row.id, nombre: row.nombre, apellido: "-", activo: row.activo, es_cliente_retira: row.es_cliente_retira, created_at: row.created_at, updated_at: row.updated_at };
}

export async function listResponsablesActivos(): Promise<Responsable[]> {
  const { data, error } = await createClient().from("responsables").select("id,gafete,nombre,activo,created_at,updated_at").eq("activo", true).order("nombre");
  if (error) throw new AppError("No se pudieron cargar los responsables.", "RESPONSABLES_LOAD_FAILED", error);
  return ((data ?? []) as ResponsableRow[]).map(mapResponsable);
}

export async function listResponsables(): Promise<Responsable[]> {
  const { data, error } = await createClient().from("responsables").select("id,gafete,nombre,activo,created_at,updated_at").order("nombre");
  if (error) throw new AppError("No se pudieron cargar los responsables.", "RESPONSABLES_LOAD_FAILED", error);
  return ((data ?? []) as ResponsableRow[]).map(mapResponsable);
}

export async function listCompaniasActivas(): Promise<Compania[]> {
  const { data, error } = await createClient().from("companias").select("id,nombre,activo,created_at,updated_at").eq("activo", true).order("nombre");
  if (error) throw new AppError("No se pudieron cargar las compañías.", "COMPANIAS_LOAD_FAILED", error);
  return (data ?? []) as Compania[];
}

export async function listCompanias(): Promise<Compania[]> {
  const { data, error } = await createClient().from("companias").select("id,nombre,activo,created_at,updated_at").order("nombre");
  if (error) throw new AppError("No se pudieron cargar las compañías.", "COMPANIAS_LOAD_FAILED", error);
  return (data ?? []) as Compania[];
}

export async function listRutasByCompania(companiaId: string): Promise<Ruta[]> {
  const { data, error } = await createClient().from("rutas").select("id,compania_id,nombre,activo,created_at,updated_at").eq("compania_id", companiaId).eq("activo", true).order("nombre");
  if (error) throw new AppError("No se pudieron cargar las rutas.", "RUTAS_LOAD_FAILED", error);
  return ((data ?? []) as RutaRow[]).map(mapRuta).sort((a, b) => a.numero - b.numero);
}

export async function listRutas(): Promise<Ruta[]> {
  const { data, error } = await createClient().from("rutas").select("id,compania_id,nombre,activo,created_at,updated_at").order("nombre");
  if (error) throw new AppError("No se pudieron cargar las rutas.", "RUTAS_LOAD_FAILED", error);
  return ((data ?? []) as RutaRow[]).map(mapRuta).sort((a, b) => a.numero - b.numero);
}

export async function createOrReactivateRuta(companiaId: string, numero: number): Promise<Ruta> {
  const { data, error } = await createClient().rpc("compat_create_or_reactivate_ruta", { p_compania_id: companiaId, p_numero: numero });
  if (error) throw appErrorFromSupabase(error, "RUTA_CREATE_OR_REACTIVATE_FAILED", "No se pudo crear o reactivar la ruta.");
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new AppError("La operación no devolvió la ruta creada o reactivada.", "RUTA_CREATE_OR_REACTIVATE_EMPTY");
  return mapRuta(row as RutaRow);
}

export async function listTransportistasActivos(): Promise<Transportista[]> {
  const { data, error } = await createClient().from("transportistas").select("id,nombre,activo,es_cliente_retira,created_at,updated_at").eq("activo", true).order("nombre");
  if (error) throw new AppError("No se pudieron cargar los transportistas.", "TRANSPORTISTAS_LOAD_FAILED", error);
  return ((data ?? []) as TransportistaRow[]).map(mapTransportista);
}

export async function listTransportistas(): Promise<Transportista[]> {
  const { data, error } = await createClient().from("transportistas").select("id,nombre,activo,es_cliente_retira,created_at,updated_at").order("nombre");
  if (error) throw new AppError("No se pudieron cargar los transportistas.", "TRANSPORTISTAS_LOAD_FAILED", error);
  return ((data ?? []) as TransportistaRow[]).map(mapTransportista);
}

export async function listTransportistasConPlaca(): Promise<TransportistaPlacaRow[]> {
  const supabase = createClient();
  const { data: carriers, error: carrierError } = await supabase.from("transportistas").select("id,nombre,activo,es_cliente_retira,created_at").order("nombre");
  if (carrierError) throw new AppError("No se pudieron cargar los transportistas.", "TRANSPORTISTAS_LOAD_FAILED", carrierError);
  const { data: vehicles, error: vehicleError } = await supabase.from("vehiculos").select("id,transportista_id,placa,activo,created_at").order("created_at");
  if (vehicleError) throw new AppError("No se pudieron cargar las placas.", "VEHICULOS_LOAD_FAILED", vehicleError);

  const byCarrier = new Map<string, { id: string; transportista_id: string; placa: string; activo: boolean; created_at: string }>();
  for (const vehicle of vehicles ?? []) if (!byCarrier.has(vehicle.transportista_id)) byCarrier.set(vehicle.transportista_id, vehicle);

  return (carriers ?? []).map((carrier) => {
    const vehicle = byCarrier.get(carrier.id) ?? null;
    return {
      transportista_id: carrier.id,
      nombre_completo: carrier.nombre,
      transportista_activo: carrier.activo,
      transportista_created_at: carrier.created_at,
      vehiculo_id: vehicle?.id ?? null,
      placa: vehicle?.placa ?? null,
      vehiculo_activo: vehicle?.activo ?? null,
      vehiculo_created_at: vehicle?.created_at ?? null,
    };
  });
}

export async function listVehiculosByTransportista(transportistaId: string): Promise<Vehiculo[]> {
  const { data, error } = await createClient().from("vehiculos").select("id,transportista_id,placa,activo,created_at,updated_at").eq("transportista_id", transportistaId).eq("activo", true).order("created_at");
  if (error) throw new AppError("No se pudieron cargar las placas.", "VEHICULOS_LOAD_FAILED", error);
  return (data ?? []) as Vehiculo[];
}
