"use client";

import { AppDialog } from "@/components/app/app-dialog";
import { formatDateTime } from "@/lib/utils/date";
import type { ScanDecision } from "@/types/dispatch";

export function StatusAlert({
  decision,
  onClose,
}: {
  decision: Exclude<
    ScanDecision,
    { kind: "AVAILABLE" }
  > | null;
  onClose: () => void;
}) {
  if (!decision) {
    return null;
  }

  if (decision.kind === "CANCELLED") {
    return (
      <AppDialog
        open
        tone="danger"
        title="PEDIDO CANCELADO — NO DESPACHAR"
        description="Esta factura fue bloqueada y no puede continuar por el flujo normal."
        onClose={onClose}
      >
        <div className="grid gap-2 rounded-xl border border-red-400/15 bg-red-500/[0.05] p-3">
          <Detail
            label="Factura"
            value={decision.dispatch.factura}
          />
          <Detail
            label="Cancelado"
            value={formatDateTime(
              decision.dispatch.fecha_hora_cancelacion
            )}
          />
          <Detail
            label="Detalle"
            value={decision.dispatch.detalle ?? "-"}
          />
        </div>
      </AppDialog>
    );
  }

  if (
    decision.kind === "ALREADY_DISPATCHED"
  ) {
    return (
      <AppDialog
        open
        tone="info"
        title="Factura ya despachada"
        description="Esta factura ya completó su proceso de despacho."
        onClose={onClose}
      >
        <div className="grid gap-2 rounded-xl border border-emerald-400/15 bg-emerald-500/[0.05] p-3">
          <Detail
            label="Factura"
            value={decision.dispatch.factura}
          />
          <Detail
            label="Finalizada"
            value={formatDateTime(
              decision.dispatch.fecha_hora_final
            )}
          />
        </div>
      </AppDialog>
    );
  }

  return (
    <AppDialog
      open
      tone="warning"
      title="Factura en proceso"
      description="Esta factura actualmente se encuentra siendo atendida."
      onClose={onClose}
    >
      <div className="grid gap-2 rounded-xl border border-amber-400/15 bg-amber-500/[0.05] p-3">
        <Detail
          label="Factura"
          value={decision.dispatch.factura}
        />
        <Detail
          label="Iniciada"
          value={formatDateTime(
            decision.dispatch.fecha_hora_inicio
          )}
        />
      </div>
    </AppDialog>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-4 text-xs">
      <span className="text-slate-500">
        {label}
      </span>
      <span className="text-right font-medium text-slate-200">
        {value}
      </span>
    </div>
  );
}
