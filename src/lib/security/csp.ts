// Content Security Policy por solicitud. Los scripts solo se ejecutan con el nonce de la
// respuesta ('strict-dynamic' extiende la confianza a lo que esos scripts cargan); no se
// permite JavaScript inline sin nonce. Los estilos conservan 'unsafe-inline' porque la UI y
// los gráficos usan atributos style, que un nonce no cubre.

export type CspOptions = {
  nonce: string;
  isDevelopment: boolean;
  supabaseUrl: string | undefined;
};

// El navegador habla directamente con Supabase (datos, RPC y Realtime), así que connect-src
// debe permitir el origen configurado, también el local por http/ws.
export function supabaseOrigins(url: string | undefined): string {
  if (!url) return "https://*.supabase.co wss://*.supabase.co";
  const { origin, protocol, host } = new URL(url);
  return `${origin} ${protocol === "https:" ? "wss:" : "ws:"}//${host}`;
}

export function buildContentSecurityPolicy({
  nonce,
  isDevelopment,
  supabaseUrl,
}: CspOptions): string {
  const servesOverHttps = !supabaseUrl?.startsWith("http:");

  return [
    "default-src 'self'",
    // React necesita eval solo en desarrollo para reconstruir pilas de error.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' ${supabaseOrigins(supabaseUrl)}${isDevelopment ? " ws: http: https:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDevelopment || !servesOverHttps ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function createNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}
