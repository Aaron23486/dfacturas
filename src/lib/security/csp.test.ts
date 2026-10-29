import { describe, expect, it } from "vitest";

import {
  buildContentSecurityPolicy,
  createNonce,
  supabaseOrigins,
} from "./csp";

function directives(policy: string): Map<string, string> {
  return new Map(
    policy.split("; ").map((part) => {
      const [name, ...values] = part.split(" ");
      return [name, values.join(" ")];
    }),
  );
}

describe("Content Security Policy", () => {
  it("en producción solo ejecuta scripts con el nonce de la respuesta", () => {
    const policy = directives(
      buildContentSecurityPolicy({
        nonce: "abc123",
        isDevelopment: false,
        supabaseUrl: "https://demo.supabase.co",
      }),
    );

    expect(policy.get("script-src")).toBe(
      "'self' 'nonce-abc123' 'strict-dynamic'",
    );
    expect(policy.get("script-src")).not.toContain("unsafe-inline");
    expect(policy.get("connect-src")).toBe(
      "'self' https://demo.supabase.co wss://demo.supabase.co",
    );
    expect(policy.get("frame-ancestors")).toBe("'none'");
    expect(policy.get("object-src")).toBe("'none'");
    expect(policy.has("upgrade-insecure-requests")).toBe(true);
  });

  it("con Supabase local por http no fuerza https y permite ws", () => {
    const policy = directives(
      buildContentSecurityPolicy({
        nonce: "n",
        isDevelopment: false,
        supabaseUrl: "http://127.0.0.1:55321",
      }),
    );

    expect(policy.get("connect-src")).toBe(
      "'self' http://127.0.0.1:55321 ws://127.0.0.1:55321",
    );
    expect(policy.has("upgrade-insecure-requests")).toBe(false);
  });

  it("en desarrollo añade eval para React y conexiones del servidor de desarrollo", () => {
    const policy = directives(
      buildContentSecurityPolicy({
        nonce: "n",
        isDevelopment: true,
        supabaseUrl: undefined,
      }),
    );

    expect(policy.get("script-src")).toContain("'unsafe-eval'");
    expect(policy.get("connect-src")).toContain("ws: http: https:");
    expect(policy.has("upgrade-insecure-requests")).toBe(false);
  });

  it("sin URL configurada permite los proyectos alojados de Supabase", () => {
    expect(supabaseOrigins(undefined)).toBe(
      "https://*.supabase.co wss://*.supabase.co",
    );
  });

  it("genera un nonce distinto en cada solicitud", () => {
    const nonces = new Set(Array.from({ length: 50 }, createNonce));

    expect(nonces.size).toBe(50);
    for (const nonce of nonces) expect(nonce).toMatch(/^[A-Za-z0-9+/=]{40,}$/);
  });
});
