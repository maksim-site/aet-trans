# Design QA

## Evidence

- Source visual truth: `/private/tmp/aet-trans-design-audit/02-lider-reference.png`
- Secondary reference: `/private/tmp/aet-trans-design-audit/03-trucknroll-reference.png`
- Previous hero baseline: `/private/tmp/aet-trans-design-audit/19-aet-final-desktop.jpg`
- New hero asset: `assets/images/hero-industrial-v2.webp`
- Implementation: `http://127.0.0.1:4174/`
- Implementation screenshot: `/private/tmp/aet-hero-v2-desktop.jpg`
- Mobile screenshot: `/private/tmp/aet-hero-v2-mobile.jpg`
- Viewport: 1440 x 900 for the primary comparison, plus 375 x 812 for mobile
- State: homepage, first screen, menu closed, forms empty
- Full-view comparison: `/private/tmp/aet-hero-before-after.jpg`
- Focused comparison: not required because the before and after first screens are both preserved at native 1440 x 900 size. The image crop, typography, navigation, CTA contrast, and transition into the estimate section remain readable.

## Findings

- No actionable P0, P1, or P2 findings remain.
- Typography: Lora and Manrope reproduce the calm editorial hierarchy of the main reference without copying its industry-specific character.
- Spacing and layout: removing the four-item strip makes the first screen calmer and gives the cargo image a clear role. The 80 px desktop header stays within the intended navigation height.
- Colors and tokens: warm neutrals, graphite, and deep green replace the previous neon treatment. The original blue and green logo remains unchanged by client request and is used as the sole bright brand accent.
- Image quality: the new 1536 x 864 WebP hero has a deliberate left-side copy area, a strong industrial subject on the right, and weighs about 136 KB. It is a generated mockup asset based on the company's real project imagery, so production should use it only after approval or replace it with an owned professional photograph.
- Copy: headings and supporting text describe actual logistics services and keep one clear conversion path.
- Responsiveness: the hero was visually checked at 375 x 812 and 375 x 667. The 320 px layout received an additional compact CTA and single-column facts fallback.
- Accessibility: semantic headings, labels, alt text, focus states, mobile tap targets, and reduced-motion handling are present.

## Comparison History

### Pass 1

- Earlier P2 finding: the translucent fixed header used `backdrop-filter`, which produced black compositing artifacts in some scrolled browser captures.
- Fix: replaced the translucent blurred background with the solid `--paper` token and kept the subtle border and shadow.
- Post-fix evidence: `/private/tmp/aet-trans-design-audit/18-header-fixed.jpg`

### Pass 2

- Full comparison evidence: `/private/tmp/aet-trans-design-audit/20-reference-vs-aet.jpg`
- Result: the implementation now matches the requested serious, restrained, image-led B2B direction. No remaining P0, P1, or P2 design issue was found.

### Pass 3

- Earlier P2 finding: the original hero photo had no quiet copy area, and the truck, cranes, railway, headline, and four-item proof strip competed for attention.
- Fix: added `hero-industrial-v2.webp`, moved the visual subject to the right, strengthened the left-side scrim, removed the proof strip, and reduced the desktop header from 88 px to 80 px.
- Post-fix evidence: `/private/tmp/aet-hero-v2-desktop.jpg`
- Comparison evidence: `/private/tmp/aet-hero-before-after.jpg`

### Pass 4

- Earlier P2 finding: at the narrowest 320 px viewport the secondary hero CTA extended below the hero, and the facts and routes content could force a small horizontal overflow.
- Fix: hide the redundant secondary CTA only on very narrow or short phones, use a one-column facts layout at 380 px and below, and constrain the routes track and small-screen heading size.
- Mobile evidence: `/private/tmp/aet-hero-v2-mobile.jpg`

### Pass 5

- Original-site evidence: `https://aet-trans.ru/` exposes an `Оставить заявку` action and a modal `Расчет доставки`, but no standalone preliminary-calculation band in the main page flow.
- Fix: removed the standalone `Предварительный расчёт` section while retaining the full request form near the bottom of the page.
- Brand refinement: a test with the official logo blue `#01B6EC` was reviewed and removed because it competed with the restrained green and neutral palette.
- Browser-rendered post-fix evidence is pending because browser control stopped before the final capture. Static HTML, CSS references, duplicate content, and diff checks passed.

### Pass 6

- Screenshot finding: Material Symbol names such as `arrow_forward`, `call`, `mail`, and `location_on` rendered as text because the icon class did not declare its font family.
- Fix: added the complete `Material Symbols Sharp` font declaration while keeping the existing official Google Fonts resource.
- Favicon: created `assets/favicon.svg` from the official logo source and cropped its viewBox to the green arrow and two-dot mark only. The wordmark and tagline remain outside the favicon crop.

## Primary Interactions Tested

- Mobile menu opens, closes, and exposes all main navigation links.
- Mobile menu CTA scrolls to the request section and closes the menu.
- Request form fields accept input and the demo submit state appears.
- Header changes correctly after scrolling.
- Console errors and warnings checked: none.

## Follow-up Polish

- The forms are intentionally demo-only until the full site transfer and lead delivery integration are implemented.
- News and project cards currently lead to the request section because separate detail pages are outside this design pass.

final result: blocked
