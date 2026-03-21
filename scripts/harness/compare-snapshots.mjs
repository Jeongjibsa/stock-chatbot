import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { loadAndValidateFixtures } from "./fixture-utils.mjs";

const projectRoot = process.cwd();
const fixturesRoot = path.resolve(projectRoot, "harness", "fixtures");
const snapshotsRoot = path.resolve(projectRoot, "harness", "snapshots");
const { errors, fixtures } = await loadAndValidateFixtures(fixturesRoot, projectRoot);

if (errors.length > 0) {
  globalThis.console.error(
    "Snapshot comparison stopped because fixture validation failed:"
  );

  for (const error of errors) {
    globalThis.console.error(`- ${error}`);
  }

  process.exit(1);
}

const snapshotErrors = [];
let comparedCount = 0;

for (const fixture of fixtures) {
  if (typeof fixture.expected.snapshotFile !== "string") {
    continue;
  }

  const snapshotPath = path.resolve(snapshotsRoot, fixture.expected.snapshotFile);
  const snapshotContent = normalizeSnapshot(await fs.readFile(snapshotPath, "utf8"));
  const renderedText = normalizeSnapshot(fixture.expected.renderedText);

  if (renderedText !== snapshotContent) {
    snapshotErrors.push(
      `${fixture.id}: snapshot mismatch for ${fixture.expected.snapshotFile}`
    );
    continue;
  }

  comparedCount += 1;
}

if (snapshotErrors.length > 0) {
  globalThis.console.error("Harness snapshot comparison failed:");

  for (const error of snapshotErrors) {
    globalThis.console.error(`- ${error}`);
  }

  process.exit(1);
}

globalThis.console.log(`Compared ${comparedCount} harness snapshots.`);

function normalizeSnapshot(value) {
  return value.replace(/\r\n/g, "\n").replace(/\n$/, "");
}
