import { describe, expect, it } from "vitest";

import type { Dispatch } from "./dispatch.types";
import { resolveDispatchScan } from "./scan.rules";

function createDispatch(
  overrides: Partial<Dispatch> = {},
): Dispatch {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    factura: "12345678901234567890",
    estado: "ATENDIENDO",

    responsableId: "00000000-0000-0000-0000-000000000002",
    companiaId: null,
    rutaId: null,
    transportistaId: null,
    vehiculoId: null,

    detalle: null,

    fechaHoraInicio: new Date().toISOString(),
    fechaHoraFinal: null,
    fechaHoraCancelacion: null,

    creadoPor: null,

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,

    ...overrides,
  };
}

describe("resolveDispatchScan", () => {
  it("devuelve AVAILABLE cuando no existe despacho", () => {
    expect(resolveDispatchScan(null).kind).toBe("AVAILABLE");
  });

  it("devuelve AVAILABLE para un registro eliminado logicamente", () => {
    const dispatch = createDispatch({
      deletedAt: new Date().toISOString(),
    });

    expect(resolveDispatchScan(dispatch).kind).toBe("AVAILABLE");
  });

  it("interpreta ATENDIENDO como segundo escaneo", () => {
    const dispatch = createDispatch({
      estado: "ATENDIENDO",
    });

    expect(resolveDispatchScan(dispatch).kind).toBe("IN_PROGRESS");
  });

  it("bloquea una factura DESPACHADA", () => {
    const dispatch = createDispatch({
      estado: "DESPACHADA",
    });

    expect(resolveDispatchScan(dispatch).kind).toBe(
      "ALREADY_DISPATCHED",
    );
  });

  it("bloquea una factura PEDIDO_CANCELADO", () => {
    const dispatch = createDispatch({
      estado: "PEDIDO_CANCELADO",
    });

    expect(resolveDispatchScan(dispatch).kind).toBe("CANCELLED");
  });
});
