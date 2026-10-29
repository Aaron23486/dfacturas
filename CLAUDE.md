@AGENTS.md

# DFacturas — guía para trabajar en el repositorio

- **Qué es:** control de despachos por factura (20 dígitos). Primer escaneo → `ATENDIENDO`, segundo → `DESPACHADA`; cancelación con motivo → `PEDIDO_CANCELADO`. Roles `ADMIN` y `OPERATIVO`.
- **Stack:** Next.js 16 (App Router, `src/proxy.ts`), React 19, TypeScript, Tailwind 4, Supabase (Auth, PostgREST, Realtime) sobre PostgreSQL 17.
- **La base es la frontera de autorización:** RLS en todas las tablas, escrituras críticas solo por RPC `SECURITY DEFINER`. No mover reglas de negocio a la UI ni abrir escrituras directas.
- **Migraciones:** solo hacia adelante. Nunca editar una migración ya fusionada en `main`; crear una nueva en `supabase/migrations/`.
- **Puesta en marcha local:** `npm ci` → `npm run db:up` → `npm run env:local` → `npm run demo:setup` → `npm run dev`.
- **Antes de un commit:** `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run build`; con la base local, `npm run db:verify`, `npm run test:integration` y `npm run test:e2e`.
- **Idiomas:** UI, comentarios y nombres de pruebas en español; README, `docs/`, commits y PR en inglés.
- **Convenciones:** Conventional Commits; una rama y un PR por cambio; documentación en `docs/` (requisitos FR/NFR/R, arquitectura D-n, ADR en `docs/decisions/`).
- **Nunca** versionar `.env.local`, claves secretas de Supabase ni datos reales; los datos de demostración son ficticios.
