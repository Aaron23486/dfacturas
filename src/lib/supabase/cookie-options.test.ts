import { afterEach, describe, expect, it, vi } from "vitest";

import {
  browserCookies,
  SESSION_MAX_AGE_SECONDS,
  sessionCookieOptions,
  withSessionLifetime,
} from "./cookie-options";

afterEach(() => vi.unstubAllGlobals());

describe("cookie de sesión", () => {
  it("dura lo mismo que la sesión de Auth en lugar de 400 días", () => {
    expect(
      withSessionLifetime({ path: "/", maxAge: 400 * 24 * 60 * 60 }),
    ).toEqual({ path: "/", maxAge: 12 * 60 * 60 });
    expect(SESSION_MAX_AGE_SECONDS).toBe(43_200);
  });

  it("respeta maxAge 0 para borrar la cookie al cerrar sesión", () => {
    expect(withSessionLifetime({ path: "/", maxAge: 0 })).toEqual({
      path: "/",
      maxAge: 0,
    });
  });

  it("es Lax y no se marca Secure fuera de producción", () => {
    expect(sessionCookieOptions).toMatchObject({
      path: "/",
      sameSite: "lax",
      secure: false,
    });
  });

  it("en el navegador lee document.cookie y escribe con la vida acotada", () => {
    const written: string[] = [];
    vi.stubGlobal("document", {
      get cookie() {
        return "sb-127-auth-token=abc; otra=1";
      },
      set cookie(value: string) {
        written.push(value);
      },
    });

    expect(browserCookies.getAll()).toEqual([
      { name: "sb-127-auth-token", value: "abc" },
      { name: "otra", value: "1" },
    ]);

    browserCookies.setAll([
      {
        name: "sb-127-auth-token",
        value: "xyz",
        options: { path: "/", sameSite: "lax", maxAge: 34_560_000 },
      },
    ]);
    expect(written).toHaveLength(1);
    expect(written[0]).toMatch(/^sb-127-auth-token=xyz;/);
    expect(written[0]).toContain("Max-Age=43200");
    expect(written[0]).toContain("SameSite=Lax");
  });
});
