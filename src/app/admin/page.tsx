import Link from "next/link";
import { requireAdmin } from "@/services/auth.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminPage() {
  await requireAdmin();

  return (
    <main className="min-h-screen bg-muted/20 p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Administración
          </h1>
          <p className="text-sm text-muted-foreground">
            Esta ruta solo puede ser utilizada por perfiles ADMIN.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Acceso administrativo confirmado</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
  href="/app"
  className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
>
  Volver al área operativa
</Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
