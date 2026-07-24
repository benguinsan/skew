# Prompt: biasly News details page UI

## Goal

Implement the **news details page** from `prompt-imgs/03-news-details-page.png`: article hero (breadcrumb, headline, byline, actions, image, labeled bias meter), article body, Related Stories grid, right sidebar (Bias Analysis / AI Summary / Source Breakdown), newsletter CTA, and shared header/footer — using existing design tokens and homepage layout primitives, with static mock article detail data (no DB/auth/pipeline yet).

Wire homepage Top News cards to open this page at `/news/[id]`.

## Skills read

- `AGENTS.md` sections 1 (news details page), 5 (Website layer only — UI displays stored-shaped data; must not scrape/analyze), 19 (details must show full analysis: summary, sentiment, framing percentages, confidence, framing notes, loaded terms, disclaimer), 20 (Related Articles section exists in UI; real pgvector wiring later — mock related stories now), 21 (keep small, no secrets)
- Existing design system + homepage: `prompts/design-system.md`, `prompts/homepage-ui.md`, `app/globals.css`, `components/**`
- `node_modules/next/dist/docs/` for App Router dynamic routes (`app/news/[id]/page.tsx`) if needed

No Clerk / Supabase / Oxylabs / AI SDK skills — do not wire them in this task.

## Existing code inspected

- `app/page.tsx` — homepage Top News grid; cards link to `#${id}` (update to `/news/[id]`)
- `app/layout.tsx` — Poppins, flex column shell
- `app/globals.css` — light-only design tokens
- `components/layout/site-header.tsx` — utility bar + nav + **topic chips** (details mock has no topic chips)
- `components/layout/site-footer.tsx` — dark Company / Help / Connect footer
- `components/news/article-card.tsx` — homepage card (image + category·region + title + labeled meter + sources) — **not** the related-story card anatomy
- `components/ui/{button,chip,bias-meter,container}.tsx` — reuse BiasMeter `variant="labeled"` and outline/primary buttons
- `components/icons/index.tsx` — Info, Menu, Chevrons, socials; need Save / Share / More (and optional Clock) icons
- `lib/mock-articles.ts` — `MOCK_TOP_NEWS` list cards only; no detail body / analysis / related / sources yet
- Reference: `prompt-imgs/03-news-details-page.png`

## Decisions / assumptions

1. **UI-only details page** — static mock shaped like future `articles` + `article_analyses` (+ presentational multi-source breakdown for the mock). No Supabase, Clerk, scrape, or analyze.
2. **Route:** `app/news/[id]/page.tsx`. Resolve article from mock by `id`. Unknown id → `notFound()`.
3. **Primary story** matches homepage card `id: "1"` (Iran / Trump headline) so homepage → details feels continuous. Other ids get enough mock detail to render the same layout (can share body/analysis templates with per-id title/meta/bias).
4. **Header:** reuse `SiteHeader` with a prop such as `showTopics={false}` on details (mock has no topic chip row). Nav: Home is a normal link (not forced active underline on details).
5. **Typography:** keep **Poppins** from the design system (do not add a serif face even if the mock looks editorial-serif).
6. **Layout:** two columns on `lg+` — main ~65% left, sticky-friendly sidebar ~35% right; stack sidebar below hero/body on mobile (or below article header + image, before related — prefer: main column then sidebar on small screens).
7. **Sidebar cards** are bordered white panels (`border-border`, `rounded-lg`, padding) — interaction/info containers matching the mock. Include three cards:
   - **Bias Analysis** — overall bias label + strongest % (color by left/center/right), three horizontal progress rows (Left / Center / Right), short framing notes / methodology copy, confidence, sentiment label, loaded terms (compact chips or comma list), outline **How We Analyze Bias** button (presentational).
   - **AI Summary** — date + read-time meta, bulleted summary points (from analysis summary), disclaimer, outline **Provide Feedback** button (presentational).
   - **Source Breakdown** — total sources + Left/Center/Right counts, list of outlet names with bias labels colored by token, outline **View All Sources** button. This is **mock UI only** (product stores one source per article today); keep presentational so the screenshot matches.
8. **Main column bias meter** — labeled `BiasMeter` under the hero image + “N sources” caption (same as homepage cards).
9. **Related Stories** — separate compact card component (not homepage `ArticleCard`): small square thumb, `Category - Region`, bold headline, `date | read time`. 2-column grid; up to 6 mock related items (screenshot shows a grid; AGENTS later caps real related at 5 — for mock, 4–6 is fine). Links to `/news/[id]` where possible.
10. **Newsletter CTA** — full-width light bar above footer: “Stay Informed. Stay Balanced.” + short subcopy + email input + Subscribe (presentational; no backend). Prefer a reusable `NewsletterCta` used on details (homepage may omit for now).
11. **Article actions** — Save / Share / More icons+labels presentational only.
12. **Hero image** — CSS placeholder panel (reuse `imageTone`); optional caption/credit string under image.
13. **Article body** — several paragraphs of mock news prose (not raw scrape dump). No HTML from external sources.
14. **AGENTS analysis fields mapping** (all visible somewhere on the page):

| Field                              | Where in UI                          |
| ---------------------------------- | ------------------------------------ |
| summary                            | AI Summary bullets                   |
| sentiment_label (+ optional score) | Bias Analysis card meta              |
| left/center/right %                | Main meter + Bias Analysis bars      |
| bias_label / overall               | “Overall Bias: Right 49%” style line |
| confidence                         | Bias Analysis near overall           |
| framing_notes                      | Bias Analysis body copy              |
| loaded_terms                       | Bias Analysis (chips/list)           |
| disclaimer                         | AI Summary footer                    |
| source name                        | Byline or Source Breakdown mock list |

15. Do not implement Blindspot/For You/Local, real subscribe/login, theme switching, feedback APIs, or “View All Sources” modal.
16. Do not move header/footer into root layout unless it clearly simplifies both pages; composing in each page (current homepage pattern) is fine.

## Visual interpretation

- Clean editorial article reading experience: white/light gray page, dense sidebar analytics, generous main-column type.
- Bias colors remain the primary signal: left `#B42318`, center `#E5E7EB`, right `#1D4ED8`.
- Sidebar cards: white, thin gray border, rounded ~12px, stacked with consistent gap (~16–24px).
- Related Stories are compact list-like cards, not large homepage image cards.
- Newsletter is a soft surface strip with rounded corners inside the container (or full-bleed soft band with inner container).
- No purple gradients, cream/terracotta themes, broadsheet hairlines, or dark-mode-first styling.

## Layout / typography / spacing / colors / responsiveness

| Area       | Spec                                                           |
| ---------- | -------------------------------------------------------------- |
| Header     | Same utility + main nav as homepage; **hide topic chips**      |
| Breadcrumb | Caption / secondary: `Politics - United States`                |
| Headline   | Large bold (~H1 or slightly larger on desktop); tight leading  |
| Byline row | Secondary text + Save/Share/More actions right-aligned         |
| Hero image | Wide aspect (~16:9 or 2:1), `rounded-lg`                       |
| Bias meter | Labeled meter full width of main column; sources caption below |
| Body       | `text-body-lg` / comfortable line-height; max readable measure |
| Sidebar    | Stack of 3 cards; progress bars use bias token fills           |
| Related    | H2 “Related Stories”; `1 col` → `md:2` grid                    |
| Newsletter | Surface/bg-secondary bar; input + primary Subscribe            |
| Footer     | Existing dark `SiteFooter`                                     |
| Container  | max 1280px, px 24                                              |

Pixel-perfect expectations:

- Overall bias percentage colored by dominant framing (Right → bias-right blue, etc.).
- Sidebar Left/Center/Right bars proportional to percentages.
- Source list bias labels colored (Left red, Center gray/muted, Right blue).
- Mobile: single column; actions wrap; sidebar below main content; no horizontal overflow at ~375px.
- Sticky sidebar optional on `lg+` if it doesn’t fight short viewports.

## Files likely to change

- `app/news/[id]/page.tsx` — details page composition (new)
- `app/page.tsx` — link cards to `/news/[id]`
- `lib/mock-articles.ts` — extend with detail payload(s), related stories, source breakdown, analysis fields
- `components/layout/site-header.tsx` — `showTopics?: boolean` (default `true`)
- New: `components/news/related-story-card.tsx`
- New: `components/news/bias-analysis-card.tsx`
- New: `components/news/ai-summary-card.tsx`
- New: `components/news/source-breakdown-card.tsx`
- New: `components/layout/newsletter-cta.tsx` (or `components/news/newsletter-cta.tsx`)
- `components/icons/index.tsx` — Bookmark/Save, Share, More (dots), optional Clock
- Possibly small article header / hero subcomponents under `components/news/` if the page file gets too large

## Implementation requirements

1. Build `/news/[id]` that looks like the screenshot structure for the primary mock article.
2. Extend mock data with: `author`, `publishedLabel`, `readTime`, `imageCaption`, `bodyParagraphs[]`, analysis fields (summary bullets, sentiment, confidence, framing notes, loaded terms, disclaimer, bias label + %), `sources[]` for breakdown, `relatedIds` or embedded related list.
3. Compose main column + sidebar + related + newsletter + footer.
4. Reuse `BiasMeter` labeled variant, `Button`, `Container`, `Logo`/header/footer, design tokens.
5. Update homepage `href` to `/news/${article.id}`.
6. Server components by default; client only if newsletter input needs local state (prefer uncontrolled form with `action="#"` / `onSubmit` prevented via no-op, or plain static markup without client JS).
7. TypeScript strict; no `any`; no pipeline/auth/DB packages.
8. Accessibility: landmark structure, heading hierarchy (one H1 headline), meter/`aria-label`s, labeled icon buttons for Save/Share/More.

## Security requirements

- No secrets, no env vars, no third-party API calls.
- Mock data only; no scraping or AI calls from the UI.
- No remote image hosts required (placeholders only).

## Acceptance criteria

- [ ] `/news/1` (and other mock ids) renders details layout matching the mock: header (no topics), breadcrumb, headline, byline+actions, image, labeled bias meter, body, related grid, sidebar cards, newsletter, footer
- [ ] Homepage cards navigate to `/news/[id]`
- [ ] Unknown id returns 404
- [ ] Bias Analysis / AI Summary / Source Breakdown match mock structure and show AGENTS analysis fields (summary, sentiment, framing %, confidence, framing notes, loaded terms, disclaimer)
- [ ] Related Stories use compact card anatomy (thumb + category + title + date/read)
- [ ] Design tokens / BiasMeter colors consistent with homepage
- [ ] Responsive: stacked on mobile; two-column on desktop; no horizontal overflow ~375px
- [ ] No Clerk/Supabase/scrape/analyze introduced
- [ ] `npm run typecheck` and `npm run lint` pass

## Checks to run

- `npm run typecheck`
- `npm run lint`
- Manual visual check in browser (`npm run dev` or `docker compose up --build`)

## Exact manual test steps

1. Start app: `npm run dev` or `docker compose up --build`.
2. Open `http://localhost:3000` (or Docker-mapped port).
3. Click the first Top News card; confirm URL `/news/1` and details layout.
4. Confirm no topic chips on details header; footer still present.
5. Confirm sidebar: Overall Bias, progress bars, AI Summary bullets + disclaimer, Source Breakdown list with colored labels.
6. Confirm Related Stories grid and newsletter strip above footer.
7. Open `/news/999` (or missing id) → 404.
8. Resize to ~375px: single column, usable actions/sidebar, no horizontal scroll.
9. Run `npm run typecheck` and `npm run lint`; report results.
