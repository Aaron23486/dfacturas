"use client";

import {
  memo,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Filter,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/app/status-badge";

import {
  formatDateTime,
  formatDuration,
} from "@/lib/utils/date";

import type { DispatchListItem } from "@/types/dispatch";
import type { UserRole } from "@/types/auth";

type FilterKey =
  | "factura"
  | "compania"
  | "ruta"
  | "estado"
  | "responsable"
  | "transportista";

type Filters = Record<FilterKey, string>;

type SortKey =
  | "iniciada"
  | "terminada"
  | "duracion";

type SortDirection =
  | "asc"
  | "desc";

interface SortState {
  key: SortKey;
  direction: SortDirection;
}

const EMPTY_FILTERS: Filters = {
  factura: "",
  compania: "",
  ruta: "",
  estado: "",
  responsable: "",
  transportista: "",
};

/*
 * ============================================================
 * IMPORTANTE
 * ============================================================
 *
 * Estos componentes están FUERA de DispatchTable.
 *
 * Esto evita que React los considere componentes nuevos en
 * cada render y remonte el input después de cada letra.
 *
 * Ese era el motivo por el que podías escribir "M" pero luego
 * el campo perdía el foco.
 */

function InlineFilterHeader({
  label,
  filterKey,
  activeFilter,
  setActiveFilter,
  filters,
  setFilters,
}: {
  label: string;

  filterKey: FilterKey;

  activeFilter: FilterKey | null;

  setActiveFilter: Dispatch<
    SetStateAction<FilterKey | null>
  >;

  filters: Filters;

  setFilters: Dispatch<
    SetStateAction<Filters>
  >;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const active =
    activeFilter === filterKey;

  const value =
    filters[filterKey];

  const hasValue =
    value.trim().length > 0;

  function activate() {
    setActiveFilter(filterKey);

    window.setTimeout(() => {
      const input =
        inputRef.current;

      input?.focus();

      if (input) {
        input.setSelectionRange(
          input.value.length,
          input.value.length
        );
      }
    }, 0);
  }

  function update(
    value: string
  ) {
    setFilters(
      (current) => ({
        ...current,

        [filterKey]:
          value,
      })
    );
  }

  function clear() {
    setFilters(
      (current) => ({
        ...current,

        [filterKey]: "",
      })
    );

    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }

  return (
    <div className="h-8 w-full min-w-0">
      {active ? (
        <div
          className="relative h-8 w-full min-w-0 max-w-full"
          onClick={(
            event
          ) =>
            event.stopPropagation()
          }
          onPointerDown={(
            event
          ) =>
            event.stopPropagation()
          }
        >
          <Search className="pointer-events-none absolute left-2 top-1/2 z-10 size-3.5 -translate-y-1/2 text-amber-400/65" />

          <Input
            ref={inputRef}
            value={value}
            onChange={(
              event
            ) =>
              update(
                event.target.value
              )
            }
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
            onPointerDown={(
              event
            ) =>
              event.stopPropagation()
            }
            onKeyDown={(
              event
            ) => {
              /*
               * Escape cierra visualmente
               * el input pero conserva el
               * filtro escrito.
               */
              if (
                event.key ===
                "Escape"
              ) {
                event.preventDefault();

                setActiveFilter(
                  null
                );
              }
            }}
            placeholder={
              label
            }
            aria-label={`Filtrar por ${label}`}
            autoComplete="off"
            className={[
              "h-8 w-full min-w-0 max-w-full rounded-md",

              "border-amber-500/20 bg-[#07111F]/95",

              "pl-7 pr-7 text-[11px] font-medium normal-case tracking-normal text-slate-100",

              "placeholder:text-slate-400",

              "focus-visible:border-amber-400/45 focus-visible:ring-1 focus-visible:ring-amber-400/15",
            ].join(" ")}
          />

          {hasValue ? (
            <button
              type="button"
              title={`Limpiar ${label}`}
              aria-label={`Limpiar filtro ${label}`}
              className="absolute right-1.5 top-1/2 z-20 grid size-5 -translate-y-1/2 place-items-center rounded-md text-slate-600 transition hover:bg-white/[0.06] hover:text-amber-400"
              onClick={(
                event
              ) => {
                event.stopPropagation();

                clear();
              }}
              onPointerDown={(
                event
              ) =>
                event.stopPropagation()
              }
            >
              <X className="size-3" />
            </button>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={
            activate
          }
          className={[
            "group flex h-8 w-full min-w-0 cursor-text items-center justify-between gap-1 rounded-md px-2 text-left transition",

            "hover:bg-amber-500/[0.035]",

            hasValue
              ? "text-amber-400"
              : "text-slate-500 hover:text-slate-300",
          ].join(" ")}
          title={`Filtrar por ${label}`}
        >
          <span className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-[0.06em]">
            {hasValue
              ? value
              : label}
          </span>

          <span className="relative shrink-0">
            <Filter
              className={[
                "size-3.5 transition",

                hasValue
                  ? "text-amber-400"
                  : "text-slate-600 group-hover:text-amber-400/70",
              ].join(" ")}
            />

            {hasValue ? (
              <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,.65)]" />
            ) : null}
          </span>
        </button>
      )}
    </div>
  );
}

/*
 * ============================================================
 * HEADER DE ORDENAMIENTO
 * ============================================================
 *
 * Primer click:
 * ASC
 *
 * Segundo:
 * DESC
 *
 * Tercero:
 * sin ordenamiento.
 */

function SortableHeader({
  label,
  sortKey,
  sort,
  setSort,
}: {
  label: string;

  sortKey: SortKey;

  sort: SortState | null;

  setSort: Dispatch<
    SetStateAction<
      SortState | null
    >
  >;
}) {
  const active =
    sort?.key === sortKey;

  const direction =
    active
      ? sort?.direction ?? null
      : null;

  function toggle() {
    setSort(
      (current) => {
        if (
          !current ||
          current.key !==
            sortKey
        ) {
          return {
            key: sortKey,
            direction:
              "asc",
          };
        }

        if (
          current.direction ===
          "asc"
        ) {
          return {
            key: sortKey,
            direction:
              "desc",
          };
        }

        return null;
      }
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={[
        "group flex h-8 w-full min-w-0 cursor-pointer items-center justify-between gap-1 rounded-md px-2 text-left transition",

        "hover:bg-amber-500/[0.035]",

        active
          ? "text-amber-400"
          : "text-slate-500 hover:text-slate-300",
      ].join(" ")}
      title={
        !active
          ? `Ordenar ${label} de forma ascendente`
          : direction === "asc"
            ? `Ordenar ${label} de forma descendente`
            : `Quitar ordenamiento de ${label}`
      }
    >
      <span className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-[0.06em]">
        {label}
      </span>

      {!active ? (
        <ArrowUpDown className="size-3.5 shrink-0 text-slate-600 transition group-hover:text-amber-400/70" />
      ) : direction === "asc" ? (
        <ArrowUp className="size-3.5 shrink-0 text-amber-400" />
      ) : (
        <ArrowDown className="size-3.5 shrink-0 text-amber-400" />
      )}
    </button>
  );
}

function StaticHeader({
  children,
}: {
  children: string;
}) {
  return (
    <div className="flex h-8 items-center px-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">
      {children}
    </div>
  );
}

function DispatchTableComponent({
  rows,
  role,
  onFinalize,
  onDelete,
  onEdit,
}: {
  rows: DispatchListItem[];

  role: UserRole;

  onFinalize: (
    row: DispatchListItem
  ) => Promise<void>;

  onDelete: (
    row: DispatchListItem
  ) => Promise<void>;

  onEdit: (
    row: DispatchListItem
  ) => void;
}) {
  void onFinalize;

  const [
    activeFilter,
    setActiveFilter,
  ] =
    useState<
      FilterKey | null
    >(null);

  const [
    filters,
    setFilters,
  ] =
    useState<Filters>(
      EMPTY_FILTERS
    );

  const [
    sort,
    setSort,
  ] =
    useState<
      SortState | null
    >(null);

  /*
   * ============================================================
   * FILTRADO
   * ============================================================
   */
  const processedRows =
    useMemo(() => {
      const has = (
        value:
          | string
          | number
          | null
          | undefined,

        query: string
      ) =>
        String(
          value ?? ""
        )
          .toLocaleLowerCase(
            "es"
          )
          .includes(
            query
              .trim()
              .toLocaleLowerCase(
                "es"
              )
          );

      const filtered =
        rows.filter(
          (row) =>
            has(
              row.factura,
              filters.factura
            ) &&

            has(
              row.compania_nombre,
              filters.compania
            ) &&

            has(
              row.ruta_numero,
              filters.ruta
            ) &&

            has(
              row.estado,
              filters.estado
            ) &&

            has(
              row.responsable_nombre,
              filters.responsable
            ) &&

            has(
              row.transportista_nombre,
              filters.transportista
            )
        );

      /*
       * Sin orden seleccionado:
       * conservar orden original.
       */
      if (!sort) {
        return filtered;
      }

      const activeSort = sort;

      const sorted = [
        ...filtered,
      ];

      /*
       * Fecha de inicio.
       */
      function getStart(
        row: DispatchListItem
      ) {
        if (
          !row.fecha_hora_inicio
        ) {
          return null;
        }

        const timestamp =
          new Date(
            row.fecha_hora_inicio
          ).getTime();

        return Number.isNaN(
          timestamp
        )
          ? null
          : timestamp;
      }

      /*
       * Para cancelados usamos
       * fecha_hora_cancelacion.
       *
       * Para despachadas:
       * fecha_hora_final.
       */
      function getEnd(
        row: DispatchListItem
      ) {
        const value =
          row.estado ===
          "PEDIDO_CANCELADO"
            ? row.fecha_hora_cancelacion
            : row.fecha_hora_final;

        if (!value) {
          return null;
        }

        const timestamp =
          new Date(
            value
          ).getTime();

        return Number.isNaN(
          timestamp
        )
          ? null
          : timestamp;
      }

      /*
       * Duración.
       */
      function getDuration(
        row: DispatchListItem
      ) {
        const start =
          getStart(row);

        const end =
          getEnd(row);

        if (
          start === null ||
          end === null
        ) {
          return null;
        }

        return Math.max(
          0,
          end - start
        );
      }

      function getSortValue(
        row: DispatchListItem
      ) {
        switch (
          activeSort.key
        ) {
          case "iniciada":
            return getStart(
              row
            );

          case "terminada":
            return getEnd(
              row
            );

          case "duracion":
            return getDuration(
              row
            );
        }
      }

      sorted.sort(
        (a, b) => {
          const aValue =
            getSortValue(
              a
            );

          const bValue =
            getSortValue(
              b
            );

          /*
           * Los valores vacíos siempre
           * quedan al final.
           */
          if (
            aValue === null &&
            bValue === null
          ) {
            return 0;
          }

          if (
            aValue === null
          ) {
            return 1;
          }

          if (
            bValue === null
          ) {
            return -1;
          }

          const result =
            aValue -
            bValue;

          return activeSort.direction ===
            "asc"
            ? result
            : -result;
        }
      );

      return sorted;
    }, [
      rows,
      filters,
      sort,
    ]);

  return (
    <div className="h-[calc(100vh-350px)] min-h-[360px] max-h-[calc(100vh-350px)] overflow-auto rounded-xl border border-white/8 bg-[#0B1626]/78 shadow-[0_16px_40px_rgba(0,0,0,.22)] backdrop-blur-xl">
      <table className="w-full min-w-[1320px] table-fixed text-xs">
        <colgroup>
          <col className="w-[9%]" />

          <col className="w-[9%]" />

          <col className="w-[5%]" />

          <col className="w-[9%]" />

          <col className="w-[12%]" />

          <col className="w-[13%]" />

          <col className="w-[11%]" />

          <col className="w-[11%]" />

          <col className="w-[7%]" />

          <col className="w-[9%]" />

          <col className="w-[5%]" />
        </colgroup>

        <thead className="sticky top-0 z-20 bg-[#101C2C]/98 text-left shadow-[0_1px_0_rgba(255,255,255,.06)] backdrop-blur-xl">
          <tr className="align-middle">
            <th className="overflow-hidden p-2">
              <InlineFilterHeader
                label="Factura"
                filterKey="factura"
                activeFilter={
                  activeFilter
                }
                setActiveFilter={
                  setActiveFilter
                }
                filters={
                  filters
                }
                setFilters={
                  setFilters
                }
              />
            </th>

            <th className="overflow-hidden p-2">
              <InlineFilterHeader
                label="Compañía"
                filterKey="compania"
                activeFilter={
                  activeFilter
                }
                setActiveFilter={
                  setActiveFilter
                }
                filters={
                  filters
                }
                setFilters={
                  setFilters
                }
              />
            </th>

            <th className="overflow-hidden p-2">
              <InlineFilterHeader
                label="Ruta"
                filterKey="ruta"
                activeFilter={
                  activeFilter
                }
                setActiveFilter={
                  setActiveFilter
                }
                filters={
                  filters
                }
                setFilters={
                  setFilters
                }
              />
            </th>

            <th className="overflow-hidden p-2">
              <InlineFilterHeader
                label="Estado"
                filterKey="estado"
                activeFilter={
                  activeFilter
                }
                setActiveFilter={
                  setActiveFilter
                }
                filters={
                  filters
                }
                setFilters={
                  setFilters
                }
              />
            </th>

            <th className="overflow-hidden p-2">
              <InlineFilterHeader
                label="Responsable"
                filterKey="responsable"
                activeFilter={
                  activeFilter
                }
                setActiveFilter={
                  setActiveFilter
                }
                filters={
                  filters
                }
                setFilters={
                  setFilters
                }
              />
            </th>

            <th className="overflow-hidden p-2">
              <InlineFilterHeader
                label="Transportista"
                filterKey="transportista"
                activeFilter={
                  activeFilter
                }
                setActiveFilter={
                  setActiveFilter
                }
                filters={
                  filters
                }
                setFilters={
                  setFilters
                }
              />
            </th>

            <th className="overflow-hidden p-2">
              <SortableHeader
                label="Iniciada"
                sortKey="iniciada"
                sort={sort}
                setSort={
                  setSort
                }
              />
            </th>

            <th className="overflow-hidden p-2">
              <SortableHeader
                label="Terminada"
                sortKey="terminada"
                sort={sort}
                setSort={
                  setSort
                }
              />
            </th>

            <th className="overflow-hidden p-2">
              <SortableHeader
                label="Duración"
                sortKey="duracion"
                sort={sort}
                setSort={
                  setSort
                }
              />
            </th>

            <th className="overflow-hidden p-2">
              <StaticHeader>
                Detalle
              </StaticHeader>
            </th>

            <th className="overflow-hidden p-2 text-right">
              <StaticHeader>
                Acciones
              </StaticHeader>
            </th>
          </tr>
        </thead>

        <tbody>
          {processedRows.map(
            (row) => (
              <tr
                key={
                  row.id
                }
                className="border-t border-white/[0.045] text-slate-300 transition hover:bg-amber-500/[0.025]"
              >
                <td className="truncate px-3 py-3 font-semibold text-slate-100">
                  {
                    row.factura
                  }
                </td>

                <td className="truncate px-3 py-3">
                  {row.compania_nombre ??
                    "-"}
                </td>

                <td className="truncate px-3 py-3 font-semibold text-amber-300">
                  {row.ruta_numero ??
                    "-"}
                </td>

                <td className="overflow-hidden px-3 py-3">
                  <StatusBadge
                    status={
                      row.estado
                    }
                  />
                </td>

                <td
                  className="truncate px-3 py-3"
                  title={
                    row.responsable_nombre ??
                    ""
                  }
                >
                  {row.responsable_nombre ??
                    "-"}
                </td>

                <td className="overflow-hidden px-3 py-3">
                  <div className="min-w-0 leading-5">
                    <p
                      className="truncate"
                      title={
                        row.transportista_nombre ??
                        ""
                      }
                    >
                      {row.transportista_nombre ??
                        "-"}
                    </p>

                    {row.placa ? (
                      <p className="truncate text-[11px] text-amber-400/55">
                        {
                          row.placa
                        }
                      </p>
                    ) : null}
                  </div>
                </td>

                <td
                  className="truncate whitespace-nowrap px-3 py-3 text-slate-400"
                  title={formatDateTime(
                    row.fecha_hora_inicio
                  )}
                >
                  {formatDateTime(
                    row.fecha_hora_inicio
                  )}
                </td>

                <td
                  className="truncate whitespace-nowrap px-3 py-3 text-slate-400"
                  title={formatDateTime(
                    row.estado ===
                      "PEDIDO_CANCELADO"
                      ? row.fecha_hora_cancelacion
                      : row.fecha_hora_final
                  )}
                >
                  {formatDateTime(
                    row.estado ===
                      "PEDIDO_CANCELADO"
                      ? row.fecha_hora_cancelacion
                      : row.fecha_hora_final
                  )}
                </td>

                <td className="truncate whitespace-nowrap px-3 py-3">
                  {formatDuration(
                    row.fecha_hora_inicio,
                    row.fecha_hora_final
                  )}
                </td>

                <td
                  className="truncate px-3 py-3 text-slate-400"
                  title={
                    row.detalle ??
                    ""
                  }
                >
                  {row.detalle ??
                    "-"}
                </td>

                <td className="px-3 py-3">
                  <div className="flex justify-end gap-1.5">
                    {row.estado ===
                      "ATENDIENDO" ||
                    row.estado ===
                      "DESPACHADA" ||
                    role ===
                      "ADMIN" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 border-white/10 bg-white/[0.03] p-0 text-slate-400 hover:border-amber-500/20 hover:bg-amber-500/[0.06] hover:text-amber-300"
                        onClick={() =>
                          onEdit(
                            row
                          )
                        }
                        title="Corregir factura"
                      >
                        <Pencil className="size-4" />
                      </Button>
                    ) : null}

                    {row.estado ===
                      "ATENDIENDO" ||
                    role ===
                      "ADMIN" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 border-red-400/15 bg-red-400/[0.04] p-0 text-red-300 hover:bg-red-400/10"
                        onClick={() =>
                          void onDelete(
                            row
                          )
                        }
                        title="Eliminar"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            )
          )}

          {processedRows.length ===
          0 ? (
            <tr>
              <td
                colSpan={11}
                className="p-10 text-center text-slate-600"
              >
                No hay registros que coincidan con los filtros.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

export const DispatchTable = memo(DispatchTableComponent);
