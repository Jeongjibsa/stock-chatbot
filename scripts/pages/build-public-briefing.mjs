/* global console, process */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { renderPublicDailyBriefingHtml } from "../../packages/application/dist/index.js";

const [inputPath, outputRoot = "site"] = process.argv.slice(2);

if (!inputPath) {
  throw new Error("Usage: node scripts/pages/build-public-briefing.mjs <input.json> [outputRoot]");
}

const briefing = JSON.parse(readFileSync(inputPath, "utf8"));
const html = renderPublicDailyBriefingHtml(briefing);
const canonicalTarget = join(outputRoot, toRelativePath(briefing.canonicalPath), "index.html");
const archiveTarget = join(outputRoot, toRelativePath(briefing.archivePath), "index.html");

for (const target of [canonicalTarget, archiveTarget]) {
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, html);
}

writeFileSync(join(outputRoot, ".nojekyll"), "");

console.log(
  JSON.stringify(
    {
      canonicalTarget,
      archiveTarget
    },
    null,
    2
  )
);

function toRelativePath(pathname) {
  return pathname.replace(/^\/+/, "");
}
