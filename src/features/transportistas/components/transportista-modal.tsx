"use client";

import { useEffect, useState } from "react";
import { AppDialog } from "@/components/app/app-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createTransportistaWithPlate,
  updateTransportistaPlaca,
} from "@/services/admin.service";
import type { TransportistaPlacaRow } from "@/types/admin";

export function TransportistaModal({
  open,
  row,
  canChangeStatus,
  onClose,
  onSaved,
}: {
  open: boolean;
  row: TransportistaPlacaRow | null;
  canChangeStatus: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [placa, setPlaca] = useState("");
  const [activo, setActivo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = window.setTimeout(() => {
      setNombreCompleto(row?.nombre_completo ?? "");
      setPlaca(row?.placa ?? "");
      setActivo(row?.transportista_activo ?? true);
      setError(null);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [open, row]);

  async function save() {
    if (!nombreCompleto.trim() || !placa.trim()) {
      setError("Nombre completo y placa son obligatorios.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (row) {
        await updateTransportistaPlaca({
          transportistaId: row.transportista_id,
          vehiculoId: row.vehiculo_id,
          nombreCompleto,
          placa,
          activo,
        });
      } else {
        await createTransportistaWithPlate({
          nombreCompleto,
          placa,
        });
      }

      await onSaved();
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo guardar."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppDialog
      open={open}
      tone="info"
      title={row ? "Editar transportista" : "Agregar transportista"}
      description="Cada transportista tiene exactamente una placa."
      confirmLabel="Guardar"
      loading={loading}
      onConfirm={save}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-300">
            Nombre completo
          </Label>
          <Input
            value={nombreCompleto}
            onChange={(event) => setNombreCompleto(event.target.value)}
            className="border-white/10 bg-white/[0.04] text-slate-100"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-slate-300">
            Placa
          </Label>
          <Input
            value={placa}
            onChange={(event) =>
              setPlaca(event.target.value.toUpperCase())
            }
            className="border-white/10 bg-white/[0.04] text-slate-100"
          />
        </div>

        {row && canChangeStatus ? (
          <label className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.025] p-3 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={activo}
              onChange={(event) => setActivo(event.target.checked)}
            />
            Transportista activo
          </label>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-xs text-red-300">
            {error}
          </div>
        ) : null}
      </div>
    </AppDialog>
  );
}
