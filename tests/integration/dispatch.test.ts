import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  TestEnvironment,
  testInvoice,
  type Account,
  type Catalog,
} from "./support";

const env = new TestEnvironment();
let admin: Account;
let operativo: Account;
let catalog: Catalog;

beforeAll(async () => {
  admin = await env.account("ADMIN");
  operativo = await env.account("OPERATIVO");
  catalog = await env.catalog();
});

afterAll(() => env.cleanup());

function firstScan(client = operativo.client, factura = testInvoice()) {
  return client.rpc("scan_dispatch", {
    p_factura: factura,
    p_responsable_id: catalog.responsableId,
    p_compania_id: catalog.companiaId,
    p_ruta_id: catalog.rutaId,
    p_transportista_id: catalog.carrierId,
    p_vehiculo_id: catalog.vehicleId,
  });
}

function scan(factura: string, client = operativo.client) {
  return client.rpc("scan_dispatch", { p_factura: factura });
}

describe("ciclo de una factura", () => {
  it("primer escaneo inicia, segundo despacha y el tercero se bloquea", async () => {
    const factura = testInvoice();

    const first = await firstScan(operativo.client, factura);
    expect(first.data).toMatchObject({
      factura,
      estado: "ATENDIENDO",
      fecha_hora_final: null,
      creado_por: operativo.id,
    });

    const second = await scan(factura);
    expect(second.data.estado).toBe("DESPACHADA");
    expect(
      new Date(second.data.fecha_hora_final).getTime(),
    ).toBeGreaterThanOrEqual(new Date(second.data.fecha_hora_inicio).getTime());

    const third = await scan(factura);
    expect(third.error?.message).toBe("ALREADY_DISPATCHED");
  });

  it("acepta la factura con espacios, pero no otros formatos", async () => {
    const factura = testInvoice();
    const spaced = `${factura.slice(0, 10)} ${factura.slice(10)} `;
    expect((await firstScan(operativo.client, spaced)).data?.factura).toBe(
      factura,
    );

    for (const invalid of ["123", "7700000000000000000A", ""]) {
      const { error } = await scan(invalid);
      expect(error?.message, invalid).toBe("INVALID_INVOICE");
    }
  });

  it("cancelar exige motivo y una factura cancelada ya no se escanea", async () => {
    const factura = testInvoice();
    await firstScan(operativo.client, factura);

    const withoutReason = await operativo.client.rpc("cancel_dispatch", {
      p_factura: factura,
      p_responsable_id: catalog.responsableId,
      p_motivo: "   ",
    });
    expect(withoutReason.error?.message).toBe("CANCEL_REASON_REQUIRED");

    const cancelled = await operativo.client.rpc("cancel_dispatch", {
      p_factura: factura,
      p_responsable_id: catalog.responsableId,
      p_motivo: "El cliente anuló el pedido.",
    });
    expect(cancelled.data).toMatchObject({
      estado: "PEDIDO_CANCELADO",
      detalle: "El cliente anuló el pedido.",
    });

    expect((await scan(factura)).error?.message).toBe("DISPATCH_CANCELLED");
    const again = await operativo.client.rpc("cancel_dispatch", {
      p_factura: factura,
      p_responsable_id: catalog.responsableId,
      p_motivo: "Otra vez",
    });
    expect(again.error?.message).toBe("DISPATCH_ALREADY_CANCELLED");
  });
});

describe("contexto del despacho", () => {
  it("la ruta debe pertenecer a la compañía", async () => {
    const { error } = await operativo.client.rpc("scan_dispatch", {
      p_factura: testInvoice(),
      p_responsable_id: catalog.responsableId,
      p_compania_id: catalog.companiaId,
      p_ruta_id: catalog.otherRutaId,
      p_transportista_id: catalog.carrierId,
      p_vehiculo_id: catalog.vehicleId,
    });

    expect(error?.message).toBe("RUTA_COMPANIA_MISMATCH");
  });

  it("la placa debe ser del transportista elegido", async () => {
    const { error } = await operativo.client.rpc("scan_dispatch", {
      p_factura: testInvoice(),
      p_responsable_id: catalog.responsableId,
      p_compania_id: catalog.companiaId,
      p_ruta_id: catalog.rutaId,
      p_transportista_id: catalog.carrierId,
      p_vehiculo_id: catalog.otherVehicleId,
    });

    expect(error?.message).toBe("VEHICULO_INACTIVE_OR_NOT_FOUND");
  });

  it("un transportista normal necesita placa; CLIENTE RETIRA no admite ninguna", async () => {
    const base = {
      p_responsable_id: catalog.responsableId,
      p_compania_id: catalog.companiaId,
      p_ruta_id: catalog.rutaId,
    };

    const noPlate = await operativo.client.rpc("scan_dispatch", {
      ...base,
      p_factura: testInvoice(),
      p_transportista_id: catalog.carrierId,
    });
    expect(noPlate.error?.message).toBe("VEHICULO_REQUIRED");

    const pickupWithPlate = await operativo.client.rpc("scan_dispatch", {
      ...base,
      p_factura: testInvoice(),
      p_transportista_id: catalog.clienteRetiraId,
      p_vehiculo_id: catalog.vehicleId,
    });
    expect(pickupWithPlate.error?.message).toBe("CLIENTE_RETIRA_WITH_VEHICLE");

    const pickup = await operativo.client.rpc("scan_dispatch", {
      ...base,
      p_factura: testInvoice(),
      p_transportista_id: catalog.clienteRetiraId,
    });
    expect(pickup.data).toMatchObject({
      estado: "ATENDIENDO",
      vehiculo_id: null,
    });
  });

  it("los despachos no se escriben directamente en la tabla", async () => {
    const { error } = await admin.client.from("despachos").insert({
      factura: testInvoice(),
      estado: "DESPACHADA",
      responsable_id: catalog.responsableId,
    });

    expect(error?.code).toBe("42501");
  });
});

describe("concurrencia", () => {
  it("cinco escaneos simultáneos de una factura nueva dejan un solo despacho coherente", async () => {
    const factura = testInvoice();
    const results = await Promise.all(
      Array.from({ length: 5 }, () => firstScan(operativo.client, factura)),
    );

    const states = results
      .map((r) => r.data?.estado ?? r.error?.message)
      .sort();
    expect(states).toEqual([
      "ALREADY_DISPATCHED",
      "ALREADY_DISPATCHED",
      "ALREADY_DISPATCHED",
      "ATENDIENDO",
      "DESPACHADA",
    ]);

    const { data } = await env.service
      .from("despachos")
      .select("estado")
      .eq("factura", factura);
    expect(data).toEqual([{ estado: "DESPACHADA" }]);
  });
});

describe("borrado lógico", () => {
  it("el OPERATIVO borra solo en curso y deja de verlo; el ADMIN lo sigue viendo", async () => {
    const dispatched = testInvoice();
    await firstScan(operativo.client, dispatched);
    const done = await scan(dispatched);
    const blocked = await operativo.client.rpc("compat_soft_delete_dispatch", {
      p_dispatch_id: done.data.id,
      p_reason: "No corresponde",
    });
    expect(blocked.error?.message).toBe("ADMIN_REQUIRED");

    const open = await firstScan();
    const removed = await operativo.client.rpc("compat_soft_delete_dispatch", {
      p_dispatch_id: open.data.id,
    });
    expect(removed.data).toMatchObject({ deleted_by: operativo.id });

    const operatorView = await operativo.client
      .from("despachos")
      .select("id")
      .eq("id", open.data.id);
    expect(operatorView.data).toEqual([]);

    const adminView = await admin.client
      .from("despachos")
      .select("id, deleted_at")
      .eq("id", open.data.id);
    expect(adminView.data).toHaveLength(1);
    expect(adminView.data![0].deleted_at).not.toBeNull();
  });

  it("una factura borrada puede volver a escanearse desde cero", async () => {
    const factura = testInvoice();
    const first = await firstScan(operativo.client, factura);
    await operativo.client.rpc("compat_soft_delete_dispatch", {
      p_dispatch_id: first.data.id,
    });

    const again = await firstScan(operativo.client, factura);
    expect(again.data).toMatchObject({ estado: "ATENDIENDO" });
    expect(again.data.id).not.toBe(first.data.id);
  });
});
