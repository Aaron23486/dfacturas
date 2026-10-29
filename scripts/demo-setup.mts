// Acceso y datos de demostración para una evaluación local: `npm run demo:setup`.
//
// - Crea (o reactiva) una cuenta por rol con una contraseña generada que se muestra una sola
//   vez. Al ejecutarlo de nuevo emite contraseñas nuevas.
// - La primera vez crea compañías, rutas, responsables y transportistas ficticios con la sesión
//   del administrador de demostración (mismas políticas y RPC que la app), un historial de
//   despachos de los últimos meses y algunas facturas en curso escaneadas por el operativo.
// - Se niega a ejecutarse contra algo que no sea el Supabase local.
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  CLIENTE_RETIRA,
  DEMO_ACCOUNTS,
  DEMO_CANCEL_REASONS,
  DEMO_CARRIERS,
  DEMO_COMPANIES,
  DEMO_HISTORY_DAYS,
  DEMO_HISTORY_DISPATCHES,
  DEMO_IN_PROGRESS,
  DEMO_RESPONSABLES,
  demoInvoice,
  seededRandom,
} from "./lib/demo-data.mts";
import { generateDemoPassword } from "./lib/passwords.mts";
import {
  adminClient,
  findAccountByEmail,
  resolveSupabaseTarget,
  setProfileAccess,
  signedInClient,
  type Role,
} from "./lib/supabase-local.mts";

type Row = Record<string, unknown> & { id: string };

function fail(step: string, error: { code?: string; message: string }): never {
  throw new Error(
    `${step} falló (${error.code ?? "sin código"}): ${error.message}`,
  );
}

async function rows(
  client: SupabaseClient,
  table: string,
  columns: string,
): Promise<Row[]> {
  const { data, error } = await client.from(table).select(columns);
  if (error) fail(`Lectura de ${table}`, error);
  return data as unknown as Row[];
}

async function upsertAccount(
  admin: SupabaseClient,
  account: { email: string; fullName: string; role: Role },
  password: string,
): Promise<string> {
  const existing = await findAccountByEmail(admin, account.email);
  const result = existing
    ? await admin.auth.admin.updateUserById(existing.id, { password })
    : await admin.auth.admin.createUser({
        email: account.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: account.fullName },
      });
  if (result.error || !result.data.user) {
    throw new Error(
      `No fue posible preparar ${account.email}: ${result.error?.message}`,
    );
  }
  await setProfileAccess(admin, result.data.user.id, {
    role: account.role,
    active: true,
  });
  return result.data.user.id;
}

async function createCatalogs(app: SupabaseClient): Promise<void> {
  for (const company of DEMO_COMPANIES) {
    const { data, error } = await app
      .from("companias")
      .insert({ nombre: company.nombre, activo: true })
      .select("id")
      .single();
    if (error) fail(`Alta de ${company.nombre}`, error);

    for (let numero = 1; numero <= company.rutas; numero++) {
      const route = await app.rpc("compat_create_or_reactivate_ruta", {
        p_compania_id: data.id,
        p_numero: numero,
      });
      if (route.error) fail(`Ruta ${numero} de ${company.nombre}`, route.error);
    }
  }

  const { error } = await app
    .from("responsables")
    .insert(DEMO_RESPONSABLES.map((r) => ({ ...r, activo: true })));
  if (error) fail("Alta de responsables", error);

  for (const carrier of [
    { nombre: CLIENTE_RETIRA, placa: "N/A" },
    ...DEMO_CARRIERS,
  ]) {
    const result = await app.rpc("compat_create_transportista_with_plate", {
      p_nombre_completo: carrier.nombre,
      p_placa: carrier.placa,
    });
    if (result.error) fail(`Alta de ${carrier.nombre}`, result.error);
  }
}

// Las RPC fechan cada despacho con now(); para tener un historial de varios meses en el
// dashboard, los despachos pasados se insertan con la clave de servicio y fechas propias.
// Las restricciones y triggers de la tabla se aplican igual.
async function createHistory(
  admin: SupabaseClient,
  app: SupabaseClient,
  operativoId: string,
): Promise<number> {
  const companies = await rows(app, "companias", "id");
  const routes = await rows(app, "rutas", "id, compania_id");
  const people = await rows(app, "responsables", "id");
  const carriers = await rows(app, "transportistas", "id, es_cliente_retira");
  const vehicles = await rows(app, "vehiculos", "id, transportista_id");

  const random = seededRandom(2026);
  const pick = <T,>(list: readonly T[]): T =>
    list[Math.floor(random() * list.length)];
  const now = Date.now();
  const history = [];

  for (let i = 1; i <= DEMO_HISTORY_DISPATCHES; i++) {
    const daysAgo = 1 + Math.floor(random() * DEMO_HISTORY_DAYS);
    const start = new Date(now - daysAgo * 86_400_000);
    start.setHours(
      7 + Math.floor(random() * 10),
      Math.floor(random() * 60),
      0,
      0,
    );

    const company = pick(companies);
    const route = pick(routes.filter((r) => r.compania_id === company.id));
    const carrier =
      random() < 0.12
        ? carriers.find((c) => c.es_cliente_retira)!
        : pick(carriers.filter((c) => !c.es_cliente_retira));
    const vehicle = carrier.es_cliente_retira
      ? null
      : vehicles.find((v) => v.transportista_id === carrier.id)!;

    const base = {
      factura: demoInvoice(i),
      responsable_id: pick(people).id,
      compania_id: company.id,
      ruta_id: route.id,
      transportista_id: carrier.id,
      vehiculo_id: vehicle?.id ?? null,
      creado_por: operativoId,
      created_at: start.toISOString(),
    };

    if (random() < 0.07) {
      history.push({
        ...base,
        estado: "PEDIDO_CANCELADO",
        detalle: pick(DEMO_CANCEL_REASONS),
        fecha_hora_cancelacion: start.toISOString(),
      });
    } else {
      const minutes = 5 + Math.floor(random() * random() * 180);
      history.push({
        ...base,
        estado: "DESPACHADA",
        fecha_hora_inicio: start.toISOString(),
        fecha_hora_final: new Date(
          start.getTime() + minutes * 60_000,
        ).toISOString(),
      });
    }
  }

  const { error } = await admin.from("despachos").insert(history);
  if (error) fail("Historial de despachos", error);
  return history.length;
}

// Facturas en curso, escaneadas por el operativo con la RPC de la app (primer escaneo).
async function createInProgress(
  operativo: SupabaseClient,
  firstSequence: number,
): Promise<void> {
  const company = (await rows(operativo, "companias", "id, nombre")).find(
    (c) => c.nombre === DEMO_COMPANIES[0].nombre,
  )!;
  const routes = (await rows(operativo, "rutas", "id, compania_id")).filter(
    (r) => r.compania_id === company.id,
  );
  const people = await rows(operativo, "responsables", "id");
  const carriers = (
    await rows(operativo, "transportistas", "id, es_cliente_retira")
  ).filter((c) => !c.es_cliente_retira);
  const vehicles = await rows(operativo, "vehiculos", "id, transportista_id");

  for (let i = 0; i < DEMO_IN_PROGRESS; i++) {
    const carrier = carriers[i % carriers.length];
    const { error } = await operativo.rpc("scan_dispatch", {
      p_factura: demoInvoice(firstSequence + i),
      p_responsable_id: people[i % people.length].id,
      p_compania_id: company.id,
      p_ruta_id: routes[i % routes.length].id,
      p_transportista_id: carrier.id,
      p_vehiculo_id: vehicles.find((v) => v.transportista_id === carrier.id)!
        .id,
    });
    if (error) fail("Escaneo en curso", error);
  }
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("demo:setup no se ejecuta con NODE_ENV=production.");
  }
  const target = resolveSupabaseTarget();
  if (!target.local) {
    throw new Error(
      "demo:setup solo se ejecuta contra el Supabase local (npm run db:up).",
    );
  }
  const admin = adminClient(target);

  const credentials = DEMO_ACCOUNTS.map((account) => ({
    ...account,
    password: generateDemoPassword(),
  }));
  const ids = new Map<Role, string>();
  for (const c of credentials) {
    ids.set(c.role, await upsertAccount(admin, c, c.password));
  }

  const demoAdmin = credentials.find((c) => c.role === "ADMIN")!;
  const demoOperativo = credentials.find((c) => c.role === "OPERATIVO")!;

  const { count, error } = await admin
    .from("companias")
    .select("id", { count: "exact", head: true });
  if (error) fail("Consulta de compañías", error);

  if (count === 0) {
    const app = await signedInClient(
      target,
      demoAdmin.email,
      demoAdmin.password,
    );
    await createCatalogs(app);
    const created = await createHistory(admin, app, ids.get("OPERATIVO")!);
    const operativo = await signedInClient(
      target,
      demoOperativo.email,
      demoOperativo.password,
    );
    await createInProgress(operativo, created + 1);
    console.log(
      `Datos de demostración creados: ${DEMO_COMPANIES.length} compañías, ` +
        `${DEMO_RESPONSABLES.length} responsables, ` +
        `${DEMO_CARRIERS.length + 1} transportistas y ` +
        `${created + DEMO_IN_PROGRESS} despachos.`,
    );
  } else {
    console.log(
      "Ya hay datos en la base; solo se renovaron las cuentas de demostración.",
    );
  }

  console.log(
    "\nCuentas de demostración (las contraseñas no se vuelven a mostrar):",
  );
  for (const c of credentials) {
    console.log(`  ${c.role.padEnd(9)} ${c.email}  ${c.password}`);
  }
  console.log(
    "\nInicia la app con `npm run dev` y entra en http://localhost:3000/login",
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
