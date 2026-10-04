import Link from "next/link";
import type { ReactNode } from "react";

import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import {
  AppNavigation,
  type NavigationItem,
} from "@/components/app/app-navigation";
import type { UserProfile } from "@/types/auth";

export function AppShell({
  profile,
  children,
}: {
  profile: UserProfile;
  children: ReactNode;
}) {
  const isAdmin = profile.role === "ADMIN";

  const items: NavigationItem[] = [
    {
      href: "/admin/dashboard",
      label: "Dashboard",
      icon: "dashboard",
      disabled: !isAdmin,
      disabledReason: "Dashboard requiere permisos de administrador.",
    },
    {
      href: "/app",
      label: "Despacho",
      icon: "dispatch",
    },
    {
      href: "/admin/responsables",
      label: "Responsables",
      icon: "responsables",
    },
    {
      href: "/admin/transportistas",
      label: "Transportistas",
      icon: "transportistas",
    },
    {
      href: "/admin/configuracion",
      label: "Configuración",
      icon: "configuracion",
      disabled: !isAdmin,
      disabledReason: "Configuración requiere permisos de administrador.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#07111F] text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-64 -top-64 size-[650px] rounded-full bg-amber-600/[0.07] blur-[130px]" />
        <div className="absolute -bottom-72 right-0 size-[700px] rounded-full bg-blue-500/[0.06] blur-[140px]" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#07111F]/88 backdrop-blur-xl">
        <div className="relative mx-auto flex min-h-14 max-w-[1900px] items-center gap-4 px-4">
          <Link href="/app" className="mr-2 shrink-0">
            <p className="text-sm font-bold tracking-tight text-slate-100">
              Facturación V2
            </p>
            <p className="text-[10px] text-amber-400/70">
              Control de despachos
            </p>
          </Link>

          <AppNavigation items={items} />

          <div className="hidden text-right lg:block">
            <p className="text-[11px] font-medium text-slate-300">
              {profile.email}
            </p>
            <p className="text-[10px] text-amber-400/70">
              {profile.role}
            </p>
          </div>

          <form action={logout}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08] hover:text-white"
            >
              Salir
            </Button>
          </form>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1900px] p-4">
        {children}
      </main>
    </div>
  );
}
