# Contributor Guide

Welcome to Artemisa. This project accepts contributions from humans and AI agents.

- **Human contributors**: read this section. For code changes, the detailed guide for AI below also applies.
- **AI agents**: the "AI Contributor Guide" section is your main entry point.

## Where the documentation lives

All project documentation lives in the repository under `docs/`:

| File / directory       | Content                                                       |
| ---------------------- | ------------------------------------------------------------- |
| `README.md`            | Introduction, architecture, quick start, and roadmap.         |
| `CONTEXT.md`           | Project status, modules, critical paths, and high-risk areas. |
| `docs/CONTRIBUTING.md` | This file — guide for human contributors and agents.          |
| `docs/architecture.md` | Engine, layers, and design decisions.                         |
| `docs/deployment.md`   | Local deployment, Docker, and Render.                         |
| `docs/CONVENTIONS.md`  | Code conventions, tests, API, and Git.                        |
| `docs/adr/`            | Architecture Decision Records.                                |

The **GitHub Wiki is intentionally disabled**: having two places for documentation creates confusion about which one is up to date. All technical and user documentation resides with the code so that it is reviewable, versionable, and searchable without leaving the repository.

## Flow for humans

1. Look for an issue with label `good first issue` or `help wanted`.
2. Create a branch from `origin/development` with prefix `feature/`, `fix/`, or `docs/`.
3. Make changes focused on the issue. No refactors or unrequested formatting.
4. Run `npm run test:unit` and `npx tsc --noEmit`.
5. Open a PR to `development` with `Closes #N` in the body.
6. Wait for review. Maintainers review PRs weekly.

## Getting started

```bash
git clone https://github.com/VECTORG99/Artemisa
cd Artemisa
npm ci
cp .env.example .env
npm run dev
```

Read `README.md` to understand the architecture and `docs/CONVENTIONS.md` for code conventions.

---

# AI Contributor Guide

Audience: AI agents changing this repository. Keep changes issue-scoped, schema-valid, tested, and routed through PRs to `development`.## Quick Reference

| Scenario                                   | Read first                                                   | Change here                                      | Required check                                           |
| ------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------ | -------------------------------------------------------- |
| Any code/doc change                        | `AGENTS.md`, `docs/CONVENTIONS.md`                           | Issue branch from `origin/development`           | `git diff`, relevant tests                               |
| Architecture/route/auth/deploy integration | `CONTEXT.md`, relevant `docs/adr/*`                          | Smallest owning module                           | Update `CONTEXT.md` if state changed                     |
| Add backend route                          | `src/app.ts`, nearby `src/routes/*.ts`, `test/app.test.mjs`  | `src/routes/<resource>.ts`, `src/app.ts`         | `npm run test:unit`, `npx tsc --noEmit`                  |
| Change request validation                  | Target route/parser tests                                    | Route-owned parser/helper                        | Unit test for accepted/rejected input                    |
| Change decision tree / catalog             | `src/creator/decisionTree.ts`, `src/creator/catalog.ts`      | Question/option owner + version bump if breaking | `npm run test:unit`                                      |
| Change generated artifacts                 | `src/creator/generator.ts`, `test/CreatorGenerator.test.mjs` | Generator only; keep output deterministic        | `npm run test:unit`                                      |
| Change generated artifact schema           | `src/kiro/schemas/*.json`                                    | Schema + generator together                      | `npm run test:unit`                                      |
| Update reference artifacts                 | `docs/reference/README.md`                                   | `docs/reference/*`                               | `node --import tsx/esm --test test/kiro-schema.test.mjs` |
| Add frontend route                         | Existing `frontend/src/app/**/page.tsx` pattern              | `frontend/src/app/<route>/page.tsx`              | Frontend build/test if available                         |
| OpenAPI/API contract change                | `src/routes/openapi.ts`, route tests                         | OpenAPI + route response together                | `npm run test:unit`                                      |
| Env/config change                          | `src/config.ts`, `.env.example` if present                   | Config boundary only                             | Config/unit test, no secret output                       |

## PR Quality Gate

- [ ] Issue exists and PR body includes `Closes #<number>`.
- [ ] Branch is based on current `origin/development`.
- [ ] Scope only covers the issue; no drive-by refactors or formatting.
- [ ] New behavior has the smallest useful test, or skip reason is in PR body.
- [ ] `npm run test:unit` passed, or failure/blocker is documented.
- [ ] `npx tsc --noEmit` passed, or failure/blocker is documented.
- [ ] Generated artifacts still validate against `src/kiro/schemas/*.json`.
- [ ] Public API changes update tests and OpenAPI docs together.
- [ ] Generator changes keep output deterministic (same answers -> same hashes).
- [ ] Auth/deploy/frontend-backend integration changes update `CONTEXT.md`.
- [ ] No secrets, tokens, raw `.env` values, generated databases, or build artifacts committed.
- [ ] PR targets `development`, not `master`.

## Architecture Rules / Constraints

- Backend entrypoint: `src/server.ts` -> `src/app.ts`; app wiring stays thin.
- The backend only generates configuration files (#584): no execution engine, LLM, RAG, MCP, database or filesystem writes.
- Route modules own HTTP parsing/status/response shape; `src/creator/*` owns catalog, tree, recommendations and generation.- The Creator is stateless and deterministic: same answers + versions -> same artifacts and SHA-256 hashes.
- Auth boundary lives in `src/middleware/auth.ts`; do not weaken fail-closed behavior when `AUTH_REQUIRED=true`.
- Generated artifacts must match `src/kiro/schemas/*.json`; reference examples in `docs/reference/` are tested by `test/kiro-schema.test.mjs`.
- Frontends are separate install domains (`frontend/`, `agent-creator/`); do not introduce root workspaces unless an issue explicitly requires it.
- Root TypeScript is ESM; source imports use `.js` specifiers.
- No new dependency for behavior that Node, TypeScript, Express, CSS, or an installed package already covers.
- Generated/build output and local tracking docs are not source changes.

## How To Test Changes

Run from repository root unless noted.

```bash
npm run test:unit
npx tsc --noEmit
```

Useful narrower checks:

`2`

Frontend checks are separate dependency domains; run only when that app changed:

`3`

## Recipes

### Add Catalog Technology

1. Edit `src/creator/catalog.ts` in the matching category tuple list; keep ids kebab-case and stable.
2. If the option changes recommendations, update `src/creator/decisionTree.ts` and its test.
3. Bump `CATALOG_VERSION` only when an existing id/meaning changes (clients pin versions and get 409).
4. Run `npm run test:unit`.

### Add Generated Artifact

1. Emit it from `src/creator/generator.ts` under the condition that requires it; keep content deterministic (no dates, no randomness).2. Keep paths relative, without `..`, backslashes or duplicates; stay under the 40 files / 256 KB preview budget.
2. Never inline secrets: use `${ENV_VAR}` references.
3. If the artifact is JSON with a schema, keep `src/kiro/schemas/*.json` in sync.
4. Add coverage in `test/CreatorGenerator.test.mjs`, then run `npm run test:unit`.

### Update Reference Artifacts

1. Reference material for generated bundles lives in `docs/reference/` (steering roles, security policy, hooks implementation, MCP/RAG examples).
2. Keep JSON examples schema-valid: `test/kiro-schema.test.mjs` validates them against `src/kiro/schemas/*.json`.
3. Document intent in the matching guide (`security-policy-guide.md`, `steering-roles-guide.md`) instead of adding runtime code.
4. Run `npm run test:unit`.

### Add Endpoint

1. Add or update the owning route in `src/routes/`.2. Mount it in `src/app.ts` at the correct auth boundary.
2. Validate params/body at the route boundary; return stable status codes and JSON shapes.
3. Update `src/routes/openapi.ts` if public contract changes.
4. Add route tests, then run `npm run test:unit` and `npx tsc --noEmit`.

### Add Frontend Route

1. Add `frontend/src/app/<route>/page.tsx` using existing app-router patterns.
2. Put shared API calls in `frontend/src/lib/api.ts` only when at least two callers need them now.
3. Keep `NEXT_PUBLIC_API_URL` behavior unchanged unless the issue is deploy/config-specific.
4. Run the relevant frontend build/test command if dependencies are installed.
