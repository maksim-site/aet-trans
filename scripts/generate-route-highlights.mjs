import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const graphicsDirectory = path.join(projectRoot, "v7", "assets", "graphics");
const mapFile = path.join(graphicsDirectory, "eurasia-base.svg");

const destinationParts = {
  russia: { index: 16, label: "Россия" },
  china: { index: 96, label: "Китай" },
  europe: { index: 79, label: "Европа — Германия" },
  cis: { index: 0, label: "СНГ — Казахстан" },
  turkey: { index: 83, label: "Турция" },
  other: { index: 41, label: "Другие направления — ОАЭ" },
};

const mapSource = await readFile(mapFile, "utf8");
const countryPath = mapSource.match(/<path d="([^"]+)"/)?.[1];

if (!countryPath) {
  throw new Error(`Country geometry was not found in ${mapFile}`);
}

const countryParts = countryPath.match(/M[^Z]+Z/g) || [];

if (countryParts.length < 100) {
  throw new Error(`Expected Natural Earth country parts, found ${countryParts.length}`);
}

await mkdir(graphicsDirectory, { recursive: true });

for (const [routeKey, destination] of Object.entries(destinationParts)) {
  const geometry = countryParts[destination.index];
  if (!geometry) {
    throw new Error(`Missing country part ${destination.index} for ${routeKey}`);
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 520" role="img" aria-label="${destination.label}">
  <metadata>Natural Earth 1:110m admin-0 countries, public domain. Extracted from eurasia-base.svg for the AET Trans route interaction.</metadata>
  <path d="${geometry}" fill="#8ed04f" stroke="#bce994" stroke-width="1.2" vector-effect="non-scaling-stroke"/>
</svg>
`;

  await writeFile(path.join(graphicsDirectory, `route-highlight-${routeKey}.svg`), svg, "utf8");
}

console.log(`Generated ${Object.keys(destinationParts).length} route highlight assets.`);
