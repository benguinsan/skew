# Prompt: biasly News homepage UI

## Goal

Replace the design-system smoke page on `/` with the **biasly News homepage** from `prompt-imgs/02-homepage.png`: utility bar, main nav, topic chips, **Top News** 3-column card grid, and dark footer — using existing design tokens and primitives, with static mock article data (no DB/auth/pipeline yet).

## Skills read

- `AGENTS.md` sections 1 (home page with news cards), 5 (Website layer only — UI displays stored-shaped data), 19 (card fields: title, source framing percentages; UI must not scrape/analyze), 21 (keep small, no secrets)
- Existing design system: `prompts/design-system.md`, `app/globals.css`, `components/**`
- `node_modules/next/dist/docs/` only if layout/font/image APIs are needed

No Clerk / Supabase / Oxylabs / AI SDK skills — those are not wired yet; do not add them in this task.

## Existing code inspected

- `app/page.tsx` — full design-system token/component showcase (replace with product homepage)
- `app/layout.tsx` — Poppins, biasly metadata, minimal shell
- `app/globals.css` — design tokens (light-only)
- `components/brand/logo.tsx` — stacked “biasly” + “News” subtitle
- `components/ui/{button,chip,bias-meter,container}.tsx`
- `components/news/article-card.tsx` — preview card (chip category, excerpt, thin unlabeled meter, time/read meta) — **does not match homepage card anatomy**
- No Supabase schema/queries, no Clerk, no article APIs yet
- Reference: `prompt-imgs/02-homepage.png` (+ design system `01-ui-design-system.png` for tokens)

## Decisions / assumptions

1. **UI-only homepage** — static mock articles shaped like future `articles` + `article_analyses` fields. No Supabase reads, no Clerk Login wiring (Login/Subscribe are presentational links/buttons).
2. **Replace `/`** with the product homepage. Do **not** keep the design-system showcase on `/`. Optional: skip a `/design-system` route (do not overbuild unless needed for QA).
3. **Match the screenshot layout**, not invent alternate marketing layouts. Preserve design-system tokens/colors/type (Poppins, bias red/gray/blue, container 1280 / px-6).
4. **Homepage card anatomy** (from mock) differs from current `ArticleCard`:
   - Image (rounded) with small circular **info** icon top-right
   - Category · region text (e.g. `Politics · United States`) — not a Chip
   - Bold headline (no excerpt)
   - **Labeled** bias meter (segments show `L 20%` / `Center 31%` / `Right 49%`)
   - Source count meta (e.g. `12 sources`)
5. Update `BiasMeter` to support a **labeled** variant (or `size="labeled"`) used by homepage cards; keep the thin unlabeled bar for reuse.
6. Update `ArticleCard` (or introduce a focused homepage card component) to match the mock; prefer adapting `ArticleCard` if props stay clean, else `components/news/homepage-article-card.tsx`.
7. **Topic chips** use trailing `+` as in the mock (`World Cup +`), via existing `Chip` (adjust plus placement if needed).
8. **Nav items** Home / For You / Local / Blindspot — presentational; Home is active (underline). “For You” has a red notification dot. Hamburger is visual only on this pass (or show on mobile).
9. **Utility bar** content is static: Browser Extension, Theme Light/Dark/Auto (Light active, non-functional), fixed date string or live formatted date, Set Location, International Edition — presentational only.
10. **Footer** dark charcoal/black: logo + tagline, Company / Help link columns, Connect social icons (inline SVG), copyright.
11. **Mock data** — ~9–12 stories inspired by the reference headlines/categories/bias splits; use CSS/placeholder image blocks (no remote image hosts required). Optional: tinted placeholder panels labeled by story.
12. Page background for main content area may be white or very light gray per mock; cards sit in a clean 3-column grid with consistent gaps.
13. Logo in header may render as a compact single-line **biasly News** wordmark (extend `Logo` with a `variant="header"` if stacked subtitle does not match the mock).
14. Do not implement Blindspot/For You/Local pages, subscribe checkout, theme switching, or browser extension.

## Visual interpretation

- Clean editorial news product: white header, light page, dense but airy 3-col card grid.
- Bias meter is the primary color signal on each card (red / light gray / blue proportional segments with in-bar labels).
- Header is three bands: thin utility strip → logo/nav/actions → horizontal topic chips.
- Footer is near-black with muted link text and social icons.
- No purple gradients, cream/terracotta themes, broadsheet hairlines, or dark-mode-first styling.

## Layout / typography / spacing / colors / responsiveness

| Area        | Spec                                                                                               |
| ----------- | -------------------------------------------------------------------------------------------------- |
| Utility bar | Small caption text, secondary gray on light gray/white strip; theme control inline                 |
| Main nav    | Logo left; centered or left-adjacent nav links (body/h4 weight); Subscribe primary + Login outline |
| Topic row   | Horizontal wrap or scroll of chips; gap ~8–12px; container-aligned                                 |
| Top News    | H2 “Top News”; grid `1 col` → `md:2` → `lg:3`; gap ~24px                                           |
| Cards       | Image ~16:10, radius-lg; category caption; H3 title; labeled meter; caption sources                |
| Footer      | Dark bg (`text-primary` / near `#0D0D0F` or `#00000F`); multi-column → stacked on mobile           |
| Container   | max 1280px, px 24 (`Container`)                                                                    |

Pixel-perfect expectations:

- Bias segment widths proportional to percentages; labels readable when segment is wide enough (hide or abbreviate label if segment too narrow, e.g. show `L` / `%` gracefully).
- Active nav underline on Home.
- Red dot on For You.
- Info icon does not need a working modal — decorative/`aria-hidden` or simple `title` is fine.
- Mobile: single-column cards; utility/nav may compress (hide lesser utility items if needed; keep logo + Login/Subscribe accessible).

## Files likely to change

- `app/page.tsx` — homepage composition
- `app/layout.tsx` — only if shared header/footer should wrap all pages (prefer composing header/footer in page **or** layout; pick one and keep body `flex flex-col`)
- `components/news/article-card.tsx` — homepage card anatomy
- `components/ui/bias-meter.tsx` — labeled variant
- `components/ui/chip.tsx` — trailing plus if required
- `components/brand/logo.tsx` — header compact variant if needed
- New: `components/layout/site-header.tsx`
- New: `components/layout/site-footer.tsx`
- New: `components/layout/topic-chips.tsx` (or inline in header)
- New: `lib/mock-articles.ts` (or colocated constants) — mock Top News data
- Possibly small inline SVG icons module under `components/icons/`

## Implementation requirements

1. Build **SiteHeader** with utility bar + main nav + topic chips matching the mock structure.
2. Build **SiteFooter** matching Company / Help / Connect + copyright.
3. Replace `/` content with Top News grid of homepage-style article cards.
4. Extend **BiasMeter** for labeled in-bar percentages used on cards.
5. Adapt **ArticleCard** props to homepage fields: `title`, `category`, `region`, `left/center/right`, `sourceCount`, optional `href` (can be `#` or `/news/[id]` stub without building details page).
6. Reuse `Button`, `Chip`, `Container`, design tokens — no new color system.
7. Server components by default; client components only if a control truly needs interactivity (prefer static for theme/location this pass).
8. TypeScript strict; no `any`; no pipeline/auth/DB packages.
9. Keep accessibility basics: landmark `header`/`main`/`footer`, nav labels, meter `aria-label` with percentages.

## Security requirements

- No secrets, no env vars, no third-party API calls.
- Mock data only; no scraping or AI calls from the UI.
- No remote image domains required (placeholders only). If `next/image` is used later, configure domains then — not in this task.

## Acceptance criteria

- [ ] `/` matches the homepage mock structure: utility bar, nav, topic chips, Top News grid, footer
- [ ] Design-system showcase is no longer the homepage
- [ ] Cards show image, category·region, title, labeled L/Center/Right meter, source count
- [ ] Bias meter colors/tokens match design system; segments proportional
- [ ] Subscribe (primary) + Login (outline) visible; Home active; For You has red dot
- [ ] Footer dark with logo, link columns, social icons, copyright
- [ ] Responsive: 1 / 2 / 3 columns; no horizontal overflow at ~375px
- [ ] No Clerk/Supabase/scrape/analyze introduced
- [ ] `npm run typecheck` and `npm run lint` pass

## Checks to run

- `npm run typecheck`
- `npm run lint`
- Manual visual check in browser (`npm run dev` or `docker compose up --build`)

## Exact manual test steps

1. Start app: `npm run dev` or `docker compose up --build`.
2. Open `http://localhost:3000` (or Docker-mapped port, e.g. `5173`).
3. Confirm design-system token page is gone; homepage shows **Top News**.
4. Confirm header: utility strip, **biasly** logo, nav links, Subscribe + Login, topic chips with `+`.
5. Confirm ~3-column card grid on desktop; labeled bias bars (red/gray/blue) with percentages.
6. Confirm footer is dark with Company / Help / Connect and copyright.
7. Resize to ~375px: single-column cards, usable header/footer, no horizontal scroll.
8. Run `npm run typecheck` and `npm run lint`; report results.
