// Datos ficticios para la demostración local. Ningún nombre corresponde a personas o
// empresas reales.

export const DEMO_ACCOUNTS = [
  {
    email: "admin@demo.dfacturas.test",
    fullName: "Administración Demo",
    role: "ADMIN",
  },
  {
    email: "operativo@demo.dfacturas.test",
    fullName: "Operación Demo",
    role: "OPERATIVO",
  },
] as const;

export const DEMO_COMPANIES = [
  { nombre: "Nova Retail", rutas: 12 },
  { nombre: "Pacífico Distribución", rutas: 8 },
  { nombre: "Central Supply", rutas: 6 },
] as const;

export const DEMO_RESPONSABLES = [
  { gafete: "G-101", nombre: "Carlos Méndez" },
  { gafete: "G-102", nombre: "Esteban Araya" },
  { gafete: "G-103", nombre: "Natalia Campos" },
  { gafete: "G-104", nombre: "María Rojas" },
  { gafete: "G-105", nombre: "Andrés Vega" },
  { gafete: "G-106", nombre: "Laura Solís" },
  { gafete: "G-107", nombre: "Daniel Mora" },
  { gafete: "G-108", nombre: "Sofía Valverde" },
] as const;

export const CLIENTE_RETIRA = "CLIENTE RETIRA";

export const DEMO_CARRIERS = [
  { nombre: "Mauricio Vega", placa: "DEM-101" },
  { nombre: "Daniela Rojas", placa: "DEM-102" },
  { nombre: "Esteban Solano", placa: "DEM-103" },
  { nombre: "Andrea Jiménez", placa: "DEM-104" },
  { nombre: "Luis Calderón", placa: "DEM-105" },
  { nombre: "Rafael Brenes", placa: "DEM-106" },
  { nombre: "Jorge Quesada", placa: "DEM-107" },
  { nombre: "Melissa Vargas", placa: "DEM-108" },
] as const;

export const DEMO_CANCEL_REASONS = [
  "El cliente anuló el pedido antes de la salida.",
  "Factura duplicada; se reemplazó por una nueva.",
  "Mercadería sin existencia en bodega.",
] as const;

// Historial: despachos de los últimos meses repartidos por día, más algunos en curso hoy.
export const DEMO_HISTORY_DAYS = 150;
export const DEMO_HISTORY_DISPATCHES = 240;
export const DEMO_IN_PROGRESS = 3;

// Facturas de 20 dígitos con prefijo 99, fáciles de reconocer como ficticias.
export function demoInvoice(sequence: number): string {
  return `99${String(sequence).padStart(18, "0")}`;
}

// Generador determinista (mulberry32): el mismo historial en cada instalación limpia.
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
