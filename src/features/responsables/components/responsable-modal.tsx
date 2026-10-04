"use client";

import {
  useEffect,
  useState,
} from "react";
import { AppDialog } from "@/components/app/app-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createResponsable,
  updateResponsable,
} from "@/services/admin.service";
import type { Responsable } from "@/types/catalog";

export function ResponsableModal({
  open,
  row,
  onClose,
  onSaved,
}: {
  open: boolean;
  row: Responsable | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [gafete, setGafete] =
    useState("");
  const [nombre, setNombre] =
    useState("");
  const [activo, setActivo] =
    useState(true);
  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = window.setTimeout(() => {
      setGafete(row?.gafete ?? "");
      setNombre(
        row?.nombre_completo ?? ""
      );
      setActivo(row?.activo ?? true);
      setError(null);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [open, row]);

  async function save() {
    if (
      !gafete.trim() ||
      !nombre.trim()
    ) {
      setError(
        "Gafete y nombre son obligatorios."
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (row) {
        await updateResponsable(
          row.id,
          {
            gafete,
            nombre_completo: nombre,
            activo,
          }
        );
      } else {
        await createResponsable({
          gafete,
          nombre_completo: nombre,
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
      title={
        row
          ? "Editar responsable"
          : "Agregar responsable"
      }
      description="Administre el gafete, nombre y estado."
      confirmLabel="Guardar"
      loading={loading}
      onConfirm={save}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-300">
            Gafete
          </Label>
          <Input
            value={gafete}
            onChange={(event) =>
              setGafete(
                event.target.value
              )
            }
            className="border-white/10 bg-white/[0.04] text-slate-100"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-slate-300">
            Nombre completo
          </Label>
          <Input
            value={nombre}
            onChange={(event) =>
              setNombre(
                event.target.value
              )
            }
            className="border-white/10 bg-white/[0.04] text-slate-100"
          />
        </div>

        {row ? (
          <label className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.025] p-3 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={activo}
              onChange={(event) =>
                setActivo(
                  event.target.checked
                )
              }
            />
            Responsable activo
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
