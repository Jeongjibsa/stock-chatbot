import path from "node:path";
import process from "node:process";

import { loadAndValidateFixtures } from "./fixture-utils.mjs";

const fixturesRoot = path.resolve(process.cwd(), "harness", "fixtures");
const { errors, fixtures, suiteContracts } = await loadAndValidateFixtures(
  fixturesRoot,
  process.cwd()
);

if (errors.length > 0) {
  globalThis.console.error("Harness fixture validation failed:");

  for (const error of errors) {
    globalThis.console.error(`- ${error}`);
  }

  process.exit(1);
}

const activeSuiteCount = Object.values(suiteContracts).filter(
  (suite) => suite.status === "active"
).length;

globalThis.console.log(
  `Validated ${fixtures.length} harness fixtures across ${activeSuiteCount} active suites.`
);
