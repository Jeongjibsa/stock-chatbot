import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const publicDir = resolve(root, "public");
const distDir = resolve(root, "dist");

await rm(distDir, {
  force: true,
  recursive: true
});
await mkdir(distDir, {
  recursive: true
});
await cp(publicDir, distDir, {
  recursive: true
});
