const header = document.getElementById("siteHeader");
const hero = document.querySelector(".hero, .page-hero, .article-header, .legal-header, .not-found");
const menuToggle = document.getElementById("menuToggle");
const mobileMenu = document.getElementById("mobileMenu");
const menuBackdrop = document.getElementById("menuBackdrop");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;
const heroMedia = document.querySelector(".hero-media");
const heroImage = heroMedia?.querySelector("img");

if (!reduceMotion && finePointer && typeof window.Lenis === "function") {
  const lenis = new window.Lenis({
    duration: 1.05,
    smoothWheel: true,
    wheelMultiplier: 0.9,
  });

  const runLenis = (time) => {
    lenis.raf(time);
    requestAnimationFrame(runLenis);
  };

  requestAnimationFrame(runLenis);

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || href === "#") return;

    link.addEventListener("click", (event) => {
      const target = document.querySelector(href);
      if (!target) return;
      event.preventDefault();
      lenis.scrollTo(target, { offset: -88 });
    });
  });
}

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

const trustedLogoViewport = document.querySelector(".trusted-logo-viewport");
const trustedLogoTrack = trustedLogoViewport?.querySelector(".trusted-logo-track");
const trustedLogoSet = trustedLogoTrack?.querySelector(".trusted-logo-set");
const canEnhanceTrustedCarousel =
  typeof window.requestAnimationFrame === "function"
  && typeof window.PointerEvent === "function"
  && typeof window.performance?.now === "function"
  && typeof trustedLogoViewport?.setPointerCapture === "function";

if (
  trustedLogoViewport
  && trustedLogoTrack
  && trustedLogoSet
  && !document.body.classList.contains("theme-v7")
  && !reduceMotion
  && canEnhanceTrustedCarousel
) {
  const autoplaySpeed = -36;
  let position = 0;
  let velocity = autoplaySpeed;
  let activePointerId = null;
  let lastPointerX = 0;
  let lastPointerTime = performance.now();
  let lastFrameTime = performance.now();
  let animationFrame = 0;

  const getLoopWidth = () => trustedLogoSet.getBoundingClientRect().width;

  const normalizePosition = () => {
    const loopWidth = getLoopWidth();
    if (!loopWidth) return;

    while (position <= -loopWidth) position += loopWidth;
    while (position > 0) position -= loopWidth;
  };

  const renderTrustedLogos = () => {
    normalizePosition();
    trustedLogoTrack.style.transform = `translate3d(${position}px, 0, 0)`;
  };

  const animateTrustedLogos = (time) => {
    const elapsed = Math.min((time - lastFrameTime) / 1000, 0.05);
    lastFrameTime = time;

    if (activePointerId === null) {
      position += velocity * elapsed;
      const returnStrength = 1 - Math.exp(-4.5 * elapsed);
      velocity += (autoplaySpeed - velocity) * returnStrength;
      renderTrustedLogos();
    }

    animationFrame = requestAnimationFrame(animateTrustedLogos);
  };

  const startTrustedLogoDrag = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    activePointerId = event.pointerId;
    lastPointerX = event.clientX;
    lastPointerTime = performance.now();
    velocity = 0;
    trustedLogoViewport.classList.add("is-dragging");
    try {
      trustedLogoViewport.setPointerCapture(event.pointerId);
    } catch {
      activePointerId = null;
      velocity = autoplaySpeed;
      trustedLogoViewport.classList.remove("is-dragging");
    }
  };

  const moveTrustedLogoDrag = (event) => {
    if (event.pointerId !== activePointerId) return;

    const now = performance.now();
    const delta = event.clientX - lastPointerX;
    const elapsed = Math.max(now - lastPointerTime, 8);
    const instantVelocity = (delta / elapsed) * 1000;

    position += delta;
    velocity = velocity * 0.68 + instantVelocity * 0.32;
    lastPointerX = event.clientX;
    lastPointerTime = now;
    renderTrustedLogos();
  };

  const stopTrustedLogoDrag = (event) => {
    if (activePointerId === null || (event && event.pointerId !== activePointerId)) return;

    if (
      typeof trustedLogoViewport.hasPointerCapture === "function"
      && trustedLogoViewport.hasPointerCapture(activePointerId)
    ) {
      trustedLogoViewport.releasePointerCapture(activePointerId);
    }

    velocity = Math.max(-900, Math.min(900, velocity));
    activePointerId = null;
    trustedLogoViewport.classList.remove("is-dragging");
  };

  trustedLogoViewport.addEventListener("pointerdown", startTrustedLogoDrag);
  trustedLogoViewport.addEventListener("pointermove", moveTrustedLogoDrag);
  trustedLogoViewport.addEventListener("pointerup", stopTrustedLogoDrag);
  trustedLogoViewport.addEventListener("pointercancel", stopTrustedLogoDrag);
  trustedLogoViewport.addEventListener("lostpointercapture", stopTrustedLogoDrag);
  trustedLogoViewport.addEventListener("dragstart", (event) => event.preventDefault());
  window.addEventListener("resize", () => {
    normalizePosition();
    renderTrustedLogos();
  });
  document.addEventListener("visibilitychange", () => {
    lastFrameTime = performance.now();
    if (!document.hidden && activePointerId === null) velocity = autoplaySpeed;
  });

  requestAnimationFrame(() => {
    if (!getLoopWidth()) return;
    renderTrustedLogos();
    trustedLogoViewport.classList.add("is-interactive");
    animationFrame = requestAnimationFrame(animateTrustedLogos);
  });

  window.addEventListener("pagehide", () => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
  }, { once: true });
}

if (trustedLogoViewport && trustedLogoTrack && trustedLogoSet && document.body.classList.contains("theme-v7")) {
  const supportsAnimationFrame =
    typeof window.requestAnimationFrame === "function"
    && typeof window.cancelAnimationFrame === "function";
  const now = () => (
    typeof window.performance?.now === "function"
      ? window.performance.now()
      : Date.now()
  );

  if (supportsAnimationFrame) {
    const autoplaySpeed = -36;
    let position = 0;
    let velocity = autoplaySpeed;
    let activePointerId = null;
    let lastPointerX = 0;
    let lastPointerTime = now();
    let lastFrameTime = now();
    let animationFrame = 0;

    const getLoopWidth = () => trustedLogoSet.getBoundingClientRect().width;

    const normalizePosition = () => {
      const loopWidth = getLoopWidth();
      if (!loopWidth) return;
      while (position <= -loopWidth) position += loopWidth;
      while (position > 0) position -= loopWidth;
    };

    const renderTrustedLogos = () => {
      normalizePosition();
      trustedLogoTrack.style.transform = `translate3d(${position}px, 0, 0)`;
    };

    const animateTrustedLogos = (time) => {
      const elapsed = Math.min(Math.max((time - lastFrameTime) / 1000, 0), 0.05);
      lastFrameTime = time;
      const temporarilyPaused = document.hidden;

      if (!reduceMotion && !temporarilyPaused && activePointerId === null) {
        position += velocity * elapsed;
        const returnStrength = 1 - Math.exp(-4.5 * elapsed);
        velocity += (autoplaySpeed - velocity) * returnStrength;
        renderTrustedLogos();
      }

      animationFrame = requestAnimationFrame(animateTrustedLogos);
    };

    const canDrag =
      !reduceMotion
      && typeof window.PointerEvent === "function"
      && typeof trustedLogoViewport.setPointerCapture === "function";

    if (canDrag) {
      const startTrustedLogoDrag = (event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        activePointerId = event.pointerId;
        lastPointerX = event.clientX;
        lastPointerTime = now();
        velocity = 0;
        trustedLogoViewport.classList.add("is-dragging");
        try {
          trustedLogoViewport.setPointerCapture(event.pointerId);
        } catch {
          activePointerId = null;
          velocity = autoplaySpeed;
          trustedLogoViewport.classList.remove("is-dragging");
        }
      };

      const moveTrustedLogoDrag = (event) => {
        if (event.pointerId !== activePointerId) return;
        const currentTime = now();
        const delta = event.clientX - lastPointerX;
        const elapsed = Math.max(currentTime - lastPointerTime, 8);
        const instantVelocity = (delta / elapsed) * 1000;
        position += delta;
        velocity = velocity * 0.68 + instantVelocity * 0.32;
        lastPointerX = event.clientX;
        lastPointerTime = currentTime;
        renderTrustedLogos();
      };

      const stopTrustedLogoDrag = (event) => {
        if (activePointerId === null || (event && event.pointerId !== activePointerId)) return;
        if (
          typeof trustedLogoViewport.hasPointerCapture === "function"
          && trustedLogoViewport.hasPointerCapture(activePointerId)
        ) {
          trustedLogoViewport.releasePointerCapture(activePointerId);
        }
        velocity = Math.max(-900, Math.min(900, velocity));
        activePointerId = null;
        trustedLogoViewport.classList.remove("is-dragging");
      };

      trustedLogoViewport.addEventListener("pointerdown", startTrustedLogoDrag);
      trustedLogoViewport.addEventListener("pointermove", moveTrustedLogoDrag);
      trustedLogoViewport.addEventListener("pointerup", stopTrustedLogoDrag);
      trustedLogoViewport.addEventListener("pointercancel", stopTrustedLogoDrag);
      trustedLogoViewport.addEventListener("lostpointercapture", stopTrustedLogoDrag);
      trustedLogoViewport.addEventListener("dragstart", (event) => event.preventDefault());
      trustedLogoViewport.classList.add("is-draggable");
    }

    window.addEventListener("resize", () => {
      normalizePosition();
      renderTrustedLogos();
    });
    document.addEventListener("visibilitychange", () => {
      lastFrameTime = now();
      if (!document.hidden && activePointerId === null) velocity = autoplaySpeed;
    });

    document.body.classList.add("carousel-ready");
    trustedLogoViewport.classList.add("is-interactive");

    requestAnimationFrame(() => {
      renderTrustedLogos();
      animationFrame = requestAnimationFrame(animateTrustedLogos);
    });

    window.addEventListener("pagehide", () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    }, { once: true });
  }
}

const routeExplorer = document.querySelector("[data-route-explorer]");

if (routeExplorer) {
  const routeButtons = [...routeExplorer.querySelectorAll("[data-route-key]")];
  const routeCorridors = [...routeExplorer.querySelectorAll("[data-route-corridor]")];
  const routeHighlights = [...routeExplorer.querySelectorAll("[data-route-highlight]")];
  const routeVehicle = routeExplorer.querySelector("[data-route-vehicle]");
  const routeVehicleIcon = routeVehicle?.querySelector(".route-vehicle-icon");
  const routeTravelDuration = 950;
  const routeLandingFadeDuration = 180;
  const routeAnimationDuration = routeTravelDuration + routeLandingFadeDuration;
  let activeRoutePath = null;
  let routeVehicleFrame = 0;
  let routeVehicleStartedAt = 0;

  const positionRouteVehicle = (progress) => {
    if (!routeVehicle || !activeRoutePath || typeof activeRoutePath.getTotalLength !== "function") return;
    const length = activeRoutePath.getTotalLength();
    if (!length) return;
    const distance = Math.max(0, Math.min(1, progress)) * length;
    const point = activeRoutePath.getPointAtLength(distance);
    const pointBefore = activeRoutePath.getPointAtLength(Math.max(0, distance - 1));
    const pointAfter = activeRoutePath.getPointAtLength(Math.min(length, distance + 1));
    const angle = Math.atan2(pointAfter.y - pointBefore.y, pointAfter.x - pointBefore.x) * 180 / Math.PI;
    routeVehicle.setAttribute("transform", `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)}) rotate(${angle.toFixed(2)})`);
  };

  const animateRouteVehicle = (time) => {
    if (!routeVehicleStartedAt) routeVehicleStartedAt = time;
    const elapsed = time - routeVehicleStartedAt;

    if (elapsed <= routeTravelDuration) {
      const progress = Math.min(1, elapsed / routeTravelDuration);
      const easedProgress = 0.5 - Math.cos(Math.PI * progress) / 2;
      if (routeVehicleIcon) {
        routeVehicleIcon.style.opacity = Math.min(1, progress / 0.07).toFixed(3);
      }
      positionRouteVehicle(easedProgress);
    } else {
      const fadeProgress = Math.min(1, (elapsed - routeTravelDuration) / routeLandingFadeDuration);
      positionRouteVehicle(1);
      if (routeVehicleIcon) {
        routeVehicleIcon.style.opacity = (1 - fadeProgress).toFixed(3);
      }
    }

    if (elapsed < routeAnimationDuration) {
      routeVehicleFrame = requestAnimationFrame(animateRouteVehicle);
      return;
    }
    if (routeVehicleIcon) routeVehicleIcon.style.opacity = "0";
    routeVehicleFrame = 0;
    routeCorridors.forEach((corridor) => {
      if (corridor.classList.contains("is-active")) corridor.classList.add("is-complete");
    });
  };

  const setRouteVehiclePath = (routeKey) => {
    const activeCorridor = routeCorridors.find((corridor) => corridor.dataset.routeCorridor === routeKey);
    activeRoutePath = activeCorridor?.querySelector("[data-route-path]") || null;
    routeVehicleStartedAt = 0;
    if (routeVehicleFrame) cancelAnimationFrame(routeVehicleFrame);
    routeVehicleFrame = 0;
    if (!activeRoutePath) return;
    if (reduceMotion || typeof window.requestAnimationFrame !== "function") {
      if (routeVehicleIcon) routeVehicleIcon.style.opacity = "1";
      positionRouteVehicle(0.68);
      return;
    }
    if (routeVehicleIcon) routeVehicleIcon.style.opacity = "0";
    positionRouteVehicle(0);
    routeVehicleFrame = requestAnimationFrame(animateRouteVehicle);
  };

  const activateRoute = (routeKey) => {
    routeButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.routeKey === routeKey));
    });
    routeCorridors.forEach((corridor) => {
      if (corridor.dataset.routeCorridor !== routeKey) {
        corridor.classList.remove("is-active", "is-complete");
        return;
      }
      corridor.classList.remove("is-complete");
      if (corridor.classList.contains("is-active")) {
        corridor.classList.remove("is-active");
        void corridor.getBoundingClientRect();
      }
      corridor.classList.add("is-active");
    });
    routeHighlights.forEach((highlight) => {
      highlight.classList.toggle("is-active", highlight.dataset.routeHighlight === routeKey);
    });
    setRouteVehiclePath(routeKey);
  };

  const deactivateRoutes = () => {
    routeButtons.forEach((button) => button.setAttribute("aria-pressed", "false"));
    routeCorridors.forEach((corridor) => corridor.classList.remove("is-active", "is-complete"));
    routeHighlights.forEach((highlight) => highlight.classList.remove("is-active"));
    if (routeVehicleFrame) cancelAnimationFrame(routeVehicleFrame);
    routeVehicleFrame = 0;
    activeRoutePath = null;
    if (routeVehicleIcon) routeVehicleIcon.style.opacity = "0";
  };

  routeButtons.forEach((button, index) => {
    button.addEventListener("click", () => activateRoute(button.dataset.routeKey));
    button.addEventListener("focus", () => activateRoute(button.dataset.routeKey));
    if (finePointer) {
      button.addEventListener("mouseenter", () => activateRoute(button.dataset.routeKey));
    }

    button.addEventListener("keydown", (event) => {
      const direction = ["ArrowRight", "ArrowDown"].includes(event.key)
        ? 1
        : ["ArrowLeft", "ArrowUp"].includes(event.key)
          ? -1
          : 0;
      if (!direction) return;
      event.preventDefault();
      const nextIndex = (index + direction + routeButtons.length) % routeButtons.length;
      routeButtons[nextIndex].focus();
    });
  });

  const routeList = routeExplorer.querySelector(".route-list");

  if (routeList) {
    if (finePointer) {
      routeList.addEventListener("mouseleave", deactivateRoutes);
    }
    routeList.addEventListener("focusout", (event) => {
      if (!routeButtons.includes(event.relatedTarget)) deactivateRoutes();
    });
  }

  document.body.classList.add("route-map-ready");

  window.addEventListener("pagehide", () => {
    if (routeVehicleFrame) cancelAnimationFrame(routeVehicleFrame);
  }, { once: true });
}


const revealItems = document.querySelectorAll(".reveal");

document.querySelectorAll(".service-directory, .process-list").forEach((group) => {
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

const requestForm = document.getElementById("requestForm");
const requestStatus = document.getElementById("requestStatus");

if (requestForm && !requestForm.classList.contains("simple-request-form")) {
  const quoteSteps = [...requestForm.querySelectorAll(".quote-step")];
  const quoteBack = document.getElementById("quoteBack");
  const quoteNext = document.getElementById("quoteNext");
  const quoteSubmit = document.getElementById("quoteSubmit");
  const quoteStepCount = document.getElementById("quoteStepCount");
  const quoteStepName = document.getElementById("quoteStepName");
  const quoteProgress = document.getElementById("quoteProgress");
  const quoteProgressBar = document.getElementById("quoteProgressBar");
  const isEnglish = document.documentElement.lang.toLowerCase().startsWith("en");
  let activeQuoteStep = 0;

  const quoteCopy = isEnglish
    ? {
        step: (current, total) => `Step ${current} of ${total}`,
        required: "Please complete this step to continue.",
        status: "This is a test version. Your request has not been sent; live delivery and anti-spam protection will be connected after approval.",
      }
    : {
        step: (current, total) => `Шаг ${current} из ${total}`,
        required: "Заполните этот шаг, чтобы продолжить.",
        status: "Это тестовая версия. Заявка не отправлена — рабочую отправку и антиспам подключим после согласования.",
      };

  const clearQuoteValidation = () => {
    quoteSteps[activeQuoteStep]?.querySelectorAll(".is-invalid").forEach((field) => field.classList.remove("is-invalid"));
    if (requestStatus) {
      requestStatus.textContent = "";
      requestStatus.classList.remove("is-error", "is-test-message");
    }
  };

  const validateQuoteStep = () => {
    const step = quoteSteps[activeQuoteStep];
    if (!step) return true;

    clearQuoteValidation();
    const requiredFields = [...step.querySelectorAll("[required]")];
    const checkedRadioGroups = new Set();
    let firstInvalid = null;

    requiredFields.forEach((field) => {
      if (field.type === "radio") {
        if (checkedRadioGroups.has(field.name)) return;
        checkedRadioGroups.add(field.name);
        const group = [...step.querySelectorAll(`input[type="radio"][name="${field.name}"]`)];
        if (!group.some((radio) => radio.checked)) firstInvalid ||= group[0];
        return;
      }

      if (field.type === "checkbox" && !field.checked) {
        field.classList.add("is-invalid");
        firstInvalid ||= field;
        return;
      }

      if (!String(field.value || "").trim()) {
        field.classList.add("is-invalid");
        firstInvalid ||= field;
      }
    });

    if (!firstInvalid) return true;
    if (requestStatus) {
      requestStatus.textContent = quoteCopy.required;
      requestStatus.classList.add("is-error");
    }
    firstInvalid.focus({ preventScroll: true });
    return false;
  };

  const renderQuoteStep = (nextStep, direction = 1) => {
    activeQuoteStep = Math.max(0, Math.min(nextStep, quoteSteps.length - 1));
    requestForm.dataset.activeStep = String(activeQuoteStep);

    quoteSteps.forEach((step, index) => {
      const isActive = index === activeQuoteStep;
      step.hidden = !isActive;
      step.classList.remove("is-entering");
      if (isActive) {
        step.dataset.direction = direction > 0 ? "forward" : "back";
        requestAnimationFrame(() => step.classList.add("is-entering"));
      }
    });

    const step = quoteSteps[activeQuoteStep];
    if (quoteStepCount) quoteStepCount.textContent = quoteCopy.step(activeQuoteStep + 1, quoteSteps.length);
    if (quoteStepName) quoteStepName.textContent = step?.dataset.stepName || "";
    const progressValue = quoteSteps.length > 1 ? (activeQuoteStep / (quoteSteps.length - 1)) * 100 : 100;
    if (quoteProgressBar) quoteProgressBar.style.width = `${progressValue}%`;
    if (quoteProgress) quoteProgress.setAttribute("aria-valuenow", String(Math.round(progressValue)));
    if (quoteBack) quoteBack.hidden = activeQuoteStep === 0;
    if (quoteNext) quoteNext.hidden = activeQuoteStep === quoteSteps.length - 1;
    if (quoteSubmit) quoteSubmit.hidden = activeQuoteStep !== quoteSteps.length - 1;
    clearQuoteValidation();
  };

  const advanceQuoteStep = () => {
    if (!validateQuoteStep()) return;
    renderQuoteStep(activeQuoteStep + 1, 1);
  };

  quoteNext?.addEventListener("click", advanceQuoteStep);
  quoteBack?.addEventListener("click", () => renderQuoteStep(activeQuoteStep - 1, -1));

  requestForm.addEventListener("input", (event) => {
    event.target?.classList?.remove("is-invalid");
    if (requestStatus) {
      requestStatus.textContent = "";
      requestStatus.classList.remove("is-error", "is-test-message");
    }
  });

  requestForm.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.target?.tagName === "TEXTAREA" || activeQuoteStep === quoteSteps.length - 1) return;
    event.preventDefault();
    advanceQuoteStep();
  });

  requestForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (activeQuoteStep < quoteSteps.length - 1) {
      advanceQuoteStep();
      return;
    }
    if (!validateQuoteStep()) return;

    if (requestStatus) {
      requestStatus.textContent = quoteCopy.status;
      requestStatus.classList.add("is-test-message");
    }
  });

  renderQuoteStep(0);
}

if (requestForm?.classList.contains("simple-request-form")) {
  const isEnglish = document.documentElement.lang.toLowerCase().startsWith("en");
  const statusCopy = isEnglish
    ? "This is a test version. Your request has not been sent; live delivery and anti-spam protection will be connected after approval."
    : "Это тестовая версия. Заявка не отправлена — рабочую отправку и антиспам подключим после согласования.";

  requestForm.addEventListener("input", () => {
    if (!requestStatus) return;
    requestStatus.textContent = "";
    requestStatus.classList.remove("is-test-message");
  });

  requestForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!requestForm.checkValidity()) {
      requestForm.reportValidity();
      return;
    }
    if (requestStatus) {
      requestStatus.textContent = statusCopy;
      requestStatus.classList.add("is-test-message");
    }
  });
}
