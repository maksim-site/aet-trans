import { access, readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const roots = [projectRoot, join(projectRoot, "v3")];
const ignoredDirectories = new Set([".git", "assets", "data", "design-system", "docs", "scripts", "v3"]);

async function collectHtml(directory, isProjectRoot = false) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    if (entry.isDirectory() && isProjectRoot && ignoredDirectories.has(entry.name)) continue;

    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectHtml(path));
    if (entry.isFile() && entry.name.endsWith(".html")) files.push(path);
  }

  return files;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function localTarget(htmlPath, rawReference) {
  const reference = rawReference.replaceAll("&amp;", "&").split("#")[0].split("?")[0];
  if (!reference || reference.startsWith("#")) return null;
  if (/^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(reference)) return null;

  const decoded = decodeURIComponent(reference);
  const target = decoded.startsWith("/")
    ? join(projectRoot, decoded)
    : resolve(dirname(htmlPath), decoded);

  return decoded.endsWith("/") ? join(target, "index.html") : target;
}

const failures = [];
let checkedReferences = 0;

for (const root of roots) {
  const htmlFiles = await collectHtml(root, root === projectRoot);

  for (const htmlPath of htmlFiles) {
    const html = await readFile(htmlPath, "utf8");
    const references = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);

    for (const reference of references) {
      const target = localTarget(htmlPath, reference);
      if (!target) continue;
      checkedReferences += 1;
      if (!await exists(target)) failures.push({ htmlPath, reference, target });
    }
  }
}

if (failures.length) {
  for (const failure of failures.slice(0, 50)) {
    console.error(`${failure.htmlPath}: ${failure.reference} -> ${failure.target}`);
  }
  console.error(`Broken local references: ${failures.length}`);
  process.exitCode = 1;
} else {
  console.log(`Validated ${checkedReferences} local references without errors.`);
}
