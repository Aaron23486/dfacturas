import { describe, expect, it } from "vitest";

import type { DispatchStatus } from "./dispatch.constants";
import { resolveDispatchScan } from "./scan.rules";

function createDispatch(
  estado: DispatchStatus,
  deleted_at: string | null = null,
) {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    factura: "12345678901234567890",
    estado,
    deleted_at,
  };
}

describe("resolveDispatchScan", () => {
  it("devuelve AVAILABLE cuando no existe despacho", () => {
    expect(resolveDispatchScan(null).kind).toBe("AVAILABLE");
  });

  it("devuelve AVAILABLE para un registro eliminado logicamente", () => {
    const dispatch = createDispatch("ATENDIENDO", new Date().toISOString());

    expect(resolveDispatchScan(dispatch)).toEqual({
      kind: "AVAILABLE",
      dispatch: null,
    });
  });

  it("interpreta ATENDIENDO como segundo escaneo", () => {
    const dispatch = createDispatch("ATENDIENDO");

    expect(resolveDispatchScan(dispatch)).toEqual({
      kind: "IN_PROGRESS",
      dispatch,
    });
  });

  it("bloquea una factura DESPACHADA", () => {
    const dispatch = createDispatch("DESPACHADA");

    expect(resolveDispatchScan(dispatch).kind).toBe("ALREADY_DISPATCHED");
  });

  it("bloquea una factura PEDIDO_CANCELADO", () => {
    const dispatch = createDispatch("PEDIDO_CANCELADO");

    expect(resolveDispatchScan(dispatch).kind).toBe("CANCELLED");
  });
});
