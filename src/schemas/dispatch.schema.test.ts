import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

import { cancelDispatchSchema } from "./dispatch.schema";

const RESPONSABLE = "6f0f3f0e-8b7a-4a52-9a43-2d2f7c1e5b11";

describe("cancelDispatchSchema", () => {
  it("acepta una cancelación con motivo y recorta espacios", () => {
    const parsed = cancelDispatchSchema.parse({
      factura: " 99000000000000000001 ",
      responsableId: RESPONSABLE,
      detalle: "  Cliente anuló el pedido  ",
    });

    expect(parsed.factura).toBe("99000000000000000001");
    expect(parsed.detalle).toBe("Cliente anuló el pedido");
  });

  it("exige el motivo de cancelación", () => {
    const result = cancelDispatchSchema.safeParse({
      factura: "99000000000000000001",
      responsableId: RESPONSABLE,
      detalle: "   ",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Debe indicar el motivo.");
  });

  it("rechaza identificadores que no son UUID y motivos de más de 1000 caracteres", () => {
    expect(
      cancelDispatchSchema.safeParse({
        factura: "99000000000000000001",
        responsableId: "1",
        detalle: "Motivo",
      }).success,
    ).toBe(false);
    expect(
      cancelDispatchSchema.safeParse({
        factura: "99000000000000000001",
        responsableId: RESPONSABLE,
        detalle: "x".repeat(1001),
      }).success,
    ).toBe(false);
  });
});

describe("cn", () => {
  it("combina clases y deja la última utilidad de Tailwind en conflicto", () => {
    expect(cn("px-2 text-sm", false && "hidden", "px-4")).toBe("text-sm px-4");
  });
});
