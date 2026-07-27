import { spawn } from "node:child_process";
import { readdir, rename, stat, unlink } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const cwebpBinary = process.env.CWEBP_BINARY || "cwebp";
const force = process.argv.includes("--force");
const concurrency = Math.max(1, Math.min(8, Number(process.env.WEBP_CONCURRENCY) || 4));

const targets = [
  { directory: join(projectRoot, "assets/news"), mode: "photo" },
  { directory: join(projectRoot, "assets/images"), mode: "photo" },
  { directory: join(projectRoot, "v4/assets/client-logos"), mode: "logo" },
];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  }));
  return files.flat();
}

const jobs = [];
for (const target of targets) {
  const files = await walk(target.directory);
  for (const input of files) {
    if (!/\.(?:jpe?g|png)$/i.test(input)) continue;
    const output = input.slice(0, -extname(input).length) + ".webp";
    jobs.push({ input, output, mode: target.mode });
  }
}

async function needsConversion(job) {
  if (force) return true;
  try {
    const [inputStats, outputStats] = await Promise.all([stat(job.input), stat(job.output)]);
    return outputStats.mtimeMs < inputStats.mtimeMs;
  } catch {
    return true;
  }
}

function runCwebp(job, temporaryOutput) {
  const args = job.mode === "logo"
    ? ["-quiet", "-lossless", "-z", "9", "-metadata", "none", job.input, "-o", temporaryOutput]
    : ["-quiet", "-q", "78", "-m", "6", "-mt", "-metadata", "none", job.input, "-o", temporaryOutput];

  return new Promise((resolve, reject) => {
    const child = spawn(cwebpBinary, args, { stdio: ["ignore", "ignore", "pipe"] });
    let errorOutput = "";
    child.stderr.on("data", (chunk) => {
      errorOutput += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cwebpBinary} failed for ${job.input}: ${errorOutput.trim()}`));
    });
  });
}

let nextJob = 0;
let converted = 0;
let skipped = 0;
let originalBytes = 0;
let webpBytes = 0;

async function worker() {
  while (nextJob < jobs.length) {
    const job = jobs[nextJob++];
    const convert = await needsConversion(job);
    if (!convert) {
      skipped += 1;
      continue;
    }

    const temporaryOutput = `${job.output}.tmp-${process.pid}`;
    try {
      await runCwebp(job, temporaryOutput);
      const [inputStats, outputStats] = await Promise.all([stat(job.input), stat(temporaryOutput)]);
      await rename(temporaryOutput, job.output);
      originalBytes += inputStats.size;
      webpBytes += outputStats.size;
      converted += 1;
    } catch (error) {
      await unlink(temporaryOutput).catch(() => {});
      throw error;
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));

const savedBytes = originalBytes - webpBytes;
const savedPercent = originalBytes ? Math.round((savedBytes / originalBytes) * 1000) / 10 : 0;
console.log(JSON.stringify({
  total: jobs.length,
  converted,
  skipped,
  originalBytes,
  webpBytes,
  savedBytes,
  savedPercent,
}, null, 2));
