const header = document.getElementById("siteHeader");
const hero = document.querySelector(".hero, .page-hero, .article-header, .legal-header, .not-found");
const menuToggle = document.getElementById("menuToggle");
const mobileMenu = document.getElementById("mobileMenu");
const menuBackdrop = document.getElementById("menuBackdrop");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const heroMedia = document.querySelector(".hero-media");
const heroImage = heroMedia?.querySelector("img");

if (reduceMotion) {
  document.body.classList.add("motion-ready");
} else {
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add("motion-ready")));
}

const currentYear = document.getElementById("currentYear");
if (currentYear) currentYear.textContent = new Date().getFullYear();

const previewToken = new URLSearchParams(window.location.search).get("aet-preview");

function appendPreviewBody(container, value) {
  const sections = String(value || "").split(/\n\s*\n/).map((section) => section.trim()).filter(Boolean);

  sections.forEach((section) => {
    const lines = section.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length && lines.every((line) => line.startsWith("- "))) {
      const list = document.createElement("ul");
      lines.forEach((line) => {
        const item = document.createElement("li");
        item.textContent = line.slice(2).trim();
        list.append(item);
      });
      container.append(list);
      return;
    }

    if (section.startsWith("## ")) {
      const heading = document.createElement("h2");
      heading.textContent = section.slice(3).trim();
      container.append(heading);
      return;
    }

    if (section.startsWith("> ")) {
      const quote = document.createElement("blockquote");
      quote.textContent = lines.map((line) => line.replace(/^>\s?/, "")).join(" ");
      container.append(quote);
      return;
    }

    const paragraph = document.createElement("p");
    paragraph.textContent = lines.join(" ");
    container.append(paragraph);
  });
}

function applyArticlePreview(preview) {
  const article = document.querySelector(".article-page");
  const headerContainer = article?.querySelector(".article-header .container");
  const title = headerContainer?.querySelector("h1");
  const time = headerContainer?.querySelector("time");
  const content = article?.querySelector(".article-content");
  const layout = article?.querySelector(".article-layout");
  if (!article || !headerContainer || !title || !time || !content || !layout) return;

  const previewLabel = document.createElement("span");
  previewLabel.className = "article-preview-label";
  previewLabel.textContent = "Предпросмотр из админки";
  time.before(previewLabel);

  title.textContent = preview.title || title.textContent;
  document.title = `${title.textContent} | АЕТ Транс`;

  if (preview.date) {
    time.dateTime = preview.date;
    time.textContent = new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(`${preview.date}T12:00:00`));
  }

  const currentSummary = Array.from(headerContainer.children).find((child) => child.tagName === "P");
  if (preview.showSummaryInArticle && preview.summary) {
    const summary = currentSummary || document.createElement("p");
    summary.textContent = preview.summary;
    if (!currentSummary) headerContainer.append(summary);
  } else {
    currentSummary?.remove();
  }

  content.replaceChildren();
  appendPreviewBody(content, preview.body);

  const currentGallery = layout.querySelector(".article-gallery");
  const images = Array.isArray(preview.images) ? preview.images.filter((image) => image?.url) : [];
  if (!images.length) {
    currentGallery?.remove();
    return;
  }

  const gallery = currentGallery || document.createElement("div");
  gallery.className = "article-gallery";
  gallery.replaceChildren(...images.map((imageData, index) => {
    const figure = document.createElement("figure");
    const image = document.createElement("img");
    image.src = imageData.url;
    image.alt = `${title.textContent}, фотография ${index + 1}`;
    image.loading = "lazy";
    figure.append(image);
    return figure;
  }));

  if (!currentGallery) {
    const navigation = layout.querySelector(".article-navigation");
    layout.insertBefore(gallery, navigation);
  }
}

if (previewToken) {
  const previewKey = `aet-trans-demo-preview:${previewToken}`;
  let preview = null;
  try {
    const savedPreview = localStorage.getItem(previewKey);
    localStorage.removeItem(previewKey);
    if (savedPreview) preview = JSON.parse(savedPreview);
  } catch {
    preview = null;
  }

  const cleanUrl = new URL(window.location.href);
  cleanUrl.searchParams.delete("aet-preview");
  window.history.replaceState(null, "", `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
  if (preview) applyArticlePreview(preview);
}

const closeMenu = () => {
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Открыть меню");
  mobileMenu.classList.remove("is-open");
  menuBackdrop.classList.remove("is-open");
  menuBackdrop.setAttribute("aria-hidden", "true");
  document.body.classList.remove("menu-open");
};

menuToggle.addEventListener("click", () => {
  const willOpen = menuToggle.getAttribute("aria-expanded") !== "true";
  menuToggle.setAttribute("aria-expanded", String(willOpen));
  menuToggle.setAttribute("aria-label", willOpen ? "Закрыть меню" : "Открыть меню");
  mobileMenu.classList.toggle("is-open", willOpen);
  menuBackdrop.classList.toggle("is-open", willOpen);
  menuBackdrop.setAttribute("aria-hidden", String(!willOpen));
  document.body.classList.toggle("menu-open", willOpen);
});

menuBackdrop.addEventListener("click", closeMenu);
mobileMenu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 1220) closeMenu();
  if (window.innerWidth <= 720) heroImage?.style.removeProperty("transform");
  else updateHeroParallax();
});

if (header && hero && "IntersectionObserver" in window) {
  const headerObserver = new IntersectionObserver(
    ([entry]) => header.classList.toggle("is-scrolled", !entry.isIntersecting),
    { rootMargin: "-88px 0px 0px 0px", threshold: 0 }
  );
  headerObserver.observe(hero);
}

const updateHeaderOffset = () => {
  if (header) header.classList.toggle("has-offset", window.scrollY > 12);
};

let parallaxFrame = 0;
const updateHeroParallax = () => {
  parallaxFrame = 0;
  if (!heroMedia || reduceMotion || window.innerWidth <= 720) return;
  const heroRect = heroMedia.getBoundingClientRect();
  if (heroRect.bottom <= 0 || heroRect.top >= window.innerHeight) return;
  const progress = Math.max(0, Math.min(1, -heroRect.top / heroRect.height));
  heroImage.style.transform = `translate3d(0, ${Math.round(progress * 22)}px, 0) scale(1.06)`;
};

const handlePageScroll = () => {
  updateHeaderOffset();
  if (!parallaxFrame) parallaxFrame = requestAnimationFrame(updateHeroParallax);
};

updateHeaderOffset();
updateHeroParallax();
window.addEventListener("scroll", handlePageScroll, { passive: true });

const newsArchive = document.querySelector("[data-news-archive]");

if (newsArchive) {
  const items = Array.from(newsArchive.querySelectorAll("[data-news-item]"));
  const search = newsArchive.querySelector("[data-news-search]");
  const year = newsArchive.querySelector("[data-news-year]");
  const more = newsArchive.querySelector("[data-news-more]");
  const count = newsArchive.querySelector("[data-news-count]");
  const empty = newsArchive.querySelector("[data-news-empty]");
  const pageSize = 18;
  let limit = pageSize;

  const updateNews = () => {
    const query = search.value.trim().toLocaleLowerCase("ru");
    const selectedYear = year.value;
    const matches = [];

    items.forEach((item) => {
      const matchesSearch = !query || item.dataset.search.includes(query);
      const matchesYear = !selectedYear || item.dataset.year === selectedYear;
      const matchesFilter = matchesSearch && matchesYear;
      item.classList.toggle("is-filtered-out", !matchesFilter);
      if (matchesFilter) matches.push(item);
    });

    matches.forEach((item, index) => item.classList.toggle("is-hidden", index >= limit));
    if (count) count.textContent = String(matches.length);
    if (more) more.hidden = matches.length <= limit;
    if (empty) empty.hidden = matches.length !== 0;
  };

  search.addEventListener("input", () => {
    limit = pageSize;
    updateNews();
  });

  year.addEventListener("change", () => {
    limit = pageSize;
    updateNews();
  });

  more.addEventListener("click", () => {
    limit += pageSize;
    updateNews();
  });

  updateNews();
}

const documentLightbox = document.getElementById("documentLightbox");
const documentLinks = Array.from(document.querySelectorAll("[data-document-viewer]"));

if (documentLightbox && documentLinks.length) {
  const dialog = documentLightbox.querySelector(".document-lightbox-dialog");
  const image = documentLightbox.querySelector(".document-lightbox-image");
  const caption = documentLightbox.querySelector("#documentLightboxCaption");
  const transcript = documentLightbox.querySelector(".document-lightbox-transcript");
  const count = documentLightbox.querySelector(".document-lightbox-count");
  const closeButton = documentLightbox.querySelector(".document-lightbox-close");
  const previousButton = documentLightbox.querySelector(".document-lightbox-prev");
  const nextButton = documentLightbox.querySelector(".document-lightbox-next");
  const pageRegions = [header, document.querySelector("main"), document.querySelector(".site-footer")].filter(Boolean);
  const blankImage = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
  let activeIndex = 0;
  let returnFocus = null;
  let swipeStartX = null;

  const showDocument = (index) => {
    activeIndex = (index + documentLinks.length) % documentLinks.length;
    const link = documentLinks[activeIndex];
    const label = link.dataset.caption || link.querySelector("strong")?.textContent || "Рекомендательное письмо";
    image.src = link.href;
    image.alt = `Рекомендательное письмо: ${label}`;
    caption.textContent = label;
    const isLowResolution = link.dataset.lowResolution === "true";
    documentLightbox.classList.toggle("is-low-resolution", isLowResolution);
    transcript.hidden = !isLowResolution;
    transcript.textContent = isLowResolution ? link.dataset.transcript || "" : "";
    count.textContent = `${activeIndex + 1} / ${documentLinks.length}`;
  };

  const closeDocument = () => {
    if (!documentLightbox.classList.contains("is-open")) return;
    documentLightbox.classList.remove("is-open");
    documentLightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("document-lightbox-open");
    pageRegions.forEach((region) => { region.inert = false; });
    window.setTimeout(() => {
      if (!documentLightbox.classList.contains("is-open")) image.src = blankImage;
    }, 180);
    returnFocus?.focus();
  };

  const openDocument = (index, trigger) => {
    returnFocus = trigger;
    showDocument(index);
    documentLightbox.classList.add("is-open");
    documentLightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("document-lightbox-open");
    pageRegions.forEach((region) => { region.inert = true; });
    requestAnimationFrame(() => closeButton.focus());
  };

  documentLinks.forEach((link, index) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      openDocument(index, link);
    });
  });

  closeButton.addEventListener("click", closeDocument);
  previousButton.addEventListener("click", () => showDocument(activeIndex - 1));
  nextButton.addEventListener("click", () => showDocument(activeIndex + 1));
  documentLightbox.addEventListener("click", (event) => {
    if (event.target === documentLightbox) closeDocument();
  });

  dialog.addEventListener("touchstart", (event) => {
    swipeStartX = event.changedTouches[0]?.clientX ?? null;
  }, { passive: true });

  dialog.addEventListener("touchend", (event) => {
    if (swipeStartX === null) return;
    const distance = (event.changedTouches[0]?.clientX ?? swipeStartX) - swipeStartX;
    swipeStartX = null;
    if (Math.abs(distance) < 48) return;
    showDocument(activeIndex + (distance < 0 ? 1 : -1));
  }, { passive: true });

  window.addEventListener("keydown", (event) => {
    if (!documentLightbox.classList.contains("is-open")) return;
    if (event.key === "Escape") closeDocument();
    if (event.key === "ArrowLeft") showDocument(activeIndex - 1);
    if (event.key === "ArrowRight") showDocument(activeIndex + 1);
    if (event.key !== "Tab") return;

    const focusable = [closeButton, previousButton, nextButton];
    const currentIndex = focusable.indexOf(document.activeElement);
    event.preventDefault();
    const step = event.shiftKey ? -1 : 1;
    focusable[(currentIndex + step + focusable.length) % focusable.length].focus();
  });
}

const revealItems = document.querySelectorAll(".reveal");

document.querySelectorAll(".service-directory, .process-list, .projects-grid").forEach((group) => {
  group.querySelectorAll(":scope > .reveal").forEach((item, index) => {
    item.style.setProperty("--reveal-delay", `${index * 75}ms`);
  });
});

if (reduceMotion || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  revealItems.forEach((item) => item.classList.add("will-reveal"));

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -24px" }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
}
