import type {
  DashboardAnalytics,
  DashboardCrossFilters,
  DashboardExportRow,
} from "../domain/dashboard.types";

const STATUS_LABELS: Record<string, string> = {
  DESPACHADA: "Despachadas",
  ATENDIENDO: "Pendientes",
  PEDIDO_CANCELADO: "Canceladas",
};

function xmlEscape(value: unknown) {
  return String(value ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function excelSafeText(value: unknown) {
  const text =
    value === null || value === undefined || value === ""
      ? "-"
      : String(value);

  return /^[=+@]/.test(text) || /^-[^0-9]/.test(text)
    ? `'${text}`
    : text;
}

function colName(index: number) {
  let result = "";
  let value = index + 1;

  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }

  return result;
}

function inlineStringCell(ref: string, value: unknown, style = 0) {
  return `<c r="${ref}" t="inlineStr"${style ? ` s="${style}"` : ""}><is><t xml:space="preserve">${xmlEscape(
    excelSafeText(value)
  )}</t></is></c>`;
}

function numericCell(ref: string, value: number, style = 0) {
  return `<c r="${ref}"${style ? ` s="${style}"` : ""}><v>${Number.isFinite(value) ? value : 0}</v></c>`;
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc ^= byte;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value: number) {
  return [value & 0xff, (value >>> 8) & 0xff];
}

function u32(value: number) {
  return [
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  ];
}

function concatBytes(chunks: Uint8Array[]) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

function makeZip(files: Array<{ name: string; content: string }>) {
  const encoder = new TextEncoder();
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const data = encoder.encode(file.content);
    const crc = crc32(data);

    const localHeader = new Uint8Array([
      ...u32(0x04034b50),
      ...u16(20),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(crc),
      ...u32(data.length),
      ...u32(data.length),
      ...u16(nameBytes.length),
      ...u16(0),
    ]);

    localChunks.push(localHeader, nameBytes, data);

    const centralHeader = new Uint8Array([
      ...u32(0x02014b50),
      ...u16(20),
      ...u16(20),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(crc),
      ...u32(data.length),
      ...u32(data.length),
      ...u16(nameBytes.length),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(0),
      ...u32(offset),
    ]);

    centralChunks.push(centralHeader, nameBytes);

    offset += localHeader.length + nameBytes.length + data.length;
  }

  const local = concatBytes(localChunks);
  const central = concatBytes(centralChunks);

  const end = new Uint8Array([
    ...u32(0x06054b50),
    ...u16(0),
    ...u16(0),
    ...u16(files.length),
    ...u16(files.length),
    ...u32(central.length),
    ...u32(local.length),
    ...u16(0),
  ]);

  return concatBytes([local, central, end]);
}

function findLabel(
  items: Array<{ id: string; label: string }>,
  id: string | null,
  fallback: string
) {
  if (!id) {
    return fallback;
  }

  return items.find((item) => item.id === id)?.label ?? id;
}

function buildDispatchSheet(rows: DashboardExportRow[]) {
  const headers = [
    "Factura",
    "Estado",
    "Responsable",
    "Transportista",
    "Placa",
    "Compañía",
    "Ruta",
    "Detalle",
    "Fecha inicio",
    "Fecha final",
    "Fecha cancelación",
    "Duración (min)",
  ];

  const widths = [24, 18, 24, 26, 14, 18, 12, 42, 22, 22, 22, 16];

  const cols = widths
    .map(
      (width, index) =>
        `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`
    )
    .join("");

  const headerCells = headers
    .map((header, index) => inlineStringCell(`${colName(index)}1`, header, 1))
    .join("");

  const dataRows = rows
    .map((row, rowIndex) => {
      const excelRow = rowIndex + 2;

      const values: Array<string | number | null> = [
        String(row.factura ?? ""),
        STATUS_LABELS[row.estado] ?? row.estado,
        row.responsable,
        row.transportista,
        row.placa,
        row.compania,
        row.ruta,
        row.detalle,
        row.fecha_inicio,
        row.fecha_final,
        row.fecha_cancelacion,
        row.duracion_minutos,
      ];

      const cells = values
        .map((value, colIndex) => {
          const ref = `${colName(colIndex)}${excelRow}`;

          // Factura is ALWAYS an inline string. This prevents scientific notation
          // and preserves every digit exactly.
          if (colIndex === 0) {
            return inlineStringCell(ref, String(value ?? ""), 2);
          }

          if (colIndex === 11 && typeof value === "number") {
            return numericCell(ref, value, 3);
          }

          return inlineStringCell(ref, value ?? "-", colIndex === 7 ? 4 : 0);
        })
        .join("");

      return `<row r="${excelRow}">${cells}</row>`;
    })
    .join("");

  const lastRow = Math.max(1, rows.length + 1);

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews>
    <sheetView workbookViewId="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <cols>${cols}</cols>
  <sheetData>
    <row r="1" ht="24" customHeight="1">${headerCells}</row>
    ${dataRows}
  </sheetData>
  <autoFilter ref="A1:L${lastRow}"/>
  <pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;
}

function buildSummarySheet(input: {
  from: string;
  to: string;
  filters: DashboardCrossFilters;
  analytics: DashboardAnalytics;
  rowCount: number;
}) {
  const company = findLabel(
    input.analytics.companias,
    input.filters.companiaId,
    "Todas"
  );

  const responsible = findLabel(
    input.analytics.responsables,
    input.filters.responsableId,
    "Todos"
  );

  const route = findLabel(input.analytics.rutas, input.filters.rutaId, "Todas");

  const status = input.filters.estado
    ? STATUS_LABELS[input.filters.estado] ?? input.filters.estado
    : "Todos";

  const generated = new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date());

  const pairs: Array<[string, string | number]> = [
    ["Período", `${input.from} a ${input.to}`],
    ["Compañía", company],
    ["Responsable", responsible],
    ["Ruta", route],
    ["Estado", status],
    ["Total", input.analytics.metrics.total],
    ["Despachadas", input.analytics.metrics.despachadas],
    ["Canceladas", input.analytics.metrics.canceladas],
    ["Pendientes", input.analytics.metrics.pendientes],
    ["Promedio", `${Math.round(input.analytics.metrics.promedioMinutos)} min`],
    ["Máximo", `${Math.round(input.analytics.metrics.maximoMinutos)} min`],
    ["Ruta top", input.analytics.metrics.rutaTop || "-"],
    ["Registros exportados", input.rowCount],
    ["Generado", generated],
  ];

  const rows = pairs
    .map(([label, value], index) => {
      const r = index + 3;
      return `<row r="${r}">${inlineStringCell(`A${r}`, label, 5)}${inlineStringCell(
        `B${r}`,
        value
      )}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>
    <col min="1" max="1" width="28" customWidth="1"/>
    <col min="2" max="2" width="38" customWidth="1"/>
  </cols>
  <sheetData>
    <row r="1" ht="30" customHeight="1">${inlineStringCell(
      "A1",
      "FACTURACIÓN V2 — REPORTE DE DESPACHOS",
      6
    )}</row>
    ${rows}
  </sheetData>
  <mergeCells count="1"><mergeCell ref="A1:B1"/></mergeCells>
  <pageSetup orientation="portrait" fitToWidth="1" fitToHeight="1"/>
</worksheet>`;
}

export function downloadDashboardXlsx(input: {
  rows: DashboardExportRow[];
  from: string;
  to: string;
  filters: DashboardCrossFilters;
  analytics: DashboardAnalytics;
}) {
  const files = [
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="DESPACHOS" sheetId="1" r:id="rId1"/>
    <sheet name="RESUMEN" sheetId="2" r:id="rId2"/>
  </sheets>
</workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    {
      name: "xl/styles.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="3">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font>
    <font><b/><color rgb="FFFFFFFF"/><sz val="16"/><name val="Calibri"/></font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0E7490"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0F172A"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left/><right/><top/><bottom style="thin"><color rgb="FF164E63"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="7">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
    <xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"><alignment wrapText="1" vertical="top"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"><alignment vertical="center"/><protection locked="1"/></xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment vertical="center"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`,
    },
    {
      name: "xl/worksheets/sheet1.xml",
      content: buildDispatchSheet(input.rows),
    },
    {
      name: "xl/worksheets/sheet2.xml",
      content: buildSummarySheet({
        from: input.from,
        to: input.to,
        filters: input.filters,
        analytics: input.analytics,
        rowCount: input.rows.length,
      }),
    },
  ];

  const bytes = makeZip(files);
  const blob = new Blob([bytes.buffer as ArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download =
    input.from === input.to
      ? `Facturacion_V2_Despachos_${input.from}.xlsx`
      : `Facturacion_V2_Despachos_${input.from}_a_${input.to}.xlsx`;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
