import path from "node:path";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    setupFiles: [path.resolve(__dirname, "tests/setup.ts")],
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules", ".next"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: [
        "actions/**/*.ts",
        "lib/**/*.ts",
        "services/**/*.ts",
        "schemas/**/*.ts",
      ],
      exclude: ["**/*.d.ts"],
    },
  },
});
