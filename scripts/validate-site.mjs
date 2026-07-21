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
const markupFailures = [];
let checkedReferences = 0;
let checkedDocuments = 0;

function addMarkupFailure(htmlPath, message) {
  markupFailures.push({ htmlPath, message });
}

function validateMarkup(htmlPath, html) {
  checkedDocuments += 1;
  const isRedirect = /<meta\s+http-equiv="refresh"/i.test(html);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];

  for (const id of duplicateIds) addMarkupFailure(htmlPath, `Повторяется id="${id}"`);

  for (const [tag] of html.matchAll(/<img\b[^>]*>/gi)) {
    if (!/\salt="[^"]*"/i.test(tag)) addMarkupFailure(htmlPath, `У изображения отсутствует alt: ${tag.slice(0, 120)}`);
  }

  for (const [tag] of html.matchAll(/<iframe\b[^>]*>/gi)) {
    if (!/\stitle="[^"]+"/i.test(tag)) addMarkupFailure(htmlPath, `У iframe отсутствует title: ${tag.slice(0, 120)}`);
  }

  for (const [tag] of html.matchAll(/<a\b[^>]*\starget="_blank"[^>]*>/gi)) {
    if (!/\srel="[^"]*noopener[^"]*"/i.test(tag)) {
      addMarkupFailure(htmlPath, `Ссылка target="_blank" не содержит rel="noopener": ${tag.slice(0, 120)}`);
    }
  }

  if (isRedirect) return;
  if (!/<html\s+[^>]*lang="ru"/i.test(html)) addMarkupFailure(htmlPath, "Не указан lang=\"ru\"");
  if (!/<title>\s*[^<]+\s*<\/title>/i.test(html)) addMarkupFailure(htmlPath, "Отсутствует непустой title");
  if (!/<meta\s+name="viewport"\s+content="[^"]+"/i.test(html)) addMarkupFailure(htmlPath, "Отсутствует viewport");
  if (!/<h1\b/i.test(html)) addMarkupFailure(htmlPath, "Отсутствует h1");
}

for (const root of roots) {
  const htmlFiles = await collectHtml(root, root === projectRoot);

  for (const htmlPath of htmlFiles) {
    const html = await readFile(htmlPath, "utf8");
    validateMarkup(htmlPath, html);
    const references = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);

    for (const reference of references) {
      const target = localTarget(htmlPath, reference);
      if (!target) continue;
      checkedReferences += 1;
      if (!await exists(target)) failures.push({ htmlPath, reference, target });
    }
  }
}

if (failures.length || markupFailures.length) {
  for (const failure of failures.slice(0, 50)) {
    console.error(`${failure.htmlPath}: ${failure.reference} -> ${failure.target}`);
  }
  for (const failure of markupFailures.slice(0, 50)) {
    console.error(`${failure.htmlPath}: ${failure.message}`);
  }
  console.error(`Broken local references: ${failures.length}; markup errors: ${markupFailures.length}`);
  process.exitCode = 1;
} else {
  console.log(`Validated ${checkedDocuments} documents and ${checkedReferences} local references without errors.`);
}
