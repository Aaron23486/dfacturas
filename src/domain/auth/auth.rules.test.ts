import { describe, expect, it } from "vitest";

import {
  canAccessAdminFeatures,
  isActiveProfile,
  isAppRole,
} from "./auth.rules";

const activeOperativo = {
  id: "00000000-0000-0000-0000-000000000001",
  full_name: "Operativo Demo",
  role: "OPERATIVO" as const,
  active: true,
};

describe("auth rules", () => {
  it("reconoce exclusivamente los roles del dominio", () => {
    expect(isAppRole("ADMIN")).toBe(true);
    expect(isAppRole("OPERATIVO")).toBe(true);
    expect(isAppRole("OWNER")).toBe(false);
  });

  it("reserva capacidades administrativas para ADMIN", () => {
    expect(canAccessAdminFeatures("ADMIN")).toBe(true);
    expect(canAccessAdminFeatures("OPERATIVO")).toBe(false);
  });

  it("respeta el estado active del profile", () => {
    expect(isActiveProfile(activeOperativo)).toBe(true);
    expect(isActiveProfile({ ...activeOperativo, active: false })).toBe(false);
  });
});