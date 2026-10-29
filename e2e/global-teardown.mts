import { existsSync } from "node:fs";

import {
  adminClient,
  readLocalSupabase,
} from "../scripts/lib/supabase-local.mts";
import { dataFile, e2eData } from "./tests/support.mts";

// Borra lo que creó la ejecución: despachos de prueba, catálogo y cuentas.
export default async function globalTeardown(): Promise<void> {
  if (!existsSync(dataFile)) return;
  const { run, accounts, catalog } = e2eData();
  const service = adminClient(readLocalSupabase());

  await service.from("despachos").delete().like("factura", "88%");

  const { data: carriers } = await service
    .from("transportistas")
    .select("id")
    .eq("nombre", catalog.transportista);
  const carrierIds = (carriers ?? []).map((c) => c.id as string);
  if (carrierIds.length) {
    await service.from("vehiculos").delete().in("transportista_id", carrierIds);
    await service.from("transportistas").delete().in("id", carrierIds);
  }
  const { data: companies } = await service
    .from("companias")
    .select("id")
    .like("nombre", `%${run}%`);
  const companyIds = (companies ?? []).map((c) => c.id as string);
  if (companyIds.length) {
    await service.from("rutas").delete().in("compania_id", companyIds);
    await service.from("companias").delete().in("id", companyIds);
  }
  await service.from("responsables").delete().like("nombre", `%${run}%`);

  for (const account of Object.values(accounts)) {
    await service.auth.admin.deleteUser(account.id);
  }
}
