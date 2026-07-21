const acceptedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageSize = 8 * 1024 * 1024;

const state = {
  authenticated: false,
  posts: [],
  selectedSlug: "",
  currentPost: null,
  isNew: false,
  dirty: false,
  busy: false,
  slugTouched: false,
  gallery: [],
  pendingImages: [],
  coverKey: "",
  defaultCoverKey: "",
  inheritedCover: "",
};

const elements = {
  authScreen: document.querySelector("#authScreen"),
  authLoading: document.querySelector("#authLoading"),
  loginForm: document.querySelector("#loginForm"),
  passwordInput: document.querySelector("#passwordInput"),
  passwordToggle: document.querySelector("#passwordToggle"),
  rememberInput: document.querySelector("#rememberInput"),
  loginButton: document.querySelector("#loginButton"),
  loginError: document.querySelector("#loginError"),
  adminShell: document.querySelector("#adminShell"),
  logoutButton: document.querySelector("#logoutButton"),
  newPostButton: document.querySelector("#newPostButton"),
  searchInput: document.querySelector("#searchInput"),
  yearFilter: document.querySelector("#yearFilter"),
  resultCount: document.querySelector("#resultCount"),
  newsTable: document.querySelector("#newsTable"),
  listState: document.querySelector("#listState"),
  editorPanel: document.querySelector("#editorPanel"),
  editorEmpty: document.querySelector("#editorEmpty"),
  editorContent: document.querySelector("#editorContent"),
  editorMode: document.querySelector("#editorMode"),
  editorHeading: document.querySelector("#editorHeading"),
  closeEditorButton: document.querySelector("#closeEditorButton"),
  newsForm: document.querySelector("#newsForm"),
  originalSlug: document.querySelector("#originalSlug"),
  titleInput: document.querySelector("#titleInput"),
  dateInput: document.querySelector("#dateInput"),
  slugInput: document.querySelector("#slugInput"),
  summaryInput: document.querySelector("#summaryInput"),
  showSummaryInput: document.querySelector("#showSummaryInput"),
  bodyInput: document.querySelector("#bodyInput"),
  imageInput: document.querySelector("#imageInput"),
  imagePreview: document.querySelector("#imagePreview"),
  previewImage: document.querySelector("#previewImage"),
  coverSourceLabel: document.querySelector("#coverSourceLabel"),
  removeImageButton: document.querySelector("#removeImageButton"),
  imageCount: document.querySelector("#imageCount"),
  galleryEmpty: document.querySelector("#galleryEmpty"),
  imageGallery: document.querySelector("#imageGallery"),
  deleteButton: document.querySelector("#deleteButton"),
  cancelButton: document.querySelector("#cancelButton"),
  saveButton: document.querySelector("#saveButton"),
  deleteDialog: document.querySelector("#deleteDialog"),
  deleteMessage: document.querySelector("#deleteMessage"),
  confirmDeleteButton: document.querySelector("#confirmDeleteButton"),
  toast: document.querySelector("#toast"),
};

const transliteration = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "j", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "shh",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

function slugify(value) {
  return String(value)
    .toLowerCase()
    .split("")
    .map((character) => transliteration[character] ?? character)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 190);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatPhotoCount(count) {
  const remainder100 = count % 100;
  const remainder10 = count % 10;
  if (remainder100 >= 11 && remainder100 <= 19) return `${count} фотографий`;
  if (remainder10 === 1) return `${count} фотография`;
  if (remainder10 >= 2 && remainder10 <= 4) return `${count} фотографии`;
  return `${count} фотографий`;
}

function localDateValue() {
  const now = new Date();
  return new Date(now.valueOf() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function pathKey(path) {
  return path ? `path:${path}` : "";
}

function keyPath(key, uploaded = new Map()) {
  if (key.startsWith("path:")) return key.slice(5);
  return uploaded.get(key) || "";
}

function fileName(path) {
  const value = String(path || "").split("/").pop() || "Изображение";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function mediaLabel(item) {
  if (item.kind === "pending") return "Новое фото";
  if (item.kind === "archive") return "Из архива";
  if (item.kind === "inherited") return "Обложка сайта";
  if (item.kind === "upload") return "Загружено";
  return "Изображение";
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "Не удалось выполнить запрос");
    error.status = response.status;
    if (response.status === 401 && !path.startsWith("/api/auth/")) {
      showLogin("Сессия завершилась. Войдите снова");
    }
    throw error;
  }
  return data;
}

function showLogin(message = "") {
  state.authenticated = false;
  state.dirty = false;
  clearPendingImages();
  elements.adminShell.hidden = true;
  elements.authScreen.hidden = false;
  elements.authLoading.hidden = true;
  elements.loginForm.hidden = false;
  elements.loginError.textContent = message;
  elements.loginError.hidden = !message;
  elements.passwordInput.value = "";
  requestAnimationFrame(() => elements.passwordInput.focus());
}

function showAdmin() {
  state.authenticated = true;
  elements.authScreen.hidden = true;
  elements.adminShell.hidden = false;
  elements.loginError.hidden = true;
  elements.passwordInput.value = "";
}

async function login(event) {
  event.preventDefault();
  if (elements.loginButton.disabled || !elements.loginForm.reportValidity()) return;
  elements.loginButton.disabled = true;
  elements.loginButton.textContent = "Входим...";
  elements.loginError.hidden = true;
  try {
    await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        password: elements.passwordInput.value,
        remember: elements.rememberInput.checked,
      }),
    });
    showAdmin();
    await loadPosts();
  } catch (error) {
    elements.loginError.textContent = error.message;
    elements.loginError.hidden = false;
    elements.passwordInput.select();
  } finally {
    elements.loginButton.disabled = false;
    elements.loginButton.textContent = "Войти";
  }
}

async function logout() {
  if (!canDiscardChanges()) return;
  elements.logoutButton.disabled = true;
  try {
    await api("/api/auth/logout", { method: "POST" });
    closeEditor(true);
    state.posts = [];
    elements.newsTable.replaceChildren();
    showLogin();
  } catch (error) {
    showToast(error.message, true);
  } finally {
    elements.logoutButton.disabled = false;
  }
}

async function initialize() {
  try {
    const session = await api("/api/auth/session");
    if (!session.authenticated) {
      showLogin();
      return;
    }
    showAdmin();
    await loadPosts();
  } catch (error) {
    showLogin("Не удалось проверить доступ. Обновите страницу");
  }
}

function showToast(message, isError = false) {
  clearTimeout(showToast.timeout);
  elements.toast.textContent = message;
  elements.toast.classList.toggle("is-error", isError);
  elements.toast.hidden = false;
  showToast.timeout = setTimeout(() => {
    elements.toast.hidden = true;
  }, 4200);
}

function setBusy(value, label = "Сохранение...") {
  state.busy = value;
  elements.newsForm.setAttribute("aria-busy", String(value));
  elements.saveButton.disabled = value;
  elements.deleteButton.disabled = value;
  elements.cancelButton.disabled = value;
  elements.newPostButton.disabled = value;
  elements.imageInput.disabled = value;
  elements.showSummaryInput.disabled = value;
  elements.saveButton.textContent = value ? label : "Сохранить";
}

function filteredPosts() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const year = elements.yearFilter.value;
  return state.posts.filter((post) => {
    const matchesQuery = !query || `${post.title} ${post.summary}`.toLowerCase().includes(query);
    return matchesQuery && (!year || post.year === year);
  });
}

function renderPosts() {
  const posts = filteredPosts();
  elements.resultCount.textContent = String(posts.length);
  elements.newsTable.replaceChildren();
  elements.listState.hidden = posts.length > 0;
  elements.listState.textContent = posts.length ? "" : "Публикации не найдены";

  const fragment = document.createDocumentFragment();
  for (const post of posts) {
    const row = document.createElement("tr");
    row.dataset.slug = post.slug;
    row.tabIndex = 0;
    row.classList.toggle("is-selected", post.slug === state.selectedSlug);
    row.innerHTML = `
      <td><time class="post-date" datetime="${post.date}">${formatDate(post.date)}</time></td>
      <td><span class="post-title"></span></td>
      <td><span class="row-arrow" aria-hidden="true">›</span></td>`;
    row.querySelector(".post-title").textContent = post.title;
    row.addEventListener("click", () => selectPost(post.slug));
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectPost(post.slug);
      }
    });
    fragment.append(row);
  }
  elements.newsTable.append(fragment);
}

function renderYears() {
  const selected = elements.yearFilter.value;
  const years = [...new Set(state.posts.map((post) => post.year))].sort((a, b) => b.localeCompare(a));
  elements.yearFilter.replaceChildren(new Option("Все годы", ""));
  for (const year of years) elements.yearFilter.add(new Option(year, year));
  if (years.includes(selected)) elements.yearFilter.value = selected;
}

function resizeTextarea(textarea) {
  textarea.style.height = "auto";
  const maximum = textarea === elements.bodyInput ? 720 : 420;
  const height = Math.min(textarea.scrollHeight + 2, maximum);
  textarea.style.height = `${height}px`;
  textarea.style.overflowY = textarea.scrollHeight > maximum ? "auto" : "hidden";
}

function resizeEditorFields() {
  resizeTextarea(elements.summaryInput);
  resizeTextarea(elements.bodyInput);
}

function clearPendingImages() {
  for (const item of state.pendingImages) URL.revokeObjectURL(item.url);
  state.pendingImages = [];
}

function mediaItems() {
  return [...state.gallery, ...state.pendingImages];
}

function chooseCover(key) {
  if (state.busy || key === state.coverKey) return;
  state.coverKey = key;
  state.dirty = true;
  renderMedia();
}

function fallbackCoverKey() {
  const keys = new Set(mediaItems().map((item) => item.key));
  if (state.defaultCoverKey && keys.has(state.defaultCoverKey)) return state.defaultCoverKey;
  return "";
}

function removeMediaItem(item) {
  if (state.busy || !item.removable) return;
  if (item.kind === "pending") {
    URL.revokeObjectURL(item.url);
    state.pendingImages = state.pendingImages.filter((candidate) => candidate.key !== item.key);
  } else {
    state.gallery = state.gallery.filter((candidate) => candidate.key !== item.key);
  }
  if (state.coverKey === item.key) state.coverKey = fallbackCoverKey();
  state.dirty = true;
  renderMedia();
}

function makeGalleryCard(item) {
  const card = document.createElement("article");
  card.className = "gallery-card";
  card.classList.toggle("is-cover", item.key === state.coverKey);

  const select = document.createElement("button");
  select.className = "gallery-select";
  select.type = "button";
  select.setAttribute("aria-label", `Сделать главным: ${item.name}`);
  select.title = "Сделать главным фото";
  select.addEventListener("click", () => chooseCover(item.key));

  const image = document.createElement("img");
  image.src = item.url;
  image.alt = "";
  image.loading = "lazy";
  select.append(image);

  if (item.key === state.coverKey) {
    const badge = document.createElement("span");
    badge.className = "gallery-cover-badge";
    badge.textContent = "Главное";
    select.append(badge);
  }

  const footer = document.createElement("div");
  footer.className = "gallery-card-footer";
  const label = document.createElement("span");
  label.textContent = mediaLabel(item);
  label.title = item.name;
  footer.append(label);

  const actions = document.createElement("div");
  if (item.key !== state.coverKey) {
    const coverButton = document.createElement("button");
    coverButton.type = "button";
    coverButton.textContent = "Главное";
    coverButton.addEventListener("click", () => chooseCover(item.key));
    actions.append(coverButton);
  }
  if (item.removable) {
    const removeButton = document.createElement("button");
    removeButton.className = "gallery-delete";
    removeButton.type = "button";
    removeButton.textContent = "Удалить";
    removeButton.addEventListener("click", () => removeMediaItem(item));
    actions.append(removeButton);
  }
  footer.append(actions);
  card.append(select, footer);
  return card;
}

function renderMedia() {
  const items = mediaItems();
  const cover = items.find((item) => item.key === state.coverKey);
  elements.imageCount.textContent = formatPhotoCount(items.length);
  elements.galleryEmpty.hidden = items.length > 0;
  elements.imageGallery.hidden = items.length === 0;
  elements.imageGallery.replaceChildren(...items.map(makeGalleryCard));

  elements.imagePreview.hidden = !cover;
  if (cover) {
    elements.previewImage.src = cover.url;
    elements.previewImage.alt = `Главное фото: ${cover.name}`;
    elements.coverSourceLabel.textContent = mediaLabel(cover);
  } else {
    elements.previewImage.removeAttribute("src");
    elements.previewImage.alt = "";
    elements.coverSourceLabel.textContent = "";
  }
  elements.removeImageButton.hidden = !cover || state.coverKey === state.defaultCoverKey;
}

function openEditor(post, isNew = false) {
  clearPendingImages();
  state.currentPost = post;
  state.selectedSlug = isNew ? "" : post.slug;
  state.isNew = isNew;
  state.dirty = false;
  state.slugTouched = !isNew;
  state.gallery = (post.gallery || []).map((item) => ({
    ...item,
    key: pathKey(item.path),
    name: fileName(item.path),
  }));
  state.inheritedCover = post.inheritedCover || "";
  state.defaultCoverKey = pathKey(state.inheritedCover);
  state.coverKey = pathKey(post.coverPath || "");

  elements.editorEmpty.hidden = true;
  elements.editorContent.hidden = false;
  elements.editorMode.textContent = isNew ? "Новая публикация" : "Редактирование";
  elements.editorHeading.textContent = isNew ? "Добавить новость" : post.title;
  elements.originalSlug.value = isNew ? "" : post.slug;
  elements.titleInput.value = post.title || "";
  elements.dateInput.value = post.date || "";
  elements.slugInput.value = post.slug || "";
  elements.summaryInput.value = post.summary || "";
  elements.showSummaryInput.checked = post.showSummaryInArticle !== false;
  elements.bodyInput.value = post.body || "";
  elements.imageInput.value = "";
  elements.deleteButton.hidden = isNew;
  renderMedia();
  document.body.classList.add("editor-open");
  renderPosts();
  elements.editorPanel.scrollTo({ top: 0, behavior: "auto" });
  requestAnimationFrame(() => {
    resizeEditorFields();
    if (isNew) elements.titleInput.focus();
  });
}

function canDiscardChanges() {
  return !state.dirty || window.confirm("Изменения не сохранены. Продолжить?");
}

function closeEditor(force = false) {
  if (!force && !canDiscardChanges()) return;
  clearPendingImages();
  state.currentPost = null;
  state.selectedSlug = "";
  state.isNew = false;
  state.dirty = false;
  state.gallery = [];
  state.coverKey = "";
  state.defaultCoverKey = "";
  state.inheritedCover = "";
  elements.editorContent.hidden = true;
  elements.editorEmpty.hidden = false;
  document.body.classList.remove("editor-open");
  renderPosts();
}

async function selectPost(slug) {
  if (state.busy || slug === state.selectedSlug) return;
  if (!canDiscardChanges()) return;
  try {
    const { post } = await api(`/api/news/${encodeURIComponent(slug)}`);
    openEditor(post);
  } catch (error) {
    showToast(error.message, true);
  }
}

function newPost() {
  if (state.busy || !canDiscardChanges()) return;
  openEditor({
    title: "",
    date: localDateValue(),
    slug: "",
    summary: "",
    showSummaryInArticle: false,
    body: "",
    coverPath: "",
    inheritedCover: "",
    gallery: [],
  }, true);
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Не удалось прочитать изображение"));
    reader.readAsDataURL(file);
  });
}

async function uploadPendingImages() {
  const uploaded = new Map();
  for (const [index, item] of state.pendingImages.entries()) {
    setBusy(true, `Загрузка ${index + 1} из ${state.pendingImages.length}...`);
    const data = await readImage(item.file);
    const result = await api("/api/uploads", {
      method: "POST",
      body: JSON.stringify({
        name: item.file.name,
        type: item.file.type,
        data,
      }),
    });
    uploaded.set(item.key, result.imagePath || result.coverImage);
  }
  return uploaded;
}

async function savePost(event) {
  event.preventDefault();
  if (state.busy || !elements.newsForm.reportValidity()) return;
  const wasNew = state.isNew;
  setBusy(true, state.pendingImages.length ? "Загрузка..." : "Сохранение...");
  try {
    const uploaded = await uploadPendingImages();
    const selectedCover = keyPath(state.coverKey, uploaded);
    const coverImage = selectedCover && selectedCover !== state.inheritedCover ? selectedCover : "";
    const galleryImages = [
      ...state.gallery.filter((item) => item.persistInGallery).map((item) => item.path),
      ...state.pendingImages.map((item) => uploaded.get(item.key)).filter(Boolean),
    ];

    setBusy(true, "Сборка сайта...");
    const payload = {
      title: elements.titleInput.value.trim(),
      date: elements.dateInput.value,
      slug: elements.slugInput.value.trim(),
      summary: elements.summaryInput.value.trim(),
      showSummaryInArticle: elements.showSummaryInput.checked,
      body: elements.bodyInput.value.trim(),
      coverImage,
      galleryImages: [...new Set(galleryImages)],
    };
    const path = state.isNew
      ? "/api/news"
      : `/api/news/${encodeURIComponent(elements.originalSlug.value)}`;
    const method = state.isNew ? "POST" : "PUT";
    const { post } = await api(path, { method, body: JSON.stringify(payload) });
    state.dirty = false;
    await loadPosts(post.slug);
    showToast(wasNew ? "Новость добавлена" : "Изменения сохранены");
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setBusy(false);
  }
}

function requestDelete() {
  if (!state.currentPost || state.isNew || state.busy) return;
  elements.deleteMessage.textContent = `«${state.currentPost.title}» будет удалена с сайта.`;
  if (typeof elements.deleteDialog.showModal === "function") {
    elements.deleteDialog.showModal();
  } else if (window.confirm("Удалить эту новость?")) {
    deletePost();
  }
}

async function deletePost() {
  if (!state.currentPost || state.isNew || state.busy) return;
  setBusy(true, "Удаление...");
  try {
    await api(`/api/news/${encodeURIComponent(state.currentPost.slug)}`, { method: "DELETE" });
    state.dirty = false;
    closeEditor(true);
    await loadPosts();
    showToast("Новость удалена");
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setBusy(false);
  }
}

async function loadPosts(selectSlug = "") {
  elements.listState.hidden = false;
  elements.listState.textContent = "Загрузка...";
  try {
    const data = await api("/api/news");
    state.posts = data.posts;
    document.querySelector(".empty-index").textContent = String(data.count);
    renderYears();
    renderPosts();
    if (selectSlug) {
      state.selectedSlug = "";
      await selectPost(selectSlug);
    }
  } catch (error) {
    elements.listState.hidden = false;
    elements.listState.textContent = error.message;
    showToast(error.message, true);
  }
}

elements.loginForm.addEventListener("submit", login);
elements.logoutButton.addEventListener("click", logout);
elements.passwordToggle.addEventListener("click", () => {
  const reveal = elements.passwordInput.type === "password";
  elements.passwordInput.type = reveal ? "text" : "password";
  elements.passwordToggle.textContent = reveal ? "Скрыть" : "Показать";
  elements.passwordToggle.setAttribute("aria-pressed", String(reveal));
  elements.passwordInput.focus();
});
elements.searchInput.addEventListener("input", renderPosts);
elements.yearFilter.addEventListener("change", renderPosts);
elements.newPostButton.addEventListener("click", newPost);
elements.closeEditorButton.addEventListener("click", () => closeEditor());
elements.cancelButton.addEventListener("click", () => closeEditor());
elements.deleteButton.addEventListener("click", requestDelete);
elements.newsForm.addEventListener("submit", savePost);

elements.titleInput.addEventListener("input", () => {
  state.dirty = true;
  elements.editorHeading.textContent = elements.titleInput.value.trim() || "Добавить новость";
  if (state.isNew && !state.slugTouched) elements.slugInput.value = slugify(elements.titleInput.value);
});

elements.slugInput.addEventListener("input", () => {
  state.dirty = true;
  state.slugTouched = true;
  const position = elements.slugInput.selectionStart;
  elements.slugInput.value = slugify(elements.slugInput.value);
  elements.slugInput.setSelectionRange(position, position);
});

elements.dateInput.addEventListener("input", () => {
  state.dirty = true;
});

elements.showSummaryInput.addEventListener("change", () => {
  state.dirty = true;
});

for (const textarea of [elements.summaryInput, elements.bodyInput]) {
  textarea.addEventListener("input", () => {
    state.dirty = true;
    resizeTextarea(textarea);
  });
}

elements.imageInput.addEventListener("change", () => {
  const files = [...elements.imageInput.files];
  if (!files.length) return;
  const availableSlots = Math.max(0, 60 - mediaItems().length);
  if (files.length > availableSlots) {
    elements.imageInput.value = "";
    showToast("В одной новости может быть не больше 60 изображений", true);
    return;
  }

  for (const file of files) {
    if (!acceptedImageTypes.has(file.type)) {
      showToast(`Файл «${file.name}» имеет неподдерживаемый формат`, true);
      continue;
    }
    if (file.size > maxImageSize) {
      showToast(`Файл «${file.name}» больше 8 МБ`, true);
      continue;
    }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    state.pendingImages.push({
      key: `pending:${id}`,
      file,
      name: file.name,
      url: URL.createObjectURL(file),
      kind: "pending",
      removable: true,
      persistInGallery: true,
    });
  }

  if (!state.coverKey && state.pendingImages.length) state.coverKey = state.pendingImages[0].key;
  state.dirty = true;
  elements.imageInput.value = "";
  renderMedia();
});

elements.removeImageButton.addEventListener("click", () => {
  state.coverKey = fallbackCoverKey();
  state.dirty = true;
  renderMedia();
});

elements.deleteDialog.addEventListener("close", () => {
  if (elements.deleteDialog.returnValue === "confirm") deletePost();
});

window.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s" && state.currentPost) {
    event.preventDefault();
    elements.newsForm.requestSubmit();
  }
  if (event.key === "Escape" && document.body.classList.contains("editor-open") && !elements.deleteDialog.open) {
    closeEditor();
  }
});

window.addEventListener("beforeunload", (event) => {
  if (!state.dirty) return;
  event.preventDefault();
  event.returnValue = "";
});

initialize();
