import { describe, expect, it } from "vitest";

import { isValidInvoice } from "../../src/domain/dispatch/invoice.rules.ts";
import { demoInvoice, seededRandom } from "./demo-data.mts";
import { generateDemoPassword, newPasswordSchema } from "./passwords.mts";

describe("datos de demostración", () => {
  it("genera facturas válidas de 20 dígitos con prefijo 99", () => {
    expect(demoInvoice(360)).toBe("99000000000000000360");
    expect(isValidInvoice(demoInvoice(1))).toBe(true);
  });

  it("repite la misma secuencia con la misma semilla", () => {
    const a = seededRandom(2026);
    const b = seededRandom(2026);
    const values = Array.from({ length: 5 }, () => a());

    expect(values).toEqual(Array.from({ length: 5 }, () => b()));
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
  });
});

describe("contraseñas", () => {
  it("exige 12 caracteres con letras y números", () => {
    expect(newPasswordSchema.safeParse("corta1").success).toBe(false);
    expect(newPasswordSchema.safeParse("solamenteletras").success).toBe(false);
    expect(newPasswordSchema.safeParse("123456789012").success).toBe(false);
    expect(newPasswordSchema.safeParse("x".repeat(73) + "1").success).toBe(
      false,
    );
    expect(newPasswordSchema.safeParse("Prueba-Segura-2026").success).toBe(
      true,
    );
  });

  it("genera contraseñas de demostración que cumplen la regla y no se repiten", () => {
    const passwords = Array.from({ length: 20 }, generateDemoPassword);

    for (const password of passwords) {
      expect(password).toMatch(/^([A-Za-z2-9]{4}-){3}[A-Za-z2-9]{4}$/);
      expect(newPasswordSchema.safeParse(password).success).toBe(true);
    }
    expect(new Set(passwords).size).toBe(passwords.length);
  });
});
