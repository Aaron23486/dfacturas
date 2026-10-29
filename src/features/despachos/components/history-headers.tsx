"use client";

import { useRef, type Dispatch, type SetStateAction } from "react";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Filter,
  Search,
  X,
} from "lucide-react";

import { Input } from "@/components/ui/input";

import type { FilterKey, Filters, SortKey, SortState } from "../domain/history";

// Estos componentes viven fuera de DispatchTable para que React no los trate como nuevos en
// cada render: si se recrean, el campo de filtro pierde el foco después de cada letra.

export function InlineFilterHeader({
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

  setActiveFilter: Dispatch<SetStateAction<FilterKey | null>>;

  filters: Filters;

  setFilters: Dispatch<SetStateAction<Filters>>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const active = activeFilter === filterKey;

  const value = filters[filterKey];

  const hasValue = value.trim().length > 0;

  function activate() {
    setActiveFilter(filterKey);

    window.setTimeout(() => {
      const input = inputRef.current;

      input?.focus();

      if (input) {
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }, 0);
  }

  function update(value: string) {
    setFilters((current) => ({
      ...current,

      [filterKey]: value,
    }));
  }

  function clear() {
    setFilters((current) => ({
      ...current,

      [filterKey]: "",
    }));

    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }

  return (
    <div className="h-8 w-full min-w-0">
      {active ? (
        <div
          className="relative h-8 w-full min-w-0 max-w-full"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Search className="pointer-events-none absolute left-2 top-1/2 z-10 size-3.5 -translate-y-1/2 text-amber-400/85" />

          <Input
            ref={inputRef}
            value={value}
            onChange={(event) => update(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              /*
               * Escape cierra visualmente
               * el input pero conserva el
               * filtro escrito.
               */
              if (event.key === "Escape") {
                event.preventDefault();

                setActiveFilter(null);
              }
            }}
            placeholder={label}
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
              className="absolute right-1.5 top-1/2 z-20 grid size-5 -translate-y-1/2 place-items-center rounded-md text-slate-400 transition hover:bg-white/[0.06] hover:text-amber-400"
              onClick={(event) => {
                event.stopPropagation();

                clear();
              }}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <X className="size-3" />
            </button>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={activate}
          className={[
            "group flex h-8 w-full min-w-0 cursor-text items-center justify-between gap-1 rounded-md px-2 text-left transition",

            "hover:bg-amber-500/[0.035]",

            hasValue ? "text-amber-400" : "text-slate-400 hover:text-slate-300",
          ].join(" ")}
          title={`Filtrar por ${label}`}
        >
          <span className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-[0.06em]">
            {hasValue ? value : label}
          </span>

          <span className="relative shrink-0">
            <Filter
              className={[
                "size-3.5 transition",

                hasValue
                  ? "text-amber-400"
                  : "text-slate-400 group-hover:text-amber-400/70",
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

export function SortableHeader({
  label,
  sortKey,
  sort,
  setSort,
}: {
  label: string;

  sortKey: SortKey;

  sort: SortState | null;

  setSort: Dispatch<SetStateAction<SortState | null>>;
}) {
  const active = sort?.key === sortKey;

  const direction = active ? (sort?.direction ?? null) : null;

  function toggle() {
    setSort((current) => {
      if (!current || current.key !== sortKey) {
        return {
          key: sortKey,
          direction: "asc",
        };
      }

      if (current.direction === "asc") {
        return {
          key: sortKey,
          direction: "desc",
        };
      }

      return null;
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={[
        "group flex h-8 w-full min-w-0 cursor-pointer items-center justify-between gap-1 rounded-md px-2 text-left transition",

        "hover:bg-amber-500/[0.035]",

        active ? "text-amber-400" : "text-slate-400 hover:text-slate-300",
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
        <ArrowUpDown className="size-3.5 shrink-0 text-slate-400 transition group-hover:text-amber-400/70" />
      ) : direction === "asc" ? (
        <ArrowUp className="size-3.5 shrink-0 text-amber-400" />
      ) : (
        <ArrowDown className="size-3.5 shrink-0 text-amber-400" />
      )}
    </button>
  );
}

export function StaticHeader({ children }: { children: string }) {
  return (
    <div className="flex h-8 items-center px-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400">
      {children}
    </div>
  );
}
