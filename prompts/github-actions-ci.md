# GitHub Actions CI workflow

## Goal

Add a GitHub Actions workflow that runs the project's standard quality checks on every push and pull request, so broken typecheck/lint/build cannot merge unnoticed.

## Skills read

- `AGENTS.md` section 22 (commands and checks)
- No Clerk / Supabase / Oxylabs / AI SDK skills needed (CI config only)

## Existing code inspected

- `package.json` — scripts: `typecheck`, `lint`, `format:check`, `build`, `dev`, `start`
- `package-lock.json` — present → use `npm ci`
- `Dockerfile` — `NODE_VERSION=22.17.0` → pin CI Node to 22
- No project `.github/` directory yet (no existing workflows)
- No `vercel.json` / deploy secrets wired in-repo yet
- App is still early UI stage; no server secrets required for `typecheck` / `lint`; `build` may need dummy `NEXT_PUBLIC_*` later when Clerk/Supabase land — keep build step and document if it starts failing

## Decisions / assumptions

1. **CI first, not full CD** — ship a check workflow only. No deploy-to-Vercel / Docker-push job unless the user explicitly asks for CD in approval.
2. **Triggers** — `push` and `pull_request` on `main` (and current default branch if different).
3. **Jobs** — single `ci` job on `ubuntu-latest`:
   1. checkout
   2. setup-node@v4 with Node 22 + npm cache
   3. `npm ci`
   4. `npm run typecheck`
   5. `npm run lint`
   6. `npm run format:check`
   7. `npm run build`
4. **Concurrency** — cancel in-progress runs for the same branch/ref to save Actions minutes.
5. **No secrets in workflow** — do not reference `BIASLY_ADMIN_SECRET`, Oxylabs, OpenAI, or service-role keys.
6. **File path** — `.github/workflows/ci.yml`

## Files likely to change

- `.github/workflows/ci.yml` (new)

## Implementation requirements

1. Create `.github/workflows/ci.yml` with:
   - `name: CI`
   - `on.push` / `on.pull_request` for `main`
   - concurrency group keyed by workflow + ref, `cancel-in-progress: true`
   - one job `ci` with the steps listed above
2. Use `actions/checkout@v4` and `actions/setup-node@v4`.
3. Set `node-version: "22"` and `cache: npm`.
4. Fail the job if any check fails (default shell behavior; no `continue-on-error`).
5. Keep the YAML minimal — no matrix, no Docker build, no deploy.

## Security requirements

- Do not commit or inject real API keys / admin secrets into the workflow.
- Do not echo env secrets in logs.
- If `next build` later requires public Clerk/Supabase placeholders, use harmless dummy `NEXT_PUBLIC_*` values only — never service-role or secret keys.

## Acceptance criteria

- [ ] `.github/workflows/ci.yml` exists and is valid YAML
- [ ] Workflow runs typecheck, lint, format:check, and build after `npm ci`
- [ ] Node 22 matches Dockerfile major version
- [ ] No secrets required to run the workflow today
- [ ] No deploy/CD steps unless separately approved

## Checks to run

- Validate YAML structure by inspection (indentation, keys)
- Optionally: `npm run typecheck && npm run lint && npm run format:check` locally to confirm the same commands the CI will run

## Exact manual test steps expected after implementation

1. Confirm file exists: `.github/workflows/ci.yml`
2. Locally mirror CI:
   ```bash
   npm ci
   npm run typecheck
   npm run lint
   npm run format:check
   npm run build
   ```
3. Push the branch (or open a PR) to GitHub and confirm the **CI** workflow appears under the Actions tab and passes.
4. If CD (Vercel deploy / Docker publish) is needed next, request a separate prompt.
