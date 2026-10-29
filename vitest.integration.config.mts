import { defineConfig } from "vitest/config";

// Pruebas de integración contra el Supabase local (npm run db:up). Los archivos se ejecutan
// uno tras otro porque comparten la misma base.
export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
