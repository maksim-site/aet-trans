import { createServer } from "node:http";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { localNewsImages } from "./site-content.mjs";
import { newsImageRelativePath } from "./news-assets.mjs";

const execFileAsync = promisify(execFile);
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const newsPath = join(projectRoot, "v3/data/news.json");
const backupDirectory = join(projectRoot, ".admin-backups");
const uploadDirectory = join(projectRoot, "assets/news/uploads");
const host = "127.0.0.1";
const port = Number.parseInt(process.env.AET_ADMIN_PORT || "43119", 10);
const bodyLimit = 12 * 1024 * 1024;
const imageLimit = 8 * 1024 * 1024;

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".ico", "image/x-icon"],
  [".xml", "application/xml; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".pdf", "application/pdf"],
]);

const transliteration = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "j", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "shh",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

const blockedStaticSegments = new Set([
  ".admin-backups",
  ".git",
  "data",
  "docs",
  "node_modules",
  "scripts",
  "v3",
]);

let mutationQueue = Promise.resolve();
let mutationActive = false;

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function sendError(response, error) {
  const statusCode = error.statusCode || 500;
  if (statusCode >= 500) console.error(error);
  sendJson(response, statusCode, { error: error.message || "Внутренняя ошибка сервера" });
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > bodyLimit) throw httpError(413, "Запрос слишком большой");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw httpError(400, "Некорректные данные запроса");
  }
}

async function readNewsDocument() {
  return JSON.parse(await readFile(newsPath, "utf8"));
}

async function writeNewsDocument(document) {
  const temporaryPath = `${newsPath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
  await rename(temporaryPath, newsPath);
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .split("")
    .map((character) => transliteration[character] ?? character)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 190);
}

function assertValidDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw httpError(400, "Укажите дату публикации");
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date) {
    throw httpError(400, "Дата публикации указана неверно");
  }
}

function normalizeCoverImage(value) {
  const coverImage = String(value || "").trim().replaceAll("\\", "/");
  if (!coverImage) return "";
  if (coverImage.startsWith("/") || coverImage.includes("..") || !/^[a-zA-Z0-9_./-]+$/.test(coverImage)) {
    throw httpError(400, "Некорректный путь к изображению");
  }
  return coverImage;
}

function normalizeGalleryImages(value, fallback = []) {
  if (value === undefined) return [...fallback];
  if (!Array.isArray(value)) throw httpError(400, "Некорректный список изображений");
  if (value.length > 60) throw httpError(400, "В одной новости может быть не больше 60 изображений");
  return [...new Set(value.map(normalizeCoverImage).filter(Boolean))];
}

function assetUrl(relativePath) {
  return `/assets/${relativePath.split("/").map(encodeURIComponent).join("/")}`;
}

function availableArchiveImages(post) {
  const images = [];
  for (const source of post.images || []) {
    try {
      const path = newsImageRelativePath(source);
      if (existsSync(join(projectRoot, "assets", path))) images.push({ path, source });
    } catch {
      // Unsupported legacy image URLs are left in the source data and omitted from the editor.
    }
  }
  return images;
}

function imageKind(path, inheritedCover) {
  if (path === inheritedCover) return "inherited";
  if (path.startsWith("news/archive/")) return "archive";
  if (path.startsWith("news/uploads/")) return "upload";
  return "asset";
}

function bodyFromBlocks(blocks = []) {
  const sections = [];
  let list = [];
  const flushList = () => {
    if (!list.length) return;
    sections.push(list.map((text) => `- ${text}`).join("\n"));
    list = [];
  };

  for (const block of blocks) {
    const text = String(block.text || "").trim();
    if (!text) continue;
    if (block.type === "list-item") {
      list.push(text);
      continue;
    }
    flushList();
    if (block.type === "heading") sections.push(`## ${text}`);
    else if (block.type === "quote") sections.push(`> ${text}`);
    else sections.push(text);
  }
  flushList();
  return sections.join("\n\n");
}

function blocksFromBody(value) {
  const body = String(value || "").replaceAll("\r\n", "\n").trim();
  if (!body) throw httpError(400, "Добавьте текст публикации");
  if (body.length > 200000) throw httpError(400, "Текст публикации слишком большой");

  const blocks = [];
  for (const section of body.split(/\n\s*\n/)) {
    const lines = section.split("\n").map((line) => line.trim()).filter(Boolean);
    if (!lines.length) continue;
    if (lines.every((line) => line.startsWith("- "))) {
      for (const line of lines) blocks.push({ type: "list-item", text: line.slice(2).trim() });
    } else if (lines[0].startsWith("## ")) {
      blocks.push({ type: "heading", text: lines.join(" ").slice(3).trim() });
    } else if (lines[0].startsWith("> ")) {
      blocks.push({ type: "quote", text: lines.join(" ").slice(2).trim() });
    } else {
      blocks.push({ type: "paragraph", text: lines.join(" ") });
    }
  }
  if (!blocks.length) throw httpError(400, "Добавьте текст публикации");
  return blocks;
}

function summarize(blocks) {
  const text = blocks.find((block) => block.type === "paragraph")?.text || blocks[0]?.text || "";
  return text.length > 300 ? `${text.slice(0, 297).trim()}...` : text;
}

function postRoute(post) {
  const [year, month, day] = post.date.split("-");
  return `${year}/${month}/${day}/${post.slug}`;
}

function serializePost(post, includeBody = false) {
  const inheritedCover = localNewsImages[post.slug]
    ? `news/${localNewsImages[post.slug]}`
    : "";
  const coverPath = post.coverImage || inheritedCover;
  const persistedGallery = new Set(post.galleryImages || []);
  const archiveImages = availableArchiveImages(post);
  const galleryByPath = new Map();
  const addGalleryImage = (path, source = "") => {
    if (!path || !existsSync(join(projectRoot, "assets", path))) return;
    const previous = galleryByPath.get(path);
    galleryByPath.set(path, {
      path,
      url: assetUrl(path),
      source: source || previous?.source || "",
      kind: imageKind(path, inheritedCover),
      isCover: path === coverPath,
      removable: path.startsWith("news/uploads/"),
      persistInGallery: persistedGallery.has(path),
    });
  };

  addGalleryImage(coverPath);
  addGalleryImage(inheritedCover);
  for (const image of archiveImages) addGalleryImage(image.path, image.source);
  for (const image of post.galleryImages || []) addGalleryImage(image);

  const result = {
    id: post.id,
    date: post.date,
    year: post.year,
    slug: post.slug,
    title: post.title,
    summary: post.summary || "",
    coverImage: post.coverImage || "",
    inheritedCover,
    coverPath,
    coverUrl: coverPath ? assetUrl(coverPath) : "",
    galleryImages: post.galleryImages || [],
    gallery: [...galleryByPath.values()],
    url: `/${postRoute(post)}/`,
  };
  if (includeBody) result.body = bodyFromBlocks(post.blocks);
  return result;
}

function normalizePost(payload, existingPost, posts) {
  const title = String(payload.title || "").trim();
  if (!title) throw httpError(400, "Укажите заголовок");
  if (title.length > 220) throw httpError(400, "Заголовок слишком длинный");

  const date = String(payload.date || "").trim();
  assertValidDate(date);

  const slug = slugify(payload.slug || title);
  if (!slug) throw httpError(400, "Не удалось сформировать адрес страницы");
  const duplicate = posts.find((post) => post.slug === slug && post.slug !== existingPost?.slug);
  if (duplicate) throw httpError(409, "Такой адрес страницы уже используется");

  const blocks = blocksFromBody(payload.body);
  const suppliedSummary = String(payload.summary || "").trim();
  if (suppliedSummary.length > 1000) throw httpError(400, "Краткое описание слишком длинное");
  const summary = suppliedSummary || summarize(blocks);
  const coverImage = normalizeCoverImage(payload.coverImage);
  const galleryImages = normalizeGalleryImages(payload.galleryImages, existingPost?.galleryImages || []);
  const nextId = posts.reduce((maximum, post) => Math.max(maximum, Number(post.id) || 0), 0) + 1;

  const post = {
    ...(existingPost || {}),
    id: existingPost?.id ?? nextId,
    date,
    year: date.slice(0, 4),
    slug,
    title,
    summary,
    blocks,
    images: existingPost?.images || [],
  };

  if (coverImage) post.coverImage = coverImage;
  else delete post.coverImage;
  if (galleryImages.length) post.galleryImages = galleryImages;
  else delete post.galleryImages;

  if (!existingPost) post.legacyUrl = `https://aet-trans.ru/${postRoute(post)}/`;
  return post;
}

function sortPosts(posts) {
  posts.sort((a, b) => b.date.localeCompare(a.date) || Number(b.id || 0) - Number(a.id || 0));
}

async function backupNewsDocument(rawDocument) {
  await mkdir(backupDirectory, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  await writeFile(join(backupDirectory, `news-${timestamp}.json`), rawDocument, "utf8");
}

async function runGenerator(target) {
  const args = [join(projectRoot, "scripts/generate-site.mjs")];
  if (target) args.push(target);
  await execFileAsync(process.execPath, args, {
    cwd: projectRoot,
    maxBuffer: 12 * 1024 * 1024,
  });
}

async function removeGeneratedPost(post) {
  if (!post?.slug || !post?.date) return;
  const route = postRoute(post);
  await Promise.all([
    rm(join(projectRoot, route), { recursive: true, force: true }),
    rm(join(projectRoot, "news", post.slug), { recursive: true, force: true }),
    rm(join(projectRoot, "v3", route), { recursive: true, force: true }),
    rm(join(projectRoot, "v3/news", post.slug), { recursive: true, force: true }),
  ]);
}

function uploadedImagesForPost(post) {
  if (!post) return [];
  return [...new Set([post.coverImage, ...(post.galleryImages || [])].filter((image) => image?.startsWith("news/uploads/")))];
}

async function removeUnusedUploadedImage(imagePath, posts) {
  if (!imagePath?.startsWith("news/uploads/")) return;
  if (posts.some((post) => post.coverImage === imagePath || post.galleryImages?.includes(imagePath))) return;
  const target = resolve(projectRoot, "assets", imagePath);
  if (!target.startsWith(`${uploadDirectory}${sep}`)) return;
  await rm(target, { force: true });
}

async function generateAndValidate(stalePosts = []) {
  await runGenerator("v3");
  await runGenerator("");
  for (const post of stalePosts) await removeGeneratedPost(post);
  await execFileAsync(process.execPath, [join(projectRoot, "scripts/validate-site.mjs")], {
    cwd: projectRoot,
    maxBuffer: 12 * 1024 * 1024,
  });
}

function routeChanged(previousPost, nextPost) {
  return previousPost && nextPost && postRoute(previousPost) !== postRoute(nextPost);
}

async function mutateNews(mutator) {
  const previousRaw = await readFile(newsPath, "utf8");
  const previousDocument = JSON.parse(previousRaw);
  const nextDocument = structuredClone(previousDocument);
  const result = mutator(nextDocument);
  sortPosts(nextDocument.posts);
  nextDocument.meta = {
    ...nextDocument.meta,
    count: nextDocument.posts.length,
    updatedAt: new Date().toISOString(),
  };

  await backupNewsDocument(previousRaw);
  await writeNewsDocument(nextDocument);

  const staleOnSuccess = [];
  if (result.deletedPost) staleOnSuccess.push(result.deletedPost);
  if (routeChanged(result.previousPost, result.post)) staleOnSuccess.push(result.previousPost);

  try {
    await generateAndValidate(staleOnSuccess);
    const previousImages = uploadedImagesForPost(result.deletedPost || result.previousPost);
    const nextImages = new Set(uploadedImagesForPost(result.post));
    const removedImages = previousImages.filter((image) => !nextImages.has(image));
    await Promise.all(removedImages.map((image) => removeUnusedUploadedImage(image, nextDocument.posts)));
    return result;
  } catch (error) {
    await writeFile(newsPath, previousRaw, "utf8");
    const staleOnRollback = [];
    if (result.post && !previousDocument.posts.some((post) => postRoute(post) === postRoute(result.post))) {
      staleOnRollback.push(result.post);
    }
    try {
      await generateAndValidate(staleOnRollback);
    } catch (rollbackError) {
      console.error("Rollback rebuild failed", rollbackError);
    }
    const output = [error.stdout, error.stderr].filter(Boolean).join("\n").trim();
    throw httpError(500, output ? `Сборка сайта завершилась с ошибкой: ${output}` : "Сборка сайта завершилась с ошибкой");
  }
}

function enqueueMutation(action) {
  const pending = mutationQueue.then(async () => {
    mutationActive = true;
    try {
      return await action();
    } finally {
      mutationActive = false;
    }
  });
  mutationQueue = pending.catch(() => {});
  return pending;
}

async function handleApi(request, response, pathname) {
  const method = request.method || "GET";

  if (pathname === "/api/status" && method === "GET") {
    const document = await readNewsDocument();
    sendJson(response, 200, { ok: true, count: document.posts.length, busy: mutationActive });
    return;
  }

  if (pathname === "/api/uploads" && method === "POST") {
    const payload = await readJsonBody(request);
    const typeToExtension = new Map([
      ["image/jpeg", ".jpg"],
      ["image/png", ".png"],
      ["image/webp", ".webp"],
    ]);
    const extension = typeToExtension.get(payload.type);
    if (!extension) throw httpError(400, "Поддерживаются JPG, PNG и WebP");
    const match = String(payload.data || "").match(/^data:image\/(?:jpeg|png|webp);base64,(.+)$/);
    if (!match) throw httpError(400, "Некорректные данные изображения");
    const buffer = Buffer.from(match[1], "base64");
    if (!buffer.length || buffer.length > imageLimit) throw httpError(413, "Изображение больше 8 МБ");
    const hasValidSignature = payload.type === "image/jpeg"
      ? buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
      : payload.type === "image/png"
        ? buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
        : buffer.subarray(0, 4).toString("ascii") === "RIFF"
          && buffer.subarray(8, 12).toString("ascii") === "WEBP";
    if (!hasValidSignature) throw httpError(400, "Файл не соответствует формату изображения");
    const baseName = slugify(String(payload.name || "image").replace(/\.[^.]+$/, "")) || "image";
    const filename = `${Date.now()}-${baseName.slice(0, 70)}${extension}`;
    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(join(uploadDirectory, filename), buffer);
    sendJson(response, 201, {
      coverImage: `news/uploads/${filename}`,
      imagePath: `news/uploads/${filename}`,
      url: `/assets/news/uploads/${filename}`,
    });
    return;
  }

  if (pathname === "/api/news" && method === "GET") {
    const document = await readNewsDocument();
    sendJson(response, 200, {
      count: document.posts.length,
      posts: document.posts.map((post) => serializePost(post)),
    });
    return;
  }

  if (pathname === "/api/news" && method === "POST") {
    const payload = await readJsonBody(request);
    const result = await enqueueMutation(() => mutateNews((document) => {
      const post = normalizePost(payload, null, document.posts);
      document.posts.push(post);
      return { post };
    }));
    sendJson(response, 201, { post: serializePost(result.post, true) });
    return;
  }

  const match = pathname.match(/^\/api\/news\/([a-z0-9-]+)$/);
  if (!match) throw httpError(404, "Страница не найдена");
  const slug = match[1];

  if (method === "GET") {
    const document = await readNewsDocument();
    const post = document.posts.find((item) => item.slug === slug);
    if (!post) throw httpError(404, "Новость не найдена");
    sendJson(response, 200, { post: serializePost(post, true) });
    return;
  }

  if (method === "PUT") {
    const payload = await readJsonBody(request);
    const result = await enqueueMutation(() => mutateNews((document) => {
      const index = document.posts.findIndex((item) => item.slug === slug);
      if (index < 0) throw httpError(404, "Новость не найдена");
      const previousPost = document.posts[index];
      const post = normalizePost(payload, previousPost, document.posts);
      document.posts[index] = post;
      return { post, previousPost };
    }));
    sendJson(response, 200, { post: serializePost(result.post, true) });
    return;
  }

  if (method === "DELETE") {
    const result = await enqueueMutation(() => mutateNews((document) => {
      const index = document.posts.findIndex((item) => item.slug === slug);
      if (index < 0) throw httpError(404, "Новость не найдена");
      const [deletedPost] = document.posts.splice(index, 1);
      return { deletedPost };
    }));
    sendJson(response, 200, { deleted: result.deletedPost.slug });
    return;
  }

  throw httpError(405, "Метод не поддерживается");
}

async function serveStatic(request, response, pathname) {
  if (pathname === "/admin") {
    response.writeHead(308, { Location: "/admin/" });
    response.end();
    return;
  }

  const normalizedPath = normalize(pathname).replace(/^([/\\])+/, "");
  const firstSegment = normalizedPath.split(/[\\/]/)[0];
  const isBlocked = normalizedPath && normalizedPath !== "."
    && (firstSegment.startsWith(".") || blockedStaticSegments.has(firstSegment));
  if (isBlocked) {
    throw httpError(404, "Файл не найден");
  }

  let filePath = resolve(projectRoot, normalizedPath || "index.html");
  if (filePath !== projectRoot && !filePath.startsWith(`${projectRoot}${sep}`)) {
    throw httpError(403, "Доступ запрещен");
  }
  if (existsSync(filePath) && (await stat(filePath)).isDirectory()) filePath = join(filePath, "index.html");
  if (!existsSync(filePath) || !(await stat(filePath)).isFile()) throw httpError(404, "Файл не найден");

  const extension = extname(filePath).toLowerCase();
  const cacheControl = normalizedPath.startsWith("admin/") ? "no-store" : "no-cache";
  response.writeHead(200, {
    "Content-Type": mimeTypes.get(extension) || "application/octet-stream",
    "Cache-Control": cacheControl,
    "X-Content-Type-Options": "nosniff",
  });
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  response.end(await readFile(filePath));
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${host}:${port}`);
    const pathname = decodeURIComponent(url.pathname);
    if (pathname.startsWith("/api/")) await handleApi(request, response, pathname);
    else if (request.method === "GET" || request.method === "HEAD") await serveStatic(request, response, pathname);
    else throw httpError(405, "Метод не поддерживается");
  } catch (error) {
    if (response.headersSent) response.end();
    else sendError(response, error);
  }
});

server.listen(port, host, () => {
  console.log(`AET Trans site: http://${host}:${port}/`);
  console.log(`News admin: http://${host}:${port}/admin/`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
