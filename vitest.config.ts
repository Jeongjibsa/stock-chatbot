import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@stock-chatbot/application": fileURLToPath(
        new URL("./packages/application/src/index.ts", import.meta.url)
      ),
      "@stock-chatbot/core-types": fileURLToPath(
        new URL("./packages/core-types/src/index.ts", import.meta.url)
      ),
      "@stock-chatbot/database": fileURLToPath(
        new URL("./packages/database/src/index.ts", import.meta.url)
      )
    }
  },
  test: {
    environment: "node",
    include: ["apps/**/*.test.ts", "packages/**/*.test.ts"],
    exclude: ["**/*.integration.test.ts"]
  }
});
