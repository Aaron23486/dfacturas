"use client";

import { AppDialog } from "@/components/app/app-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { UserRole } from "@/types/auth";
import type { DispatchListItem } from "@/types/dispatch";

export function MissingFieldsDialog({
  fields,
  onClose,
}: {
  fields: string[];
  onClose: () => void;
}) {
  return (
    <AppDialog
      open={fields.length > 0}
      tone="warning"
      title="Información incompleta"
      description={
        fields.length === 1
          ? "Falta un dato necesario para completar la operación."
          : "Faltan datos necesarios para completar la operación."
      }
      onClose={onClose}
    >
      <div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-3">
        <p className="mb-2 text-xs text-slate-400">Complete:</p>

        <ul className="space-y-1 text-sm text-slate-200">
          {fields.map((field) => (
            <li key={field}>• {field}</li>
          ))}
        </ul>
      </div>
    </AppDialog>
  );
}

// Un despacho cerrado solo lo borra un ADMIN y con motivo (R-10); uno en curso, sin motivo.
export function needsDeleteReason(row: DispatchListItem, role: UserRole) {
  return row.estado !== "ATENDIENDO" && role === "ADMIN";
}

export function DeleteDispatchDialog({
  row,
  role,
  reason,
  onReasonChange,
  loading,
  onConfirm,
  onClose,
}: {
  row: DispatchListItem | null;
  role: UserRole;
  reason: string;
  onReasonChange: (value: string) => void;
  loading: boolean;
  onConfirm: (row: DispatchListItem) => Promise<void>;
  onClose: () => void;
}) {
  const askReason = row ? needsDeleteReason(row, role) : false;

  return (
    <AppDialog
      open={Boolean(row)}
      tone="danger"
      title="Eliminar registro"
      description={row ? `Factura ${row.factura} · ${row.estado}` : undefined}
      confirmLabel="Eliminar"
      loading={loading}
      confirmDisabled={askReason && !reason.trim()}
      onConfirm={() => {
        if (row) {
          return onConfirm(row);
        }
      }}
      onClose={onClose}
    >
      {askReason ? (
        <div className="space-y-2">
          <Label className="text-xs text-slate-300">
            Motivo de eliminación
          </Label>

          <Textarea
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
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
  );
}
