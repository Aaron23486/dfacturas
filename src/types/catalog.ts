export interface Responsable {
  id: string;
  legacy_id: string | null;
  gafete: string;
  nombre_completo: string;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Compania {
  id: string;
  nombre: string;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Ruta {
  id: string;
  compania_id: string;
  numero: number;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Transportista {
  id: string;
  nombre: string;
  apellido: string;
  activo: boolean;
  es_cliente_retira?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Vehiculo {
  id: string;
  transportista_id: string;
  placa: string;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}
