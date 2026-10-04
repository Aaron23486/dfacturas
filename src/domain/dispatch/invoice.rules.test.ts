import { describe, expect, it } from "vitest";

import {
  normalizeInvoice,
  validateInvoice,
} from "./invoice.rules";

describe("invoice rules", () => {
  it("normaliza espacios", () => {
    expect(normalizeInvoice(" 12345678901234567890 ")).toBe(
      "12345678901234567890",
    );
  });

  it("acepta una factura numerica de 20 digitos", () => {
    expect(validateInvoice("12345678901234567890")).toEqual({
      valid: true,
      value: "12345678901234567890",
    });
  });

  it("rechaza factura vacia", () => {
    expect(validateInvoice("")).toEqual({
      valid: false,
      reason: "EMPTY",
    });
  });

  it("rechaza caracteres no numericos", () => {
    expect(validateInvoice("1234567890123456789A")).toEqual({
      valid: false,
      reason: "NON_NUMERIC",
    });
  });

  it("rechaza longitud diferente de 20", () => {
    expect(validateInvoice("12345")).toEqual({
      valid: false,
      reason: "INVALID_LENGTH",
    });
  });
});
