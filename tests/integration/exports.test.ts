import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { TestEnvironment, type Account } from "./support";

const env = new TestEnvironment();
let admin: Account;
let operativo: Account;

beforeAll(async () => {
  admin = await env.account("ADMIN");
  operativo = await env.account("OPERATIVO");
});

afterAll(() => env.cleanup());

function exportRows(account: Account, from: string, to: string) {
  return account.client.rpc("admin_dashboard_export_rows", {
    p_from: from,
    p_to: to,
    p_compania_id: null,
    p_responsable_id: null,
    p_ruta_id: null,
    p_estado: "DESPACHADA",
  });
}

describe("exportación del dashboard", () => {
  it("rechaza periodos de más de un año", async () => {
    const { error } = await exportRows(admin, "2025-01-01", "2026-12-31");

    expect(error?.message).toBe("EXPORT_RANGE_TOO_LARGE");
  });

  it("registra quién exportó, el periodo, los filtros y cuántas filas", async () => {
    const { data, error } = await exportRows(admin, "2026-01-01", "2026-12-31");
    expect(error).toBeNull();

    const { data: log } = await admin.client
      .from("dashboard_exports")
      .select("exported_by, range_from, range_to, filters, row_count")
      .eq("exported_by", admin.id);
    expect(log).toEqual([
      {
        exported_by: admin.id,
        range_from: "2026-01-01",
        range_to: "2026-12-31",
        filters: { estado: "DESPACHADA" },
        row_count: (data as unknown[]).length,
      },
    ]);
  });

  it("el registro no se puede modificar ni borrar, ni con la clave de servicio", async () => {
    const update = await env.service
      .from("dashboard_exports")
      .update({ row_count: 0 })
      .eq("exported_by", admin.id);
    expect(update.error?.message).toBe("DASHBOARD_EXPORTS_IMMUTABLE");

    const remove = await env.service
      .from("dashboard_exports")
      .delete()
      .eq("exported_by", admin.id);
    expect(remove.error?.message).toBe("DASHBOARD_EXPORTS_IMMUTABLE");
  });

  it("el OPERATIVO no exporta, no ve el registro ni llama a la consulta interna", async () => {
    expect(
      (await exportRows(operativo, "2026-01-01", "2026-01-31")).error?.message,
    ).toBe("Permisos insuficientes");

    const { data } = await operativo.client
      .from("dashboard_exports")
      .select("id");
    expect(data).toEqual([]);

    const internal = await operativo.client.rpc("dashboard_export_rows_query", {
      p_from: "2026-01-01",
      p_to: "2026-01-31",
    });
    expect(internal.error?.code).toMatch(/42501|PGRST202/);
  });
});
