"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Power, Trash2 } from "lucide-react";

import { AppDialog } from "@/components/app/app-dialog";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils/date";
import {
  deleteTransportistaPlaca,
  updateTransportistaPlaca,
} from "@/services/admin.service";
import { listTransportistasConPlaca } from "@/services/catalog.service";
import type { TransportistaPlacaRow } from "@/types/admin";
import type { UserRole } from "@/types/auth";

import { TransportistaModal } from "./transportista-modal";

export function TransportistasAdmin({
  role,
}: {
  role: UserRole;
}) {
  const isAdmin = role === "ADMIN";

  const [rows, setRows] = useState<TransportistaPlacaRow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TransportistaPlacaRow | null>(null);
  const [confirmRow, setConfirmRow] = useState<TransportistaPlacaRow | null>(null);
  const [toggleRow, setToggleRow] = useState<TransportistaPlacaRow | null>(null);
  const [permissionDialog, setPermissionDialog] = useState(false);
  const [feedback, setFeedback] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setRows(await listTransportistasConPlaca());
  }

  useEffect(() => {
    let active = true;

    void listTransportistasConPlaca()
      .then((result) => {
        if (active) {
          setRows(result);
        }
      })
      .catch((cause) => {
        if (active) {
          setFeedback({
            title: "No se pudo cargar la información",
            message:
              cause instanceof Error ? cause.message : "Intente nuevamente.",
          });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  function adminOnly(action: () => void) {
    if (!isAdmin) {
      setPermissionDialog(true);
      return;
    }

    action();
  }

  async function toggle() {
    if (!toggleRow || !toggleRow.placa || !isAdmin) {
      return;
    }

    setLoading(true);

    try {
      await updateTransportistaPlaca({
        transportistaId: toggleRow.transportista_id,
        vehiculoId: toggleRow.vehiculo_id,
        nombreCompleto: toggleRow.nombre_completo,
        placa: toggleRow.placa,
        activo: !toggleRow.transportista_activo,
      });

      setToggleRow(null);
      await refresh();
    } catch (cause) {
      setToggleRow(null);
      setFeedback({
        title: "No se pudo actualizar el estado",
        message:
          cause instanceof Error
            ? cause.message
            : "La operación no pudo completarse.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!confirmRow || !isAdmin) {
      return;
    }

    setLoading(true);

    try {
      await deleteTransportistaPlaca({
        transportistaId: confirmRow.transportista_id,
        vehiculoId: confirmRow.vehiculo_id,
      });

      setConfirmRow(null);
      await refresh();
    } catch (cause) {
      setConfirmRow(null);
      setFeedback({
        title: "No se puede eliminar",
        message:
          cause instanceof Error
            ? cause.message
            : "Este registro no puede eliminarse.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-100">
            Transportistas y placas
          </h2>
          <p className="text-xs text-slate-600">
            Un transportista corresponde a una sola placa.
          </p>
        </div>

        <Button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="bg-amber-500 text-slate-950 hover:bg-amber-600"
        >
          <Plus className="size-4" />
          Agregar transportista
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#0B1626]/72 shadow-[0_16px_50px_rgba(0,0,0,.2)] backdrop-blur-xl">
        <table className="w-full text-xs">
          <thead className="bg-[#101C2C]/95 text-left text-[10px] uppercase tracking-[0.06em] text-slate-500">
            <tr>
              <th className="p-3">Transportista</th>
              <th className="p-3">Placa</th>
              <th className="p-3">Fecha creación</th>
              <th className="p-3">Estado</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr
                key={row.transportista_id}
                className="border-t border-white/[0.045] text-slate-300 transition hover:bg-amber-500/[0.025]"
              >
                <td className="p-3 font-medium text-slate-100">
                  {row.nombre_completo}
                </td>
                <td className="p-3 font-mono text-amber-300">
                  {row.placa ?? "-"}
                </td>
                <td className="p-3 text-slate-500">
                  {formatDate(
                    row.vehiculo_created_at ?? row.transportista_created_at
                  )}
                </td>
                <td className="p-3">
                  <span
                    className={[
                      "rounded-md border px-2 py-1 text-[10px]",
                      row.transportista_activo
                        ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                        : "border-white/8 bg-white/[0.03] text-slate-500",
                    ].join(" ")}
                  >
                    {row.transportista_activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 border-white/10 bg-white/[0.03] p-0 text-slate-400 hover:bg-white/[0.08] hover:text-white"
                      title="Editar"
                      onClick={() => {
                        setEditing(row);
                        setModalOpen(true);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 border-amber-400/15 bg-amber-400/[0.03] p-0 text-amber-300 hover:bg-amber-400/10"
                      title={row.transportista_activo ? "Desactivar" : "Activar"}
                      onClick={() => adminOnly(() => setToggleRow(row))}
                    >
                      <Power className="size-3.5" />
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 border-red-400/15 bg-red-400/[0.03] p-0 text-red-300 hover:bg-red-400/10"
                      title="Eliminar"
                      onClick={() => adminOnly(() => setConfirmRow(row))}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}

            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-10 text-center text-slate-600">
                  No hay transportistas registrados.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <TransportistaModal
        open={modalOpen}
        row={editing}
        canChangeStatus={isAdmin}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSaved={refresh}
      />

      <AppDialog
        open={Boolean(toggleRow) && isAdmin}
        tone="warning"
        title={
          toggleRow?.transportista_activo
            ? "Desactivar transportista"
            : "Activar transportista"
        }
        description={
          toggleRow
            ? `${toggleRow.nombre_completo} · ${toggleRow.placa ?? "-"}`
            : undefined
        }
        confirmLabel={toggleRow?.transportista_activo ? "Desactivar" : "Activar"}
        loading={loading}
        onConfirm={toggle}
        onClose={() => setToggleRow(null)}
      />

      <AppDialog
        open={Boolean(confirmRow) && isAdmin}
        tone="danger"
        title="Eliminar transportista"
        description={
          confirmRow
            ? `${confirmRow.nombre_completo} · ${confirmRow.placa ?? "-"}`
            : undefined
        }
        confirmLabel="Eliminar"
        loading={loading}
        onConfirm={remove}
        onClose={() => setConfirmRow(null)}
      >
        <p className="text-xs text-slate-400">
          Si posee historial de despachos, PostgreSQL bloqueará la eliminación
          para conservar la trazabilidad.
        </p>
      </AppDialog>

      <AppDialog
        open={permissionDialog}
        tone="warning"
        title="Permisos insuficientes"
        description="Necesita permisos de administrador para realizar esta acción."
        onClose={() => setPermissionDialog(false)}
      />

      <AppDialog
        open={Boolean(feedback)}
        tone="warning"
        title={feedback?.title ?? "No se pudo completar"}
        description={feedback?.message}
        onClose={() => setFeedback(null)}
      />
    </div>
  );
}
