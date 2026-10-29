import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// Pruebas unitarias: lógica pura, sin red ni base de datos. La cobertura se mide sobre esos
// módulos; la interfaz y el acceso a datos se prueban con integración (tests/integration) y e2e.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.mts"],
    coverage: {
      provider: "v8",
      include: [
        "src/domain/**",
        "src/lib/errors/**",
        "src/lib/utils/**",
        "src/lib/utils.ts",
        "src/schemas/**",
        "src/features/dashboard/components/dashboard-excel.ts",
        "scripts/lib/demo-data.mts",
        "scripts/lib/passwords.mts",
      ],
      exclude: ["**/*.test.*", "src/domain/**/*.types.ts"],
      thresholds: { lines: 85, functions: 85, branches: 85, statements: 85 },
      reporter: ["text", "text-summary"],
    },
  },
});
