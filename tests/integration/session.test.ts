import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { TestEnvironment, testInvoice, type Catalog } from "./support";

const env = new TestEnvironment();
let catalog: Catalog;

beforeAll(async () => {
  catalog = await env.catalog();
});

afterAll(() => env.cleanup());

describe("sesión", () => {
  it("cerrar sesión corta de inmediato el acceso del token a la base", async () => {
    const operativo = await env.account("OPERATIVO");
    const {
      data: { session },
    } = await operativo.client.auth.getSession();
    const token = session!.access_token;

    // Un cliente que solo conoce el token, como alguien que lo hubiera copiado.
    const stolen = createClient(env.target.url, env.target.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    expect((await stolen.rpc("is_active_user")).data).toBe(true);

    await operativo.client.auth.signOut({ scope: "global" });

    expect((await stolen.rpc("is_active_user")).data).toBe(false);
    const { data: rows } = await stolen.from("despachos").select("id").limit(1);
    expect(rows).toEqual([]);
    const { error } = await stolen.rpc("scan_dispatch", {
      p_factura: testInvoice(),
      p_responsable_id: catalog.responsableId,
    });
    expect(error?.message).toBe("USER_INACTIVE");
  });

  it("cerrar sesión en un dispositivo no afecta a otra sesión que siga abierta", async () => {
    const admin = await env.account("ADMIN");
    const other = createClient(env.target.url, env.target.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await other.auth.signInWithPassword({
      email: admin.email,
      password: admin.password,
    });

    await admin.client.auth.signOut({ scope: "local" });

    expect((await other.rpc("is_admin")).data).toBe(true);
  });
});
