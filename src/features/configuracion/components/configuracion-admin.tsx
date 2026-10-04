"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, MapPinned, Plus, Trash2 } from "lucide-react";

import { AppDialog } from "@/components/app/app-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  createOrReactivateRuta,
  listCompanias,
  listRutasByCompania,
} from "@/services/catalog.service";

import {
  createCompania,
  deleteCompaniaConfig,
  deleteRutaConfig,
} from "@/services/admin.service";

import type { Compania, Ruta } from "@/types/catalog";

type DeleteTarget =
  | {
      kind: "COMPANIA";
      id: string;
      label: string;
    }
  | {
      kind: "RUTA";
      id: string;
      label: string;
    }
  | null;

export function ConfiguracionAdmin() {
  const [companias, setCompanias] = useState<Compania[]>([]);
  const [rutas, setRutas] = useState<Ruta[]>([]);

  const [nombre, setNombre] = useState("");
  const [companiaId, setCompaniaId] = useState("");
  const [numero, setNumero] = useState("");

  const [deleteTarget, setDeleteTarget] =
    useState<DeleteTarget>(null);

  const [loading, setLoading] = useState(false);
  const [routesLoading, setRoutesLoading] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const routesRequestIdRef = useRef(0);

  async function refreshCompanies() {
    setCompanias(await listCompanias());
  }

  async function refreshRoutes(
    selectedCompanyId: string
  ) {
    const requestId =
      ++routesRequestIdRef.current;

    if (!selectedCompanyId) {
      setRutas([]);
      setRoutesLoading(false);
      return;
    }

    setRutas([]);
    setRoutesLoading(true);

    try {
      const result =
        await listRutasByCompania(
          selectedCompanyId
        );

      if (
        requestId ===
        routesRequestIdRef.current
      ) {
        setRutas(result);
      }
    } finally {
      if (
        requestId ===
        routesRequestIdRef.current
      ) {
        setRoutesLoading(false);
      }
    }
  }

  useEffect(() => {
    let active = true;

    void listCompanias()
      .then((result) => {
        if (active) {
          setCompanias(result);
        }
      })
      .catch(() => {
        if (active) {
          setError(
            "No se pudo cargar la configuración."
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const activeCompanies = useMemo(
    () =>
      companias.filter(
        (item) => item.activo
      ),
    [companias]
  );

  async function executeDelete() {
    if (!deleteTarget) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (
        deleteTarget.kind === "COMPANIA"
      ) {
        await deleteCompaniaConfig(
          deleteTarget.id
        );

        if (
          companiaId === deleteTarget.id
        ) {
          setCompaniaId("");
          setRutas([]);

          routesRequestIdRef.current += 1;
        }

        await refreshCompanies();
      } else {
        await deleteRutaConfig(
          deleteTarget.id
        );

        if (companiaId) {
          await refreshRoutes(
            companiaId
          );
        }
      }

      setDeleteTarget(null);
    } catch (cause) {
      setDeleteTarget(null);

      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo eliminar el registro."
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "border-white/10 bg-[#07111F]/85 text-slate-100 placeholder:text-slate-700 focus-visible:border-amber-500/40";

  return (
    <>
      {error ? (
        <div className="mb-3 rounded-xl border border-red-400/20 bg-red-500/[0.07] p-3 text-xs text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-white/8 bg-[#0B1626]/72 p-4 shadow-[0_16px_50px_rgba(0,0,0,.2)] backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg border border-amber-500/15 bg-amber-500/[0.06] text-amber-400">
              <Building2 className="size-4" />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Compañías
              </h3>

              <p className="text-[10px] text-slate-600">
                Catálogo operativo.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              value={nombre}
              onChange={(event) =>
                setNombre(
                  event.target.value
                )
              }
              placeholder="Nueva compañía"
              className={inputClass}
            />

            <Button
              className="bg-amber-500 text-slate-950 hover:bg-amber-600"
              disabled={
                loading ||
                !nombre.trim()
              }
              onClick={async () => {
                setLoading(true);
                setError(null);

                try {
                  await createCompania(
                    nombre
                  );

                  setNombre("");

                  await refreshCompanies();
                } catch (cause) {
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : "No se pudo crear la compañía."
                  );
                } finally {
                  setLoading(false);
                }
              }}
            >
              <Plus className="size-4" />
              Agregar
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            {activeCompanies.map(
              (compania) => (
                <div
                  key={compania.id}
                  className="flex items-center justify-between rounded-xl border border-white/7 bg-white/[0.025] px-3 py-2 text-xs text-slate-300"
                >
                  <span>
                    {compania.nombre}
                  </span>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 border-red-400/15 bg-red-400/[0.04] p-0 text-red-300 hover:bg-red-400/10"
                    onClick={() =>
                      setDeleteTarget({
                        kind:
                          "COMPANIA",
                        id: compania.id,
                        label:
                          compania.nombre,
                      })
                    }
                    title="Eliminar compañía"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              )
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-white/8 bg-[#0B1626]/72 p-4 shadow-[0_16px_50px_rgba(0,0,0,.2)] backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg border border-blue-400/15 bg-blue-400/[0.06] text-blue-300">
              <MapPinned className="size-4" />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Rutas
              </h3>

              <p className="text-[10px] text-slate-600">
                Asociadas a una compañía.
              </p>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-[1fr_0.8fr_auto]">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-[0.06em] text-slate-500">
                Compañía
              </Label>

              <select
                className="h-10 w-full rounded-lg border border-white/10 bg-[#07111F]/85 px-3 text-xs text-slate-200 outline-none focus:border-amber-500/40"
                value={companiaId}
                onChange={(event) => {
                  const nextCompanyId =
                    event.target.value;

                  setCompaniaId(
                    nextCompanyId
                  );

                  setNumero("");
                  setError(null);
                  setRutas([]);

                  void refreshRoutes(
                    nextCompanyId
                  ).catch(() => {
                    setRutas([]);

                    setError(
                      "No se pudieron cargar las rutas de la compañía."
                    );
                  });
                }}
              >
                <option value="">
                  Seleccionar
                </option>

                {activeCompanies.map(
                  (compania) => (
                    <option
                      key={
                        compania.id
                      }
                      value={
                        compania.id
                      }
                    >
                      {
                        compania.nombre
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-[0.06em] text-slate-500">
                Ruta
              </Label>

              <Input
                value={numero}
                onChange={(event) => {
                  const value =
                    event.target.value.replace(
                      /\D/g,
                      ""
                    );

                  setNumero(value);
                }}
                inputMode="numeric"
                disabled={!companiaId}
                className={inputClass}
              />
            </div>

            <Button
              className="self-end bg-amber-500 text-slate-950 hover:bg-amber-600"
              disabled={
                loading ||
                !companiaId ||
                !numero.trim()
              }
              onClick={async () => {
                setLoading(true);
                setError(null);

                try {
                  await createOrReactivateRuta(
                    companiaId,
                    Number(numero)
                  );

                  setNumero("");

                  await refreshRoutes(
                    companiaId
                  );
                } catch (cause) {
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : "No se pudo crear o reactivar la ruta."
                  );
                } finally {
                  setLoading(false);
                }
              }}
            >
              Agregar
            </Button>
          </div>

          {!companiaId ? (
            <div className="mt-4 rounded-xl border border-dashed border-white/8 bg-white/[0.015] px-3 py-6 text-center text-[11px] text-slate-600">
              Seleccione una compañía
              para ver sus rutas.
            </div>
          ) : routesLoading ? (
            <div className="mt-4 rounded-xl border border-white/7 bg-white/[0.02] px-3 py-6 text-center text-[11px] text-slate-600">
              Cargando rutas...
            </div>
          ) : rutas.length === 0 ? (
            <div className="mt-4 rounded-xl border border-white/7 bg-white/[0.02] px-3 py-6 text-center text-[11px] text-slate-600">
              Esta compañía no tiene
              rutas activas.
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6">
              {rutas.map((ruta) => (
                <div
                  key={ruta.id}
                  className="flex items-center justify-between gap-1 rounded-lg border border-white/7 bg-white/[0.025] p-2 text-xs font-medium text-amber-300"
                >
                  <span>
                    {ruta.numero}
                  </span>

                  <button
                    type="button"
                    className="rounded-md p-1 text-red-300/75 transition hover:bg-red-400/10 hover:text-red-300"
                    onClick={() =>
                      setDeleteTarget({
                        kind: "RUTA",
                        id: ruta.id,
                        label: `Ruta ${ruta.numero}`,
                      })
                    }
                    aria-label={`Eliminar ruta ${ruta.numero}`}
                    title="Eliminar ruta"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <AppDialog
        open={deleteTarget !== null}
        title={
          deleteTarget?.kind ===
          "COMPANIA"
            ? "Eliminar compañía"
            : "Eliminar ruta"
        }
        description={
          deleteTarget
            ? `${deleteTarget.label}. Si tiene historial relacionado, se retirará del catálogo activo sin destruir la trazabilidad.`
            : undefined
        }
        tone="danger"
        confirmLabel="Eliminar"
        loading={loading}
        onConfirm={executeDelete}
        onClose={() =>
          setDeleteTarget(null)
        }
      />
    </>
  );
}