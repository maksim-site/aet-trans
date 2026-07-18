const state = {
  posts: [],
  selectedSlug: "",
  currentPost: null,
  isNew: false,
  dirty: false,
  busy: false,
  slugTouched: false,
  pendingImage: null,
  previewUrl: "",
  coverImage: "",
  inheritedCover: false,
};

const elements = {
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
  bodyInput: document.querySelector("#bodyInput"),
  imageInput: document.querySelector("#imageInput"),
  imagePreview: document.querySelector("#imagePreview"),
  previewImage: document.querySelector("#previewImage"),
  removeImageButton: document.querySelector("#removeImageButton"),
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

function localDateValue() {
  const now = new Date();
  return new Date(now.valueOf() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Не удалось выполнить запрос");
  return data;
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

function setPreview(url, removable = true) {
  if (state.previewUrl.startsWith("blob:")) URL.revokeObjectURL(state.previewUrl);
  state.previewUrl = url || "";
  elements.imagePreview.hidden = !url;
  elements.previewImage.src = url || "";
  elements.removeImageButton.hidden = !removable;
}

function openEditor(post, isNew = false) {
  state.currentPost = post;
  state.selectedSlug = isNew ? "" : post.slug;
  state.isNew = isNew;
  state.dirty = false;
  state.slugTouched = !isNew;
  state.pendingImage = null;
  state.coverImage = post.coverImage || "";
  state.inheritedCover = Boolean(post.coverUrl && !post.coverImage);

  elements.editorEmpty.hidden = true;
  elements.editorContent.hidden = false;
  elements.editorMode.textContent = isNew ? "Новая публикация" : "Редактирование";
  elements.editorHeading.textContent = isNew ? "Добавить новость" : post.title;
  elements.originalSlug.value = isNew ? "" : post.slug;
  elements.titleInput.value = post.title || "";
  elements.dateInput.value = post.date || "";
  elements.slugInput.value = post.slug || "";
  elements.summaryInput.value = post.summary || "";
  elements.bodyInput.value = post.body || "";
  elements.imageInput.value = "";
  elements.deleteButton.hidden = isNew;
  setPreview(post.coverUrl || "", Boolean(post.coverImage));
  document.body.classList.add("editor-open");
  renderPosts();
  elements.editorPanel.scrollTo({ top: 0, behavior: "auto" });
  if (isNew) requestAnimationFrame(() => elements.titleInput.focus());
}

function canDiscardChanges() {
  return !state.dirty || window.confirm("Изменения не сохранены. Продолжить?");
}

function closeEditor(force = false) {
  if (!force && !canDiscardChanges()) return;
  state.currentPost = null;
  state.selectedSlug = "";
  state.isNew = false;
  state.dirty = false;
  state.pendingImage = null;
  state.coverImage = "";
  setPreview("");
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
    body: "",
    coverImage: "",
    coverUrl: "",
  }, true);
}

async function uploadPendingImage() {
  if (!state.pendingImage) return state.coverImage;
  const data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Не удалось прочитать изображение"));
    reader.readAsDataURL(state.pendingImage);
  });
  const result = await api("/api/uploads", {
    method: "POST",
    body: JSON.stringify({
      name: state.pendingImage.name,
      type: state.pendingImage.type,
      data,
    }),
  });
  return result.coverImage;
}

async function savePost(event) {
  event.preventDefault();
  if (state.busy || !elements.newsForm.reportValidity()) return;
  const wasNew = state.isNew;
  setBusy(true, state.pendingImage ? "Загрузка..." : "Сохранение...");
  try {
    const coverImage = await uploadPendingImage();
    setBusy(true, "Сборка сайта...");
    const payload = {
      title: elements.titleInput.value.trim(),
      date: elements.dateInput.value,
      slug: elements.slugInput.value.trim(),
      summary: elements.summaryInput.value.trim(),
      body: elements.bodyInput.value.trim(),
      coverImage,
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

for (const input of [elements.dateInput, elements.summaryInput, elements.bodyInput]) {
  input.addEventListener("input", () => {
    state.dirty = true;
  });
}

elements.imageInput.addEventListener("change", () => {
  const file = elements.imageInput.files[0];
  if (!file) return;
  if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type)) {
    elements.imageInput.value = "";
    showToast("Поддерживаются JPG, PNG и WebP", true);
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    elements.imageInput.value = "";
    showToast("Изображение больше 8 МБ", true);
    return;
  }
  state.pendingImage = file;
  state.coverImage = "";
  state.inheritedCover = false;
  state.dirty = true;
  setPreview(URL.createObjectURL(file));
});

elements.removeImageButton.addEventListener("click", () => {
  state.pendingImage = null;
  state.coverImage = "";
  state.inheritedCover = false;
  state.dirty = true;
  elements.imageInput.value = "";
  setPreview("");
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

loadPosts();
