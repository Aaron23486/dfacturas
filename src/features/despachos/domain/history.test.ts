import { describe, expect, it } from "vitest";

import { EMPTY_FILTERS, filterAndSortDispatches } from "./history";
import { dispatchRow } from "./__fixtures__/dispatch-row";

const rows = [
  dispatchRow({
    id: "a",
    factura: "99000000000000000001",
    compania_nombre: "Nova Retail",
    responsable_nombre: "María Rojas",
    fecha_hora_inicio: "2026-10-29T10:00:00Z",
    fecha_hora_final: "2026-10-29T11:00:00Z",
  }),
  dispatchRow({
    id: "b",
    factura: "99000000000000000002",
    compania_nombre: "Central Supply",
    responsable_nombre: "Andrés Vega",
    fecha_hora_inicio: "2026-10-29T09:00:00Z",
    fecha_hora_final: "2026-10-29T09:10:00Z",
  }),
  dispatchRow({
    id: "c",
    factura: "99000000000000000003",
    estado: "PEDIDO_CANCELADO",
    compania_nombre: "Nova Retail",
    fecha_hora_inicio: null,
    fecha_hora_final: null,
    fecha_hora_cancelacion: "2026-10-29T12:00:00Z",
  }),
  dispatchRow({
    id: "d",
    factura: "99000000000000000004",
    estado: "ATENDIENDO",
    fecha_hora_inicio: "2026-10-29T13:00:00Z",
    fecha_hora_final: null,
  }),
];

const ids = (list: { id: string }[]) => list.map((row) => row.id);

describe("historial: filtros", () => {
  it("sin filtros ni orden conserva el orden original", () => {
    expect(ids(filterAndSortDispatches(rows, EMPTY_FILTERS, null))).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });

  it("filtra por texto sin distinguir mayúsculas y combina columnas", () => {
    const result = filterAndSortDispatches(
      rows,
      { ...EMPTY_FILTERS, compania: " nova ", estado: "despach" },
      null,
    );

    expect(ids(result)).toEqual(["a"]);
  });

  it("filtra por número de ruta y por parte de la factura", () => {
    expect(
      ids(
        filterAndSortDispatches(
          rows,
          { ...EMPTY_FILTERS, ruta: "5", factura: "0003" },
          null,
        ),
      ),
    ).toEqual(["c"]);
  });
});

describe("historial: orden", () => {
  it("ordena por inicio y deja al final los que no tienen fecha", () => {
    const asc = filterAndSortDispatches(rows, EMPTY_FILTERS, {
      key: "iniciada",
      direction: "asc",
    });
    expect(ids(asc)).toEqual(["b", "a", "d", "c"]);

    const desc = filterAndSortDispatches(rows, EMPTY_FILTERS, {
      key: "iniciada",
      direction: "desc",
    });
    expect(ids(desc)).toEqual(["d", "a", "b", "c"]);
  });

  it("el final de un cancelado es su cancelación", () => {
    const result = filterAndSortDispatches(rows, EMPTY_FILTERS, {
      key: "terminada",
      direction: "desc",
    });

    expect(ids(result)).toEqual(["c", "a", "b", "d"]);
  });

  it("ordena por duración; sin inicio o sin final no hay duración", () => {
    const result = filterAndSortDispatches(rows, EMPTY_FILTERS, {
      key: "duracion",
      direction: "desc",
    });

    expect(ids(result)).toEqual(["a", "b", "c", "d"]);
  });

  it("ignora fechas que no se pueden leer", () => {
    const broken = [
      dispatchRow({ id: "x", fecha_hora_inicio: "no es fecha" }),
      dispatchRow({ id: "y", fecha_hora_inicio: "2026-10-29T08:00:00Z" }),
    ];

    expect(
      ids(
        filterAndSortDispatches(broken, EMPTY_FILTERS, {
          key: "iniciada",
          direction: "asc",
        }),
      ),
    ).toEqual(["y", "x"]);
  });

  it("dos filas sin fecha conservan su orden relativo", () => {
    const empty = [
      dispatchRow({ id: "p", fecha_hora_inicio: null }),
      dispatchRow({ id: "q", fecha_hora_inicio: null }),
    ];

    expect(
      ids(
        filterAndSortDispatches(empty, EMPTY_FILTERS, {
          key: "iniciada",
          direction: "asc",
        }),
      ),
    ).toEqual(["p", "q"]);
  });
});
