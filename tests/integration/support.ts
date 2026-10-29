// Entorno para las pruebas de integración: Supabase local en marcha (npm run db:up).
// Cada archivo crea sus propias cuentas y catálogos con nombres únicos y los elimina al final,
// así las pruebas no dependen de demo:setup ni dejan datos en la base local.
import { randomBytes, randomInt } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  adminClient,
  readLocalSupabase,
  setProfileAccess,
  signedInClient,
  type Role,
  type SupabaseTarget,
} from "../../scripts/lib/supabase-local.mts";

export type Account = {
  id: string;
  email: string;
  password: string;
  client: SupabaseClient;
};

export type Catalog = {
  responsableId: string;
  companiaId: string;
  otherCompaniaId: string;
  rutaId: string;
  otherRutaId: string;
  carrierId: string;
  vehicleId: string;
  otherCarrierId: string;
  otherVehicleId: string;
  clienteRetiraId: string;
};

const RUN = `${Date.now().toString(36)}${randomBytes(2).toString("hex")}`;
let invoiceCounter = 0;

// Facturas de prueba con prefijo 77 (las de demostración usan 99).
export function testInvoice(): string {
  invoiceCounter += 1;
  return `77${String(Date.now()).slice(-12)}${String(invoiceCounter).padStart(3, "0")}${randomInt(100, 1000)}`;
}

export function unique(label: string): string {
  return `Prueba ${label} ${RUN}`;
}

export class TestEnvironment {
  readonly target: SupabaseTarget = readLocalSupabase();
  readonly service: SupabaseClient = adminClient(this.target);
  private readonly userIds: string[] = [];
  private readonly invoicePrefix = "77";
  private readonly created: Array<{ table: string; id: string }> = [];

  // Crea una cuenta y la deja con el rol y estado pedidos (null = como la deja el trigger).
  async account(
    role: Role,
    { active = true, keepDefault = false } = {},
  ): Promise<Account> {
    const email = `it-${role.toLowerCase()}-${RUN}-${this.userIds.length}@example.test`;
    const password = `It-${randomBytes(12).toString("base64url")}1a`;
    const { data, error } = await this.service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `Prueba ${role}` },
    });
    if (error || !data.user) throw error ?? new Error("Sin usuario");
    this.userIds.push(data.user.id);
    if (!keepDefault) {
      await setProfileAccess(this.service, data.user.id, { role, active });
    }
    const client = await signedInClient(this.target, email, password).catch(
      () => null,
    );
    return {
      id: data.user.id,
      email,
      password,
      client: client as SupabaseClient,
    };
  }

  private async insert(table: string, values: Record<string, unknown>) {
    const { data, error } = await this.service
      .from(table)
      .insert(values)
      .select("id")
      .single();
    if (error) throw error;
    this.created.push({ table, id: data.id });
    return data.id as string;
  }

  async catalog(): Promise<Catalog> {
    const responsableId = await this.insert("responsables", {
      nombre: unique("responsable"),
      activo: true,
    });
    const companiaId = await this.insert("companias", {
      nombre: unique("compañía A"),
      activo: true,
    });
    const otherCompaniaId = await this.insert("companias", {
      nombre: unique("compañía B"),
      activo: true,
    });
    const rutaId = await this.insert("rutas", {
      compania_id: companiaId,
      nombre: "1",
      activo: true,
    });
    const otherRutaId = await this.insert("rutas", {
      compania_id: otherCompaniaId,
      nombre: "1",
      activo: true,
    });
    const carrierId = await this.insert("transportistas", {
      nombre: unique("transportista A"),
      activo: true,
    });
    const otherCarrierId = await this.insert("transportistas", {
      nombre: unique("transportista B"),
      activo: true,
    });
    const vehicleId = await this.insert("vehiculos", {
      transportista_id: carrierId,
      placa: `IT-${RUN}-A`,
      activo: true,
    });
    const otherVehicleId = await this.insert("vehiculos", {
      transportista_id: otherCarrierId,
      placa: `IT-${RUN}-B`,
      activo: true,
    });

    // Solo puede existir un CLIENTE RETIRA: se reutiliza si ya está.
    const { data: existing } = await this.service
      .from("transportistas")
      .select("id")
      .eq("es_cliente_retira", true)
      .maybeSingle();
    const clienteRetiraId =
      existing?.id ??
      (await this.insert("transportistas", {
        nombre: "CLIENTE RETIRA",
        activo: true,
        es_cliente_retira: true,
      }));

    return {
      responsableId,
      companiaId,
      otherCompaniaId,
      rutaId,
      otherRutaId,
      carrierId,
      vehicleId,
      otherCarrierId,
      otherVehicleId,
      clienteRetiraId,
    };
  }

  // Elimina despachos de prueba, catálogos y cuentas creados por este archivo.
  async cleanup(): Promise<void> {
    await this.service
      .from("despachos")
      .delete()
      .like("factura", `${this.invoicePrefix}%`);
    for (const { table, id } of [...this.created].reverse()) {
      await this.service.from(table).delete().eq("id", id);
    }
    for (const id of this.userIds) {
      await this.service.auth.admin.deleteUser(id);
    }
  }
}
