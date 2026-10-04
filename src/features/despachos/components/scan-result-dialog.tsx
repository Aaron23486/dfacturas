"use client";

import { AppDialog } from "@/components/app/app-dialog";
import {
  formatDateTime,
  formatDuration,
} from "@/lib/utils/date";
import type { ProcessScanResult } from "@/types/scan";

export function ScanResultDialog({
  result,
  onClose,
}: {
  result:
    | Extract<
        ProcessScanResult,
        {
          kind:
            | "BLOCKED_CANCELLED"
            | "BLOCKED_ALREADY_DISPATCHED";
        }
      >
    | null;
  onClose: () => void;
}) {
  if (!result) {
    return null;
  }

  const dispatch = result.dispatch;

  if (result.kind === "BLOCKED_CANCELLED") {
    return (
      <AppDialog
        open
        tone="danger"
        title="PEDIDO CANCELADO — NO DESPACHAR"
        description="Esta factura se encuentra bloqueada."
        onClose={onClose}
      >
        <div className="space-y-2 rounded-xl border border-red-400/15 bg-red-500/[0.04] p-3">
          <Row label="Factura" value={dispatch.factura} />
          <Row
            label="Responsable"
            value={dispatch.responsable_nombre ?? "-"}
          />
          <Row
            label="Compañía"
            value={dispatch.compania_nombre ?? "-"}
          />
          <Row
            label="Ruta"
            value={dispatch.ruta_numero?.toString() ?? "-"}
          />
          <Row
            label="Cancelado"
            value={formatDateTime(
              dispatch.fecha_hora_cancelacion
            )}
          />
          <Row label="Detalle" value={dispatch.detalle ?? "-"} />
        </div>
      </AppDialog>
    );
  }

  return (
    <AppDialog
      open
      tone="info"
      title="Factura ya despachada"
      description="Esta factura ya completó su proceso de despacho."
      onClose={onClose}
    >
      <div className="space-y-2 rounded-xl border border-emerald-400/15 bg-emerald-500/[0.04] p-3">
        <Row label="Factura" value={dispatch.factura} />
        <Row
          label="Responsable"
          value={dispatch.responsable_nombre ?? "-"}
        />
        <Row
          label="Transportista"
          value={dispatch.transportista_nombre ?? "-"}
        />
        <Row label="Placa" value={dispatch.placa ?? "-"} />
        <Row
          label="Compañía"
          value={dispatch.compania_nombre ?? "-"}
        />
        <Row
          label="Ruta"
          value={dispatch.ruta_numero?.toString() ?? "-"}
        />
        <Row
          label="Inicio"
          value={formatDateTime(dispatch.fecha_hora_inicio)}
        />
        <Row
          label="Final"
          value={formatDateTime(dispatch.fecha_hora_final)}
        />
        <Row
          label="Duración"
          value={formatDuration(
            dispatch.fecha_hora_inicio,
            dispatch.fecha_hora_final
          )}
        />
        <Row
          label="Detalle"
          value={dispatch.detalle?.trim() || "-"}
        />
      </div>
    </AppDialog>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-4 text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="max-w-[65%] text-right font-medium text-slate-200">
        {value}
      </span>
    </div>
  );
}
