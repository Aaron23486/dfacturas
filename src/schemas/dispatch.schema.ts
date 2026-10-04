import { z } from "zod";

const factura = z.string().trim().min(1).max(100);

export const createDispatchSchema = z.object({
  factura,
  responsableId: z.string().uuid(),
  companiaId: z.string().uuid(),
  rutaId: z.string().uuid(),
  transportistaId: z.string().uuid().nullable().optional(),
  vehiculoId: z.string().uuid().nullable().optional(),
  detalle: z.string().trim().max(1000).nullable().optional(),
});

export const cancelDispatchSchema = z.object({
  factura,
  responsableId: z.string().uuid(),
  detalle: z.string().trim().min(1, "Debe indicar el motivo.").max(1000),
  companiaId: z.string().uuid().nullable().optional(),
  rutaId: z.string().uuid().nullable().optional(),
  transportistaId: z.string().uuid().nullable().optional(),
  vehiculoId: z.string().uuid().nullable().optional(),
});

export const editDispatchSchema =
  createDispatchSchema.omit({
    factura: true,
  });
export const scanFacturaSchema = z.object({ factura });
