import { requireProfile } from "@/services/auth.service";
import { DispatchWorkspace } from "@/features/despachos/components/dispatch-workspace";

export default async function AppPage() {
  const profile = await requireProfile();

  return (
    <div className="flex min-h-[calc(100vh-88px)] flex-col gap-2.5">
      <div className="shrink-0">
        <h1 className="text-lg font-semibold tracking-tight text-slate-100">
          Despacho de facturas
        </h1>
        <p className="text-[11px] text-slate-600">
          Primer escaneo inicia. Segundo escaneo finaliza.
        </p>
      </div>

      <DispatchWorkspace
        userId={profile.id}
        role={profile.role}
      />
    </div>
  );
}
