import { z } from "zod";

const factura = z.string().trim().min(1).max(100);

export const cancelDispatchSchema = z.object({
  factura,
  responsableId: z.string().uuid(),
  detalle: z.string().trim().min(1, "Debe indicar el motivo.").max(1000),
  companiaId: z.string().uuid().nullable().optional(),
  rutaId: z.string().uuid().nullable().optional(),
  transportistaId: z.string().uuid().nullable().optional(),
  vehiculoId: z.string().uuid().nullable().optional(),
});
