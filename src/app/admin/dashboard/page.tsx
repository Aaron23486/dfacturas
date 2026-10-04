import { requireAdmin } from "@/services/auth.service";
import { DashboardClient } from "@/features/dashboard/components/dashboard-client";

export default async function Page() {
  await requireAdmin();
  return <DashboardClient />;
}
