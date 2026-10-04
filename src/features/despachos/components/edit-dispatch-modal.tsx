"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  Building2,
  MapPinned,
  ShieldCheck,
  Truck,
  UserRound,
  X,
} from "lucide-react";

import {
  Button,
} from "@/components/ui/button";

import {
  Label,
} from "@/components/ui/label";

import {
  Textarea,
} from "@/components/ui/textarea";

import {
  listCompaniasActivas,
  listResponsablesActivos,
  listRutasByCompania,
  listTransportistasActivos,
} from "@/services/catalog.service";

import {
  getVehicleByTransportista,
} from "@/services/vehicle.service";

import {
  correctDispatch,
  correctDispatchDetail,
} from "@/services/dispatch.service";

import type {
  Compania,
  Responsable,
  Ruta,
  Transportista,
  Vehiculo,
} from "@/types/catalog";

import type {
  DispatchListItem,
} from "@/types/dispatch";

import type {
  UserRole,
} from "@/types/auth";

function isClienteRetiraNombre(
  value: string | null | undefined
) {
  return (
    value?.trim().toUpperCase() ===
    "CLIENTE RETIRA"
  );
}

export function EditDispatchModal({
  row,
  role,
  onClose,
  onSaved,
}: {
  row: DispatchListItem | null;
  role: UserRole;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [
    responsables,
    setResponsables,
  ] = useState<
    Responsable[]
  >([]);

  const [
    companias,
    setCompanias,
  ] = useState<
    Compania[]
  >([]);

  const [
    rutas,
    setRutas,
  ] = useState<
    Ruta[]
  >([]);

  const [
    transportistas,
    setTransportistas,
  ] = useState<
    Transportista[]
  >([]);

  const [
    responsableId,
    setResponsableId,
  ] = useState("");

  const [
    companiaId,
    setCompaniaId,
  ] = useState("");

  const [
    rutaId,
    setRutaId,
  ] = useState("");

  const [
    transportistaId,
    setTransportistaId,
  ] = useState("");

  const [
    vehicle,
    setVehicle,
  ] = useState<
    Vehiculo | null
  >(null);

  const [
    detalle,
    setDetalle,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const operationalDispatched =
    role === "OPERATIVO" &&
    row?.estado ===
      "DESPACHADA";

  const admin =
    role === "ADMIN";

  const canEditContext =
    admin ||
    row?.estado ===
      "ATENDIENDO";

  const selectedTransportista =
    useMemo(
      () =>
        transportistas.find(
          (item) =>
            item.id ===
            transportistaId
        ) ?? null,
      [
        transportistas,
        transportistaId,
      ]
    );

  const clienteRetiraSeleccionado =
    isClienteRetiraNombre(
      selectedTransportista?.nombre ??
        (transportistaId ===
        row?.transportista_id
          ? row?.transportista_nombre
          : null)
    );

  useEffect(() => {
    if (!row) {
      return;
    }

    const timer = window.setTimeout(() => {
      setResponsableId(
        row.responsable_id ?? ""
      );

      setCompaniaId(
        row.compania_id ?? ""
      );

      setRutaId(
        row.ruta_id ?? ""
      );

      setTransportistaId(
        row.transportista_id ?? ""
      );

      setDetalle(
        row.detalle ?? ""
      );

      setError(null);
    }, 0);

    void Promise.all([
      listResponsablesActivos(),
      listCompaniasActivas(),
      listTransportistasActivos(),
    ])
      .then(
        ([
          responsablesData,
          companiasData,
          transportistasData,
        ]) => {
          setResponsables(
            responsablesData
          );

          setCompanias(
            companiasData
          );

          setTransportistas(
            transportistasData
          );
        }
      )
      .catch(() => {
        setError(
          "No se pudieron cargar los catálogos para la corrección."
        );
      });

    return () => window.clearTimeout(timer);
  }, [row]);

  useEffect(() => {
    if (!companiaId) {
      const timer = window.setTimeout(() => {
        setRutas([]);
      }, 0);

      return () => window.clearTimeout(timer);
    }

    void listRutasByCompania(
      companiaId
    )
      .then(setRutas)
      .catch(() => {
        setError(
          "No se pudieron cargar las rutas de la compañía seleccionada."
        );
      });
  }, [companiaId]);

  useEffect(() => {
    if (
      !transportistaId ||
      clienteRetiraSeleccionado
    ) {
      const timer = window.setTimeout(() => {
        setVehicle(null);
      }, 0);

      return () => window.clearTimeout(timer);
    }

    void getVehicleByTransportista(
      transportistaId
    )
      .then(setVehicle)
      .catch(() => {
        setVehicle(null);

        setError(
          "No se pudo consultar la placa del transportista."
        );
      });
  }, [
    transportistaId,
    clienteRetiraSeleccionado,
  ]);

  const currentResponsable =
    useMemo(
      () =>
        responsables.find(
          (item) =>
            item.id ===
            responsableId
        )
          ?.nombre_completo ??
        row?.responsable_nombre ??
        "-",
      [
        responsables,
        responsableId,
        row,
      ]
    );

  const currentCompany =
    useMemo(
      () =>
        companias.find(
          (item) =>
            item.id ===
            companiaId
        )?.nombre ??
        row?.compania_nombre ??
        "-",
      [
        companias,
        companiaId,
        row,
      ]
    );

  const currentRoute =
    useMemo(
      () =>
        rutas.find(
          (item) =>
            item.id ===
            rutaId
        )?.numero ??
        row?.ruta_numero ??
        null,
      [
        rutas,
        rutaId,
        row,
      ]
    );

  const currentTransportista =
    useMemo(() => {
      const selected =
        transportistas.find(
          (item) =>
            item.id ===
            transportistaId
        );

      if (selected) {
        return `${selected.nombre} ${
          selected.apellido === "-"
            ? ""
            : selected.apellido
        }`.trim();
      }

      return (
        row?.transportista_nombre ??
        "-"
      );
    }, [
      transportistas,
      transportistaId,
      row,
    ]);

  if (!row) {
    return null;
  }

  const selectClass =
    "h-10 w-full rounded-lg border border-white/10 bg-[#07111F] px-3 text-sm text-slate-100 outline-none transition focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/10";

  async function save() {
    if (!row) {
      return;
    }

    setError(null);

    if (canEditContext) {
      // Compatibilidad histórica:
      // un campo que ya nació NULL puede permanecer NULL al corregir
      // otro dato (por ejemplo, únicamente el Detalle).
      // Sí bloqueamos borrar accidentalmente información que antes existía.
      const missing = [
        row.responsable_id && !responsableId
          ? "Responsable"
          : null,

        row.transportista_id && !transportistaId
          ? "Transportista"
          : null,

        row.compania_id && !companiaId
          ? "Compañía"
          : null,

        // La ruta vuelve a ser obligatoria también en corrección ADMIN.
        // "Seleccionar ruta" (value="") significa dato faltante y no se guarda.
        !rutaId
          ? "Ruta"
          : null,
      ]
        .filter(Boolean)
        .join(", ");

      if (missing) {
        setError(`Faltan datos: ${missing}.`);
        return;
      }

      // Si se selecciona/asigna un transportista, la placa activa sigue
      // siendo obligatoria. Si el registro histórico nunca tuvo
      // transportista, no se inventa uno para poder guardar el detalle.
      if (
        transportistaId &&
        !clienteRetiraSeleccionado &&
        !vehicle
      ) {
        setError(
          "El transportista seleccionado no tiene una placa asociada."
        );
        return;
      }
    }

    setLoading(true);

    try {
      const normalizedDetalle = detalle.trim() || null;

      // Si un registro histórico de CLIENTE RETIRA conserva un vehículo
      // antiguo, forzamos la corrección completa aunque el resto del
      // contexto no haya cambiado, para que backend deje vehiculo_id NULL.
      const hasClienteRetiraVehicleMismatch =
        clienteRetiraSeleccionado &&
        row.vehiculo_id !== null;

      const contextUnchanged =
        !hasClienteRetiraVehicleMismatch &&
        (responsableId || null) === row.responsable_id &&
        (companiaId || null) === row.compania_id &&
        (rutaId || null) === row.ruta_id &&
        (transportistaId || null) === row.transportista_id;

      // Caso historico: si solo cambia el Detalle, nunca obligar a
      // completar un transportista/vehiculo que el registro nunca tuvo.
      if (operationalDispatched || contextUnchanged) {
        await correctDispatchDetail(row.id, normalizedDetalle);
      } else {
        await correctDispatch(
          row.id,
          {
            responsableId,
            companiaId,
            rutaId,
            transportistaId,
            detalle: normalizedDetalle,
          }
        );
      }

      await onSaved();

      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo corregir la factura."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-[#07111F]/72 p-4 backdrop-blur-md">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#101C2C]/95 shadow-[0_30px_100px_rgba(0,0,0,.58)] backdrop-blur-2xl">
        <div className="flex items-start gap-3 border-b border-white/8 px-5 py-4">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-amber-500/20 bg-amber-500/[0.07] text-amber-400">
            <ShieldCheck className="size-5" />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-slate-100">
              Corregir factura:{" "}

              <span className="text-amber-400">
                {row.factura}
              </span>
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {operationalDispatched
                ? "Factura despachada: como usuario operativo únicamente puede modificar el detalle."
                : admin
                  ? "Modo administrador: puede corregir el contexto del despacho."
                  : "Puede corregir el despacho mientras se encuentra ATENDIENDO."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-600 transition hover:bg-white/[0.05] hover:text-white"
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5">
          {canEditContext ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                icon={UserRound}
                label="Responsable"
              >
                <select
                  className={
                    selectClass
                  }
                  value={
                    responsableId
                  }
                  onChange={(
                    event
                  ) =>
                    setResponsableId(
                      event.target
                        .value
                    )
                  }
                >
                  <option value="">
                    Seleccionar responsable
                  </option>

                  {responsables.map(
                    (
                      responsable
                    ) => (
                      <option
                        key={
                          responsable.id
                        }
                        value={
                          responsable.id
                        }
                      >
                        {
                          responsable.nombre_completo
                        }
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field
                icon={Truck}
                label="Transportista"
              >
                <select
                  className={
                    selectClass
                  }
                  value={
                    transportistaId
                  }
                  onChange={(
                    event
                  ) =>
                    setTransportistaId(
                      event.target
                        .value
                    )
                  }
                >
                  <option value="">
                    Seleccionar transportista
                  </option>

                  {transportistas.map(
                    (
                      transportista
                    ) => (
                      <option
                        key={
                          transportista.id
                        }
                        value={
                          transportista.id
                        }
                      >
                        {
                          transportista.nombre
                        }{" "}
                        {transportista.apellido ===
                        "-"
                          ? ""
                          : transportista.apellido}
                      </option>
                    )
                  )}
                </select>

                {vehicle ? (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-amber-500/15 bg-amber-500/[0.04] px-2.5 py-1.5 text-xs text-slate-400">
                    <Truck className="size-3.5 text-amber-400" />

                    Placa

                    <span className="font-semibold text-amber-300">
                      {
                        vehicle.placa
                      }
                    </span>
                  </div>
                ) : null}
              </Field>

              <Field
                icon={
                  Building2
                }
                label="Compañía"
              >
                <select
                  className={
                    selectClass
                  }
                  value={
                    companiaId
                  }
                  onChange={(
                    event
                  ) => {
                    setCompaniaId(
                      event.target
                        .value
                    );

                    setRutaId("");
                  }}
                >
                  <option value="">
                    Seleccionar compañía
                  </option>

                  {companias.map(
                    (
                      compania
                    ) => (
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
              </Field>

              <Field
                icon={
                  MapPinned
                }
                label="Ruta"
              >
                <select
                  className={
                    selectClass
                  }
                  value={
                    rutaId
                  }
                  onChange={(
                    event
                  ) =>
                    setRutaId(
                      event.target
                        .value
                    )
                  }
                >
                  <option value="">
                    Seleccionar ruta
                  </option>

                  {rutas.map(
                    (
                      ruta
                    ) => (
                      <option
                        key={
                          ruta.id
                        }
                        value={
                          ruta.id
                        }
                      >
                        {
                          ruta.numero
                        }
                      </option>
                    )
                  )}
                </select>
              </Field>
            </div>
          ) : (
            <div className="grid gap-2.5 md:grid-cols-2">
              <ReadOnlyValue
                label="Responsable"
                value={
                  currentResponsable
                }
              />

              <ReadOnlyValue
                label="Transportista"
                value={
                  currentTransportista
                }
                secondary={
                  row.placa
                    ? `Placa · ${row.placa}`
                    : undefined
                }
              />

              <ReadOnlyValue
                label="Compañía"
                value={
                  currentCompany
                }
              />

              <ReadOnlyValue
                label="Ruta"
                value={
                  currentRoute ===
                  null
                    ? "-"
                    : String(
                        currentRoute
                      )
                }
              />
            </div>
          )}

          <div className="mt-4 space-y-1.5">
            <Label className="text-xs font-medium text-slate-300">
              Detalle
            </Label>

            <Textarea
              value={
                detalle
              }
              onChange={(
                event
              ) =>
                setDetalle(
                  event.target
                    .value
                )
              }
              rows={4}
              className="min-h-24 resize-none border-white/10 bg-[#07111F] text-sm text-slate-100 placeholder:text-slate-700 focus-visible:border-amber-500/40 focus-visible:ring-amber-500/10"
              placeholder="Detalle del despacho"
            />
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/[0.08] p-3 text-xs text-red-300">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-white/8 bg-black/10 px-5 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={
              onClose
            }
            disabled={
              loading
            }
            className="border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08] hover:text-white"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={() =>
              void save()
            }
            disabled={
              loading
            }
            className="bg-amber-500 text-slate-950 hover:bg-amber-600"
          >
            {loading
              ? "Guardando..."
              : "Guardar corrección"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon:
    | typeof UserRound
    | typeof Truck
    | typeof Building2
    | typeof MapPinned;

  label: string;

  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
        <Icon className="size-3.5 text-amber-400/70" />

        {label}
      </Label>

      {children}
    </div>
  );
}

function ReadOnlyValue({
  label,
  value,
  secondary,
}: {
  label: string;
  value: string;
  secondary?: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3">
      <p className="text-[10px] uppercase tracking-[0.07em] text-slate-600">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-slate-200">
        {value}
      </p>

      {secondary ? (
        <p className="mt-1 text-[11px] text-amber-400/65">
          {secondary}
        </p>
      ) : null}
    </div>
  );
}