"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AlertTriangle,
  Building2,
  Plus,
  RotateCcw,
  ScanLine,
  Truck,
  UserRound,
} from "lucide-react";

import {
  AppDialog,
} from "@/components/app/app-dialog";

import {
  Button,
} from "@/components/ui/button";

import {
  Input,
} from "@/components/ui/input";

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
  deleteDispatch,
  listDispatches,
} from "@/services/dispatch.service";

import {
  inspectFacturaScan,
  processFacturaScan,
} from "@/services/scan.service";

import {
  getVehicleByTransportista,
} from "@/services/vehicle.service";

import type {
  Compania,
  Responsable,
  Ruta,
  Transportista,
  Vehiculo,
} from "@/types/catalog";

import type {
  DailyKpis,
  DispatchListItem,
} from "@/types/dispatch";

import type {
  UserRole,
} from "@/types/auth";

import type {
  ProcessScanResult,
  ScanDispatchContext,
} from "@/types/scan";

import {
  createClient,
} from "@/lib/supabase/client";

import {
  durationMinutes,
} from "@/lib/utils/date";

import {
  DispatchTable,
} from "./dispatch-table";

import {
  EditDispatchModal,
} from "./edit-dispatch-modal";

import {
  ScanResultDialog,
} from "./scan-result-dialog";

import {
  CreateTransportistaModal,
} from "@/features/transportistas/components/create-transportista-modal";

import {
  CancelOrderDialog,
} from "./cancel-order-dialog";

import {
  FloatingMetrics,
} from "@/features/metrics/components/floating-metrics";

interface PersistedContext {
  responsableId: string;
  companiaId: string;
  rutaId: string;
  transportistaId: string;
}

type ConfirmState =
  | {
      kind: "DELETE";
      row: DispatchListItem;
    }
  | null;

const STORAGE_KEY =
  "facturacion-v2:dispatch-context";

const NOOP_FINALIZE = async () => {};

const FACTURA_LENGTH = 20;
const FACTURA_PATTERN = /^\d{20}$/;

function normalizeFactura(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, FACTURA_LENGTH);
}

function isValidFactura(value: string) {
  return FACTURA_PATTERN.test(
    value.trim()
  );
}

function isClienteRetira(
  transportista: Transportista | null | undefined
) {
  return (
    transportista?.nombre
      .trim()
      .toUpperCase() === "CLIENTE RETIRA"
  );
}

const EMPTY_CONTEXT: PersistedContext = {
  responsableId: "",
  companiaId: "",
  rutaId: "",
  transportistaId: "",
};

function readPersisted(): PersistedContext {
  try {
    return JSON.parse(
      localStorage.getItem(
        STORAGE_KEY
      ) ?? ""
    ) as PersistedContext;
  } catch {
    return EMPTY_CONTEXT;
  }
}

function calculateKpis(
  rows: DispatchListItem[]
): DailyKpis {
  const now = new Date();

  const isToday = (
    value: string | null
  ) => {
    if (!value) {
      return false;
    }

    const date =
      new Date(value);

    return (
      date.getFullYear() ===
        now.getFullYear() &&
      date.getMonth() ===
        now.getMonth() &&
      date.getDate() ===
        now.getDate()
    );
  };

  const todayRows =
    rows.filter((row) =>
      isToday(row.created_at)
    );

  const dispatched =
    todayRows.filter(
      (row) =>
        row.estado ===
        "DESPACHADA"
    );

  const durations =
    dispatched
      .map((row) =>
        durationMinutes(
          row.fecha_hora_inicio,
          row.fecha_hora_final
        )
      )
      .filter(
        (
          value
        ): value is number =>
          value !== null
      );

  const counts =
    new Map<string, number>();

  // El ranking operativo representa exclusivamente despachos finalizados.
  // PEDIDO_CANCELADO y ATENDIENDO no deben sumar al Top 1/2/3.
  for (const row of dispatched) {
    if (!row.responsable_nombre) {
      continue;
    }

    counts.set(
      row.responsable_nombre,
      (counts.get(row.responsable_nombre) ?? 0) + 1
    );
  }

  return {
    despachadas:
      dispatched.length,

    atendiendo:
      todayRows.filter(
        (row) =>
          row.estado ===
          "ATENDIENDO"
      ).length,

    finalizadas:
      dispatched.length,

    promedioMinutos:
      durations.length
        ? Math.round(
            durations.reduce(
              (sum, value) =>
                sum + value,
              0
            ) /
              durations.length
          )
        : 0,

    top: [
      ...counts.entries(),
    ]
      .sort(
        (a, b) =>
          b[1] - a[1]
      )
      .slice(0, 3)
      .map(
        ([nombre, total]) => ({
          nombre,
          total,
        })
      ),
  };
}

export function DispatchWorkspace({
  userId,
  role,
}: {
  userId: string;
  role: UserRole;
}) {
  const facturaRef =
    useRef<HTMLInputElement>(
      null
    );

  const [factura, setFactura] =
    useState("");

  const [detalle, setDetalle] =
    useState("");

  const [
    responsables,
    setResponsables,
  ] = useState<
    Responsable[]
  >([]);

  const [
    companias,
    setCompanias,
  ] = useState<Compania[]>([]);

  const [rutas, setRutas] =
    useState<Ruta[]>([]);

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
    selectedVehicle,
    setSelectedVehicle,
  ] = useState<
    Vehiculo | null
  >(null);

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
    isClienteRetira(
      selectedTransportista
    );

  const [rows, setRows] =
    useState<
      DispatchListItem[]
    >([]);

  const [
    scanResult,
    setScanResult,
  ] = useState<
    Extract<
      ProcessScanResult,
      {
        kind:
          | "BLOCKED_CANCELLED"
          | "BLOCKED_ALREADY_DISPATCHED";
      }
    > | null
  >(null);

  const [confirm, setConfirm] =
    useState<ConfirmState>(null);

  const [
    deleteReason,
    setDeleteReason,
  ] = useState("");

  const [
    missingFields,
    setMissingFields,
  ] = useState<string[]>([]);

  const [
    errorDialog,
    setErrorDialog,
  ] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const [
    editRow,
    setEditRow,
  ] = useState<
    DispatchListItem | null
  >(null);

  const [
    transportModal,
    setTransportModal,
  ] = useState(false);

  const [
    cancelOrderModal,
    setCancelOrderModal,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const refreshRows =
    useCallback(
      async () => {
        setRows(
          await listDispatches(
            300
          )
        );
      },
      []
    );

  const refreshTransportistas =
    useCallback(
      async () => {
        setTransportistas(
          await listTransportistasActivos()
        );
      },
      []
    );

  const requestDelete =
    useCallback(
      async (
        row: DispatchListItem
      ) => {
        setDeleteReason("");

        setConfirm({
          kind: "DELETE",
          row,
        });
      },
      []
    );

  const requestEdit =
    useCallback(
      (
        row: DispatchListItem
      ) => {
        setEditRow(row);
      },
      []
    );

  useEffect(() => {
    const persisted =
      readPersisted();

    void Promise.all([
      listResponsablesActivos(),
      listCompaniasActivas(),
      listTransportistasActivos(),
      listDispatches(300),
    ])
      .then(
        ([
          responsablesData,
          companiasData,
          transportistasData,
          dispatchesData,
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

          setRows(
            dispatchesData
          );

          setResponsableId(
            persisted.responsableId
          );

          setCompaniaId(
            persisted.companiaId
          );

          setRutaId(
            persisted.rutaId
          );

          setTransportistaId(
            persisted.transportistaId
          );
        }
      )
      .catch((cause) => {
        setErrorDialog({
          title:
            "No se pudo cargar la vista",

          message:
            cause instanceof Error
              ? cause.message
              : "Ocurrió un error al cargar los datos.",
        });
      });

    facturaRef.current?.focus();
  }, []);

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
        setErrorDialog({
          title:
            "No se pudieron cargar las rutas",

          message:
            "Intente seleccionar nuevamente la compañía.",
        });
      });
  }, [companiaId]);

  useEffect(() => {
    if (
      !transportistaId ||
      clienteRetiraSeleccionado
    ) {
      const timer = window.setTimeout(() => {
        setSelectedVehicle(null);
      }, 0);

      return () => window.clearTimeout(timer);
    }

    void getVehicleByTransportista(
      transportistaId
    )
      .then(
        setSelectedVehicle
      )
      .catch(() => {
        setSelectedVehicle(
          null
        );
      });
  }, [
    transportistaId,
    clienteRetiraSeleccionado,
  ]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        responsableId,
        companiaId,
        rutaId,
        transportistaId,
      })
    );
  }, [
    responsableId,
    companiaId,
    rutaId,
    transportistaId,
  ]);

  useEffect(() => {
    const supabase =
      createClient();

    const channel =
      supabase
        .channel(
          "despachos-live"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "despachos",
          },
          () =>
            void refreshRows()
        )
        .subscribe();

    return () => {
      void supabase.removeChannel(
        channel
      );
    };
  }, [refreshRows]);

  const kpis =
    useMemo(
      () =>
        calculateKpis(rows),
      [rows]
    );

  function focusScanner() {
    window.setTimeout(
      () =>
        facturaRef.current?.focus(),
      0
    );
  }

  function resetScan() {
    setFactura("");
    setDetalle("");
    focusScanner();
  }

  function clearOperationalContext() {
    setFactura("");
    setDetalle("");
    setResponsableId("");
    setCompaniaId("");
    setRutaId("");
    setTransportistaId("");
    setSelectedVehicle(null);
    setRutas([]);
    setMissingFields([]);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(EMPTY_CONTEXT)
    );

    focusScanner();
  }

  async function hydrateDispatchContext(
    dispatch: ScanDispatchContext
  ) {
    setResponsableId(
      dispatch.responsable_id ?? ""
    );

    setTransportistaId(
      dispatch.transportista_id ?? ""
    );

    if (
      dispatch.vehiculo_id &&
      dispatch.transportista_id &&
      dispatch.placa
    ) {
      setSelectedVehicle({
        id: dispatch.vehiculo_id,
        transportista_id:
          dispatch.transportista_id,
        placa: dispatch.placa,
        activo: true,
      });
    } else {
      setSelectedVehicle(null);
    }

    setDetalle(
      dispatch.detalle ?? ""
    );

    const nextCompaniaId =
      dispatch.compania_id ?? "";

    setCompaniaId(nextCompaniaId);

    if (!nextCompaniaId) {
      setRutas([]);
      setRutaId("");
      return;
    }

    const availableRoutes =
      await listRutasByCompania(
        nextCompaniaId
      );

    setRutas(availableRoutes);

    const storedRouteId =
      dispatch.ruta_id ?? "";

    setRutaId(
      storedRouteId &&
        availableRoutes.some(
          (route) =>
            route.id ===
            storedRouteId
        )
        ? storedRouteId
        : ""
    );
  }

  function getMissingFields(
    includeFactura = true
  ) {
    const missing:
      string[] = [];

    if (
      includeFactura &&
      !factura.trim()
    ) {
      missing.push("Factura");
    }

    if (!responsableId) {
      missing.push(
        "Responsable"
      );
    }

    if (!transportistaId) {
      missing.push(
        "Transportista"
      );
    }

    if (!companiaId) {
      missing.push(
        "Compañía"
      );
    }

    if (!rutaId) {
      missing.push("Ruta");
    }

    return missing;
  }

  async function resolveVehicleId(): Promise<
    string | null | undefined
  > {
    if (!transportistaId) {
      return null;
    }

    // CLIENTE RETIRA es una excepción operativa controlada:
    // existe como transportista, pero no tiene vehículo ni placa.
    if (clienteRetiraSeleccionado) {
      setSelectedVehicle(null);
      return null;
    }

    const vehicle =
      selectedVehicle ??
      (await getVehicleByTransportista(
        transportistaId
      ));

    if (!vehicle) {
      setErrorDialog({
        title:
          "Transportista sin placa",

        message:
          "El transportista seleccionado no tiene una placa activa asociada. Corrija el registro antes de continuar.",
      });

      // undefined significa error de validación. null está reservado
      // para el caso válido CLIENTE RETIRA sin placa.
      return undefined;
    }

    setSelectedVehicle(
      vehicle
    );

    return vehicle.id;
  }

  async function register(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!factura.trim()) {
      setMissingFields([
        "Factura",
      ]);
      return;
    }

    if (!isValidFactura(factura)) {
      setErrorDialog({
        title: "Factura inválida",
        message:
          "La factura debe contener exactamente 20 números, sin letras, espacios ni símbolos.",
      });
      focusScanner();
      return;
    }

    setLoading(true);

    try {
      const existingContext =
        await inspectFacturaScan(
          factura.trim()
        );

      if (
        existingContext?.estado ===
        "ATENDIENDO"
      ) {
        await hydrateDispatchContext(
          existingContext
        );
      }

      const current =
        existingContext
          ? await processFacturaScan(
              factura.trim(),
              null,
              userId,
              existingContext
            )
          : null;

      if (current) {
        if (
          current.kind ===
            "BLOCKED_CANCELLED" ||
          current.kind ===
            "BLOCKED_ALREADY_DISPATCHED"
        ) {
          setScanResult(
            current
          );

          return;
        }

        if (
          current.kind ===
          "FINALIZED"
        ) {
          resetScan();

          await refreshRows();

          return;
        }
      }

      const missing =
        getMissingFields(
          false
        );

      if (
        missing.length > 0
      ) {
        setMissingFields(
          missing
        );

        return;
      }

      const vehicleId =
        await resolveVehicleId();

      if (vehicleId === undefined) {
        return;
      }

      const result =
        await processFacturaScan(
          factura.trim(),
          {
            factura:
              factura.trim(),

            responsableId,
            companiaId,
            rutaId,
            transportistaId,

            vehiculoId:
              vehicleId,

            detalle:
              detalle.trim() ||
              null,
          },
          userId,
          null
        );

      if (
        result.kind ===
          "BLOCKED_CANCELLED" ||
        result.kind ===
          "BLOCKED_ALREADY_DISPATCHED"
      ) {
        setScanResult(
          result
        );

        return;
      }

      resetScan();

      await refreshRows();
    } catch (cause) {
      setErrorDialog({
        title:
          "No se pudo procesar la factura",

        message:
          cause instanceof Error
            ? cause.message
            : "Ocurrió un error al procesar el escaneo.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function executeDelete(
    row: DispatchListItem
  ) {
    const protectedState =
      row.estado !==
      "ATENDIENDO";

    if (
      protectedState &&
      role === "ADMIN" &&
      !deleteReason.trim()
    ) {
      return;
    }

    setLoading(true);

    try {
      await deleteDispatch(
        row.id,

        protectedState
          ? deleteReason.trim()
          : undefined
      );

      setConfirm(null);

      setDeleteReason("");

      await refreshRows();

      focusScanner();
    } catch (cause) {
      setConfirm(null);

      setDeleteReason("");

      setErrorDialog({
        title:
          "No se pudo eliminar el registro",

        message:
          cause instanceof Error
            ? cause.message
            : "La operación no pudo completarse.",
      });
    } finally {
      setLoading(false);
    }
  }

  const selectClass =
    "h-10 w-full rounded-lg border border-white/10 bg-[#07111F]/90 px-3 text-sm text-slate-100 outline-none transition focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/10";

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <section className="grid gap-3 xl:grid-cols-[0.94fr_1.06fr]">
        <div className="rounded-2xl border border-white/8 bg-[#0B1626]/74 p-4 shadow-[0_16px_50px_rgba(0,0,0,.2)] backdrop-blur-xl">
          <div className="mb-3 flex min-h-9 items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="grid size-8 place-items-center rounded-lg border border-amber-500/15 bg-amber-500/[0.06] text-amber-400">
                <ScanLine className="size-4" />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-slate-200">
                  Escaneo y operación
                </h2>

                <p className="text-[11px] text-slate-600">
                  Primer escaneo inicia. Segundo escaneo finaliza.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {selectedVehicle ? (
                <div className="inline-flex items-center gap-2 rounded-lg border border-amber-500/15 bg-amber-500/[0.045] px-3 py-1.5 text-xs text-slate-400">
                  <Truck className="size-3.5 text-amber-400" />

                  Placa

                  <span className="font-semibold text-amber-300">
                    {selectedVehicle.placa}
                  </span>
                </div>
              ) : null}

              <Button
                type="button"
                variant="outline"
                onClick={clearOperationalContext}
                className="h-8 shrink-0 border-amber-500/15 bg-amber-500/[0.04] px-2.5 text-xs text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                title="Limpiar selección actual"
              >
                <RotateCcw className="size-3.5" />
                Limpiar
              </Button>
            </div>
          </div>

          <form
            onSubmit={register}
            className="grid gap-3"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid content-start gap-3">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                    <ScanLine className="size-3.5 text-amber-400/70" />

                    Factura
                  </Label>

                  <Input
                    ref={facturaRef}
                    value={factura}
                    onChange={(
                      event
                    ) =>
                      setFactura(
                        normalizeFactura(
                          event.target
                            .value
                        )
                      )
                    }

                    type="text"
                    inputMode="numeric"
                    maxLength={FACTURA_LENGTH}
                    pattern="[0-9]{20}"
                    placeholder="Escanee la factura"
                    autoComplete="off"
                    className="h-11 border-amber-500/20 bg-[#07111F] text-base text-slate-100 placeholder:text-sm placeholder:text-slate-700 focus-visible:border-amber-500/60 focus-visible:ring-amber-500/10"
                    onInvalid={(event) => {
  event.currentTarget.setCustomValidity(
    "Debe contener 20 números y sin letras."
  );
}}
onInput={(event) => {
  event.currentTarget.setCustomValidity("");
}}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-slate-400">
                    Detalle
                  </Label>

                  <Textarea
                    value={detalle}
                    onChange={(
                      event
                    ) =>
                      setDetalle(
                        event.target
                          .value
                      )
                    }
                    rows={3}
                    className="min-h-[84px] resize-none border-white/10 bg-[#07111F]/90 text-sm text-slate-100 placeholder:text-slate-700 focus-visible:border-amber-500/35"
                    placeholder="Detalle opcional"
                  />
                </div>
              </div>

              <div className="grid content-start gap-3">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                    <UserRound className="size-3.5 text-amber-400/70" />

                    Responsable
                  </Label>

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
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                    <Truck className="size-3.5 text-amber-400/70" />

                    Transportista
                  </Label>

                  <div className="flex gap-2">
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

                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 shrink-0 border-amber-500/15 bg-amber-500/[0.04] px-3 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                      onClick={() =>
                        setTransportModal(
                          true
                        )
                      }
                      title="Agregar transportista"
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full bg-amber-500 text-sm font-semibold text-slate-950 hover:bg-amber-600"
              >
                <ScanLine className="size-4" />

                Procesar escaneo
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() =>
                  setCancelOrderModal(true)
                }
                className="h-11 w-full border-red-400/20 bg-red-400/[0.045] text-sm font-medium text-red-300 hover:bg-red-400/10 hover:text-red-200"
              >
                <AlertTriangle className="size-4" />

                Pedido cancelado
              </Button>
            </div>
          </form>
        </div>

        <div className="rounded-2xl border border-white/8 bg-[#0B1626]/74 p-4 shadow-[0_16px_50px_rgba(0,0,0,.2)] backdrop-blur-xl">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-lg border border-blue-400/15 bg-blue-400/[0.06] text-blue-300">
              <Building2 className="size-4" />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-200">
                Compañía y rutas
              </h2>

              <p className="text-[11px] text-slate-600">
                Las rutas dependen de la compañía seleccionada.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-slate-400">
                Compañía
              </Label>

              <select
                className={
                  selectClass
                }
                value={companiaId}
                onChange={(
                  event
                ) => {
                  setCompaniaId(
                    event.target.value
                  );

                  setRutaId("");
                }}
              >
                <option value="">
                  Seleccionar compañía
                </option>

                {companias.map(
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

            <div>
              <Label className="text-[11px] font-medium text-slate-400">
                Ruta
              </Label>

              {!companiaId ? (
                <div className="mt-1.5 grid min-h-[94px] place-items-center rounded-xl border border-dashed border-white/8 bg-black/10 text-sm text-slate-700">
                  Seleccione una compañía
                </div>
              ) : (
                <div className="mt-2 grid grid-cols-7 gap-2 2xl:grid-cols-10">
                  {rutas.map(
                    (ruta) => (
                      <button
                        key={
                          ruta.id
                        }
                        type="button"
                        onClick={() =>
                          setRutaId(
                            ruta.id
                          )
                        }
                        className={[
                          "h-9 rounded-lg border text-xs font-semibold transition",

                          rutaId ===
                          ruta.id
                            ? "border-amber-400/50 bg-amber-500 text-slate-950 shadow-[0_0_18px_rgba(245,158,11,.15)]"
                            : "border-white/8 bg-[#07111F]/75 text-slate-400 hover:border-amber-500/20 hover:bg-amber-500/[0.05] hover:text-amber-300",
                        ].join(
                          " "
                        )}
                      >
                        {
                          ruta.numero
                        }
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/8 bg-[#0B1626]/58 p-3 shadow-[0_16px_50px_rgba(0,0,0,.18)] backdrop-blur-xl">
        <div className="mb-2.5 flex items-end justify-between px-1">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">
              Historial en tiempo real
            </h2>

            <p className="text-[11px] text-slate-600">
              Filtre y corrija sin abandonar la pantalla.
            </p>
          </div>

          <span className="rounded-md border border-white/8 bg-white/[0.025] px-2.5 py-1 text-[11px] text-slate-500">
            {rows.length} registros
          </span>
        </div>

        <DispatchTable
          rows={rows}
          role={role}
          onFinalize={NOOP_FINALIZE}
          onDelete={requestDelete}
          onEdit={requestEdit}
        />
      </section>

      <FloatingMetrics
        data={kpis}
      />

      <CancelOrderDialog
        open={cancelOrderModal}
        userId={userId}
        responsables={responsables}
        companias={companias}
        initialResponsableId={responsableId}
        initialCompaniaId={companiaId}
        initialRutaId={rutaId}
        onClose={() => {
          setCancelOrderModal(false);
          focusScanner();
        }}
        onSuccess={refreshRows}
      />

      <ScanResultDialog
        result={scanResult}
        onClose={() => {
          setScanResult(null);

          resetScan();
        }}
      />

      <AppDialog
        open={
          missingFields.length >
          0
        }
        tone="warning"
        title="Información incompleta"
        description={
          missingFields.length ===
          1
            ? "Falta un dato necesario para completar la operación."
            : "Faltan datos necesarios para completar la operación."
        }
        onClose={() => {
          setMissingFields(
            []
          );

          focusScanner();
        }}
      >
        <div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-3">
          <p className="mb-2 text-xs text-slate-400">
            Complete:
          </p>

          <ul className="space-y-1 text-sm text-slate-200">
            {missingFields.map(
              (field) => (
                <li key={field}>
                  • {field}
                </li>
              )
            )}
          </ul>
        </div>
      </AppDialog>

      <AppDialog
        open={
          confirm?.kind ===
          "DELETE"
        }
        tone="danger"
        title="Eliminar registro"
        description={
          confirm?.kind ===
          "DELETE"
            ? `Factura ${confirm.row.factura} · ${confirm.row.estado}`
            : undefined
        }
        confirmLabel="Eliminar"
        loading={loading}
        confirmDisabled={
          confirm?.kind ===
            "DELETE" &&
          confirm.row.estado !==
            "ATENDIENDO" &&
          role === "ADMIN" &&
          !deleteReason.trim()
        }
        onConfirm={() => {
          if (
            confirm?.kind ===
            "DELETE"
          ) {
            return executeDelete(
              confirm.row
            );
          }
        }}
        onClose={() => {
          setConfirm(null);

          setDeleteReason("");
        }}
      >
        {confirm?.kind ===
          "DELETE" &&
        confirm.row.estado !==
          "ATENDIENDO" &&
        role === "ADMIN" ? (
          <div className="space-y-2">
            <Label className="text-xs text-slate-300">
              Motivo de eliminación
            </Label>

            <Textarea
              value={
                deleteReason
              }
              onChange={(
                event
              ) =>
                setDeleteReason(
                  event.target
                    .value
                )
              }
              className="border-white/10 bg-white/[0.04] text-slate-100"
              rows={3}
              placeholder="Explique el motivo administrativo"
            />
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            Esta acción requiere confirmación.
          </p>
        )}
      </AppDialog>

      <AppDialog
        open={
          Boolean(
            errorDialog
          )
        }
        tone="warning"
        title={
          errorDialog?.title ??
          "No se pudo completar"
        }
        description={
          errorDialog?.message
        }
        onClose={() => {
          setErrorDialog(null);

          focusScanner();
        }}
      />

      <EditDispatchModal
        row={editRow}
        role={role}
        onClose={() =>
          setEditRow(null)
        }
        onSaved={
          refreshRows
        }
      />

      <CreateTransportistaModal
        open={transportModal}
        onClose={() =>
          setTransportModal(
            false
          )
        }
        onCreated={
          refreshTransportistas
        }
      />
    </div>
  );
}
