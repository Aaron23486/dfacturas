import { INVOICE_LENGTH } from "./dispatch.constants";

export type InvoiceValidationResult =
  | {
      valid: true;
      value: string;
    }
  | {
      valid: false;
      reason: "EMPTY" | "NON_NUMERIC" | "INVALID_LENGTH";
    };

export function normalizeInvoice(value: string): string {
  return value.trim().replace(/\s+/g, "");
}

export function validateInvoice(value: string): InvoiceValidationResult {
  const normalized = normalizeInvoice(value);

  if (normalized.length === 0) {
    return {
      valid: false,
      reason: "EMPTY",
    };
  }

  if (!/^\d+$/.test(normalized)) {
    return {
      valid: false,
      reason: "NON_NUMERIC",
    };
  }

  if (normalized.length !== INVOICE_LENGTH) {
    return {
      valid: false,
      reason: "INVALID_LENGTH",
    };
  }

  return {
    valid: true,
    value: normalized,
  };
}
