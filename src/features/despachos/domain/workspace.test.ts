import { describe, expect, it } from "vitest";

import {
  calculateKpis,
  EMPTY_CONTEXT,
  isClienteRetira,
  missingDispatchFields,
  parsePersistedContext,
} from "./workspace";
import { dispatchRow } from "./__fixtures__/dispatch-row";

describe("contexto guardado de la pantalla de despacho", () => {
  it("recupera la selección guardada y completa lo que falte", () => {
    expect(
      parsePersistedContext(
        JSON.stringify({ responsableId: "r-1", companiaId: "c-1" }),
      ),
    ).toEqual({ ...EMPTY_CONTEXT, responsableId: "r-1", companiaId: "c-1" });
  });

  it("empieza vacío si no hay nada guardado o el valor está dañado", () => {
    expect(parsePersistedContext(null)).toEqual(EMPTY_CONTEXT);
    expect(parsePersistedContext("{no es json")).toEqual(EMPTY_CONTEXT);
  });
});

describe("CLIENTE RETIRA", () => {
  it("se reconoce sin importar mayúsculas ni espacios", () => {
    expect(isClienteRetira({ nombre: " cliente retira " })).toBe(true);
    expect(isClienteRetira({ nombre: "Daniela Rojas" })).toBe(false);
    expect(isClienteRetira(null)).toBe(false);
  });
});

describe("campos obligatorios del escaneo", () => {
  const complete = {
    factura: "99000000000000000001",
    responsableId: "r-1",
    transportistaId: "t-1",
    companiaId: "c-1",
    rutaId: "ru-1",
  };

  it("no pide nada cuando el contexto está completo", () => {
    expect(missingDispatchFields(complete)).toEqual([]);
  });

  it("lista lo que falta con los nombres de la pantalla", () => {
    expect(missingDispatchFields({ ...EMPTY_CONTEXT, factura: " " })).toEqual([
      "Factura",
      "Responsable",
      "Transportista",
      "Compañía",
      "Ruta",
    ]);
  });

  it("puede omitir la factura cuando ya se validó", () => {
    expect(
      missingDispatchFields({ ...complete, factura: "", rutaId: "" }, false),
    ).toEqual(["Ruta"]);
  });
});

describe("indicadores del día", () => {
  const now = new Date("2026-10-29T18:00:00Z");

  it("cuenta solo lo de hoy y promedia la duración de lo despachado", () => {
    const kpis = calculateKpis(
      [
        dispatchRow(),
        dispatchRow({
          id: "d-2",
          fecha_hora_final: "2026-10-29T15:00:00Z",
        }),
        dispatchRow({
          id: "d-3",
          estado: "ATENDIENDO",
          fecha_hora_final: null,
        }),
        dispatchRow({ id: "d-4", created_at: "2026-10-01T14:00:00Z" }),
      ],
      now,
    );

    expect(kpis).toMatchObject({
      despachadas: 2,
      finalizadas: 2,
      atendiendo: 1,
      promedioMinutos: 45,
    });
  });

  it("el ranking solo suma despachos finalizados y muestra tres como máximo", () => {
    const kpis = calculateKpis(
      [
        dispatchRow({ responsable_nombre: "Ana" }),
        dispatchRow({ responsable_nombre: "Ana" }),
        dispatchRow({ responsable_nombre: "Luis" }),
        dispatchRow({ responsable_nombre: "Marta" }),
        dispatchRow({ responsable_nombre: "Pedro" }),
        dispatchRow({ responsable_nombre: null }),
        dispatchRow({
          responsable_nombre: "Cancelado",
          estado: "PEDIDO_CANCELADO",
        }),
      ],
      now,
    );

    expect(kpis.top).toHaveLength(3);
    expect(kpis.top[0]).toEqual({ nombre: "Ana", total: 2 });
    expect(kpis.top.map((t) => t.nombre)).not.toContain("Cancelado");
  });

  it("sin despachos el promedio es cero", () => {
    expect(calculateKpis([], now)).toEqual({
      despachadas: 0,
      atendiendo: 0,
      finalizadas: 0,
      promedioMinutos: 0,
      top: [],
    });
  });
});
