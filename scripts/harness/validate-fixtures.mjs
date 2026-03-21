import path from "node:path";
import process from "node:process";

import { loadAndValidateFixtures } from "./fixture-utils.mjs";

const fixturesRoot = path.resolve(process.cwd(), "harness", "fixtures");
const { errors, fixtures } = await loadAndValidateFixtures(fixturesRoot);

if (errors.length > 0) {
  globalThis.console.error("Harness fixture validation failed:");

  for (const error of errors) {
    globalThis.console.error(`- ${error}`);
  }

  process.exit(1);
}

globalThis.console.log(`Validated ${fixtures.length} harness fixtures.`);
