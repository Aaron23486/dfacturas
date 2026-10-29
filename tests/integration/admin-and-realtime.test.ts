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

describe("último ADMIN activo", () => {
  it("no se puede desactivar ni degradar al único ADMIN activo", async () => {
    // Deja temporalmente a la cuenta de prueba como único ADMIN activo de la base local.
    const { data: others } = await env.service
      .from("profiles")
      .select("id")
      .eq("role", "ADMIN")
      .eq("active", true)
      .neq("id", admin.id);
    const otherIds = (others ?? []).map((p) => p.id as string);
    if (otherIds.length) {
      await env.service
        .from("profiles")
        .update({ active: false })
        .in("id", otherIds);
    }

    try {
      const selfDeactivate = await admin.client
        .from("profiles")
        .update({ active: false })
        .eq("id", admin.id);
      expect(selfDeactivate.error?.message).toBe("LAST_ADMIN_REQUIRED");

      const demote = await env.service
        .from("profiles")
        .update({ role: "OPERATIVO" })
        .eq("id", admin.id);
      expect(demote.error?.message).toBe("LAST_ADMIN_REQUIRED");

      const operatorChange = await env.service
        .from("profiles")
        .update({ active: false })
        .eq("id", operativo.id);
      expect(operatorChange.error).toBeNull();
      await env.service
        .from("profiles")
        .update({ active: true })
        .eq("id", operativo.id);
    } finally {
      if (otherIds.length) {
        await env.service
          .from("profiles")
          .update({ active: true })
          .in("id", otherIds);
      }
    }
  });

  it("con otro ADMIN activo, el cambio sí se permite", async () => {
    const second = await env.account("ADMIN");

    const { error } = await admin.client
      .from("profiles")
      .update({ active: false })
      .eq("id", second.id);
    expect(error).toBeNull();
  });
});

describe("historial en tiempo real", () => {
  it("un suscriptor recibe el alta y el despacho de una factura", async () => {
    const events: string[] = [];
    await operativo.client.realtime.setAuth();
    const channel = operativo.client
      .channel(`it-despachos-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "despachos" },
        (payload) => events.push(payload.eventType),
      );
    await new Promise<void>((resolve, reject) => {
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") resolve();
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          reject(new Error(status));
        }
      });
    });

    const factura = testInvoice();
    await operativo.client.rpc("scan_dispatch", {
      p_factura: factura,
      p_responsable_id: catalog.responsableId,
      p_compania_id: catalog.companiaId,
      p_ruta_id: catalog.rutaId,
      p_transportista_id: catalog.carrierId,
      p_vehiculo_id: catalog.vehicleId,
    });
    await operativo.client.rpc("scan_dispatch", { p_factura: factura });

    await expect
      .poll(() => events, { timeout: 10_000, interval: 250 })
      .toEqual(expect.arrayContaining(["INSERT", "UPDATE"]));
    await operativo.client.removeChannel(channel);
  });
});
