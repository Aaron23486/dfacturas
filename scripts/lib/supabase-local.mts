import { execFileSync } from "node:child_process";

export type SupabaseTarget = {
  url: string;
  publishableKey: string;
  secretKey: string;
  local: boolean;
};

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

export function isLocalUrl(url: string): boolean {
  try {
    return LOCAL_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

// Lee la URL y las claves que la CLI generó para el Supabase local (`npm run db:up`).
// Las claves nunca se copian a mano ni se guardan en el repositorio.
export function readLocalSupabase(): SupabaseTarget {
  let output: string;
  try {
    output = execFileSync(
      "npx",
      ["--no-install", "supabase", "status", "-o", "json"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        shell: process.platform === "win32",
      },
    );
  } catch {
    throw new Error(
      "Supabase local no está en marcha. Ejecuta primero: npm run db:up",
    );
  }

  const status = JSON.parse(output.slice(output.indexOf("{"))) as Record<
    string,
    string
  >;
  const url = status.API_URL;
  const publishableKey = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
  const secretKey = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;

  if (!url || !publishableKey || !secretKey) {
    throw new Error(
      "La salida de `supabase status` no contiene la URL y las claves esperadas.",
    );
  }

  return { url, publishableKey, secretKey, local: true };
}
