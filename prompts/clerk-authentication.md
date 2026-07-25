# Clerk authentication

## Goal

Add Clerk authentication to biasly so users can sign in / sign up, see signed-in state in the header, and so the app is correctly wired for Next.js 16 + `@clerk/nextjs` (current SDK). Keep browsing public; do not lock the news site behind auth.

## Skills read

- `.agents/skills/clerk/SKILL.md` (router → setup + Next.js patterns)
- `.agents/skills/clerk-setup/SKILL.md`
- `.agents/skills/clerk-nextjs-patterns/SKILL.md`
- `.agents/skills/clerk-nextjs-patterns/references/middleware-strategies.md`
- Official quickstart: https://clerk.com/docs/nextjs/getting-started/quickstart
- `AGENTS.md` sections 2, 3, 6, 21 (Clerk auth, env vars, server/client boundaries)

## Existing code inspected

- `package.json` — Next.js `16.2.11`, React 19; **no** `@clerk/nextjs` yet
- `app/layout.tsx` — root layout, no `ClerkProvider`
- `app/page.tsx` / `app/news/[id]/page.tsx` — public news UI with mock data
- `components/layout/site-header.tsx` — has stub **Login** / **Subscribe** buttons (not wired)
- No `middleware.ts` / `proxy.ts` yet
- No `components.json` (no shadcn theme path required)
- `.env.local` already contains `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` (do not print or commit secrets)
- `.env.example` missing — create it with Clerk vars (placeholders only)
- `.github/workflows/ci.yml` — `npm run build` with no Clerk env; will need dummy keys once Clerk is installed
- Clerk CLI not installed globally (optional; keys already present so manual SDK setup is fine)

## Decisions / assumptions

1. **Public-first middleware** — home, news details, and future public pages stay open. Protect only routes that need a session later (none required for this first pass beyond auth pages themselves). Use `clerkMiddleware()` with the standard matcher; do **not** call `auth.protect()` on `/` or `/news/*`.
2. **Dedicated auth routes** — add App Router pages at `/sign-in` and `/sign-up` using Clerk `<SignIn />` / `<SignUp />` (catch-all `[[...sign-in]]` / `[[...sign-up]]`).
3. **Header auth controls** — replace the stub Login button with Clerk controls:
   - Signed out: Sign in (maps to existing outline Login button style where practical) + optional Sign up
   - Signed in: `<UserButton />`
   - Leave Subscribe as a non-auth stub for now (billing is out of scope)
4. **Next.js 16 middleware filename** — create `proxy.ts` at the project root (not `middleware.ts`), per Clerk quickstart for Next.js 16+.
5. **`ClerkProvider` placement** — inside `<body>` in `app/layout.tsx`, wrapping app children.
6. **SDK** — install current `@clerk/nextjs` (v7+). Use `<Show when="signed-in|signed-out">` (not Core 2 `<SignedIn>` / `<SignedOut>`).
7. **No organizations / billing / webhooks** in this task.
8. **Env docs** — create `.env.example` with Clerk keys + sign-in/sign-up URL vars from `AGENTS.md` section 21. Do not commit `.env.local`.
9. **CI build** — add non-secret placeholder Clerk env vars on the GitHub Actions `Build` step so `next build` succeeds after Clerk is wired.
10. **Keys** — reuse existing `.env.local` keys; do not rotate or overwrite them unless `clerk doctor` reports a problem. Skip `clerk init` if it would clobber existing keys; prefer `npm install @clerk/nextjs` + manual file setup.
11. **UI scope** — keep header changes minimal and consistent with existing Button variants; no full custom auth UI redesign.

## Files likely to change

- `package.json` / `package-lock.json` — add `@clerk/nextjs`
- `app/layout.tsx` — wrap with `ClerkProvider`
- `proxy.ts` (new) — `clerkMiddleware` + matcher
- `app/sign-in/[[...sign-in]]/page.tsx` (new)
- `app/sign-up/[[...sign-up]]/page.tsx` (new)
- `components/layout/site-header.tsx` — wire Sign in / UserButton via `<Show>`
- `.env.example` (new) — document Clerk (+ leave stubs for future vars if useful)
- `.github/workflows/ci.yml` — dummy Clerk env for build
- Possibly a small `components/auth/header-auth.tsx` client component if header stays a Server Component and needs Clerk client components

## Implementation requirements

1. Install `@clerk/nextjs`.
2. Ensure `.env.local` keeps existing Clerk keys. Add to env (if missing):
   - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
   - `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
   - `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/`
   - `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/`
3. Create `.env.example` documenting those variables with empty/placeholder values (never real secrets).
4. Add `ClerkProvider` inside `<body>` in root layout.
5. Create `proxy.ts` with `clerkMiddleware` and the official matcher that includes API routes.
6. Add `/sign-in` and `/sign-up` catch-all pages centered with Clerk prebuilt components.
7. Update header so Login becomes real auth:
   - Signed out → Sign in (and Sign up if it fits without cluttering the header)
   - Signed in → `UserButton`
8. Extract a client `HeaderAuth` (or similar) if needed so Server Component headers stay clean.
9. Update CI build env with dummy `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` placeholders sufficient for build.
10. Do not protect news browsing behind auth.
11. Do not expose `CLERK_SECRET_KEY` to client code.
12. Do not add Supabase Auth, orgs, billing, or webhooks.

## Security requirements

- Secret key server-only; only `NEXT_PUBLIC_*` in browser.
- Never commit `.env.local` or real keys.
- Auth UI/actions stay on Clerk-hosted components / Clerk SDK — no custom password handling.
- Admin/pipeline secrets (`BIASLY_ADMIN_SECRET`, etc.) are unrelated; do not mix with Clerk.

## Acceptance criteria

- [ ] `@clerk/nextjs` is installed and typechecks
- [ ] `ClerkProvider` wraps the app inside `<body>`
- [ ] `proxy.ts` exists with `clerkMiddleware` and correct matcher
- [ ] `/sign-in` and `/sign-up` render Clerk components
- [ ] Header shows Sign in when signed out and `UserButton` when signed in
- [ ] Home and news detail pages remain publicly viewable without signing in
- [ ] `.env.example` documents Clerk env vars
- [ ] CI build step has placeholder Clerk env so build can pass
- [ ] `npm run typecheck` and `npm run lint` pass
- [ ] `npm run build` succeeds locally with existing `.env.local`

## Checks to run

- `npm run typecheck`
- `npm run lint`
- `npm run build`

## Exact manual test steps expected after implementation

1. Ensure `.env.local` has valid Clerk test keys (already present).
2. Run `npm run dev`.
3. Open `http://localhost:3000` — page loads without forcing login.
4. Click **Login** / Sign in in the header → lands on `/sign-in` (or Clerk modal if using buttons that open modal — prefer redirect mode to dedicated routes).
5. Create or sign in with a test account.
6. Confirm header shows `UserButton` instead of Login.
7. Visit `/sign-up` directly and confirm it renders.
8. Sign out via `UserButton` → Login returns.
9. Open `/news/<any-mock-id>` while signed out — still loads.
10. Optional: run `npx clerk doctor` if CLI is available; otherwise skip.
