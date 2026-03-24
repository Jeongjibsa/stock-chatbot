import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    externalDir: true
  },
  webpack(config) {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@stock-chatbot/application": path.resolve(
        __dirname,
        "../../packages/application/src/index.ts"
      ),
      "@stock-chatbot/database": path.resolve(
        __dirname,
        "../../packages/database/src/index.ts"
      ),
      "@stock-chatbot/telegram-bot/build-bot": path.resolve(
        __dirname,
        "../../apps/telegram-bot/src/build-bot.ts"
      )
    };

    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
      ".cjs": [".cts", ".cjs"]
    };

    return config;
  }
};

export default nextConfig;
