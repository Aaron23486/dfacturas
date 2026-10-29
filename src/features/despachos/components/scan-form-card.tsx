"use client";

import type { FormEvent, RefObject } from "react";

import {
  AlertTriangle,
  Plus,
  RotateCcw,
  ScanLine,
  Truck,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { INVOICE_LENGTH } from "@/domain/dispatch/dispatch.constants";
import { sanitizeInvoiceInput } from "@/domain/dispatch/invoice.rules";
import type { Responsable, Transportista, Vehiculo } from "@/types/catalog";

import { workspaceSelectClass } from "./workspace-styles";

type ScanFormCardProps = {
  facturaRef: RefObject<HTMLInputElement | null>;
  factura: string;
  onFacturaChange: (value: string) => void;
  detalle: string;
  onDetalleChange: (value: string) => void;
  responsables: Responsable[];
  responsableId: string;
  onResponsableChange: (id: string) => void;
  transportistas: Transportista[];
  transportistaId: string;
  onTransportistaChange: (id: string) => void;
  selectedVehicle: Vehiculo | null;
  loading: boolean;
  onSubmit: (event: FormEvent) => void;
  onClear: () => void;
  onAddTransportista: () => void;
  onCancelOrder: () => void;
};

// Formulario de escaneo: factura, detalle, responsable y transportista con su placa.
export function ScanFormCard({
  facturaRef,
  factura,
  onFacturaChange,
  detalle,
  onDetalleChange,
  responsables,
  responsableId,
  onResponsableChange,
  transportistas,
  transportistaId,
  onTransportistaChange,
  selectedVehicle,
  loading,
  onSubmit,
  onClear,
  onAddTransportista,
  onCancelOrder,
}: ScanFormCardProps) {
  return (
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

            <p className="text-[11px] text-slate-400">
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
            onClick={onClear}
            className="h-8 shrink-0 border-amber-500/15 bg-amber-500/[0.04] px-2.5 text-xs text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
            title="Limpiar selección actual"
          >
            <RotateCcw className="size-3.5" />
            Limpiar
          </Button>
        </div>
      </div>

      <form onSubmit={onSubmit} className="grid gap-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid content-start gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="dispatch-factura"
                className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400"
              >
                <ScanLine className="size-3.5 text-amber-400/70" />
                Factura
              </Label>

              <Input
                id="dispatch-factura"
                ref={facturaRef}
                value={factura}
                onChange={(event) =>
                  onFacturaChange(sanitizeInvoiceInput(event.target.value))
                }
                type="text"
                inputMode="numeric"
                maxLength={INVOICE_LENGTH}
                pattern="[0-9]{20}"
                placeholder="Escanee la factura"
                autoComplete="off"
                className="h-11 border-amber-500/20 bg-[#07111F] text-base text-slate-100 placeholder:text-sm placeholder:text-slate-700 focus-visible:border-amber-500/60 focus-visible:ring-amber-500/10"
                onInvalid={(event) => {
                  event.currentTarget.setCustomValidity(
                    "Debe contener 20 números y sin letras.",
                  );
                }}
                onInput={(event) => {
                  event.currentTarget.setCustomValidity("");
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="dispatch-detalle"
                className="text-[11px] font-medium text-slate-400"
              >
                Detalle
              </Label>

              <Textarea
                id="dispatch-detalle"
                value={detalle}
                onChange={(event) => onDetalleChange(event.target.value)}
                rows={3}
                className="min-h-[84px] resize-none border-white/10 bg-[#07111F]/90 text-sm text-slate-100 placeholder:text-slate-700 focus-visible:border-amber-500/35"
                placeholder="Detalle opcional"
              />
            </div>
          </div>

          <div className="grid content-start gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="dispatch-responsable"
                className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400"
              >
                <UserRound className="size-3.5 text-amber-400/70" />
                Responsable
              </Label>

              <select
                id="dispatch-responsable"
                className={workspaceSelectClass}
                value={responsableId}
                onChange={(event) => onResponsableChange(event.target.value)}
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
              <Label
                htmlFor="dispatch-transportista"
                className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400"
              >
                <Truck className="size-3.5 text-amber-400/70" />
                Transportista
              </Label>

              <div className="flex gap-2">
                <select
                  id="dispatch-transportista"
                  className={workspaceSelectClass}
                  value={transportistaId}
                  onChange={(event) =>
                    onTransportistaChange(event.target.value)
                  }
                >
                  <option value="">Seleccionar transportista</option>

                  {transportistas.map((transportista) => (
                    <option key={transportista.id} value={transportista.id}>
                      {transportista.nombre}{" "}
                      {transportista.apellido === "-"
                        ? ""
                        : transportista.apellido}
                    </option>
                  ))}
                </select>

                <Button
                  type="button"
                  variant="outline"
                  className="h-10 shrink-0 border-amber-500/15 bg-amber-500/[0.04] px-3 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                  onClick={onAddTransportista}
                  title="Agregar transportista"
                  aria-label="Agregar transportista"
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
            onClick={onCancelOrder}
            className="h-11 w-full border-red-400/20 bg-red-400/[0.045] text-sm font-medium text-red-300 hover:bg-red-400/10 hover:text-red-200"
          >
            <AlertTriangle className="size-4" />
            Pedido cancelado
          </Button>
        </div>
      </form>
    </div>
  );
}
