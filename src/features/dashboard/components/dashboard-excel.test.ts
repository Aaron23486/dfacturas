import { crc32 } from "node:zlib";

import { describe, expect, it } from "vitest";

import type {
  DashboardAnalytics,
  DashboardExportRow,
} from "../domain/dashboard.types";
import { EMPTY_DASHBOARD_FILTERS } from "../domain/dashboard.types";
import { buildDashboardWorkbook, dashboardFileName } from "./dashboard-excel";

// Lee un ZIP sin compresión (método 0) y comprueba el CRC de cada archivo.
function readStoredZip(bytes: Uint8Array): Map<string, string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  const files = new Map<string, string>();
  let offset = 0;

  while (view.getUint32(offset, true) === 0x04034b50) {
    const method = view.getUint16(offset + 8, true);
    const crc = view.getUint32(offset + 14, true);
    const size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const data = bytes.subarray(dataStart, dataStart + size);

    expect(method).toBe(0);
    expect(crc32(data)).toBe(crc);
    files.set(
      decoder.decode(bytes.subarray(nameStart, nameStart + nameLength)),
      decoder.decode(data),
    );
    offset = dataStart + size;
  }

  return files;
}

const analytics: DashboardAnalytics = {
  metrics: {
    total: 2,
    despachadas: 1,
    canceladas: 1,
    pendientes: 0,
    promedioMinutos: 47,
    maximoMinutos: 47,
    rutaTop: "5",
  },
  companias: [{ id: "c1", label: "Nova Retail", value: 2 }],
  responsables: [{ id: "r1", label: "Carlos Méndez", value: 2 }],
  rutas: [{ id: "ru1", label: "5", value: 2 }],
  estados: [],
  comparativaMensual: [],
  promedioRuta: [],
};

function row(overrides: Partial<DashboardExportRow>): DashboardExportRow {
  return {
    factura: "99000000000000000360",
    estado: "DESPACHADA",
    responsable: "Carlos Méndez",
    transportista: "Daniela Rojas",
    placa: "DEM-102",
    compania: "Nova Retail",
    ruta: "5",
    detalle: "",
    fecha_inicio: "05/10/2026 15:28",
    fecha_final: "05/10/2026 16:15",
    fecha_cancelacion: "",
    duracion_minutos: 47,
    ...overrides,
  };
}

function workbook(
  rows: DashboardExportRow[],
  filters = EMPTY_DASHBOARD_FILTERS,
) {
  return readStoredZip(
    buildDashboardWorkbook({
      rows,
      from: "2026-10-01",
      to: "2026-10-31",
      filters,
      analytics,
    }),
  );
}

describe("exportación del dashboard a Excel", () => {
  it("genera un .xlsx válido con sus dos hojas", () => {
    const files = workbook([row({})]);

    expect([...files.keys()]).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/workbook.xml",
      "xl/_rels/workbook.xml.rels",
      "xl/styles.xml",
      "xl/worksheets/sheet1.xml",
      "xl/worksheets/sheet2.xml",
    ]);
    expect(files.get("xl/workbook.xml")).toContain('name="DESPACHOS"');
    expect(files.get("xl/workbook.xml")).toContain('name="RESUMEN"');
  });

  it("guarda la factura como texto para no perder dígitos", () => {
    const sheet = workbook([row({})]).get("xl/worksheets/sheet1.xml")!;

    expect(sheet).toContain(
      '<c r="A2" t="inlineStr" s="2"><is><t xml:space="preserve">99000000000000000360</t></is></c>',
    );
    expect(sheet).toContain('<c r="L2" s="3"><v>47</v></c>');
  });

  it("escapa XML y neutraliza textos que una hoja interpretaría como fórmula", () => {
    const sheet = workbook([
      row({
        detalle: '<script>alert("x")</script> & más',
        responsable: '=HYPERLINK("http://x")',
        transportista: "@SUM(A1)",
        placa: "-cmd",
        duracion_minutos: null,
      }),
    ]).get("xl/worksheets/sheet1.xml")!;

    expect(sheet).toContain(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; más",
    );
    expect(sheet).not.toContain("<script>");
    expect(sheet).toContain("&apos;=HYPERLINK(&quot;http://x&quot;)");
    expect(sheet).toContain("&apos;@SUM(A1)");
    expect(sheet).toContain("&apos;-cmd");
    expect(sheet).toContain(
      '<c r="L2" t="inlineStr"><is><t xml:space="preserve">-</t>',
    );
  });

  it("resume el periodo y los filtros con sus nombres", () => {
    const summary = workbook([row({}), row({ estado: "PEDIDO_CANCELADO" })], {
      companiaId: "c1",
      responsableId: null,
      rutaId: "desconocida",
      estado: "PEDIDO_CANCELADO",
    }).get("xl/worksheets/sheet2.xml")!;

    expect(summary).toContain("Nova Retail");
    expect(summary).toContain("Todos");
    expect(summary).toContain("desconocida");
    expect(summary).toContain("Canceladas");
  });

  it("nombra el archivo según el periodo", () => {
    expect(dashboardFileName("2026-10-05", "2026-10-05")).toBe(
      "Facturacion_V2_Despachos_2026-10-05.xlsx",
    );
    expect(dashboardFileName("2026-10-01", "2026-10-31")).toBe(
      "Facturacion_V2_Despachos_2026-10-01_a_2026-10-31.xlsx",
    );
  });
});
