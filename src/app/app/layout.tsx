import type { ReactNode } from "react";
import { requireProfile } from "@/services/auth.service";
import { AppShell } from "@/components/app/app-shell";
export default async function Layout({children}:{children:ReactNode}){const profile=await requireProfile();return <AppShell profile={profile}>{children}</AppShell>}
