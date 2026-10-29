import {
  parseCookieHeader,
  serializeCookieHeader,
  type CookieMethodsBrowser,
  type CookieOptions,
  type CookieOptionsWithName,
} from "@supabase/ssr";

// La sesión vive en una cookie que el cliente de Supabase del navegador necesita leer
// (consultas, RPC y Realtime desde los componentes), así que no puede ser httpOnly.
// Se acota su vida a la de la sesión de Auth (12 h) y viaja solo por https en producción.
export const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

export const sessionCookieOptions: CookieOptionsWithName = {
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
};

// @supabase/ssr escribe siempre maxAge de 400 días e ignora el de cookieOptions; aquí se
// reemplaza por la vida de la sesión. maxAge 0 (borrar la cookie) se respeta.
export function withSessionLifetime(options: CookieOptions): CookieOptions {
  return options.maxAge === 0
    ? options
    : { ...options, maxAge: SESSION_MAX_AGE_SECONDS };
}

// Lectura y escritura de document.cookie para el cliente del navegador, con la vida acotada.
export const browserCookies = {
  getAll() {
    return parseCookieHeader(document.cookie).map(({ name, value }) => ({
      name,
      value: value ?? "",
    }));
  },
  setAll(
    cookiesToSet: Parameters<NonNullable<CookieMethodsBrowser["setAll"]>>[0],
  ) {
    for (const { name, value, options } of cookiesToSet) {
      document.cookie = serializeCookieHeader(
        name,
        value,
        withSessionLifetime(options),
      );
    }
  },
} satisfies CookieMethodsBrowser;
