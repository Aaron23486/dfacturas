import { mkdirSync, writeFileSync } from "node:fs";

import { chromium, type FullConfig } from "@playwright/test";

import { generateDemoPassword } from "../scripts/lib/passwords.mts";
import {
  adminClient,
  readLocalSupabase,
  setProfileAccess,
  signedInClient,
} from "../scripts/lib/supabase-local.mts";
import {
  AUTH_DIR,
  dataFile,
  signInThroughForm,
  storageFile,
  type AccountKey,
  type E2EData,
} from "./tests/support.mts";

// Prepara cada ejecución: una cuenta por rol (más una para probar el cierre de sesión sin
// invalidar las sesiones guardadas), un catálogo propio con prefijo único y la sesión de
// ADMIN y OPERATIVO guardada para no iniciar sesión en cada prueba.
export default async function globalSetup(config: FullConfig): Promise<void> {
  const target = readLocalSupabase();
  const service = adminClient(target);
  const run = `e2e${Date.now().toString(36)}`;

  const accounts = {} as E2EData["accounts"];
  for (const key of ["ADMIN", "OPERATIVO", "SIGN_OUT"] as AccountKey[]) {
    const email = `${run}-${key.toLowerCase().replace("_", "-")}@e2e.dfacturas.test`;
    const password = generateDemoPassword();
    const { data, error } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `E2E ${key}` },
    });
    if (error || !data.user) {
      throw new Error(`No se pudo crear ${email}: ${error?.message}`);
    }
    await setProfileAccess(service, data.user.id, {
      role: key === "ADMIN" ? "ADMIN" : "OPERATIVO",
      active: true,
    });
    accounts[key] = { email, password, id: data.user.id };
  }

  // El catálogo se crea con la sesión del ADMIN de prueba, como en la app.
  const app = await signedInClient(
    target,
    accounts.ADMIN.email,
    accounts.ADMIN.password,
  );
  const catalog = {
    responsable: `Responsable ${run}`,
    compania: `Compañía ${run}`,
    ruta: "7",
    transportista: `Transportista ${run}`,
    placa: `E2E-${run.slice(-5).toUpperCase()}`,
  };
  const company = await app
    .from("companias")
    .insert({ nombre: catalog.compania, activo: true })
    .select("id")
    .single();
  if (company.error) throw company.error;
  const steps = await Promise.all([
    app.rpc("compat_create_or_reactivate_ruta", {
      p_compania_id: company.data.id,
      p_numero: Number(catalog.ruta),
    }),
    app
      .from("responsables")
      .insert({ nombre: catalog.responsable, activo: true }),
    app.rpc("compat_create_transportista_with_plate", {
      p_nombre_completo: catalog.transportista,
      p_placa: catalog.placa,
    }),
  ]);
  for (const step of steps) if (step.error) throw step.error;
  await app.auth.signOut();

  mkdirSync(AUTH_DIR, { recursive: true });
  const data: E2EData = { run, accounts, catalog };
  writeFileSync(dataFile, JSON.stringify(data, null, 2));

  const { baseURL, channel } = config.projects[0].use;
  const browser = await chromium.launch({ channel });
  for (const role of ["ADMIN", "OPERATIVO"] as const) {
    const page = await browser.newPage({ baseURL });
    await signInThroughForm(page, accounts[role]);
    await page.context().storageState({ path: storageFile(role) });
    await page.close();
  }
  await browser.close();
}
