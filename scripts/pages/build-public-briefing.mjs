import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync
} from "node:fs";
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
const webAppSource = join(process.cwd(), "apps", "web", "dist");
const webAppTarget = join(outputRoot, "app");
const latestBriefingDataTarget = join(webAppTarget, "data", "latest-briefing.json");
const hasStaticWebApp = existsSync(webAppSource);

for (const target of [canonicalTarget, archiveTarget]) {
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, html);
}

if (hasStaticWebApp) {
  cpSync(webAppSource, webAppTarget, {
    recursive: true
  });
  mkdirSync(dirname(latestBriefingDataTarget), { recursive: true });
  writeFileSync(latestBriefingDataTarget, JSON.stringify(briefing, null, 2));
}

writeArchiveIndex(outputRoot, briefing.runDate, briefing.canonicalPath);
writeRootIndex(outputRoot, briefing.canonicalPath, hasStaticWebApp);
writeFileSync(join(outputRoot, ".nojekyll"), "");

console.log(
  JSON.stringify(
    {
      canonicalTarget,
      archiveTarget,
      latestBriefingDataTarget,
      archiveIndexTarget: join(outputRoot, "briefings", "index.html"),
      rootIndexTarget: join(outputRoot, "index.html")
    },
    null,
    2
  )
);

function toRelativePath(pathname) {
  return pathname.replace(/^\/+/, "");
}

function writeArchiveIndex(outputRoot, latestRunDate, latestCanonicalPath) {
  const entries = readAvailableBriefingEntries(outputRoot);
  const items = entries
    .map(
      (entry) =>
        `        <li><a href="${escapeHtml(entry.href)}">${escapeHtml(entry.label)}</a></li>`
    )
    .join("\n");
  const target = join(outputRoot, "briefings", "index.html");

  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(
    target,
    [
      "<!doctype html>",
      '<html lang="ko">',
      "<head>",
      '  <meta charset="utf-8" />',
      '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
      "  <title>브리핑 아카이브</title>",
      "  <style>",
      "    body { margin: 0; font-family: 'Iowan Old Style', 'Noto Serif KR', serif; background: #f7f4ee; color: #181511; }",
      "    main { max-width: 860px; margin: 0 auto; padding: 48px 20px 80px; }",
      "    .card { background: #fffaf1; border: 1px solid #ded4c6; border-radius: 20px; padding: 24px; }",
      "    h1 { margin: 0 0 12px; font-size: clamp(2rem, 4vw, 3rem); }",
      "    p { color: #5a534a; line-height: 1.6; }",
      "    ul { margin: 16px 0 0; padding-left: 1.2rem; }",
      "    li { margin: 0.45rem 0; }",
      "    a { color: #9a2c20; text-decoration: none; }",
      "  </style>",
      "</head>",
      "<body>",
      "  <main>",
      '    <section class="card">',
      "      <h1>브리핑 아카이브</h1>",
      `      <p>최신 공개 브리핑 기준일은 ${escapeHtml(latestRunDate)}입니다.</p>`,
      `      <p><a href="${escapeHtml(
        relativeFromBriefingsRoot(latestCanonicalPath)
      )}">최신 브리핑 바로가기</a></p>`,
      "      <ul>",
      items || "        <li>아직 생성된 브리핑이 없습니다.</li>",
      "      </ul>",
      "    </section>",
      "  </main>",
      "</body>",
      "</html>"
    ].join("\n")
  );
}

function writeRootIndex(outputRoot, latestCanonicalPath, hasStaticWebApp) {
  const target = join(outputRoot, "index.html");
  const links = [
    `        <a class="button primary" href="${escapeHtml(
      `.${latestCanonicalPath}`
    )}">최신 브리핑 보기</a>`
  ];

  if (hasStaticWebApp) {
    links.push('        <a class="button secondary" href="./app/">공개 웹사이트 보기</a>');
  }

  links.push('        <a class="button secondary" href="./briefings/">아카이브 보기</a>');

  writeFileSync(
    target,
    [
      "<!doctype html>",
      '<html lang="ko">',
      "<head>",
      '  <meta charset="utf-8" />',
      '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
      "  <title>Stock Chatbot Briefings</title>",
      "  <style>",
      "    body { margin: 0; font-family: 'Iowan Old Style', 'Noto Serif KR', serif; background: radial-gradient(circle at top, #fff4d9, #f7f4ee 52%); color: #181511; }",
      "    main { max-width: 860px; margin: 0 auto; padding: 56px 20px 80px; }",
      "    .hero { background: #fffaf1; border: 1px solid #ded4c6; border-radius: 24px; padding: 28px; box-shadow: 0 14px 40px rgba(0, 0, 0, 0.05); }",
      "    h1 { margin: 0 0 12px; font-size: clamp(2rem, 4vw, 3.4rem); line-height: 1.05; }",
      "    p { color: #5a534a; line-height: 1.6; }",
      "    .links { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 20px; }",
      "    .button { display: inline-block; padding: 12px 16px; border-radius: 999px; text-decoration: none; font-weight: 700; }",
      "    .primary { background: #9a2c20; color: #fffaf1; }",
      "    .secondary { border: 1px solid #ded4c6; color: #181511; background: rgba(255,255,255,0.8); }",
      "  </style>",
      "</head>",
      "<body>",
      "  <main>",
      '    <section class="hero">',
      "      <h1>오늘의 공개 브리핑</h1>",
      `      <p>최신 공개 브리핑 경로는 ${escapeHtml(latestCanonicalPath)} 입니다. 텔레그램 요약본과 연결되는 시장·매크로·자금·이벤트 상세 브리핑을 확인하실 수 있습니다.</p>`,
      '      <div class="links">',
      ...links,
      "      </div>",
      "    </section>",
      "  </main>",
      "</body>",
      "</html>"
    ].join("\n")
  );
}

function readAvailableBriefingEntries(outputRoot) {
  const briefingsRoot = join(outputRoot, "briefings");

  if (!existsSync(briefingsRoot)) {
    return [];
  }

  return readdirSync(briefingsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name))
    .flatMap((dateEntry) => {
      const sessionRoot = join(briefingsRoot, dateEntry.name);

      return readdirSync(sessionRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => ({
          href: `./${dateEntry.name}/${entry.name}/`,
          label: `${dateEntry.name} · ${entry.name}`
        }));
    })
    .sort((left, right) => right.label.localeCompare(left.label));
}

function relativeFromBriefingsRoot(canonicalPath) {
  return `.${canonicalPath.replace(/^\/briefings/, "")}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
