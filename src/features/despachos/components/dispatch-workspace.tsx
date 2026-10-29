"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { AppDialog } from "@/components/app/app-dialog";
import { isValidInvoice } from "@/domain/dispatch/invoice.rules";
import { FloatingMetrics } from "@/features/metrics/components/floating-metrics";
import { CreateTransportistaModal } from "@/features/transportistas/components/create-transportista-modal";
import {
  listCompaniasActivas,
  listResponsablesActivos,
  listRutasByCompania,
  listTransportistasActivos,
} from "@/services/catalog.service";
import { deleteDispatch, listDispatches } from "@/services/dispatch.service";
import {
  inspectFacturaScan,
  processFacturaScan,
} from "@/services/scan.service";
import { getVehicleByTransportista } from "@/services/vehicle.service";
import type { UserRole } from "@/types/auth";
import type {
  Compania,
  Responsable,
  Ruta,
  Transportista,
  Vehiculo,
} from "@/types/catalog";
import type { DispatchListItem } from "@/types/dispatch";
import type { ProcessScanResult, ScanDispatchContext } from "@/types/scan";

import {
  calculateKpis,
  DISPATCH_CONTEXT_STORAGE_KEY,
  EMPTY_CONTEXT,
  isClienteRetira,
  missingDispatchFields,
  parsePersistedContext,
} from "../domain/workspace";
import {
  HISTORY_LIMIT,
  useDispatchHistory,
} from "../hooks/use-dispatch-history";
import { CancelOrderDialog } from "./cancel-order-dialog";
import { CompanyRouteCard } from "./company-route-card";
import { DispatchTable } from "./dispatch-table";
import { EditDispatchModal } from "./edit-dispatch-modal";
import { ScanFormCard } from "./scan-form-card";
import { ScanResultDialog } from "./scan-result-dialog";
import {
  DeleteDispatchDialog,
  MissingFieldsDialog,
  needsDeleteReason,
} from "./workspace-dialogs";

type BlockedScan = Extract<
  ProcessScanResult,
  { kind: "BLOCKED_CANCELLED" | "BLOCKED_ALREADY_DISPATCHED" }
>;

function isBlocked(result: ProcessScanResult): result is BlockedScan {
  return (
    result.kind === "BLOCKED_CANCELLED" ||
    result.kind === "BLOCKED_ALREADY_DISPATCHED"
  );
}

function errorMessage(cause: unknown, fallback: string) {
  return cause instanceof Error ? cause.message : fallback;
}

// Pantalla de despacho: guarda el estado del escaneo y coordina el formulario, la compañía y
// la ruta, el historial en tiempo real y los diálogos.
export function DispatchWorkspace({
  userId,
  role,
}: {
  userId: string;
  role: UserRole;
}) {
  const facturaRef = useRef<HTMLInputElement>(null);

  const [factura, setFactura] = useState("");
  const [detalle, setDetalle] = useState("");

  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [companias, setCompanias] = useState<Compania[]>([]);
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [transportistas, setTransportistas] = useState<Transportista[]>([]);

  const [responsableId, setResponsableId] = useState("");
  const [companiaId, setCompaniaId] = useState("");
  const [rutaId, setRutaId] = useState("");
  const [transportistaId, setTransportistaId] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehiculo | null>(null);

  const selectedTransportista = useMemo(
    () => transportistas.find((item) => item.id === transportistaId) ?? null,
    [transportistas, transportistaId],
  );
  const clienteRetiraSeleccionado = isClienteRetira(selectedTransportista);

  const { rows, setRows, refreshRows } = useDispatchHistory();

  const [scanResult, setScanResult] = useState<BlockedScan | null>(null);
  const [deleteRow, setDeleteRow] = useState<DispatchListItem | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [errorDialog, setErrorDialog] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [editRow, setEditRow] = useState<DispatchListItem | null>(null);
  const [transportModal, setTransportModal] = useState(false);
  const [cancelOrderModal, setCancelOrderModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const refreshTransportistas = useCallback(async () => {
    setTransportistas(await listTransportistasActivos());
  }, []);

  const requestDelete = useCallback(async (row: DispatchListItem) => {
    setDeleteReason("");
    setDeleteRow(row);
  }, []);

  const requestEdit = useCallback((row: DispatchListItem) => {
    setEditRow(row);
  }, []);

  useEffect(() => {
    const persisted = parsePersistedContext(
      localStorage.getItem(DISPATCH_CONTEXT_STORAGE_KEY),
    );

    void Promise.all([
      listResponsablesActivos(),
      listCompaniasActivas(),
      listTransportistasActivos(),
      listDispatches(HISTORY_LIMIT),
    ])
      .then(
        ([
          responsablesData,
          companiasData,
          transportistasData,
          dispatchesData,
        ]) => {
          setResponsables(responsablesData);
          setCompanias(companiasData);
          setTransportistas(transportistasData);
          setRows(dispatchesData);
          setResponsableId(persisted.responsableId);
          setCompaniaId(persisted.companiaId);
          setRutaId(persisted.rutaId);
          setTransportistaId(persisted.transportistaId);
        },
      )
      .catch((cause) => {
        setErrorDialog({
          title: "No se pudo cargar la vista",
          message: errorMessage(cause, "Ocurrió un error al cargar los datos."),
        });
      });

    facturaRef.current?.focus();
  }, [setRows]);

  useEffect(() => {
    if (!companiaId) {
      const timer = window.setTimeout(() => {
        setRutas([]);
      }, 0);

      return () => window.clearTimeout(timer);
    }

    void listRutasByCompania(companiaId)
      .then(setRutas)
      .catch(() => {
        setErrorDialog({
          title: "No se pudieron cargar las rutas",
          message: "Intente seleccionar nuevamente la compañía.",
        });
      });
  }, [companiaId]);

  useEffect(() => {
    if (!transportistaId || clienteRetiraSeleccionado) {
      const timer = window.setTimeout(() => {
        setSelectedVehicle(null);
      }, 0);

      return () => window.clearTimeout(timer);
    }

    void getVehicleByTransportista(transportistaId)
      .then(setSelectedVehicle)
      .catch(() => {
        setSelectedVehicle(null);
      });
  }, [transportistaId, clienteRetiraSeleccionado]);

  useEffect(() => {
    localStorage.setItem(
      DISPATCH_CONTEXT_STORAGE_KEY,
      JSON.stringify({ responsableId, companiaId, rutaId, transportistaId }),
    );
  }, [responsableId, companiaId, rutaId, transportistaId]);

  const kpis = useMemo(() => calculateKpis(rows), [rows]);

  function focusScanner() {
    window.setTimeout(() => facturaRef.current?.focus(), 0);
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
      DISPATCH_CONTEXT_STORAGE_KEY,
      JSON.stringify(EMPTY_CONTEXT),
    );

    focusScanner();
  }

  // En el segundo escaneo, la pantalla muestra el contexto con el que se inició el despacho.
  async function hydrateDispatchContext(dispatch: ScanDispatchContext) {
    setResponsableId(dispatch.responsable_id ?? "");
    setTransportistaId(dispatch.transportista_id ?? "");

    if (dispatch.vehiculo_id && dispatch.transportista_id && dispatch.placa) {
      setSelectedVehicle({
        id: dispatch.vehiculo_id,
        transportista_id: dispatch.transportista_id,
        placa: dispatch.placa,
        activo: true,
      });
    } else {
      setSelectedVehicle(null);
    }

    setDetalle(dispatch.detalle ?? "");

    const nextCompaniaId = dispatch.compania_id ?? "";

    setCompaniaId(nextCompaniaId);

    if (!nextCompaniaId) {
      setRutas([]);
      setRutaId("");
      return;
    }

    const availableRoutes = await listRutasByCompania(nextCompaniaId);

    setRutas(availableRoutes);

    const storedRouteId = dispatch.ruta_id ?? "";

    setRutaId(
      storedRouteId &&
        availableRoutes.some((route) => route.id === storedRouteId)
        ? storedRouteId
        : "",
    );
  }

  // undefined: error de validación ya mostrado. null: válido sin placa (CLIENTE RETIRA).
  async function resolveVehicleId(): Promise<string | null | undefined> {
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
      selectedVehicle ?? (await getVehicleByTransportista(transportistaId));

    if (!vehicle) {
      setErrorDialog({
        title: "Transportista sin placa",
        message:
          "El transportista seleccionado no tiene una placa activa asociada. Corrija el registro antes de continuar.",
      });
      return undefined;
    }

    setSelectedVehicle(vehicle);

    return vehicle.id;
  }

  async function register(event: FormEvent) {
    event.preventDefault();

    if (!factura.trim()) {
      setMissingFields(["Factura"]);
      return;
    }

    if (!isValidInvoice(factura)) {
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
      const existingContext = await inspectFacturaScan(factura.trim());

      if (existingContext?.estado === "ATENDIENDO") {
        await hydrateDispatchContext(existingContext);
      }

      const current = existingContext
        ? await processFacturaScan(factura.trim(), null, existingContext)
        : null;

      if (current && isBlocked(current)) {
        setScanResult(current);
        return;
      }

      if (current?.kind === "FINALIZED") {
        resetScan();
        await refreshRows();
        return;
      }

      const missing = missingDispatchFields(
        { factura, responsableId, transportistaId, companiaId, rutaId },
        false,
      );

      if (missing.length > 0) {
        setMissingFields(missing);
        return;
      }

      const vehicleId = await resolveVehicleId();

      if (vehicleId === undefined) {
        return;
      }

      const result = await processFacturaScan(
        factura.trim(),
        {
          factura: factura.trim(),
          responsableId,
          companiaId,
          rutaId,
          transportistaId,
          vehiculoId: vehicleId,
          detalle: detalle.trim() || null,
        },
        null,
      );

      if (isBlocked(result)) {
        setScanResult(result);
        return;
      }

      resetScan();
      await refreshRows();
    } catch (cause) {
      setErrorDialog({
        title: "No se pudo procesar la factura",
        message: errorMessage(
          cause,
          "Ocurrió un error al procesar el escaneo.",
        ),
      });
    } finally {
      setLoading(false);
    }
  }

  function closeDeleteDialog() {
    setDeleteRow(null);
    setDeleteReason("");
  }

  async function executeDelete(row: DispatchListItem) {
    const protectedState = row.estado !== "ATENDIENDO";

    if (needsDeleteReason(row, role) && !deleteReason.trim()) {
      return;
    }

    setLoading(true);

    try {
      await deleteDispatch(
        row.id,
        protectedState ? deleteReason.trim() : undefined,
      );
      closeDeleteDialog();
      await refreshRows();
      focusScanner();
    } catch (cause) {
      closeDeleteDialog();
      setErrorDialog({
        title: "No se pudo eliminar el registro",
        message: errorMessage(cause, "La operación no pudo completarse."),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <section className="grid gap-3 xl:grid-cols-[0.94fr_1.06fr]">
        <ScanFormCard
          facturaRef={facturaRef}
          factura={factura}
          onFacturaChange={setFactura}
          detalle={detalle}
          onDetalleChange={setDetalle}
          responsables={responsables}
          responsableId={responsableId}
          onResponsableChange={setResponsableId}
          transportistas={transportistas}
          transportistaId={transportistaId}
          onTransportistaChange={setTransportistaId}
          selectedVehicle={selectedVehicle}
          loading={loading}
          onSubmit={register}
          onClear={clearOperationalContext}
          onAddTransportista={() => setTransportModal(true)}
          onCancelOrder={() => setCancelOrderModal(true)}
        />

        <CompanyRouteCard
          companias={companias}
          companiaId={companiaId}
          onCompaniaChange={(id) => {
            setCompaniaId(id);
            setRutaId("");
          }}
          rutas={rutas}
          rutaId={rutaId}
          onRutaChange={setRutaId}
        />
      </section>

      <section className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/8 bg-[#0B1626]/58 p-3 shadow-[0_16px_50px_rgba(0,0,0,.18)] backdrop-blur-xl">
        <div className="mb-2.5 flex items-end justify-between px-1">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">
              Historial en tiempo real
            </h2>

            <p className="text-[11px] text-slate-400">
              Filtre y corrija sin abandonar la pantalla.
            </p>
          </div>

          <span className="rounded-md border border-white/8 bg-white/[0.025] px-2.5 py-1 text-[11px] text-slate-400">
            {rows.length} registros
          </span>
        </div>

        <DispatchTable
          rows={rows}
          role={role}
          onDelete={requestDelete}
          onEdit={requestEdit}
        />
      </section>

      <FloatingMetrics data={kpis} />

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

      <MissingFieldsDialog
        fields={missingFields}
        onClose={() => {
          setMissingFields([]);
          focusScanner();
        }}
      />

      <DeleteDispatchDialog
        row={deleteRow}
        role={role}
        reason={deleteReason}
        onReasonChange={setDeleteReason}
        loading={loading}
        onConfirm={executeDelete}
        onClose={closeDeleteDialog}
      />

      <AppDialog
        open={Boolean(errorDialog)}
        tone="warning"
        title={errorDialog?.title ?? "No se pudo completar"}
        description={errorDialog?.message}
        onClose={() => {
          setErrorDialog(null);
          focusScanner();
        }}
      />

      <EditDispatchModal
        row={editRow}
        role={role}
        onClose={() => setEditRow(null)}
        onSaved={refreshRows}
      />

      <CreateTransportistaModal
        open={transportModal}
        onClose={() => setTransportModal(false)}
        onCreated={refreshTransportistas}
      />
    </div>
  );
}
