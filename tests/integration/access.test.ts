import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  TestEnvironment,
  testInvoice,
  unique,
  type Account,
  type Catalog,
} from "./support";

const env = new TestEnvironment();
let admin: Account;
let operativo: Account;
let inactive: Account;
let catalog: Catalog;

beforeAll(async () => {
  admin = await env.account("ADMIN");
  operativo = await env.account("OPERATIVO");
  inactive = await env.account("OPERATIVO", { keepDefault: true });
  catalog = await env.catalog();
});

afterAll(() => env.cleanup());

describe("cuentas y registro", () => {
  it("no permite el registro público", async () => {
    const anon = createClient(env.target.url, env.target.publishableKey, {
      auth: { persistSession: false },
    });
    const { error } = await anon.auth.signUp({
      email: `publico-${Date.now()}@example.test`,
      password: "Registro-Publico-2026",
    });

    expect(error?.message).toMatch(/signups not allowed/i);
  });

  it("una identidad nueva nace OPERATIVO e inactiva", async () => {
    const { data } = await env.service
      .from("profiles")
      .select("role, active")
      .eq("id", inactive.id)
      .single();

    expect(data).toEqual({ role: "OPERATIVO", active: false });
  });

  it("una cuenta inactiva puede autenticarse pero la base rechaza sus operaciones", async () => {
    const { error } = await inactive.client.rpc("scan_dispatch", {
      p_factura: testInvoice(),
      p_responsable_id: catalog.responsableId,
    });

    expect(error?.message).toBe("USER_INACTIVE");
    const { data } = await inactive.client.from("despachos").select("id");
    expect(data).toEqual([]);
  });

  it("el rol anónimo no lee ninguna tabla", async () => {
    const anon = createClient(env.target.url, env.target.publishableKey, {
      auth: { persistSession: false },
    });
    for (const table of [
      "profiles",
      "despachos",
      "responsables",
      "audit_logs",
    ]) {
      const { error } = await anon.from(table).select("id").limit(1);
      expect(error?.code, table).toBe("42501");
    }
  });
});

describe("permisos del OPERATIVO", () => {
  it("lee los catálogos activos", async () => {
    const { data } = await operativo.client
      .from("responsables")
      .select("id")
      .eq("id", catalog.responsableId);

    expect(data).toHaveLength(1);
  });

  it("no da de alta catálogos ni transportistas directamente", async () => {
    const company = await operativo.client
      .from("companias")
      .insert({ nombre: unique("intrusa"), activo: true });
    expect(company.error?.code).toBe("42501");

    const carrier = await operativo.client
      .from("transportistas")
      .insert({ nombre: unique("intruso"), activo: true });
    expect(carrier.error?.code).toBe("42501");
  });

  it("no puede elevar su propio rol", async () => {
    await operativo.client
      .from("profiles")
      .update({ role: "ADMIN" })
      .eq("id", operativo.id);

    const { data } = await env.service
      .from("profiles")
      .select("role")
      .eq("id", operativo.id)
      .single();
    expect(data?.role).toBe("OPERATIVO");
  });

  it("solo ve su propio perfil y nada de la auditoría", async () => {
    const { data: profiles } = await operativo.client
      .from("profiles")
      .select("id");
    expect(profiles).toEqual([{ id: operativo.id }]);

    const { data: audit } = await operativo.client
      .from("audit_logs")
      .select("id")
      .limit(1);
    expect(audit).toEqual([]);
  });

  it("las funciones de administración lo rechazan", async () => {
    const calls = [
      operativo.client.rpc("admin_dashboard_analytics", {
        p_from: "2026-01-01",
        p_to: "2026-12-31",
        p_compania_id: null,
        p_responsable_id: null,
        p_ruta_id: null,
        p_estado: null,
      }),
      operativo.client.rpc("compat_delete_compania", {
        p_compania_id: catalog.companiaId,
      }),
      operativo.client.rpc("compat_create_or_reactivate_ruta", {
        p_compania_id: catalog.companiaId,
        p_numero: 99,
      }),
    ];

    for (const { error } of await Promise.all(calls)) {
      expect(error?.message).toMatch(/ADMIN_REQUIRED|Permisos insuficientes/);
    }
  });

  it("no ejecuta el validador interno de contexto", async () => {
    const { error } = await operativo.client.rpc("validate_dispatch_context", {
      p_responsable_id: catalog.responsableId,
      p_compania_id: null,
      p_ruta_id: null,
      p_transportista_id: null,
      p_vehiculo_id: null,
    });

    expect(error?.code).toMatch(/42501|PGRST202/);
  });
});

describe("permisos del ADMIN", () => {
  it("administra catálogos y la auditoría registra quién lo hizo", async () => {
    const { data, error } = await admin.client
      .from("companias")
      .insert({ nombre: unique("admin"), activo: true })
      .select("id")
      .single();
    expect(error).toBeNull();

    const { data: audit } = await admin.client
      .from("audit_logs")
      .select("action, changed_by")
      .eq("table_name", "companias")
      .eq("record_id", data!.id);
    expect(audit).toEqual([{ action: "INSERT", changed_by: admin.id }]);

    await env.service.from("companias").delete().eq("id", data!.id);
  });
});
