# AET Trans Mobile Design System

## Intent

Serious B2B logistics interface for decision makers. The mobile page must feel calm, precise and operational. Photography carries scale; typography carries trust.

## Core Tokens

- Navy: `#0b1b2b`
- Navy overlay: `rgba(7, 20, 32, 0.72)`
- Green action: `#4f7838`
- Logo blue: `#168fbd`, identity only
- Surface: `#ffffff`
- Page background: `#f3f6f7`
- Text: `#17212b`
- Muted text: `#5d6973`
- Mobile gutter: `16px`
- Mobile header: `64px`
- Minimum touch target: `44px`

## Typography

- Font family: IBM Plex Sans
- Hero title: `34px / 1.08`, weight 600
- Section title: `28px / 1.15`, weight 600
- Body: `15px / 1.5`, weight 400
- Labels and metadata: `11-13px`, weight 500-600
- No letter spacing and no decorative uppercase text

## Mobile Header

- Fixed over the hero image
- Dark translucent background at the top of the page
- Light solid background after scrolling
- Original logo, one short CTA and menu button
- Phone remains in the hero and menu to avoid crowding

## Hero Composition

1. The upper photographic area stays clear, with no copy over the cargo
2. Title, description and actions form one continuous copy group in the lower half
3. Two actions share one full-width row, with the primary action slightly wider
4. Company facts form a separate text-only three-column line at the bottom edge

The hero uses `100svh`, full-bleed photography and no side gutters. Content must not overlap the main cargo subject.

## Responsive Rules

- `320px`: smaller title and tighter three-column fact line
- `390px`: default mobile composition
- `430px`: same composition with wider text measure
- Desktop uses the same grouped copy and bottom fact-line composition

## Avoid

- White detached header above a dark hero
- Full phone number plus CTA plus menu in one mobile row
- Body copy separated from the title by an empty middle area
- Equal visual emphasis for every text block
- Large empty cards or generic full-screen white menus
