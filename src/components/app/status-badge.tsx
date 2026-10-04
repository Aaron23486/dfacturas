import { Badge } from "@/components/ui/badge";
import type { DispatchStatus } from "@/types/dispatch";

const labels: Record<DispatchStatus, string> = {
  ATENDIENDO: "Atendiendo",
  DESPACHADA: "Despachada",
  PEDIDO_CANCELADO: "Pedido cancelado",
};

const classes: Record<DispatchStatus, string> = {
  ATENDIENDO:
    "border-amber-400/25 bg-amber-400/10 text-amber-300",
  DESPACHADA:
    "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  PEDIDO_CANCELADO:
    "border-red-400/25 bg-red-400/10 text-red-300",
};

export function StatusBadge({
  status,
}: {
  status: DispatchStatus;
}) {
  return (
    <Badge
      variant="outline"
      className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${classes[status]}`}
    >
      {labels[status]}
    </Badge>
  );
}
