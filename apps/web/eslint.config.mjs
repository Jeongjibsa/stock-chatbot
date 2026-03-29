import nextPlugin from "@next/eslint-plugin-next";

import rootConfig from "../../eslint.config.js";

export default [
  {
    plugins: {
      "@next/next": nextPlugin
    }
  },
  ...rootConfig
];
