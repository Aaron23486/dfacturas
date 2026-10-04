import { ResponsablesAdmin } from "@/features/responsables/components/responsables-admin";
import { requireProfile } from "@/services/auth.service";

export default async function Page() {
  const profile = await requireProfile();

  return <ResponsablesAdmin role={profile.role} />;
}
