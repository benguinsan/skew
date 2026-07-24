# Prompt: biasly design system foundation

## Goal

Implement the **biasly News** design system from the attached UI style guide as the app’s foundational tokens, typography, and reusable UI primitives — so later home/details pages can reuse consistent colors, type, spacing, and components.

Do **not** build the full news feed, auth, or scraping UI in this task. Scope is design-system foundation + a small visual smoke page that proves tokens/components match the reference.

## Skills read

- `node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md` — `next/font` for Poppins
- Project Tailwind v4 patterns via `app/globals.css` (`@import "tailwindcss"`, `@theme inline`)
- `AGENTS.md` sections 1 (minimal UI), 5 (Website layer only), 21 (no secrets / keep small)

No Clerk / Supabase / Oxylabs / AI SDK skills needed for this UI-only task.

## Existing code inspected

- `app/globals.css` — default Geist/white tokens + dark `prefers-color-scheme` (remove auto-dark; reference is light-only)
- `app/layout.tsx` — Geist fonts, placeholder metadata
- `app/page.tsx` — placeholder “Home”
- No `components/` app UI yet; no shadcn installed
- Stack: Next.js 16 App Router, React 19, Tailwind CSS v4

## Decisions / assumptions

1. **Light theme only** for now — match the style guide; do not keep OS dark-mode overrides.
2. **Font:** Poppins via `next/font/google` (weights: 400 Regular, 500 Medium, 600 SemiBold, 700 Bold).
3. **Tokens live in CSS** (`:root` + `@theme inline`) so Tailwind utilities like `bg-surface`, `text-text-primary`, `shadow-md` work.
4. **Primitives only** — Button, Chip, BiasMeter, Icon stroke helpers, SiteLogo, Container. No full news card page layout yet; include a compact **design system preview** on `/` so visual QA is possible without inventing product data pipelines.
5. **Cards as interaction containers** — style guide shows news cards; provide a presentational `ArticleCard` shell using static mock props for the preview only (UI displays stored-shaped fields; no scrape/analyze).
6. Brand name in UI: **biasly** (wordmark) + optional “News” as secondary label per reference.
7. Bias colors are semantic UI only (`left` / `center` / `right`); labels must remain visually “AI-estimated” ready for later copy, but this task does not wire analysis data.
8. Icons: simple inline SVG with `2` stroke, round caps/joins — no icon library unless already present (none is).
9. Spacing scale uses 4px base: 4, 8, 16, 24, 32, 40, 64 mapped as `--spacing-*` / Tailwind theme where practical.
10. Max content width **1280px**, horizontal margin/padding **24px**, 12-col mental model (use CSS grid/flex; no full 12-col framework).

## Visual interpretation (from reference)

- Clean editorial/news product: high whitespace, soft gray surfaces, black primary actions.
- Bias meter is the strongest color signal: red `#B42318` (left), gray `#E5E7EB` (center), blue `#1D4ED8` (right).
- Surfaces: white page BG, `#F6F6F6` / `#F0F0F0` secondary panels, hairline borders `#E5E7EB`.
- Typography hierarchy is Poppins-only; H1 32 Bold → Caption 11 Regular.
- Cards: image with large radius (~12px), category chip, H3 title, body-small excerpt, bias meter, meta row (time / read time).
- Buttons: primary filled near-black; secondary outlined; disabled muted gray.
- Chips: pill (`radius-full`), border, optional leading “+”.
- Shadows: subtle elevation only (sm/md/lg as specified).

## Layout / typography / spacing / colors / responsiveness

| Token                | Value                     |
| -------------------- | ------------------------- |
| text-primary         | `#00000F`                 |
| text-secondary       | `#6B7280`                 |
| surface              | `#F6F6F6`                 |
| bias-left            | `#B42318`                 |
| bias-center          | `#E5E7EB`                 |
| bias-right           | `#1D4ED8`                 |
| bg-primary           | `#FFFFFF`                 |
| bg-secondary         | `#F0F0F0`                 |
| border / divider     | `#E5E7EB`                 |
| radius-sm/md/lg/full | 4 / 8 / 12 / 9999         |
| shadow-sm/md/lg      | per style guide           |
| container            | max-w `1280px`, px `24px` |

Responsive expectations:

- Preview + container readable on mobile (≥320px) and desktop.
- Article card preview: single column on small screens; can show 1–2 cards in a simple grid from `md+`.
- Touch targets for buttons/chips ≥ 40px height where practical.

Pixel-perfect expectations:

- Match hex values and type sizes/weights from the guide.
- Bias meter segments proportional to given percentages (e.g. 20/30/50).
- Do not invent purple gradients, cream/terracotta themes, or dark-first styling.

## Files likely to change

- `app/globals.css` — design tokens + `@theme inline` + base element styles
- `app/layout.tsx` — Poppins, metadata for biasly
- `app/page.tsx` — design-system smoke/preview using primitives
- `components/ui/button.tsx` (new)
- `components/ui/chip.tsx` (new)
- `components/ui/bias-meter.tsx` (new)
- `components/ui/container.tsx` (new)
- `components/brand/logo.tsx` (new)
- `components/news/article-card.tsx` (new, presentational + mock-friendly)
- Optional: `lib/design-tokens.ts` only if needed for typed bias percentages — prefer CSS/Tailwind first

## Implementation requirements

1. Replace Geist with Poppins in root layout; apply `font-sans` globally.
2. Encode all color / radius / shadow / font-size tokens in `globals.css` for Tailwind v4 `@theme`.
3. Remove automatic dark-mode color flip.
4. Implement primitives:

- `Button` — variants: `primary` | `secondary` | `outline` | `disabled` (or `disabled` attr)
- `Chip` — bordered pill, optional leading plus
- `BiasMeter` — horizontal 3-segment bar from `left`/`center`/`right` percentages (normalize or assume sum 100)
- `Container` — max-width 1280 + horizontal padding 24
- `Logo` — “biasly” bold wordmark (+ optional “News” subtitle)
- `ArticleCard` — image, category chip(s), title, excerpt, bias meter, meta

5. Home page becomes a minimal design-system preview (logo, type samples, buttons, chips, bias meter, 1–2 mock cards) — not product marketing bloat.
6. Keep TypeScript strict; no `any`; server components by default; client only if interaction requires it (buttons can be plain `<button>` in server components).
7. Do not install shadcn unless necessary; plain Tailwind + small components is enough.
8. Do not wire Clerk, Supabase, scrape, or analyze.

## Security requirements

- No secrets, no env exposure.
- Preview uses static mock article data only (local constants).
- No external image hosts required if using placeholder `div`/SVG; if using remote images, use a safe placeholder and configure `images` only if needed — prefer local/public placeholder or CSS block to avoid Next image remote config.

## Acceptance criteria

- [ ] App uses Poppins; metadata title/description reflect biasly News
- [ ] CSS tokens match the style guide hex/radius/shadow/type scale
- [ ] No OS dark-mode override fighting the light design system
- [ ] Button / Chip / BiasMeter / Container / Logo / ArticleCard exist and match reference styling
- [ ] `/` shows a clean preview proving tokens + components
- [ ] Responsive: preview usable on mobile and desktop
- [ ] No pipeline/auth/DB work introduced
- [ ] `npm run typecheck` and `npm run lint` pass (add typecheck script if missing)

## Checks to run

- `npm run lint`
- `npx tsc --noEmit` (or `npm run typecheck` if script exists / add it)
- Manual visual check in browser (dev server or Docker compose)

## Exact manual test steps

1. From project root: `npm run dev` (or `docker compose up --build` if using Docker).
2. Open `http://localhost:3000` (or `http://localhost:5173` if Docker maps 5173).
3. Confirm Poppins loads (Computed font-family includes Poppins).
4. Confirm page background white / surface gray panels / near-black primary text.
5. Confirm Primary button is near-black; Secondary/Outline bordered; Disabled muted.
6. Confirm Chip pills with border; BiasMeter shows red/gray/blue segments in given ratios.
7. Confirm Logo reads **biasly** prominently.
8. Confirm mock ArticleCard shows image area, category, title, excerpt, meter, meta.
9. Resize to mobile width (~375px): content padded ~24px, no horizontal overflow.
10. Run lint + typecheck; report results.
