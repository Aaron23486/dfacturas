import { z } from "zod";

export const createTransportistaSchema = z.object({
  nombre: z.string().trim().min(2).max(80),
  apellido: z.string().trim().min(2).max(80),
  placa: z.string().trim().min(2).max(20).transform((v) => v.toUpperCase()),
});
