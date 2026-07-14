import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { newsImageRelativePath } from "./news-assets.mjs";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const newsData = JSON.parse(await readFile(join(projectRoot, "v3/data/news.json"), "utf8"));
const assetsRoot = join(projectRoot, "assets");
const entriesByPath = new Map();

for (const imageUrl of newsData.posts.flatMap((post) => post.images || [])) {
  const relativePath = newsImageRelativePath(imageUrl);
  if (!entriesByPath.has(relativePath)) {
    entriesByPath.set(relativePath, imageUrl);
  }
}

const entries = [...entriesByPath.entries()];
let downloaded = 0;
let skipped = 0;
let failed = 0;

async function fileExists(path) {
  try {
    return (await stat(path)).size > 0;
  } catch {
    return false;
  }
}

async function fetchImage(relativePath, imageUrl) {
  const target = join(assetsRoot, relativePath);
  if (await fileExists(target)) {
    skipped += 1;
    return;
  }

  await mkdir(dirname(target), { recursive: true });

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(imageUrl, {
        headers: { "user-agent": "AET-Trans-content-migration/1.0" },
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.startsWith("image/")) {
        throw new Error(`Unexpected content type: ${contentType}`);
      }

      await writeFile(target, Buffer.from(await response.arrayBuffer()));
      downloaded += 1;
      return;
    } catch (error) {
      if (attempt === 3) {
        failed += 1;
        console.error(`Failed: ${imageUrl} (${error.message})`);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
}

const concurrency = 8;
let cursor = 0;

async function worker() {
  while (cursor < entries.length) {
    const current = entries[cursor];
    cursor += 1;
    await fetchImage(...current);
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));

console.log(`News images: ${downloaded} downloaded, ${skipped} skipped, ${failed} failed.`);
if (failed) process.exitCode = 1;
