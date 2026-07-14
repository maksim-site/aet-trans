export function newsImageRelativePath(rawUrl) {
  const url = new URL(rawUrl);
  const marker = "/wp-content/uploads/";
  const markerIndex = url.pathname.indexOf(marker);

  if (markerIndex === -1) {
    throw new Error(`Unsupported news image URL: ${rawUrl}`);
  }

  const sourcePath = decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  const safeParts = sourcePath
    .split("/")
    .filter((part) => part && part !== "." && part !== "..");

  if (!safeParts.length) {
    throw new Error(`Empty news image path: ${rawUrl}`);
  }

  return `news/archive/${safeParts.join("/")}`;
}

export function newsImageWebPath(rawUrl) {
  return newsImageRelativePath(rawUrl)
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}
