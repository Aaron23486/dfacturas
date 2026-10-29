import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";

import { TestEnvironment } from "./support";

const env = new TestEnvironment();

afterAll(() => env.cleanup());

function signIn(email: string, password: string) {
  return createClient(env.target.url, env.target.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).auth.signInWithPassword({ email, password });
}

describe("contraseñas", () => {
  it("una sesión válida no puede cambiar su propia contraseña", async () => {
    const operativo = await env.account("OPERATIVO");

    const { error } = await operativo.client.auth.updateUser({
      password: "Cambio-No-Permitido-2026",
    });
    expect(error).not.toBeNull();

    expect(
      (await signIn(operativo.email, operativo.password)).error,
    ).toBeNull();
    expect(
      (await signIn(operativo.email, "Cambio-No-Permitido-2026")).error,
    ).not.toBeNull();
  });

  it("la sesión puede seguir actualizando otros datos de su cuenta", async () => {
    const operativo = await env.account("OPERATIVO");

    const { error } = await operativo.client.auth.updateUser({
      data: { full_name: "Nombre actualizado" },
    });
    expect(error).toBeNull();
  });

  it("la API de administración de Auth tampoco cambia contraseñas", async () => {
    const operativo = await env.account("OPERATIVO");

    const { error } = await env.service.auth.admin.updateUserById(
      operativo.id,
      { password: "Cambio-Por-Api-2026" },
    );
    expect(error).not.toBeNull();
    expect(
      (await signIn(operativo.email, operativo.password)).error,
    ).toBeNull();
  });

  it("la función de terminal cambia la contraseña y cierra las sesiones abiertas", async () => {
    const admin = await env.account("ADMIN");
    expect((await admin.client.rpc("is_active_user")).data).toBe(true);

    const { error } = await env.service.rpc("terminal_set_password", {
      p_user_id: admin.id,
      p_password: "Nueva-Clave-Terminal-2026",
    });
    expect(error).toBeNull();

    expect((await admin.client.rpc("is_active_user")).data).toBe(false);
    expect((await signIn(admin.email, admin.password)).error).not.toBeNull();
    expect(
      (await signIn(admin.email, "Nueva-Clave-Terminal-2026")).error,
    ).toBeNull();
  });

  it("la función de terminal exige una contraseña robusta y solo la usa el servicio", async () => {
    const operativo = await env.account("OPERATIVO");

    const weak = await env.service.rpc("terminal_set_password", {
      p_user_id: operativo.id,
      p_password: "corta1",
    });
    expect(weak.error?.message).toBe("PASSWORD_INVALID");

    const fromSession = await operativo.client.rpc("terminal_set_password", {
      p_user_id: operativo.id,
      p_password: "Desde-La-Sesion-2026",
    });
    expect(fromSession.error?.code).toMatch(/42501|PGRST202/);
  });
});
