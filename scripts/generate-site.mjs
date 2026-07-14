import { copyFile, readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  clients,
  localNewsImages,
  projectSlugs,
  reviews,
  services,
} from "./site-content.mjs";
import { newsImageRelativePath, newsImageWebPath } from "./news-assets.mjs";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = process.argv[2] || ".";
const outputRoot = join(projectRoot, outputDirectory);
const assetDepthOffset = outputDirectory === "." ? 0 : 1;
const versionRoot = join(projectRoot, "v3");

if (outputDirectory === ".") {
  await mkdir(join(projectRoot, "data"), { recursive: true });
  await copyFile(join(versionRoot, "data/news.json"), join(projectRoot, "data/news.json"));
  await copyFile(join(versionRoot, "styles.css"), join(projectRoot, "styles.css"));
  await copyFile(join(versionRoot, "script.js"), join(projectRoot, "script.js"));

  const versionHome = await readFile(join(versionRoot, "index.html"), "utf8");
  await writeFile(
    join(projectRoot, "index.html"),
    versionHome.replaceAll("../assets/", "assets/"),
    "utf8",
  );
}

const newsData = JSON.parse(await readFile(join(versionRoot, "data/news.json"), "utf8"));
const posts = newsData.posts;
const postsBySlug = new Map(posts.map((post) => [post.slug, post]));

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const formatDate = (date) =>
  new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));

const rootPrefix = (depth) => "../".repeat(depth);
const assetPrefix = (depth) => "../".repeat(depth + assetDepthOffset) + "assets/";

const navItems = [
  ["services", "Услуги", "uslugi/"],
  ["oversized", "Негабарит", "negabaritnye-perevozki/"],
  ["projects", "Проекты", "proekty/"],
  ["about", "О компании", "o-kompanii/"],
  ["news", "Новости", "novosti/"],
  ["contacts", "Контакты", "kontakty/"],
];

const postRoute = (post) => {
  const [year, month, day] = post.date.split("-");
  return `${year}/${month}/${day}/${post.slug}/`;
};

function header(depth, active) {
  const root = rootPrefix(depth);
  const assets = assetPrefix(depth);
  const links = navItems
    .map(([key, label, href]) => `<a href="${root}${href}"${active === key ? ' aria-current="page"' : ""}>${label}</a>`)
    .join("");
  const mobileLinks = navItems
    .map(
      ([key, label, href]) =>
        `<a href="${root}${href}"${active === key ? ' aria-current="page"' : ""}>${label} <span aria-hidden="true">→</span></a>`,
    )
    .join("");

  return `
  <header class="site-header" id="siteHeader">
    <div class="container header-inner">
      <a class="brand" href="${root}" aria-label="АЕТ Транс, на главную">
        <img class="brand-color" src="${assets}logo-wordmark.svg" alt="АЕТ Транс">
        <img class="brand-light" src="${assets}logo-wordmark-light.svg" alt="" aria-hidden="true">
      </a>
      <nav class="desktop-nav" aria-label="Основная навигация">${links}</nav>
      <div class="header-actions">
        <a class="header-phone" href="tel:+78123094625">+7 (812) 309-46-25</a>
        <a class="button button-primary header-cta" href="${root}#request"><span class="header-cta-full">Оставить заявку</span><span class="header-cta-short">Заявка</span></a>
        <button class="menu-toggle" id="menuToggle" type="button" aria-label="Открыть меню" aria-expanded="false" aria-controls="mobileMenu"><span></span><span></span><span></span></button>
      </div>
    </div>
  </header>
  <button class="menu-backdrop" id="menuBackdrop" type="button" aria-label="Закрыть меню" aria-hidden="true" tabindex="-1"></button>
  <nav class="mobile-menu" id="mobileMenu" aria-label="Мобильная навигация">
    <div class="container mobile-menu-inner">
      ${mobileLinks}
      <a class="button button-primary mobile-menu-cta" href="${root}#request">Оставить заявку</a>
      <div class="mobile-menu-contacts">
        <a href="tel:+78123094625">+7 (812) 309-46-25</a>
        <a href="mailto:info@aet-trans.ru">info@aet-trans.ru</a>
      </div>
    </div>
  </nav>`;
}

function footer(depth) {
  const root = rootPrefix(depth);
  const assets = assetPrefix(depth);
  return `
  <footer class="site-footer">
    <div class="container footer-main">
      <a class="footer-brand" href="${root}" aria-label="АЕТ Транс, на главную"><img src="${assets}logo-wordmark-light.svg" alt="АЕТ Транс"></a>
      <nav class="footer-nav" aria-label="Навигация в подвале">
        <a href="${root}uslugi/">Услуги</a><a href="${root}negabaritnye-perevozki/">Негабарит</a><a href="${root}proekty/">Проекты</a><a href="${root}o-kompanii/">О компании</a><a href="${root}klienty/">Клиенты</a><a href="${root}testimonial/">Отзывы</a><a href="${root}novosti/">Новости</a><a href="${root}kontakty/">Контакты</a>
      </nav>
    </div>
    <div class="container footer-bottom">
      <span>&copy; 2004-<span id="currentYear"></span> ООО «АЕТ Транс»</span>
      <a href="${root}privacy/">Политика обработки данных</a>
      <a href="mailto:info@aet-trans.ru">info@aet-trans.ru</a>
    </div>
  </footer>`;
}

function pageHero({ depth, eyebrow, title, intro, image, imageAlt = "" }) {
  const assets = assetPrefix(depth);
  return `
    <section class="page-hero">
      <div class="container page-hero-grid">
        <div class="page-hero-copy reveal">
          <p class="context-line">${escapeHtml(eyebrow)}</p>
          <h1>${escapeHtml(title)}</h1>
          <p>${escapeHtml(intro)}</p>
        </div>
        ${image ? `<figure class="page-hero-media reveal"><img src="${assets}${image}" alt="${escapeHtml(imageAlt)}"></figure>` : ""}
      </div>
    </section>`;
}

function ctaBand(depth, title = "Обсудим вашу перевозку") {
  const root = rootPrefix(depth);
  return `
    <section class="inner-cta">
      <div class="container inner-cta-grid">
        <div><p class="section-label">Следующий шаг</p><h2>${escapeHtml(title)}</h2></div>
        <p>Расскажите о грузе, маршруте и сроках. Мы уточним детали и предложим рабочий вариант перевозки.</p>
        <div class="inner-cta-actions"><a class="button button-primary" href="${root}#request">Оставить заявку</a><a class="button button-secondary" href="tel:+78123094625">Позвонить</a></div>
      </div>
    </section>`;
}

function documentPage({ depth = 1, active, title, description, canonicalPath, main, image = "images/oversize.jpg" }) {
  const root = rootPrefix(depth);
  const assets = assetPrefix(depth);
  const canonical = `https://aet-trans.ru/${canonicalPath}`;
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="theme-color" content="#081b2e">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="https://aet-trans.ru/assets/${image}">
  <link rel="icon" href="${assets}favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&amp;display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${root}styles.css?v=3">
</head>
<body class="theme-blue-v3 inner-page">
${header(depth, active)}
  <main>${main}</main>
${footer(depth)}
  <script src="${root}script.js?v=2"></script>
</body>
</html>
`;
}

function servicesPage() {
  const depth = 1;
  const root = rootPrefix(depth);
  const serviceItems = services
    .map(
      (service) => `
        <article class="service-row reveal">
          <span class="service-row-number">${service.number}</span>
          <div class="service-row-copy"><h2>${escapeHtml(service.title)}</h2><p>${escapeHtml(service.description)}</p></div>
          <ul>${service.details.map((detail) => `<li>${escapeHtml(detail)}</li>`).join("")}</ul>
          <a href="${service.href ? root + service.href : root + "#request"}" aria-label="Подробнее: ${escapeHtml(service.title)}">Подробнее <span aria-hidden="true">→</span></a>
        </article>`,
    )
    .join("");

  const main = `
${pageHero({
    depth,
    eyebrow: "Полный комплекс логистических услуг",
    title: "Перевозка под контролем одной команды",
    intro: "Подключаемся к отдельному этапу или полностью организуем доставку от подготовки маршрута до выгрузки.",
    image: "images/project-2.jpg",
    imageAlt: "Перегрузка промышленного оборудования",
  })}
    <section class="section inner-intro"><div class="container split-intro"><h2>Что берем на себя</h2><p>Транспортно-экспедиторская компания «АЕТ Транс» работает с промышленными грузами по России и за рубежом. В одном проекте объединяем перевозку, документы, таможню, страхование, хранение и сопровождение.</p></div></section>
    <section class="service-directory"><div class="container">${serviceItems}</div></section>
    <section class="transport-modes"><div class="container"><header><p class="section-label">Виды транспорта</p><h2>Выбираем схему под груз и маршрут</h2></header><div class="mode-grid"><div><strong>Авто</strong><span>Гибкие маршруты и доставка до площадки</span></div><div><strong>Море</strong><span>Международные и проектные отправки</span></div><div><strong>Авиа</strong><span>Срочные и ценные грузы</span></div><div><strong>Железная дорога</strong><span>Крупные партии и дальние расстояния</span></div></div></div></section>
${ctaBand(depth)}`;

  return documentPage({
    depth,
    active: "services",
    title: "Услуги | АЕТ Транс",
    description: "Негабаритные, международные и мультимодальные перевозки, таможенное оформление, экспедирование, хранение и страхование грузов.",
    canonicalPath: "uslugi/",
    main,
    image: "images/project-2.jpg",
  });
}

function oversizedPage() {
  const depth = 1;
  const main = `
${pageHero({
    depth,
    eyebrow: "Проектная логистика",
    title: "Негабаритные и тяжеловесные грузы",
    intro: "Инженерная подготовка, согласованный маршрут и точная координация каждого этапа перевозки.",
    image: "images/oversize.jpg",
    imageAlt: "Крупногабаритное оборудование на судне",
  })}
    <section class="section inner-intro"><div class="container split-intro"><h2>Сложная перевозка начинается до погрузки</h2><p>Изучаем характеристики груза и площадок, проверяем ограничения маршрута, подбираем транспорт и заранее определяем порядок перегрузок. Это позволяет видеть критические точки проекта до выхода груза в путь.</p></div></section>
    <section class="technical-stages"><div class="container technical-stages-grid">
      <div class="technical-stage reveal"><span>01</span><h3>Исходные данные</h3><p>Размеры, масса, центр тяжести, точки крепления, сроки и требования площадки.</p></div>
      <div class="technical-stage reveal"><span>02</span><h3>Маршрут</h3><p>Обследование дорог, мостов, портов, терминалов и мест перегрузки.</p></div>
      <div class="technical-stage reveal"><span>03</span><h3>Технология</h3><p>Транспорт, схемы погрузки, крепление, разрешения и такелаж.</p></div>
      <div class="technical-stage reveal"><span>04</span><h3>Реализация</h3><p>Координация участников, контроль сроков, документов и состояния груза.</p></div>
    </div></section>
    <section class="section media-story"><div class="container media-story-grid"><figure class="reveal"><img src="${assetPrefix(depth)}images/specialization.jpg" alt="Погрузка крупногабаритного оборудования" loading="lazy"></figure><div class="reveal"><p class="section-label">Ответственность за результат</p><h2>Один план для всех участников</h2><p>Перевозчик, терминал, порт, таможня, страховая компания и площадка заказчика работают по общей последовательности действий. Клиент получает один контакт и статус по контрольным точкам.</p><ul><li>Проверка документов до старта</li><li>Контроль погрузки и крепления</li><li>Согласование перегрузок</li><li>Закрывающие документы после доставки</li></ul></div></div></section>
${ctaBand(depth, "Разберем параметры сложного груза")}`;
  return documentPage({
    depth,
    active: "oversized",
    title: "Негабаритные перевозки | АЕТ Транс",
    description: "Организация перевозок крупногабаритных и тяжеловесных грузов по России и за рубежом.",
    canonicalPath: "negabaritnye-perevozki/",
    main,
  });
}

function projectsPage() {
  const depth = 1;
  const root = rootPrefix(depth);
  const assets = assetPrefix(depth);
  const projectRows = projectSlugs
    .map((slug, index) => postsBySlug.get(slug))
    .filter(Boolean)
    .map((post, index) => {
      const image = localNewsImages[post.slug] || `../images/project-${(index % 3) + 1}.jpg`;
      const imageSrc = image.startsWith("../") ? `${assets}${image.slice(3)}` : `${assets}news/${image}`;
      return `
        <article class="project-row reveal">
          <a class="project-row-media" href="${root}${postRoute(post)}"><img src="${imageSrc}" alt="${escapeHtml(post.title)}" loading="lazy"></a>
          <div class="project-row-copy"><time datetime="${post.date}">${formatDate(post.date)}</time><h2><a href="${root}${postRoute(post)}">${escapeHtml(post.title)}</a></h2><p>${escapeHtml(post.summary)}</p><a class="text-link" href="${root}${postRoute(post)}">О проекте <span aria-hidden="true">→</span></a></div>
        </article>`;
    })
    .join("");

  const main = `
${pageHero({depth, eyebrow: "Выполненные перевозки", title: "Проекты из практики компании", intro: "Промышленное оборудование, международные маршруты и перевозки для энергетической отрасли.", image: "images/project-1.jpg", imageAlt: "Промышленное оборудование на судне"})}
    <section class="section project-directory"><div class="container">${projectRows}</div></section>
${ctaBand(depth, "Обсудим задачу похожего масштаба")}`;
  return documentPage({depth, active: "projects", title: "Проекты | АЕТ Транс", description: "Выполненные международные, проектные и негабаритные перевозки АЕТ Транс.", canonicalPath: "proekty/", main, image: "images/project-1.jpg"});
}

function aboutPage() {
  const depth = 1;
  const assets = assetPrefix(depth);
  const previewLogos = clients.slice(0, 6).map((client) => `<div><img src="${assets}clients/${client.logo}" alt="${escapeHtml(client.name)}" loading="lazy"><span>${escapeHtml(client.name)}</span></div>`).join("");
  const main = `
${pageHero({depth, eyebrow: "Работаем с 2004 года", title: "Логистика для промышленности и энергетики", intro: "Организуем перевозки по России и за рубежом, включая сложные крупногабаритные и тяжеловесные грузы.", image: "images/hero-port.jpg", imageAlt: "Грузовой порт Санкт-Петербурга"})}
    <section class="section inner-intro"><div class="container split-intro"><h2>АЕТ Транс</h2><div><p>Компания оказывает полный комплекс логистических услуг с использованием автомобильного, морского, авиационного и железнодорожного транспорта.</p><p>Берем на себя работы, связанные с отправкой и перевозкой груза, страхованием, таможенным оформлением, хранением и документальным сопровождением.</p></div></div></section>
    <section class="company-metrics"><div class="container company-metrics-grid"><div><strong>2004</strong><span>год основания</span></div><div><strong>Россия и зарубежье</strong><span>география перевозок</span></div><div><strong>Одна команда</strong><span>маршрут, документы и контроль</span></div></div></section>
    <section class="section media-story"><div class="container media-story-grid"><figure class="reveal"><img src="${assets}images/project-2.jpg" alt="Погрузка промышленного оборудования" loading="lazy"></figure><div class="reveal"><p class="section-label">Основная специализация</p><h2>Проекты, где важна подготовка</h2><p>Приоритетное направление компании: перевозки крупногабаритных и тяжеловесных грузов по России и за рубежом. За годы работы команда выполнила проекты от стандартных отправок до уникального промышленного оборудования.</p><blockquote>Наша задача: сократить транспортные издержки клиента и держать его в курсе на всех стадиях доставки.</blockquote><p class="quote-author"><strong>Александр Торгашов</strong><span>Руководитель АЕТ Транс</span></p></div></div></section>
    <section class="section proof-preview"><div class="container"><header class="section-heading"><h2>Опыт, подтвержденный работой с отраслью</h2><p>В архиве компании сохранены проекты и отзывы предприятий машиностроительного и энергетического комплекса.</p></header><div class="client-preview-grid">${previewLogos}</div><div class="proof-preview-actions"><a class="button button-dark" href="../klienty/">Все клиенты</a><a class="button button-light" href="../testimonial/">Отзывы и письма</a></div></div></section>
${ctaBand(depth)}`;
  return documentPage({depth, active: "about", title: "О компании | АЕТ Транс", description: "АЕТ Транс работает с 2004 года и организует промышленную, международную и проектную логистику.", canonicalPath: "o-kompanii/", main, image: "images/hero-port.jpg"});
}

function clientsPage() {
  const depth = 1;
  const assets = assetPrefix(depth);
  const items = clients.map((client) => `<article class="client-logo-item reveal"><img src="${assets}clients/${client.logo}" alt="${escapeHtml(client.name)}" loading="lazy"><h2>${escapeHtml(client.name)}</h2></article>`).join("");
  const main = `
${pageHero({depth, eyebrow: "Отраслевой опыт", title: "Клиенты компании", intro: "Предприятия машиностроительного и энергетического комплекса, для которых АЕТ Транс выполняла логистические задачи.", image: "images/project-2.jpg", imageAlt: "Промышленное оборудование"})}
    <section class="section clients-directory"><div class="container"><div class="client-logo-grid">${items}</div></div></section>
    <section class="industry-band"><div class="container industry-band-grid"><h2>Работаем там, где цена ошибки особенно высока</h2><div><span>Атомная энергетика</span><span>Тяжелое машиностроение</span><span>Промышленное оборудование</span><span>Инфраструктурные проекты</span></div></div></section>
${ctaBand(depth)}`;
  return documentPage({depth, active: "about", title: "Клиенты | АЕТ Транс", description: "Клиенты АЕТ Транс из машиностроительного и энергетического комплекса.", canonicalPath: "klienty/", main, image: "images/project-2.jpg"});
}

function reviewsPage() {
  const depth = 1;
  const assets = assetPrefix(depth);
  const items = reviews.map((review, index) => `<article class="review-item reveal"><div class="review-copy"><span class="review-number">${String(index + 1).padStart(2, "0")}</span><blockquote>${escapeHtml(review.text)}</blockquote><h2>${escapeHtml(review.company)}</h2></div><a class="review-scan" href="${assets}reviews/${review.image}" target="_blank" rel="noopener" aria-label="Открыть письмо: ${escapeHtml(review.company)}"><img src="${assets}reviews/${review.image}" alt="Скан отзыва ${escapeHtml(review.company)}" loading="lazy"><span>Открыть письмо</span></a></article>`).join("");
  const main = `
${pageHero({depth, eyebrow: "Рекомендации заказчиков", title: "Отзывы о работе АЕТ Транс", intro: "Письма предприятий, для которых компания организовывала доставку промышленного оборудования и проектных грузов.", image: "images/project-3.jpg", imageAlt: "Зона таможенного контроля"})}
    <section class="section reviews-directory"><div class="container">${items}</div></section>
${ctaBand(depth)}`;
  return documentPage({depth, active: "about", title: "Отзывы | АЕТ Транс", description: "Отзывы клиентов АЕТ Транс и сканы рекомендательных писем.", canonicalPath: "testimonial/", main, image: "images/project-3.jpg"});
}

function newsPage() {
  const depth = 1;
  const root = rootPrefix(depth);
  const assets = assetPrefix(depth);
  const years = [...new Set(posts.map((post) => post.year))];
  const yearOptions = years.map((year) => `<option value="${year}">${year}</option>`).join("");
  const items = posts.map((post) => {
    const image = localNewsImages[post.slug];
    const media = image
      ? `\n      <a class="news-archive-media" href="${root}${postRoute(post)}"><img src="${assets}news/${image}" alt="${escapeHtml(post.title)}" loading="lazy"></a>`
      : "";
    return `<article class="news-archive-item${image ? " has-media" : ""}" data-news-item data-year="${post.year}" data-search="${escapeHtml(`${post.title} ${post.summary}`.toLowerCase())}">${media}
      <div><time datetime="${post.date}">${formatDate(post.date)}</time><h2><a href="${root}${postRoute(post)}">${escapeHtml(post.title)}</a></h2>${post.summary ? `<p>${escapeHtml(post.summary)}</p>` : ""}<a class="text-link" href="${root}${postRoute(post)}">Читать <span aria-hidden="true">→</span></a></div>
    </article>`;
  }).join("");
  const main = `
${pageHero({depth, eyebrow: "Архив с 2006 года", title: "Новости и проекты компании", intro: "Перевозки, отраслевые события, партнерские проекты и важные этапы работы АЕТ Транс.", image: "news/conference-2026.jpg", imageAlt: "Конференция по проектной логистике"})}
    <section class="section news-archive" data-news-archive><div class="container"><div class="news-toolbar"><div><label for="newsSearch">Поиск</label><input id="newsSearch" type="search" placeholder="Название проекта или компании" data-news-search></div><div><label for="newsYear">Год</label><select id="newsYear" data-news-year><option value="">Все годы</option>${yearOptions}</select></div><p><strong data-news-count>${posts.length}</strong><span> публикаций</span></p></div><div class="news-archive-list">${items}</div><button class="button button-dark news-more" type="button" data-news-more>Показать еще</button><p class="news-empty" data-news-empty hidden>По вашему запросу публикаций не найдено.</p></div></section>`;
  return documentPage({depth, active: "news", title: "Новости | АЕТ Транс", description: "Новости, проекты и архив перевозок АЕТ Транс с 2006 года.", canonicalPath: "novosti/", main, image: "news/conference-2026.jpg"});
}

function renderArticleBlocks(post) {
  const output = [];
  let list = [];
  const flushList = () => {
    if (!list.length) return;
    output.push(`<ul>${list.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`);
    list = [];
  };

  for (const block of post.blocks) {
    if (block.type === "list-item") {
      list.push(block.text);
      continue;
    }
    flushList();
    if (block.type === "heading") output.push(`<h2>${escapeHtml(block.text)}</h2>`);
    else if (block.type === "quote") output.push(`<blockquote>${escapeHtml(block.text)}</blockquote>`);
    else output.push(`<p>${escapeHtml(block.text)}</p>`);
  }
  flushList();

  if (!output.length) output.push(`<p>${escapeHtml(post.summary || "Информация о проекте сохранена в архиве компании.")}</p>`);
  return output.join("");
}

function articlePage(post, index) {
  const depth = 4;
  const root = rootPrefix(depth);
  const assets = assetPrefix(depth);
  const localImage = localNewsImages[post.slug];
  const availableImages = (post.images || []).filter((image) =>
    existsSync(join(projectRoot, "assets", newsImageRelativePath(image))),
  );
  const gallery = availableImages.length
    ? availableImages.map((image) => `${assets}${newsImageWebPath(image)}`)
    : localImage
      ? [`${assets}news/${localImage}`]
      : [];
  const newer = posts[index - 1];
  const older = posts[index + 1];
  const articleNavigation = `<nav class="article-navigation" aria-label="Соседние публикации">${newer ? `<a href="${root}${postRoute(newer)}"><span>Новая публикация</span><strong>${escapeHtml(newer.title)}</strong></a>` : "<span></span>"}${older ? `<a href="${root}${postRoute(older)}"><span>Предыдущая публикация</span><strong>${escapeHtml(older.title)}</strong></a>` : ""}</nav>`;
  const main = `
    <article class="article-page">
      <header class="article-header"><div class="container"><a class="article-back" href="${root}novosti/">← Все новости</a><time datetime="${post.date}">${formatDate(post.date)}</time><h1>${escapeHtml(post.title)}</h1>${post.summary ? `<p>${escapeHtml(post.summary)}</p>` : ""}</div></header>
      <div class="container article-layout"><div class="article-content">${renderArticleBlocks(post)}</div>${gallery.length ? `<div class="article-gallery">${gallery.map((image, imageIndex) => `<figure><img src="${image}" alt="${escapeHtml(post.title)}${imageIndex ? `, фотография ${imageIndex + 1}` : ""}" loading="lazy"></figure>`).join("")}</div>` : ""}${articleNavigation}</div>
    </article>
${ctaBand(depth)}`;
  return documentPage({depth, active: "news", title: `${post.title} | АЕТ Транс`, description: post.summary || post.title, canonicalPath: postRoute(post), main, image: localImage ? `news/${localImage}` : "images/oversize.jpg"});
}

function contactsPage() {
  const depth = 1;
  const root = rootPrefix(depth);
  const main = `
${pageHero({depth, eyebrow: "Санкт-Петербург", title: "Свяжитесь с нами", intro: "Обсудим груз, маршрут, сроки и документы. Можно позвонить, написать на почту или оставить заявку.", image: "images/hero-port.jpg", imageAlt: "Порт Санкт-Петербурга"})}
    <section class="section contact-page"><div class="container contact-page-grid"><div class="contact-details"><a href="tel:+78123094625"><span>Телефон</span><strong>+7 (812) 309-46-25</strong></a><a href="mailto:info@aet-trans.ru"><span>Email</span><strong>info@aet-trans.ru</strong></a><div><span>Офис</span><strong>198035, Санкт-Петербург,<br>Межевой Канал, д. 5, лит. АХ, офис 406</strong></div><div><span>Юридический, почтовый и фактический адрес</span><strong>Совпадают</strong></div></div><form class="request-form lead-form" data-recipient="info@aet-trans.ru"><div class="field"><label for="contactName">Ваше имя</label><input id="contactName" name="name" autocomplete="name" required></div><div class="field"><label for="contactPhone">Телефон</label><input id="contactPhone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required></div><div class="field field-full"><label for="contactCargo">Задача</label><textarea id="contactCargo" name="cargo" placeholder="Груз, маршрут и желаемые сроки"></textarea></div><div class="form-footer"><button class="button button-primary" type="submit">Отправить заявку</button><p>Нажимая кнопку, вы соглашаетесь с <a href="${root}privacy/">политикой обработки данных</a>.</p></div><p class="form-status" aria-live="polite"></p></form></div></section>
    <section class="map-section"><iframe title="Офис АЕТ Транс на карте" src="https://yandex.ru/map-widget/v1/?ll=30.248474%2C59.911503&amp;z=16&amp;pt=30.248474%2C59.911503,pm2blm" loading="lazy"></iframe></section>`;
  return documentPage({depth, active: "contacts", title: "Контакты | АЕТ Транс", description: "Контакты АЕТ Транс: телефон, email и адрес офиса в Санкт-Петербурге.", canonicalPath: "kontakty/", main, image: "images/hero-port.jpg"});
}

function privacyPage() {
  const depth = 1;
  const main = `
    <section class="legal-header"><div class="container"><p class="context-line">Документы</p><h1>Политика обработки персональных данных</h1><p>Правила работы с данными, которые пользователь передает через формы сайта.</p></div></section>
    <section class="section legal-page"><div class="container legal-content">
      <h2>1. Общие положения</h2><p>Оператором персональных данных является ООО «АЕТ Транс». Для вопросов об обработке данных можно использовать адрес info@aet-trans.ru.</p>
      <h2>2. Какие данные обрабатываются</h2><p>Через формы сайта могут передаваться имя, номер телефона, адрес электронной почты и описание логистической задачи. Сайт также может получать стандартные технические данные браузера и сведения о посещении страниц.</p>
      <h2>3. Цели обработки</h2><p>Данные используются для ответа на обращение, подготовки предложения, связи с пользователем и анализа работы сайта.</p>
      <h2>4. Основание и срок обработки</h2><p>Данные обрабатываются с согласия пользователя и хранятся не дольше, чем это требуется для ответа и выполнения договорных обязательств, если иной срок не установлен законом.</p>
      <h2>5. Передача данных</h2><p>Данные не передаются третьим лицам без законного основания. Для работы сайта могут использоваться подрядчики по хостингу, почте, аналитике и защите форм, которые получают только необходимый объем данных.</p>
      <h2>6. Права пользователя</h2><p>Пользователь может запросить сведения об обработке, исправление или удаление данных, а также отозвать согласие, написав на info@aet-trans.ru.</p>
      <h2>7. Защита данных</h2><p>Оператор применяет организационные и технические меры для защиты данных от неправомерного доступа, изменения, раскрытия и уничтожения.</p>
      <p class="legal-note">Перед запуском на основном домене документ подлежит проверке и утверждению оператором персональных данных.</p>
    </div></section>`;
  return documentPage({depth, title: "Политика обработки персональных данных | АЕТ Транс", description: "Политика обработки персональных данных сайта АЕТ Транс.", canonicalPath: "privacy/", main});
}

function notFoundPage() {
  const depth = 0;
  const main = `<section class="not-found"><div class="container"><span>404</span><h1>Страница не найдена</h1><p>Возможно, адрес изменился при обновлении сайта.</p><a class="button button-primary" href="./">На главную</a></div></section>`;
  return documentPage({depth, title: "Страница не найдена | АЕТ Транс", description: "Страница не найдена.", canonicalPath: "404/", main});
}

function redirectPage(target) {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="0; url=${target}">
  <title>Переход на страницу | АЕТ Транс</title>
</head>
<body><p><a href="${target}">Перейти на страницу</a></p></body>
</html>
`;
}

async function writeOutput(relativePath, content) {
  const target = join(outputRoot, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}

await Promise.all([
  writeOutput("uslugi/index.html", servicesPage()),
  writeOutput("negabaritnye-perevozki/index.html", oversizedPage()),
  writeOutput("proekty/index.html", projectsPage()),
  writeOutput("o-kompanii/index.html", aboutPage()),
  writeOutput("klienty/index.html", clientsPage()),
  writeOutput("testimonial/index.html", reviewsPage()),
  writeOutput("novosti/index.html", newsPage()),
  writeOutput("kontakty/index.html", contactsPage()),
  writeOutput("privacy/index.html", privacyPage()),
  writeOutput("404.html", notFoundPage()),
  writeOutput("services/index.html", redirectPage("../uslugi/")),
  writeOutput("oversized/index.html", redirectPage("../negabaritnye-perevozki/")),
  writeOutput("projects/index.html", redirectPage("../proekty/")),
  writeOutput("about/index.html", redirectPage("../o-kompanii/")),
  writeOutput("clients/index.html", redirectPage("../klienty/")),
  writeOutput("reviews/index.html", redirectPage("../testimonial/")),
  writeOutput("news/index.html", redirectPage("../novosti/")),
  writeOutput("contacts/index.html", redirectPage("../kontakty/")),
  ...posts.map((post, index) => writeOutput(`${postRoute(post)}index.html`, articlePage(post, index))),
  ...posts.map((post) => writeOutput(`news/${post.slug}/index.html`, redirectPage(`../../${postRoute(post)}`))),
]);

const sitemapPaths = [
  "",
  "uslugi/",
  "negabaritnye-perevozki/",
  "proekty/",
  "o-kompanii/",
  "klienty/",
  "testimonial/",
  "novosti/",
  "kontakty/",
  "privacy/",
  ...posts.map((post) => postRoute(post)),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapPaths.map((path) => `  <url><loc>https://aet-trans.ru/${path}</loc></url>`).join("\n")}\n</urlset>\n`;
await writeOutput("sitemap.xml", sitemap);
await writeOutput("robots.txt", "User-agent: *\nAllow: /\nSitemap: https://aet-trans.ru/sitemap.xml\n");

console.log(`Generated 10 sections and ${posts.length} news pages in ${outputDirectory}.`);
