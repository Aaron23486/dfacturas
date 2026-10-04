"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  BarChart3,
  ClipboardList,
  LockKeyhole,
  Settings,
  Truck,
  UserRoundCog,
} from "lucide-react";

export type NavigationIcon =
  | "dispatch"
  | "dashboard"
  | "responsables"
  | "transportistas"
  | "configuracion";

export interface NavigationItem {
  href: string;
  label: string;
  icon: NavigationIcon;
  disabled?: boolean;
  disabledReason?: string;
}

const icons = {
  dispatch: ClipboardList,
  dashboard: BarChart3,
  responsables: UserRoundCog,
  transportistas: Truck,
  configuracion: Settings,
};

function isActivePath(pathname: string, href: string) {
  if (href === "/app") {
    return pathname === "/app";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavigation({
  items,
}: {
  items: NavigationItem[];
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="flex flex-1 items-center gap-1 overflow-visible">
      {items.map((item) => {
        const { href, label, icon, disabled, disabledReason } = item;
        const active = !disabled && isActivePath(pathname, href);
        const Icon = icons[icon];

        if (disabled) {
          return (
            <span
              key={href}
              aria-disabled="true"
              title={
                disabledReason ??
                "Necesita permisos de administrador para acceder."
              }
              className="relative inline-flex h-9 shrink-0 cursor-not-allowed items-center gap-1.5 rounded-lg border border-transparent px-3 text-xs text-slate-600 opacity-70"
            >
              <Icon className="size-3.5" />
              <span>{label}</span>
              <LockKeyhole className="size-3 text-slate-600" />
            </span>
          );
        }

        return (
          <Link
            key={href}
            href={href}
            prefetch={true}
            onMouseEnter={() => router.prefetch(href)}
            onFocus={() => router.prefetch(href)}
            aria-current={active ? "page" : undefined}
            className={[
              "relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs transition-all duration-200",
              active
                ? "border-amber-500/30 bg-amber-500/[0.10] text-amber-300 shadow-[0_0_18px_rgba(245,158,11,.07)]"
                : "border-transparent text-slate-400 hover:border-white/8 hover:bg-white/[0.05] hover:text-slate-200",
            ].join(" ")}
          >
            <Icon className="size-3.5" />
            <span>{label}</span>

            {active ? (
              <span className="absolute bottom-0 left-1/2 h-[2px] w-6 -translate-x-1/2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,.45)]" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
