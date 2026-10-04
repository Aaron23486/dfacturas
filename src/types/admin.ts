export interface TransportistaPlacaRow {
  transportista_id: string;
  nombre_completo: string;
  transportista_activo: boolean;
  transportista_created_at: string;
  vehiculo_id: string | null;
  placa: string | null;
  vehiculo_activo: boolean | null;
  vehiculo_created_at: string | null;
}
