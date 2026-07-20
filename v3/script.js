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
