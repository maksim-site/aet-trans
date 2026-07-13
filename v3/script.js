const header = document.getElementById("siteHeader");
const hero = document.querySelector(".hero");
const menuToggle = document.getElementById("menuToggle");
const mobileMenu = document.getElementById("mobileMenu");
const menuBackdrop = document.getElementById("menuBackdrop");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.getElementById("currentYear").textContent = new Date().getFullYear();

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
});

if ("IntersectionObserver" in window) {
  const headerObserver = new IntersectionObserver(
    ([entry]) => header.classList.toggle("is-scrolled", !entry.isIntersecting),
    { rootMargin: "-88px 0px 0px 0px", threshold: 0 }
  );
  headerObserver.observe(hero);
}

document.querySelectorAll(".demo-form").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const button = form.querySelector("button[type='submit']");
    const status = form.querySelector(".form-status");
    button.disabled = true;
    button.textContent = "Заявка принята";
    status.textContent = "В рабочей версии заявка будет отправлена менеджеру.";
  });
});

const revealItems = document.querySelectorAll(".reveal");

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
