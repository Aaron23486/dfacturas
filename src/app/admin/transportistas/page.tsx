import { requireProfile } from "@/services/auth.service";

import { TransportistasAdmin } from "@/features/transportistas/components/transportistas-admin";

export default async function Page() {
  const profile = await requireProfile();

  return (
    <TransportistasAdmin role={profile.role} />
  );
}