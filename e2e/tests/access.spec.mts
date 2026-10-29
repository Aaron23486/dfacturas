import { expect, test } from "@playwright/test";

import { e2eData, signInThroughForm, storageFile } from "./support.mts";

test.describe("sin sesión", () => {
  test("las pantallas privadas llevan al ingreso", async ({ page }) => {
    for (const path of ["/app", "/admin/dashboard", "/admin/auditoria"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
    }
  });

  test("credenciales incorrectas muestran un mensaje sin detalles", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Correo").fill("nadie@e2e.dfacturas.test");
    await page.getByLabel("Contraseña").fill("Incorrecta-2026");
    await page.getByRole("button", { name: "Ingresar" }).click();

    await expect(page).toHaveURL(/\/login\?error=invalid$/);
    await expect(page.getByText("Credenciales incorrectas.")).toBeVisible();
  });
});

test.describe("OPERATIVO", () => {
  test.use({ storageState: storageFile("OPERATIVO") });

  test("ve despacho y catálogos, pero no las funciones de administración", async ({
    page,
  }) => {
    await page.goto("/app");
    const nav = page.getByRole("navigation");
    await expect(nav.getByRole("link", { name: "Despacho" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Responsables" })).toBeVisible();
    await expect(
      nav.locator('[aria-disabled="true"]', { hasText: "Dashboard" }),
    ).toBeVisible();
    await expect(
      nav.locator('[aria-disabled="true"]', { hasText: "Configuración" }),
    ).toBeVisible();
    await expect(nav.getByRole("link", { name: "Dashboard" })).toHaveCount(0);
    await expect(page.getByText("OPERATIVO", { exact: true })).toBeVisible();
  });

  test("el servidor lo saca de las pantallas de administración", async ({
    page,
  }) => {
    for (const path of [
      "/admin",
      "/admin/dashboard",
      "/admin/configuracion",
      "/admin/auditoria",
    ]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/app\?error=forbidden$/);
    }
  });
});

test.describe("ADMIN", () => {
  test.use({ storageState: storageFile("ADMIN") });

  test("entra al dashboard y a la auditoría", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();

    await page.goto("/admin/auditoria");
    await expect(
      page.getByRole("heading", { name: "Auditoría" }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Registro de auditoría" }),
    ).toBeVisible();
  });
});

test("cerrar sesión vuelve al ingreso y deja de dar acceso", async ({
  page,
}) => {
  await signInThroughForm(page, e2eData().accounts.SIGN_OUT);

  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/app");
  await expect(page).toHaveURL(/\/login$/);
});
