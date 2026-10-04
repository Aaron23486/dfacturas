import { requireAdmin } from "@/services/auth.service";
import { ConfiguracionAdmin } from "@/features/configuracion/components/configuracion-admin";

export default async function Page() {
  await requireAdmin();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">
          Configuración
        </h1>
        <p className="text-xs text-slate-600">
          Administración de compañías y rutas.
        </p>
      </div>

      <ConfiguracionAdmin />
    </div>
  );
}
