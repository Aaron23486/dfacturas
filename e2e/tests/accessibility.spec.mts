import { expect, test } from "@playwright/test";

import { expectNoAccessibilityViolations, storageFile } from "./support.mts";

test.describe("accesibilidad sin sesión", () => {
  test("pantalla de ingreso", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Ingresar" })).toBeVisible();
    await expectNoAccessibilityViolations(page, "/login");
  });

  test("ingreso con error", async ({ page }) => {
    await page.goto("/login?error=invalid");
    await expect(page.getByText("Credenciales incorrectas.")).toBeVisible();
    await expectNoAccessibilityViolations(page, "/login?error=invalid");
  });
});

test.describe("accesibilidad como ADMIN", () => {
  test.use({ storageState: storageFile("ADMIN") });

  const pages = [
    { path: "/app", ready: "Historial en tiempo real" },
    { path: "/admin/dashboard", ready: "Por compañía" },
    { path: "/admin/responsables", ready: "Responsables" },
    { path: "/admin/transportistas", ready: "Transportistas" },
    { path: "/admin/configuracion", ready: "Compañías" },
    { path: "/admin/auditoria", ready: "Auditoría" },
  ];

  for (const { path, ready } of pages) {
    test(path, async ({ page }) => {
      await page.goto(path);
      await expect(
        page.getByText(ready, { exact: true }).first(),
      ).toBeVisible();
      await expectNoAccessibilityViolations(page, path);
    });
  }

  test("diálogo de pedido cancelado", async ({ page }) => {
    await page.goto("/app");
    await page.getByRole("button", { name: "Pedido cancelado" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expectNoAccessibilityViolations(page, "diálogo de cancelación");
  });
});

test.describe("accesibilidad como OPERATIVO", () => {
  test.use({ storageState: storageFile("OPERATIVO") });

  test("/app", async ({ page }) => {
    await page.goto("/app");
    await expect(page.getByText("Historial en tiempo real")).toBeVisible();
    await expectNoAccessibilityViolations(page, "/app (OPERATIVO)");
  });
});
