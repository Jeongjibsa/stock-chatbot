import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  normalizeTickerNameEn,
  normalizeTickerNameKr,
  normalizeTickerSearchInput
} from "@stock-chatbot/application";
import {
  createDatabase,
  createPool,
  TickerMasterRepository
} from "@stock-chatbot/database";

const DEFAULT_DATABASE_URL = "postgresql://stockbot:stockbot@localhost:5432/stockbot";

type CsvTickerRow = {
  market: string;
  nameEn: string;
  nameKr: string;
  symbol: string;
};

type HeaderIndex = {
  market: number;
  nameEn: number;
  nameKr: number;
  symbol: number;
};

async function main(): Promise<void> {
  const csvPath = resolveCsvPath(process.argv.slice(2));
  const databaseUrl = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
  const content = await readFile(csvPath, "utf8");
  const rows = parseCsv(content);
  const [headerRow, ...valueRows] = rows;

  if (!headerRow) {
    throw new Error("CSV header row is missing");
  }

  const headerIndex = buildHeaderIndex(headerRow);
  const inputs = valueRows
    .map((row) => mapCsvTickerRow(row, headerIndex))
    .filter((row): row is CsvTickerRow => row !== null)
    .map((row) => ({
      symbol: row.symbol,
      nameEn: row.nameEn,
      nameKr: row.nameKr,
      market: row.market,
      normalizedSymbol: normalizeTickerSearchInput(row.symbol),
      normalizedNameEn: normalizeTickerNameEn(row.nameEn),
      normalizedNameKr: normalizeTickerNameKr(row.nameKr)
    }));

  const pool = createPool(databaseUrl);

  try {
    const db = createDatabase(pool);
    const repository = new TickerMasterRepository(db);
    const imported = await repository.upsertMany(inputs);
    const total = await repository.count();

    process.stdout.write(
      [
        `ticker master import completed`,
        `source: ${csvPath}`,
        `upserted: ${imported}`,
        `total_rows: ${total}`
      ].join("\n") + "\n"
    );
  } finally {
    await pool.end();
  }
}

function resolveCsvPath(argv: string[]): string {
  const positional = argv.find((arg) => !arg.startsWith("--"));
  const explicit = argv.find((arg) => arg.startsWith("--file="));
  const rawPath = explicit ? explicit.replace(/^--file=/, "") : positional;

  if (!rawPath) {
    throw new Error("Usage: pnpm --filter @stock-chatbot/worker run run:import-tickers -- --file=/path/to/tickers.csv");
  }

  return resolve(rawPath);
}

function buildHeaderIndex(headerRow: string[]): HeaderIndex {
  const normalized = headerRow.map((header) => header.trim());

  return {
    symbol: findHeaderIndex(normalized, ["symbol", "종목코드"]),
    nameEn: findHeaderIndex(normalized, ["name_en", "종목명(영문)"]),
    nameKr: findHeaderIndex(normalized, ["name_kr", "종목명(한글)"]),
    market: findHeaderIndex(normalized, ["market", "시장구분"])
  };
}

function findHeaderIndex(headers: string[], variants: string[]): number {
  const index = headers.findIndex((header) => variants.includes(header));

  if (index === -1) {
    throw new Error(`Missing required CSV column: ${variants.join(" / ")}`);
  }

  return index;
}

function mapCsvTickerRow(
  row: string[],
  headerIndex: HeaderIndex
): CsvTickerRow | null {
  const symbol = String(row[headerIndex.symbol] ?? "").trim();
  const market = String(row[headerIndex.market] ?? "").trim();

  if (!symbol || !market) {
    return null;
  }

  return {
    symbol,
    market,
    nameEn: String(row[headerIndex.nameEn] ?? "").trim(),
    nameKr: String(row[headerIndex.nameKr] ?? "").trim()
  };
}

function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  const normalizedInput = input.startsWith("\uFEFF") ? input.slice(1) : input;

  for (let index = 0; index < normalizedInput.length; index += 1) {
    const character = normalizedInput[index];
    const nextCharacter = normalizedInput[index + 1];

    if (inQuotes) {
      if (character === "\"" && nextCharacter === "\"") {
        currentField += "\"";
        index += 1;
        continue;
      }

      if (character === "\"") {
        inQuotes = false;
        continue;
      }

      currentField += character;
      continue;
    }

    if (character === "\"") {
      inQuotes = true;
      continue;
    }

    if (character === ",") {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if (character === "\n") {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
      continue;
    }

    if (character === "\r") {
      continue;
    }

    currentField += character;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((value) => value.trim().length > 0));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
