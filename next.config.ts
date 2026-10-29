import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV !== "production";

// El navegador habla directamente con Supabase (datos, RPC y Realtime), así que
// connect-src debe permitir el origen configurado, también el local por http/ws.
function supabaseOrigins(url: string | undefined): string {
  if (!url) return "https://*.supabase.co wss://*.supabase.co";
  const { origin, protocol, host } = new URL(url);
  return `${origin} ${protocol === "https:" ? "wss:" : "ws:"}//${host}`;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const servesOverHttps = !supabaseUrl?.startsWith("http:");

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
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

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
