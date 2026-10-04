import { createClient } from "@/lib/supabase/client";
import { AppError } from "@/lib/errors/app-error";
import type { Vehiculo } from "@/types/catalog";

export async function getVehicleByTransportista(
  transportistaId: string
): Promise<Vehiculo | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("vehiculos")
    .select("id, transportista_id, placa, activo, created_at, updated_at")
    .eq("transportista_id", transportistaId)
    .eq("activo", true)
    .maybeSingle();

  if (error) {
    throw new AppError(
      "No se pudo consultar la placa del transportista.",
      "VEHICLE_LOOKUP_FAILED",
      error
    );
  }

  return data as Vehiculo | null;
}
