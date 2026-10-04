import { redirect } from "next/navigation";
import { LockKeyhole, ScanLine } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { login } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  searchParams: Promise<{
    error?: string;
  }>;
}

export default async function LoginPage({
  searchParams,
}: Props) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("active")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.active) {
      redirect("/app");
    }
  }

  const params = await searchParams;
  const errorMessages: Record<string, string> = {
    required: "Correo y contraseña son obligatorios.",
    invalid: "Credenciales incorrectas.",
    profile: "La cuenta no tiene un perfil autorizado.",
    inactive: "La cuenta está desactivada.",
  };
  const errorMessage = params.error ? errorMessages[params.error] ?? null : null;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07111F] p-6 text-slate-100">
      <div className="pointer-events-none absolute -left-40 top-10 size-[500px] rounded-full bg-amber-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 right-0 size-[500px] rounded-full bg-blue-500/10 blur-[120px]" />

      <Card className="relative w-full max-w-md border-white/10 bg-[#0B1626]/75 text-slate-100 shadow-[0_30px_100px_rgba(0,0,0,.5)] backdrop-blur-2xl">
        <CardHeader>
          <div className="mb-3 flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400">
              <ScanLine className="size-5" />
            </div>

            <div>
              <CardTitle className="text-xl text-slate-100">
                Facturación V2
              </CardTitle>
              <CardDescription className="text-slate-400">
                Control logístico de despachos
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form action={login} className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-xs text-slate-300"
              >
                Correo
              </Label>

              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-600 focus-visible:border-amber-500/60"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-xs text-slate-300"
              >
                Contraseña
              </Label>

              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-600 focus-visible:border-amber-500/60"
              />
            </div>

            {errorMessage ? (
              <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-300">
                {errorMessage}
              </div>
            ) : null}

            <Button
              type="submit"
              className="w-full bg-amber-500 text-slate-950 hover:bg-amber-600"
            >
              <LockKeyhole className="size-4" />
              Ingresar
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
