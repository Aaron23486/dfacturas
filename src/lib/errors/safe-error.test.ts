import { describe, expect, it } from "vitest";

import { AppError } from "./app-error";
import { appErrorFromSupabase, safeErrorMessage } from "./safe-error";

describe("safeErrorMessage", () => {
  it("devuelve el mensaje por defecto cuando no hay error", () => {
    expect(safeErrorMessage(null, "Falló")).toBe("Falló");
  });

  it("traduce los códigos de dominio que lanzan las RPC", () => {
    expect(safeErrorMessage({ message: "ALREADY_DISPATCHED" }, "x")).toBe(
      "La factura ya fue despachada.",
    );
    expect(safeErrorMessage({ message: "INVALID_INVOICE" }, "x")).toBe(
      "La factura debe contener exactamente 20 dígitos.",
    );
  });

  it("explica los límites de exportación y del último administrador", () => {
    expect(safeErrorMessage({ message: "EXPORT_RANGE_TOO_LARGE" }, "x")).toBe(
      "El periodo a exportar no puede superar un año.",
    );
    expect(safeErrorMessage({ message: "LAST_ADMIN_REQUIRED" }, "x")).toBe(
      "Debe quedar al menos un administrador activo.",
    );
  });

  it("busca el código también en details", () => {
    expect(
      safeErrorMessage({ message: "error", details: "ADMIN_REQUIRED" }, "x"),
    ).toBe("Esta operación requiere permisos de administrador.");
  });

  it("traduce los SQLSTATE conocidos sin exponer el texto de PostgreSQL", () => {
    const raw = 'duplicate key value violates unique constraint "x"';
    expect(safeErrorMessage({ message: raw, code: "23505" }, "x")).toBe(
      "Ya existe un registro con esos datos.",
    );
    expect(safeErrorMessage({ code: "23503" }, "x")).toMatch(
      /datos relacionados/,
    );
    expect(safeErrorMessage({ code: "23514" }, "x")).toMatch(/reglas/);
    expect(safeErrorMessage({ code: "22023" }, "x")).toMatch(/reglas/);
    expect(safeErrorMessage({ code: "42501" }, "x")).toBe(
      "No tiene permisos para realizar esta operación.",
    );
  });

  it("reconoce fallos de red", () => {
    expect(
      safeErrorMessage({ message: "TypeError: Failed to fetch" }, "x"),
    ).toBe("No se pudo conectar con el servicio. Inténtelo nuevamente.");
  });

  it("nunca devuelve un mensaje desconocido tal cual", () => {
    expect(
      safeErrorMessage(
        { message: 'relation "public.secret" does not exist', code: 42 },
        "No se pudo completar.",
      ),
    ).toBe("No se pudo completar.");
  });
});

describe("appErrorFromSupabase", () => {
  it("envuelve el error con código propio y conserva la causa", () => {
    const cause = { message: "DISPATCH_NOT_FOUND" };
    const error = appErrorFromSupabase(cause, "LOOKUP", "Falló");

    expect(error).toBeInstanceOf(AppError);
    expect(error.name).toBe("AppError");
    expect(error.code).toBe("LOOKUP");
    expect(error.message).toBe("No se encontró el despacho solicitado.");
    expect(error.cause).toBe(cause);
  });
});
