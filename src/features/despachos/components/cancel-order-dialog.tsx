"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Building2,
  FileText,
  Route as RouteIcon,
  ScanLine,
  UserRound,
} from "lucide-react";

import { AppDialog } from "@/components/app/app-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { listRutasByCompania } from "@/services/catalog.service";
import { registerCancelledDispatch } from "@/services/dispatch.service";
import type {
  Compania,
  Responsable,
  Ruta,
} from "@/types/catalog";

const FACTURA_LENGTH = 20;
const FACTURA_PATTERN = /^\d{20}$/;

const selectClass =
  "h-12 w-full rounded-xl border border-white/10 bg-[#07111F]/90 px-4 text-base text-slate-100 outline-none transition focus:border-red-400/45 focus:ring-2 focus:ring-red-400/10";

function normalizeFactura(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, FACTURA_LENGTH);
}

function isValidFactura(value: string) {
  return FACTURA_PATTERN.test(value.trim());
}

type CancelOrderDialogProps = {
  open: boolean;
  userId: string;
  responsables: Responsable[];
  companias: Compania[];
  initialResponsableId?: string;
  initialCompaniaId?: string;
  initialRutaId?: string;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
};

export function CancelOrderDialog(props: CancelOrderDialogProps) {
  if (!props.open) {
    return null;
  }

  return <CancelOrderDialogContent {...props} />;
}

function CancelOrderDialogContent({
  open,
  userId,
  responsables,
  companias,
  initialResponsableId,
  initialCompaniaId,
  initialRutaId,
  onClose,
  onSuccess,
}: CancelOrderDialogProps) {
  const facturaRef = useRef<HTMLInputElement>(null);

  const [factura, setFactura] = useState("");
  const [responsableId, setResponsableId] = useState(
    initialResponsableId ?? ""
  );
  const [companiaId, setCompaniaId] = useState(
    initialCompaniaId ?? ""
  );
  const [rutaId, setRutaId] = useState(initialRutaId ?? "");
  const [detalle, setDetalle] = useState("");
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [loading, setLoading] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!companiaId) {
      return;
    }

    let active = true;

    void listRutasByCompania(companiaId)
      .then((data) => {
        if (!active) {
          return;
        }

        setRutas(data);
        setRutaId((current) =>
          current && data.some((route) => route.id === current)
            ? current
            : ""
        );
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setRutas([]);
        setRutaId("");
        setErrorMessage(
          "No se pudieron cargar las rutas. Seleccione nuevamente la compañía."
        );
      });

    return () => {
      active = false;
    };
  }, [companiaId]);

  function focusCancellationScanner() {
    window.setTimeout(() => facturaRef.current?.focus(), 0);
  }

  function validate() {
    const missing: string[] = [];

    if (!responsableId) {
      missing.push("Responsable");
    }

    if (!companiaId) {
      missing.push("Compañía");
    }

    if (!rutaId) {
      missing.push("Ruta");
    }

    if (!detalle.trim()) {
      missing.push("Detalle / motivo");
    }

    if (!factura.trim()) {
      missing.push("Factura");
    }

    setMissingFields(missing);

    if (missing.length > 0) {
      setErrorMessage(null);

      if (missing.length === 1 && missing[0] === "Factura") {
        focusCancellationScanner();
      }

      return false;
    }

    if (!isValidFactura(factura)) {
      setErrorMessage(
        "La factura debe contener exactamente 20 números, sin letras, espacios ni símbolos."
      );
      focusCancellationScanner();
      return false;
    }

    setErrorMessage(null);
    return true;
  }

  async function submitCancellation(event?: FormEvent) {
    event?.preventDefault();

    if (loading || !validate()) {
      return;
    }

    setLoading(true);

    try {
      await registerCancelledDispatch(
        {
          factura: factura.trim(),
          responsableId,
          companiaId,
          rutaId,
          detalle: detalle.trim(),
          transportistaId: null,
          vehiculoId: null,
        },
        userId
      );

      await onSuccess();
      onClose();
    } catch (cause) {
      setErrorMessage(
        cause instanceof Error
          ? cause.message
          : "Ocurrió un error al cancelar el pedido."
      );
      focusCancellationScanner();
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppDialog
      open={open}
      tone="danger"
      title="Registrar pedido cancelado"
      description="Este flujo es independiente del despacho normal. Complete los datos y escanee la factura como último paso."
      confirmLabel="Registrar pedido cancelado"
      panelClassName="max-w-[620px]"
      loading={loading}
      onConfirm={submitCancellation}
      onClose={() => {
        if (!loading) {
          onClose();
        }
      }}
    >
      <form
        className="space-y-5"
        onSubmit={submitCancellation}
        noValidate
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <UserRound className="size-4 text-red-300/80" />
              Responsable
            </Label>

            <select
              className={selectClass}
              value={responsableId}
              onChange={(event) => {
                setResponsableId(event.target.value);
                setMissingFields([]);
              }}
              disabled={loading}
            >
              <option value="">Seleccionar responsable</option>
              {responsables.map((responsable) => (
                <option key={responsable.id} value={responsable.id}>
                  {responsable.nombre_completo}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Building2 className="size-4 text-red-300/80" />
              Compañía
            </Label>

            <select
              className={selectClass}
              value={companiaId}
              onChange={(event) => {
                setCompaniaId(event.target.value);
                setRutaId("");
                setRutas([]);
                setMissingFields([]);
                setErrorMessage(null);
              }}
              disabled={loading}
            >
              <option value="">Seleccionar compañía</option>
              {companias.map((compania) => (
                <option key={compania.id} value={compania.id}>
                  {compania.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <RouteIcon className="size-4 text-red-300/80" />
              Ruta
            </Label>

            <select
              className={selectClass}
              value={rutaId}
              onChange={(event) => {
                setRutaId(event.target.value);
                setMissingFields([]);
              }}
              disabled={loading || !companiaId}
            >
              <option value="">
                {companiaId
                  ? "Seleccionar ruta"
                  : "Seleccione primero una compañía"}
              </option>
              {rutas.map((ruta) => (
                <option key={ruta.id} value={ruta.id}>
                  Ruta {ruta.numero}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <FileText className="size-4 text-red-300/80" />
            Detalle / motivo
          </Label>

          <Textarea
            value={detalle}
            onChange={(event) => {
              setDetalle(event.target.value);
              setMissingFields([]);
            }}
            rows={3}
            maxLength={1000}
            disabled={loading}
            className="min-h-[96px] resize-none rounded-xl border-white/10 bg-[#07111F]/90 px-4 py-3 text-base text-slate-100 placeholder:text-slate-600 focus-visible:border-red-400/45 focus-visible:ring-red-400/10"
            placeholder="Indique por qué se cancela el pedido"
          />
        </div>

        <div className="space-y-2 rounded-xl border border-red-400/15 bg-red-400/[0.035] p-4">
          <Label className="flex items-center gap-2 text-sm font-semibold text-red-200">
            <ScanLine className="size-4" />
            Factura — escanear al final
          </Label>

          <Input
            ref={facturaRef}
            value={factura}
            onChange={(event) => {
              setFactura(normalizeFactura(event.target.value));
              setMissingFields([]);
              setErrorMessage(null);
            }}
            type="text"
            inputMode="numeric"
            maxLength={FACTURA_LENGTH}
            autoComplete="off"
            disabled={loading}
            placeholder="Escanee la factura para cancelar"
            className="h-12 rounded-xl border-red-400/25 bg-[#07111F] px-4 text-base text-slate-100 placeholder:text-base placeholder:text-slate-600 focus-visible:border-red-400/70 focus-visible:ring-red-400/15"
          />

          <p className="text-xs leading-5 text-slate-400">
            El Enter enviado por el lector registra esta cancelación; no ejecuta el primer ni el segundo escaneo del flujo normal.
          </p>
        </div>

        {missingFields.length > 0 ? (
          <div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-3">
            <p className="mb-1.5 text-sm font-medium text-amber-200">
              Complete los datos requeridos:
            </p>
            <p className="text-sm text-slate-400">
              {missingFields.join(" · ")}
            </p>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3 text-sm leading-5 text-red-200">
            {errorMessage}
          </div>
        ) : null}

        <button
          type="submit"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        >
          Registrar pedido cancelado
        </button>
      </form>
    </AppDialog>
  );
}
