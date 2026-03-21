import fs from "node:fs/promises";
import path from "node:path";

export const ALLOWED_SUITES = new Set([
  "daily_schedule_cases",
  "market_snapshot_cases",
  "portfolio_news_cases",
  "quant_signal_cases",
  "report_render_cases"
]);

export async function collectFixtureFiles(fixturesRoot) {
  const entries = await fs.readdir(fixturesRoot, {
    withFileTypes: true
  });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(fixturesRoot, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFixtureFiles(entryPath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(entryPath);
    }
  }

  return files.sort();
}

export async function loadFixtureFile(filePath) {
  const content = await fs.readFile(filePath, "utf8");

  return JSON.parse(content);
}

export function validateFixtureDocument(document, filePath = "fixture") {
  const errors = [];

  if (!document || typeof document !== "object" || Array.isArray(document)) {
    return [`${filePath}: fixture must be a JSON object`];
  }

  if (typeof document.id !== "string" || document.id.trim() === "") {
    errors.push(`${filePath}: id must be a non-empty string`);
  }

  if (typeof document.suite !== "string" || !ALLOWED_SUITES.has(document.suite)) {
    errors.push(`${filePath}: suite must be one of ${[...ALLOWED_SUITES].join(", ")}`);
  }

  if (
    typeof document.description !== "string" ||
    document.description.trim() === ""
  ) {
    errors.push(`${filePath}: description must be a non-empty string`);
  }

  if (!document.input || typeof document.input !== "object" || Array.isArray(document.input)) {
    errors.push(`${filePath}: input must be a JSON object`);
  }

  if (
    !document.expected ||
    typeof document.expected !== "object" ||
    Array.isArray(document.expected)
  ) {
    errors.push(`${filePath}: expected must be a JSON object`);
  }

  if (
    document.expected &&
    typeof document.expected === "object" &&
    "snapshotFile" in document.expected &&
    typeof document.expected.snapshotFile !== "string"
  ) {
    errors.push(`${filePath}: expected.snapshotFile must be a string when provided`);
  }

  return errors;
}

export async function loadAndValidateFixtures(fixturesRoot) {
  const files = await collectFixtureFiles(fixturesRoot);
  const fixtures = [];
  const errors = [];
  const ids = new Set();

  for (const file of files) {
    const fixture = await loadFixtureFile(file);
    const fixtureErrors = validateFixtureDocument(fixture, file);

    if (fixtureErrors.length > 0) {
      errors.push(...fixtureErrors);
      continue;
    }

    if (ids.has(fixture.id)) {
      errors.push(`${file}: duplicate fixture id ${fixture.id}`);
      continue;
    }

    ids.add(fixture.id);
    fixtures.push({
      ...fixture,
      file
    });
  }

  return {
    errors,
    fixtures
  };
}
