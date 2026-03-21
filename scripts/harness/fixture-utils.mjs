import fs from "node:fs/promises";
import path from "node:path";

export async function loadSuiteContracts(projectRoot) {
  const suiteContractsPath = path.resolve(
    projectRoot,
    "harness",
    "suite-contracts.json"
  );
  const content = await fs.readFile(suiteContractsPath, "utf8");

  return JSON.parse(content);
}

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

export function validateFixtureDocument(
  document,
  suiteContracts,
  filePath = "fixture"
) {
  const errors = [];
  const suiteNames = Object.keys(suiteContracts);

  if (!document || typeof document !== "object" || Array.isArray(document)) {
    return [`${filePath}: fixture must be a JSON object`];
  }

  if (typeof document.id !== "string" || document.id.trim() === "") {
    errors.push(`${filePath}: id must be a non-empty string`);
  }

  if (typeof document.suite !== "string" || !suiteNames.includes(document.suite)) {
    errors.push(`${filePath}: suite must be one of ${suiteNames.join(", ")}`);
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

  if (typeof document.suite === "string" && suiteContracts[document.suite]) {
    const contract = suiteContracts[document.suite];
    const expected = document.expected;

    for (const key of contract.requiredExpectedKeys ?? []) {
      if (!expected || !(key in expected)) {
        errors.push(`${filePath}: expected.${key} is required for suite ${document.suite}`);
      }
    }

    if (contract.requiresSnapshot) {
      if (typeof expected?.snapshotFile !== "string" || expected.snapshotFile.trim() === "") {
        errors.push(`${filePath}: expected.snapshotFile is required for suite ${document.suite}`);
      }

      if (typeof expected?.renderedText !== "string" || expected.renderedText.trim() === "") {
        errors.push(`${filePath}: expected.renderedText is required for suite ${document.suite}`);
      }
    }
  }

  return errors;
}

export async function loadAndValidateFixtures(fixturesRoot, projectRoot) {
  const resolvedProjectRoot =
    projectRoot ?? path.resolve(fixturesRoot, "..", "..");
  const suiteContracts = await loadSuiteContracts(resolvedProjectRoot);
  const files = await collectFixtureFiles(fixturesRoot);
  const fixtures = [];
  const errors = [];
  const ids = new Set();
  const suiteFixtureCounts = new Map(Object.keys(suiteContracts).map((suite) => [suite, 0]));

  for (const file of files) {
    const fixture = await loadFixtureFile(file);
    const fixtureErrors = validateFixtureDocument(fixture, suiteContracts, file);

    if (fixtureErrors.length > 0) {
      errors.push(...fixtureErrors);
      continue;
    }

    if (ids.has(fixture.id)) {
      errors.push(`${file}: duplicate fixture id ${fixture.id}`);
      continue;
    }

    ids.add(fixture.id);
    suiteFixtureCounts.set(
      fixture.suite,
      (suiteFixtureCounts.get(fixture.suite) ?? 0) + 1
    );
    fixtures.push({
      ...fixture,
      file
    });
  }

  for (const [suiteName, contract] of Object.entries(suiteContracts)) {
    const fixtureCount = suiteFixtureCounts.get(suiteName) ?? 0;
    const suitePath = path.resolve(fixturesRoot, suiteName);

    try {
      await fs.access(suitePath);
    } catch {
      if (contract.status === "active") {
        errors.push(`${suiteName}: active suite directory is missing`);
      }
    }

    if (contract.status === "active" && fixtureCount === 0) {
      errors.push(`${suiteName}: active suite must contain at least one fixture`);
    }

    if (typeof contract.grader === "string") {
      const graderPath = path.resolve(
        resolvedProjectRoot,
        "harness",
        "graders",
        contract.grader
      );

      try {
        await fs.access(graderPath);
      } catch {
        errors.push(`${suiteName}: grader file is missing (${contract.grader})`);
      }
    }
  }

  for (const fixture of fixtures) {
    const contract = suiteContracts[fixture.suite];

    if (typeof fixture.expected?.snapshotFile === "string") {
      const snapshotPath = path.resolve(
        resolvedProjectRoot,
        "harness",
        "snapshots",
        fixture.expected.snapshotFile
      );

      try {
        await fs.access(snapshotPath);
      } catch {
        errors.push(
          `${fixture.file}: snapshot file is missing (${fixture.expected.snapshotFile})`
        );
      }
    }

    if (
      contract?.requiresSnapshot &&
      typeof fixture.expected?.snapshotFile === "string" &&
      !fixture.expected.snapshotFile.startsWith(`${fixture.suite}/`)
    ) {
      errors.push(
        `${fixture.file}: snapshotFile must stay inside suite directory (${fixture.suite}/...)`
      );
    }
  }

  return {
    errors,
    fixtures,
    suiteContracts
  };
}
