"use client";

import { memo, useMemo, useState } from "react";

import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/app/status-badge";

import { formatDateTime, formatDuration } from "@/lib/utils/date";

import type { DispatchListItem } from "@/types/dispatch";
import type { UserRole } from "@/types/auth";

import {
  EMPTY_FILTERS,
  filterAndSortDispatches,
  type FilterKey,
  type Filters,
  type SortState,
} from "../domain/history";

import {
  InlineFilterHeader,
  SortableHeader,
  StaticHeader,
} from "./history-headers";

function DispatchTableComponent({
  rows,
  role,
  onDelete,
  onEdit,
}: {
  rows: DispatchListItem[];

  role: UserRole;

  onDelete: (row: DispatchListItem) => Promise<void>;

  onEdit: (row: DispatchListItem) => void;
}) {
  const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null);

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const [sort, setSort] = useState<SortState | null>(null);

  const processedRows = useMemo(
    () => filterAndSortDispatches(rows, filters, sort),
    [rows, filters, sort],
  );

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
                activeFilter={activeFilter}
                setActiveFilter={setActiveFilter}
                filters={filters}
                setFilters={setFilters}
              />
            </th>

            <th className="overflow-hidden p-2">
              <InlineFilterHeader
                label="Compañía"
                filterKey="compania"
                activeFilter={activeFilter}
                setActiveFilter={setActiveFilter}
                filters={filters}
                setFilters={setFilters}
              />
            </th>

            <th className="overflow-hidden p-2">
              <InlineFilterHeader
                label="Ruta"
                filterKey="ruta"
                activeFilter={activeFilter}
                setActiveFilter={setActiveFilter}
                filters={filters}
                setFilters={setFilters}
              />
            </th>

            <th className="overflow-hidden p-2">
              <InlineFilterHeader
                label="Estado"
                filterKey="estado"
                activeFilter={activeFilter}
                setActiveFilter={setActiveFilter}
                filters={filters}
                setFilters={setFilters}
              />
            </th>

            <th className="overflow-hidden p-2">
              <InlineFilterHeader
                label="Responsable"
                filterKey="responsable"
                activeFilter={activeFilter}
                setActiveFilter={setActiveFilter}
                filters={filters}
                setFilters={setFilters}
              />
            </th>

            <th className="overflow-hidden p-2">
              <InlineFilterHeader
                label="Transportista"
                filterKey="transportista"
                activeFilter={activeFilter}
                setActiveFilter={setActiveFilter}
                filters={filters}
                setFilters={setFilters}
              />
            </th>

            <th className="overflow-hidden p-2">
              <SortableHeader
                label="Iniciada"
                sortKey="iniciada"
                sort={sort}
                setSort={setSort}
              />
            </th>

            <th className="overflow-hidden p-2">
              <SortableHeader
                label="Terminada"
                sortKey="terminada"
                sort={sort}
                setSort={setSort}
              />
            </th>

            <th className="overflow-hidden p-2">
              <SortableHeader
                label="Duración"
                sortKey="duracion"
                sort={sort}
                setSort={setSort}
              />
            </th>

            <th className="overflow-hidden p-2">
              <StaticHeader>Detalle</StaticHeader>
            </th>

            <th className="overflow-hidden p-2 text-right">
              <StaticHeader>Acciones</StaticHeader>
            </th>
          </tr>
        </thead>

        <tbody>
          {processedRows.map((row) => (
            <tr
              key={row.id}
              className="border-t border-white/[0.045] text-slate-300 transition hover:bg-amber-500/[0.025]"
            >
              <td className="truncate px-3 py-3 font-semibold text-slate-100">
                {row.factura}
              </td>

              <td className="truncate px-3 py-3">
                {row.compania_nombre ?? "-"}
              </td>

              <td className="truncate px-3 py-3 font-semibold text-amber-300">
                {row.ruta_numero ?? "-"}
              </td>

              <td className="overflow-hidden px-3 py-3">
                <StatusBadge status={row.estado} />
              </td>

              <td
                className="truncate px-3 py-3"
                title={row.responsable_nombre ?? ""}
              >
                {row.responsable_nombre ?? "-"}
              </td>

              <td className="overflow-hidden px-3 py-3">
                <div className="min-w-0 leading-5">
                  <p
                    className="truncate"
                    title={row.transportista_nombre ?? ""}
                  >
                    {row.transportista_nombre ?? "-"}
                  </p>

                  {row.placa ? (
                    <p className="truncate text-[11px] text-amber-400/85">
                      {row.placa}
                    </p>
                  ) : null}
                </div>
              </td>

              <td
                className="truncate whitespace-nowrap px-3 py-3 text-slate-400"
                title={formatDateTime(row.fecha_hora_inicio)}
              >
                {formatDateTime(row.fecha_hora_inicio)}
              </td>

              <td
                className="truncate whitespace-nowrap px-3 py-3 text-slate-400"
                title={formatDateTime(
                  row.estado === "PEDIDO_CANCELADO"
                    ? row.fecha_hora_cancelacion
                    : row.fecha_hora_final,
                )}
              >
                {formatDateTime(
                  row.estado === "PEDIDO_CANCELADO"
                    ? row.fecha_hora_cancelacion
                    : row.fecha_hora_final,
                )}
              </td>

              <td className="truncate whitespace-nowrap px-3 py-3">
                {formatDuration(row.fecha_hora_inicio, row.fecha_hora_final)}
              </td>

              <td
                className="truncate px-3 py-3 text-slate-400"
                title={row.detalle ?? ""}
              >
                {row.detalle ?? "-"}
              </td>

              <td className="px-3 py-3">
                <div className="flex justify-end gap-1.5">
                  {row.estado === "ATENDIENDO" ||
                  row.estado === "DESPACHADA" ||
                  role === "ADMIN" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 border-white/10 bg-white/[0.03] p-0 text-slate-400 hover:border-amber-500/20 hover:bg-amber-500/[0.06] hover:text-amber-300"
                      onClick={() => onEdit(row)}
                      title="Corregir factura"
                    >
                      <Pencil className="size-4" />
                    </Button>
                  ) : null}

                  {row.estado === "ATENDIENDO" || role === "ADMIN" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 border-red-400/15 bg-red-400/[0.04] p-0 text-red-300 hover:bg-red-400/10"
                      onClick={() => void onDelete(row)}
                      title="Eliminar"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}

          {processedRows.length === 0 ? (
            <tr>
              <td colSpan={11} className="p-10 text-center text-slate-400">
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
