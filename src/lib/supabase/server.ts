import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { sessionCookieOptions, withSessionLifetime } from "./cookie-options";

export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url)
    throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
  if (!publishableKey)
    throw new Error(
      "Missing environment variable: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );

  return createServerClient(url, publishableKey, {
    cookieOptions: sessionCookieOptions,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, withSessionLifetime(options)),
          );
        } catch {
          // Los Server Components no siempre pueden escribir cookies; el proxy renueva la sesión.
        }
      },
    },
  });
}
