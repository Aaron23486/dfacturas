// Ejecuta los verificadores SQL de supabase/tests contra la base local: `npm run db:verify`.
// Usa psql dentro del contenedor de la base que levanta la CLI; falla si una comprobación falla.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";

const CONTAINER = "supabase_db_dfacturas";
const DIRECTORY = "supabase/tests";

const files = readdirSync(DIRECTORY)
  .filter((name) => name.endsWith(".sql"))
  .sort();

try {
  for (const file of files) {
    execFileSync(
      "docker",
      [
        "exec",
        "-i",
        CONTAINER,
        "psql",
        "-U",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
        "-q",
      ],
      {
        input: readFileSync(`${DIRECTORY}/${file}`),
        stdio: ["pipe", "inherit", "inherit"],
      },
    );
    console.log(`OK  ${file}`);
  }
} catch {
  console.error(
    "La verificación de la base falló (¿está en marcha? npm run db:up).",
  );
  process.exitCode = 1;
}
