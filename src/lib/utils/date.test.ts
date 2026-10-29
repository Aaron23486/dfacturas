import { describe, expect, it } from "vitest";

import {
  durationMinutes,
  formatDate,
  formatDateTime,
  formatDuration,
  formatToday,
} from "./date";

describe("fechas", () => {
  it("muestra un guion cuando no hay fecha", () => {
    expect(formatDate(null)).toBe("-");
    expect(formatDateTime(undefined)).toBe("-");
  });

  it("formatea fecha y fecha con hora en es-CR", () => {
    expect(formatDate("2026-10-05T15:28:22Z")).toMatch(/^\d{2}\/\d{2}\/2026$/);
    expect(formatDateTime("2026-10-05T15:28:22Z")).toMatch(
      /^\d{2}\/\d{2}\/2026, \d{2}:\d{2}:\d{2}/,
    );
    expect(formatToday()).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });
});

describe("duración", () => {
  it("es nula si falta el inicio o el final", () => {
    expect(durationMinutes(null, "2026-10-05T10:00:00Z")).toBeNull();
    expect(formatDuration("2026-10-05T10:00:00Z", null)).toBe("-");
  });

  it("redondea a minutos y nunca es negativa", () => {
    expect(
      durationMinutes("2026-10-05T10:00:00Z", "2026-10-05T10:08:40Z"),
    ).toBe(9);
    expect(
      durationMinutes("2026-10-05T10:00:00Z", "2026-10-05T09:00:00Z"),
    ).toBe(0);
  });

  it("usa minutos por debajo de una hora y horas con minutos por encima", () => {
    expect(formatDuration("2026-10-05T10:00:00Z", "2026-10-05T10:47:00Z")).toBe(
      "47 min",
    );
    expect(formatDuration("2026-10-05T10:00:00Z", "2026-10-05T11:13:00Z")).toBe(
      "1h 13m",
    );
  });
});
