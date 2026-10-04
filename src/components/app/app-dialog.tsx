"use client";

import type { ReactNode } from "react";
import {
  AlertTriangle,
  CircleAlert,
  Info,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DialogTone =
  | "default"
  | "info"
  | "warning"
  | "danger";

function toneClasses(tone: DialogTone) {
  switch (tone) {
    case "danger":
      return {
        icon: "border-red-400/30 bg-red-500/10 text-red-300",
        button:
          "bg-red-500 text-white hover:bg-red-400",
      };
    case "warning":
      return {
        icon: "border-amber-400/30 bg-amber-500/10 text-amber-300",
        button:
          "bg-amber-400 text-slate-950 hover:bg-amber-300",
      };
    case "info":
      return {
        icon: "border-amber-500/30 bg-amber-600/10 text-amber-400",
        button:
          "bg-amber-500 text-slate-950 hover:bg-amber-600",
      };
    default:
      return {
        icon: "border-white/10 bg-white/5 text-slate-300",
        button:
          "bg-amber-500 text-slate-950 hover:bg-amber-600",
      };
  }
}

function ToneIcon({
  tone,
}: {
  tone: DialogTone;
}) {
  const className = "size-5";

  if (tone === "danger") {
    return <Trash2 className={className} />;
  }

  if (tone === "warning") {
    return <AlertTriangle className={className} />;
  }

  if (tone === "info") {
    return <Info className={className} />;
  }

  return <ShieldAlert className={className} />;
}

export function AppDialog({
  open,
  title,
  description,
  tone = "default",
  children,
  confirmLabel,
  cancelLabel = "Cancelar",
  confirmDisabled = false,
  loading = false,
  onConfirm,
  onClose,
  panelClassName,
}: {
  open: boolean;
  title: string;
  description?: string;
  tone?: DialogTone;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmDisabled?: boolean;
  loading?: boolean;
  onConfirm?: () => void | Promise<void>;
  onClose: () => void;
  panelClassName?: string;
}) {
  if (!open) {
    return null;
  }

  const styles = toneClasses(tone);

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-[#07111F]/75 p-4 backdrop-blur-md">
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0B1626]/95 shadow-[0_30px_100px_rgba(0,0,0,.55)] backdrop-blur-2xl",
          panelClassName
        )}
      >
        <div className="flex items-start gap-3 border-b border-white/8 px-5 py-4">
          <div
            className={`grid size-10 shrink-0 place-items-center rounded-xl border ${styles.icon}`}
          >
            <ToneIcon tone={tone} />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-slate-100">
              {title}
            </h2>

            {description ? (
              <p className="mt-1 text-sm leading-5 text-slate-400">
                {description}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-slate-200"
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>
        </div>

        {children ? (
          <div className="px-5 py-4 text-sm text-slate-300">
            {children}
          </div>
        ) : null}

        <div className="flex justify-end gap-2 border-t border-white/8 bg-black/10 px-5 py-3">
          {confirmLabel ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08] hover:text-white"
              >
                {cancelLabel}
              </Button>

              <Button
                type="button"
                onClick={() => void onConfirm?.()}
                disabled={confirmDisabled || loading}
                className={styles.button}
              >
                {loading ? "Procesando..." : confirmLabel}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={onClose}
              className="bg-amber-500 text-slate-950 hover:bg-amber-600"
            >
              Entendido
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function InlineNotice({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-2 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-3">
      <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-400" />
      <div>
        <p className="text-xs font-semibold text-slate-200">
          {title}
        </p>
        <div className="mt-1 text-xs text-slate-400">
          {children}
        </div>
      </div>
    </div>
  );
}
