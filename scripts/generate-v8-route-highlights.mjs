import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const graphicsDirectory = path.join(projectRoot, "v8", "assets", "graphics");
const mapFile = path.join(graphicsDirectory, "eurasia-base.svg");

const destinationParts = {
  russia: { indices: [16], label: "Россия" },
  china: { indices: [96], label: "Китай" },
  europe: {
    indices: [29, 30, 31, 32, 34, 35, 36, 68, 71, 72, 73, 75, 76, 77, 78, 79, 80, 81, 82, 85, 86, 87, 88, 89, 90, 91, 92, 93, 98, 99, 100, 101, 102, 103, 104, 105, 119, 120, 121, 122, 130, 131, 132, 133, 134],
    label: "Европа — группа стран",
  },
  cis: {
    indices: [0, 1, 62, 63, 64, 67, 69, 70, 74, 106, 107],
    label: "СНГ — группа стран",
  },
  turkey: { indices: [83], label: "Турция" },
  other: {
    indices: [41, 51, 56, 127],
    label: "Другие направления — Ближний Восток, Индия и Юго-Восточная Азия",
  },
};

const mapSource = await readFile(mapFile, "utf8");
const countryPath = mapSource.match(/<path d="([^"]+)"/)?.[1];

if (!countryPath) throw new Error(`Country geometry was not found in ${mapFile}`);

const countryParts = countryPath.match(/M[^Z]+Z/g) || [];

if (countryParts.length < 100) {
  throw new Error(`Expected Natural Earth country parts, found ${countryParts.length}`);
}

await mkdir(graphicsDirectory, { recursive: true });

for (const [routeKey, destination] of Object.entries(destinationParts)) {
  const geometries = destination.indices.map((index) => {
    const geometry = countryParts[index];
    if (!geometry) throw new Error(`Missing country part ${index} for ${routeKey}`);
    return `<path d="${geometry}"/>`;
  }).join("\n    ");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-16 -18 932 578" role="img" aria-label="${destination.label}">
  <metadata>Natural Earth 1:110m admin-0 countries, public domain. Country groups extracted from eurasia-base.svg for the AET Trans route interaction.</metadata>
  <g fill="#8ed04f" stroke="#bce994" stroke-width="1.2" vector-effect="non-scaling-stroke">
    ${geometries}
  </g>
</svg>
`;

  await writeFile(path.join(graphicsDirectory, `route-highlight-${routeKey}.svg`), svg, "utf8");
}

console.log(`Generated ${Object.keys(destinationParts).length} v8 route highlight assets.`);
