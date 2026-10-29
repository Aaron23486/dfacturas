import { describe, expect, it } from "vitest";

import {
  isValidInvoice,
  normalizeInvoice,
  sanitizeInvoiceInput,
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

  it("deja solo digitos al escribir o escanear", () => {
    expect(sanitizeInvoiceInput("12-34 ab56")).toBe("123456");
  });

  it("corta la entrada en 20 digitos", () => {
    expect(sanitizeInvoiceInput("1234567890123456789012345")).toBe(
      "12345678901234567890",
    );
  });

  it("isValidInvoice coincide con validateInvoice", () => {
    expect(isValidInvoice(" 12345678901234567890 ")).toBe(true);
    expect(isValidInvoice("1234567890123456789")).toBe(false);
  });
});
