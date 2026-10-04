"use client";

import { useEffect, useState } from "react";
import { AppDialog } from "@/components/app/app-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTransportistaWithPlate } from "@/services/admin.service";

export function CreateTransportistaModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [placa, setPlaca] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = window.setTimeout(() => {
      setNombreCompleto("");
      setPlaca("");
      setError(null);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [open]);

  async function save() {
    if (!nombreCompleto.trim() || !placa.trim()) {
      setError("Nombre completo y placa son obligatorios.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createTransportistaWithPlate({
        nombreCompleto,
        placa,
      });

      await onCreated();
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo crear el transportista."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppDialog
      open={open}
      tone="info"
      title="Agregar transportista"
      description="Registre el nombre completo y su única placa."
      confirmLabel="Crear transportista"
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
            autoFocus
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

        {error ? (
          <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-xs text-red-300">
            {error}
          </div>
        ) : null}
      </div>
    </AppDialog>
  );
}
