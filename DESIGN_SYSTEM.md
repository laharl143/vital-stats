# VitalStats Design — Style Reference
> A single teal accent against warm cream, restrained and clinical — italic serif for the emotional beat, plain sans for everything that has to be trusted.

**Theme:** light (public site) · admin dashboard supports a light/dark toggle (VS-123)

VitalStats reads as a medical-wellness brand that refuses to look like a pharmacy insert. One accent color (`#2E8B72` teal) carries the entire brand — no multi-hue "rooms" the way a fintech or consumer app might use. Headlines and product names switch to a serif (`.font-display`) at a light weight, often with a single italicized word for warmth, while everything else — nav, body copy, labels, buttons — stays in a plain sans grotesque. Radius is small and quiet (2–6px) almost everywhere except pill-shaped CTAs and chips, which go fully round. There is no drop-shadow system; elevation is a 1px hairline border at rest and a translateY lift + soft shadow on hover, nothing more.

This document describes what the codebase actually does today, not an aspirational target — gaps and inconsistencies found while writing it are called out explicitly rather than smoothed over.

## Tokens — Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Teal | `#2E8B72` | `--teal` | The single brand accent — CTAs, links, active states, category labels, icons. Everything on-brand traces back to this one hue. |
| Teal Dark | `#1D6B57` | `--teal-dark` | Text-on-light-teal (badges, FDA checkmark), darker hover states |
| Teal Deep | `#0F4A3C` | `--teal-deep` | Hero gradient endpoints, dark surfaces (footer, sidebar dark mode) |
| Teal Light | `#5CAFA0` | `--teal-light` | Decorative bullet dots, secondary accents |
| Teal Pale | `#EAF5F2` | `--teal-pale` | Chip/pill backgrounds, subtle section fills |
| Mint | `#6FE6B8` | `--mint` | Homepage-only decorative gradients (Hero, Footer, Categories, Testimonials, FeaturedProducts) — brighter and more playful than teal, kept off admin/product pages |
| Sage | `#6B8F7E` | `--sage` | **Declared but unused.** No component references it — dead token, candidate for removal or a defined purpose |
| Amber | `#B9791F` | `--amber` | Added in VS-17 specifically to separate "Best Seller" from the generic teal delivery-method badges — the only non-teal semantic accent in the system |
| Cream | `#F7F9F8` | `--cream` | Page background everywhere (`body` default) |
| Ink | `#0D1512` | `--ink` | Primary text — a near-black with a green cast, never pure `#000000` |
| Ink Mid | `#1E2B27` | `--ink-mid` | Secondary headline color in a few places |
| Ink Muted | `#4A5754` | `--ink-muted` | Body copy on white/cream |
| Ink Faint | `#8FA39D` | `--ink-faint` | Captions, placeholder-weight text, faint labels |

## Tokens — Typography

Four font families are loaded via `next/font/google` in `layout.tsx`, but **only two are actually wired up to a CSS class that anything uses**:

| Family | Loaded as | Applied via | Status |
|--------|-----------|-------------|--------|
| Plus Jakarta Sans | `--font-jakarta` | `body { font-family: 'Plus Jakarta Sans' }` (hardcoded string, not the variable) | **Live** — default body/UI font everywhere |
| IBM Plex Sans | `--font-plex-sans` | `.font-secure` class | **Live** — admin/secure-area typography |
| Cormorant Garamond | `--font-cormorant` | *(nothing)* | **Dead weight** — loaded on every page, never referenced |
| DM Sans | `--font-dm-sans` | *(nothing)* | **Dead weight** — loaded on every page, never referenced |

And separately: **`.font-display` — used everywhere for headlines and product names — sets `font-family: 'Playfair Display', serif`, but Playfair Display is never loaded** (not in `layout.tsx`'s `next/font` imports, no stylesheet link). Every "serif" headline on the site is actually rendering the browser's fallback system serif (Georgia on Windows, Times on macOS), not the intended typeface. This has been true long enough that it may be the de facto look at this point — worth a deliberate decision (load Playfair Display for real, or repoint `.font-display` at a serif that's actually shipping) rather than leaving it as an accident.

### Real type scale (as used, not a formal system)

| Role | Size | Example |
|------|------|---------|
| Eyebrow / label | 10–11px, `0.2em` letter-spacing, uppercase | "OUR PRODUCTS", "WEIGHT MANAGEMENT" |
| Body | 12–14px | Card taglines, paragraph copy |
| Section heading | 20–28px, `.font-display` | "Overview", "How It Works" |
| Page H1 | `clamp(32px, 4vw, 56px)`, `.font-display`, weight 300–400 | Hero headlines site-wide |
| Card/product name | 18–22px, `.font-display` | ProductCard name, detail page name |

Letter-spacing is applied by feel, not a token scale: uppercase labels commonly use `0.08em`–`0.22em`; headline tracking is usually `-0.01em`. No sub-pixel/px-based letter-spacing values exist anywhere in the codebase (unlike systems that specify e.g. `-2.16px`) — everything is `em`-relative.

## Tokens — Spacing & Radius

**Base unit:** 4px (Tailwind's default spacing scale, used directly — `gap-3`, `px-4`, `py-2`, etc. — no custom spacing scale defined)

### Radius — used as distinct *roles*, not one system

| Role | Value | Where |
|------|-------|-------|
| Badges / small CTAs | 2px | ProductCard badges, FDA tag, outlined "Learn More" button |
| Filter pills | 3px | CategoryFilter buttons |
| Cards (small) | 4px | ProductCard container |
| Cards (medium) | 6px | Product detail sidebar card |
| Pills / chips | `9999px` / `rounded-full` | Navbar "Book a Consult", hero "View Products", benefit chips |

No card in the codebase uses a large single-digit-percent or 80px+ radius the way some design systems do (e.g. Wise's 86px content-block radius) — VitalStats keeps card radii small (4–6px) and reserves fully-round shapes for pills only.

## Components

### Primary CTA Pill
`background: var(--teal)`, `color: #fff`, `border-radius: 9999px`, `padding: 13px 28px` (desktop, via `clamp()`), weight 500–600, uppercase tracking `0.1em`. Used for "Book a Consult" (Navbar), "View Products" (Hero). No border — the fill is the button.

### Outlined CTA
`border: 1px solid var(--teal)`, `color: var(--teal)`, transparent background, `border-radius: 2px`, uppercase, `11px`. On hover (ProductCard), fills to `var(--teal)` with white text. Used for "Learn More".

### Category / Status Badge
`background: var(--teal)` (or `var(--amber)` for Best Seller since VS-17), white text, `9px` uppercase, `border-radius: 2px`, `padding: 4px 10px`. Floats top-left of a card's image area.

### Benefit Chip
`background: var(--teal-pale)`, `color: var(--teal-dark)`, `border-radius: 9999px`, `10.5px` semibold. Small pill, not a badge — softer, informational rather than a status flag.

### Product Card
White surface, `1px solid rgba(0,0,0,0.06)` border, `border-radius: 4px`. Flat at rest; on hover, `translateY(-4px)` + `box-shadow: 0 12px 32px rgba(0,0,0,0.08)` — the only elevation motion in the system. Image area is a two-stop linear gradient (per category) with a centered lucide icon, not a photo (see Imagery).

### Category Filter Pill
`border-radius: 3px`, `1px solid rgba(0,0,0,0.15)` when inactive, fills to `var(--teal)` with white text when active. Deliberately less round than the CTA pills — a filter control, not a call to action.

### Hero Header Block
Full-width `linear-gradient(135deg, var(--teal-deep) 0%, var(--teal) 100%)`, white/translucent-white text, eyebrow label + `.font-display` H1 + short supporting paragraph. Repeated near-identically across Products, Contact, and Book a Consult pages.

## Do's and Don'ts

### Do
- Keep teal as the *only* brand accent — amber exists solely to distinguish "Best Seller" from other badges, not as a general second color
- Use `.font-display` for names/headlines and plain sans for everything else — don't mix serif into body copy or UI chrome
- Keep card radii small (2–6px); reserve fully-round shapes for pills and chips only
- Use `var(--ink)` for primary text, never literal `#000000` or `black`
- Prefer lucide-react icons over raw emoji in new UI (the VS-121/VS-32/VS-17 migration direction) — several emoji spots remain (Navbar search results, some admin areas) as known follow-ups, not the target state

### Don't
- Don't introduce a new accent color without a stated reason — amber was added for exactly one signal (best-seller) and shouldn't multiply informally
- Don't add drop-shadows for decoration — the only shadow in the system is the ProductCard hover lift; elevation elsewhere is a hairline border, not a shadow
- Don't assume `.font-display` renders Playfair Display in production — it currently falls back to the system serif (see Typography); verify before relying on Playfair-specific metrics
- Don't load new Google Fonts without wiring them to an actual CSS class — Cormorant Garamond and DM Sans are cautionary examples already sitting unused in the bundle
- Don't use large (80px+) card radii — no component in the app does this; it would read as off-brand

## Elevation

No formal shadow scale exists. The only elevation effect in the entire codebase is the ProductCard hover state: flat hairline border at rest, `translateY(-4px)` + `box-shadow: 0 12px 32px rgba(0,0,0,0.08)` on hover. Admin modals (FAQ, Doctor's Notes) use a blurred backdrop (`backdrop-filter: blur(20px)`, `rgba(13,21,18,0.28–0.86)`) plus z-index layering (established ceiling: z-70 for the top-most existing modal, z-80 reserved for `/design-system`'s own switcher) rather than a shadow-depth system.

## Imagery

Product cards use a two-tone gradient background (per category) with a centered lucide icon — a placeholder, not real photography, despite every product having real uploaded images available (`product.images`) that the card currently ignores (flagged in the VS-17 plan as a follow-up). The product **detail** page does use real photography (hero background image, video thumbnails via Cloudinary) — the gap is specifically at the card/listing level. There is no illustration or mascot style established anywhere in the system.

## Layout

Section padding is consistently `px-8 md:px-16`. The floating navbar pill caps at `max-width: 1360px`, centered with `mx-4 md:mx-8` margins. Content grids are responsive 1/2/3-column (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`), most commonly seen in the product listing. Hero sections use a `clamp()`-based fluid type scale rather than fixed breakpoint sizes. No page in the app exceeds roughly 1360–1440px of effective content width — consistent with, though never explicitly declared as, a page max-width token.

## Agent Prompt Guide

**Quick reference**
- Text (primary): `var(--ink)` `#0D1512`
- Accent / CTA fill: `var(--teal)` `#2E8B72`
- Page background: `var(--cream)` `#F7F9F8`
- Secondary text: `var(--ink-muted)` `#4A5754`
- Semantic "best seller": `var(--amber)` `#B9791F` — the only sanctioned second accent

**Example prompts**

1. **Hero section**: `linear-gradient(135deg, var(--teal-deep), var(--teal))` background, white text, eyebrow label (`10px`, `0.2em` tracking, uppercase), `.font-display` H1 at `clamp(32px, 4vw, 56px)` weight 300–400, one supporting paragraph at `13–14px`, `rgba(255,255,255,0.65–0.75)`.
2. **Product card**: white surface, `1px solid rgba(0,0,0,0.06)`, `border-radius: 4px`. Category badge top-left (`var(--teal)` or `var(--amber)` for best-seller). Gradient + lucide-icon image area, `.font-display` name at `21–22px`, benefit chips (`var(--teal-pale)` bg, `9999px` radius), price + outlined CTA footer.
3. **Primary CTA**: `var(--teal)` fill, white text, `border-radius: 9999px`, uppercase, `0.1em` tracking, weight 500–600.
4. **Section heading**: `.font-display`, weight 300–400, `20–28px`, `var(--ink)`. No decorative underline or icon — weight and the serif switch carry the emphasis.

## Similar Brands

Directional references only — not a claim of direct inspiration:
- **Ro / Hims & Hers** — clinical-but-warm telehealth brands using a single restrained accent color against a light neutral base
- **Curology** — soft sans body type paired with an editorial serif for headlines, similar to VitalStats' `.font-display` switch
- **Equinox** — heavy reliance on a dark hero gradient + light serif italic for an emotional beat, similar treatment to VitalStats' hero headlines

## Quick Start

### CSS Custom Properties (already in `src/app/globals.css`)

```css
:root {
  --teal: #2E8B72;
  --teal-dark: #1D6B57;
  --teal-deep: #0F4A3C;
  --teal-light: #5CAFA0;
  --teal-pale: #EAF5F2;
  --mint: #6FE6B8;
  --sage: #6B8F7E; /* declared, unused */
  --amber: #B9791F;
  --cream: #F7F9F8;
  --ink: #0D1512;
  --ink-mid: #1E2B27;
  --ink-muted: #4A5754;
  --ink-faint: #8FA39D;
}
```

### Radius roles (not currently tokenized — proposed)

```css
:root {
  --radius-badge: 2px;
  --radius-filter-pill: 3px;
  --radius-card-sm: 4px;
  --radius-card-md: 6px;
  --radius-pill: 9999px;
}
```

---
*Written for VS-141. Reflects the codebase as of the products-page/design-system-page work in this session — re-verify specifics (especially the Playfair Display gap) before treating any single number here as permanent.*
