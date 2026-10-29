import { expect, test, type Page } from "@playwright/test";

import { e2eData, e2eInvoice, storageFile } from "./support.mts";

test.use({ storageState: storageFile("OPERATIVO") });

async function fillContext(page: Page) {
  const { catalog } = e2eData();
  await page
    .getByLabel("Responsable")
    .selectOption({ label: catalog.responsable });
  await page
    .getByLabel("Transportista", { exact: true })
    .selectOption({ label: `${catalog.transportista} ` });
  await page.getByLabel("Compañía").selectOption({ label: catalog.compania });
  await page
    .getByRole("group", { name: "Ruta" })
    .getByRole("button", { name: catalog.ruta, exact: true })
    .click();
}

async function scan(page: Page, factura: string) {
  await page.getByLabel("Factura").fill(factura);
  await page.getByRole("button", { name: "Procesar escaneo" }).click();
}

function historyRow(page: Page, factura: string) {
  return page.getByRole("row").filter({ hasText: factura });
}

test("primer escaneo inicia, segundo despacha y el tercero avisa", async ({
  page,
}) => {
  const factura = e2eInvoice();
  await page.goto("/app");
  await expect(page.getByText("Historial en tiempo real")).toBeVisible();

  await fillContext(page);
  await scan(page, factura);
  await expect(historyRow(page, factura)).toContainText("Atendiendo");
  await expect(historyRow(page, factura)).toContainText(
    e2eData().catalog.placa,
  );

  await scan(page, factura);
  await expect(historyRow(page, factura)).toContainText("Despachada");

  await scan(page, factura);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Factura ya despachada");
  await expect(dialog).toContainText(factura);
});

test("una factura que no tiene 20 dígitos no se envía", async ({ page }) => {
  await page.goto("/app");
  const input = page.getByLabel("Factura");
  await input.fill("12345");
  await page.getByRole("button", { name: "Procesar escaneo" }).click();

  // La validación del formulario lo detiene antes de llegar a la base.
  await expect
    .poll(() =>
      input.evaluate((el) => (el as HTMLInputElement).validationMessage),
    )
    .toBe("Debe contener 20 números y sin letras.");
  await expect(historyRow(page, "12345")).toHaveCount(0);
});

test("el campo de factura solo admite dígitos", async ({ page }) => {
  await page.goto("/app");
  const input = page.getByLabel("Factura");
  await input.fill("88-AB 12");

  await expect(input).toHaveValue("8812");
});

test("un pedido cancelado queda registrado y bloquea el escaneo", async ({
  page,
}) => {
  const { catalog } = e2eData();
  const factura = e2eInvoice();
  await page.goto("/app");

  await page.getByRole("button", { name: "Pedido cancelado" }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Responsable")
    .selectOption({ label: catalog.responsable });
  await dialog.getByLabel("Compañía").selectOption({ label: catalog.compania });
  await dialog
    .getByLabel("Ruta")
    .selectOption({ label: `Ruta ${catalog.ruta}` });
  await dialog
    .getByLabel("Detalle / motivo")
    .fill("El cliente anuló el pedido.");
  await dialog.getByLabel("Factura — escanear al final").fill(factura);
  await dialog
    .getByRole("button", { name: "Registrar pedido cancelado" })
    .click();

  await expect(historyRow(page, factura)).toContainText("Pedido cancelado");

  await fillContext(page);
  await scan(page, factura);
  await expect(page.getByRole("dialog")).toContainText("PEDIDO CANCELADO");
});
