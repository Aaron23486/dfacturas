import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export const AUTH_DIR = resolve(import.meta.dirname, "../.auth");
export const dataFile = resolve(AUTH_DIR, "data.json");

export type AccountKey = "ADMIN" | "OPERATIVO" | "SIGN_OUT";
export type Credentials = { email: string; password: string; id: string };

export type E2EData = {
  run: string;
  accounts: Record<AccountKey, Credentials>;
  catalog: {
    responsable: string;
    compania: string;
    ruta: string;
    transportista: string;
    placa: string;
  };
};

export function storageFile(role: "ADMIN" | "OPERATIVO"): string {
  return resolve(AUTH_DIR, `${role.toLowerCase()}.json`);
}

export function e2eData(): E2EData {
  return JSON.parse(readFileSync(dataFile, "utf8")) as E2EData;
}

// Facturas de prueba con prefijo 88 (demostración 99, integración 77).
let sequence = 0;
export function e2eInvoice(): string {
  sequence += 1;
  return `88${String(Date.now()).padStart(14, "0")}${String(sequence).padStart(4, "0")}`;
}

export async function signInThroughForm(
  page: Page,
  { email, password }: { email: string; password: string },
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/app$/);
}

// Revisión automática de accesibilidad (WCAG 2.1 A y AA) de lo que está en pantalla.
export async function expectNoAccessibilityViolations(
  page: Page,
  label: string,
): Promise<void> {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const summary = violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.nodes
        .slice(0, 3)
        .map((n) => n.target.join(" "))
        .join(" | ")}`,
  );
  expect(summary, `${label}: violaciones de accesibilidad`).toEqual([]);
}
