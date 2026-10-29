"use client";

import { Building2 } from "lucide-react";

import { Label } from "@/components/ui/label";
import type { Compania, Ruta } from "@/types/catalog";

import { workspaceSelectClass } from "./workspace-styles";

type CompanyRouteCardProps = {
  companias: Compania[];
  companiaId: string;
  onCompaniaChange: (id: string) => void;
  rutas: Ruta[];
  rutaId: string;
  onRutaChange: (id: string) => void;
};

// Compañía y botones de ruta; las rutas dependen de la compañía elegida.
export function CompanyRouteCard({
  companias,
  companiaId,
  onCompaniaChange,
  rutas,
  rutaId,
  onRutaChange,
}: CompanyRouteCardProps) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#0B1626]/74 p-4 shadow-[0_16px_50px_rgba(0,0,0,.2)] backdrop-blur-xl">
      <div className="mb-3 flex items-center gap-2.5">
        <div className="grid size-8 place-items-center rounded-lg border border-blue-400/15 bg-blue-400/[0.06] text-blue-300">
          <Building2 className="size-4" />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-slate-200">
            Compañía y rutas
          </h2>

          <p className="text-[11px] text-slate-400">
            Las rutas dependen de la compañía seleccionada.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label
            htmlFor="dispatch-compania"
            className="text-[11px] font-medium text-slate-400"
          >
            Compañía
          </Label>

          <select
            id="dispatch-compania"
            className={workspaceSelectClass}
            value={companiaId}
            onChange={(event) => onCompaniaChange(event.target.value)}
          >
            <option value="">Seleccionar compañía</option>

            {companias.map((compania) => (
              <option key={compania.id} value={compania.id}>
                {compania.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p
            id="dispatch-ruta"
            className="text-[11px] font-medium text-slate-400"
          >
            Ruta
          </p>

          {!companiaId ? (
            <div className="mt-1.5 grid min-h-[94px] place-items-center rounded-xl border border-dashed border-white/8 bg-black/10 text-sm text-slate-400">
              Seleccione una compañía
            </div>
          ) : (
            <div
              role="group"
              aria-labelledby="dispatch-ruta"
              className="mt-2 grid grid-cols-7 gap-2 2xl:grid-cols-10"
            >
              {rutas.map((ruta) => (
                <button
                  key={ruta.id}
                  type="button"
                  aria-pressed={rutaId === ruta.id}
                  onClick={() => onRutaChange(ruta.id)}
                  className={[
                    "h-9 rounded-lg border text-xs font-semibold transition",

                    rutaId === ruta.id
                      ? "border-amber-400/50 bg-amber-500 text-slate-950 shadow-[0_0_18px_rgba(245,158,11,.15)]"
                      : "border-white/8 bg-[#07111F]/75 text-slate-400 hover:border-amber-500/20 hover:bg-amber-500/[0.05] hover:text-amber-300",
                  ].join(" ")}
                >
                  {ruta.numero}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
