import type { ReactNode } from "react";

import { AppShell } from "@/components/app/app-shell";
import { requireProfile } from "@/services/auth.service";

export default async function Layout({
  children,
}: {
  children: ReactNode;
}) {
  const profile = await requireProfile();

  return <AppShell profile={profile}>{children}</AppShell>;
}
