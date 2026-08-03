import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

// Unit-test config for the pure scoring engine. Node environment only —
// no jsdom, no DOM-dependent code is exercised by these tests.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Loads .env before any test module evaluates (prisma builds its pool
    // eagerly at import). Harmless for the scoring suite.
    setupFiles: ["tests/setup-env.ts"],
  },
})
