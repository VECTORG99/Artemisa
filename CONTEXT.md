# Huascar Project Context

Updated: 2026-07-26

## State

- Repository uses npm workspaces (`packages/*`, `frontend`, `agent-creator`): root Express/TypeScript backend, `frontend/` Next app (landing + Creator at `/agents/new`), and `agent-creator/` Vite tool. Root `package.json` owns backend scripts/tests and hoists shared dependencies; per-app installs still work via `npm --prefix <app> run <script>` but `npm --prefix <app> ci` fails (use root `npm ci` instead, which installs all workspaces).
- The backend only generates configuration files (#584, ADR-0008). The Runtime (ReAct engine, LLM providers, RAG, MCP, sessions, ephemeral agents CRUD, commit approvals, SQLite) was deleted; there is no execution, deployment or hosting path in this repo.
- Backend entrypoint: `src/server.ts` -> `src/app.ts`. Express mounts public creator catalog/workflow/tutorial/agent endpoints before auth, then `/api` metrics/health/openapi, then the protected creator routes.
- Backend source is now: `src/creator/*` (catalog, decision tree, generator, agent protocol, sub-catalogs), `src/routes/{health,metrics,openapi,debug}.ts`, `src/middleware/*`, `src/config.ts` (server settings only), `src/errors.ts`, `src/logger.ts`, `src/health.ts`, and `src/kiro/schemas/*.json`.
- No persistence: no database, no filesystem writes, no network calls during generation. Every request is a pure function of its body.
- Backend runtime dependencies are `express`, `helmet`, `cors`, `compression`, `express-rate-limit`, `pino`, `dotenv`. There is no `better-sqlite3`, `ai`, `@ai-sdk/*` or `@modelcontextprotocol/sdk`.
- Reference artifacts rescued from the deleted runtime live in `docs/reference/`: `steering-roles.json` (the 7 curated roles), `security-policy.example.json`, `hooks-implementation.ts`, `mcps.example.json`, `rag.example.json`, `prompts/`, plus `security-policy-guide.md` and `steering-roles-guide.md`. They are documentation, never loaded by the server.
- Auth is environment-driven in `src/middleware/auth.ts`: `AUTH_REQUIRED=false` for local development; `AUTH_REQUIRED=true` requires `HUASCAR_API_KEYS` through `Authorization: Bearer` or `X-API-Key`, and fails closed when keys are missing.

## What Works

- JSON API routes:
  - `GET /api/health`, `GET /api/health/live`, `GET /api/health/ready`, `GET /api/metrics`, `GET /api/openapi.json` are mounted before protected route auth. Health reports process signals only (memory, disk, uptime).
  - `/api/v1/creator/catalog|workflow|tutorial|skills|mcps|models` are public; `/evaluate|preview|generate` are protected by API auth when enabled.
  - `/api/v1/creator/agent`, `/agent/start`, `/agent/answer`, `/agent/generate` and `/startup` are the public AI-agent onboarding protocol.
  - The catalog's `skill` and `mcp` categories are derived from `src/creator/skillsCatalog.ts` and `src/creator/mcpCatalog.ts` rather than declared separately, because the decision tree validates `skills_selection`/`mcps_selection` against those categories. When they were separate lists the ids did not intersect, so both questions were unanswerable from any UI.
  - `RATE_LIMIT_CREATOR` defaults to 120/min: the Creator re-evaluates the whole tree per step, so one completed Auto-largo run costs ~35 requests.
- Generation is deterministic: same answers plus the same `workflowVersion`/`catalogVersion` produce the same artifacts and SHA-256 hashes. Version mismatches return 409; incomplete trees, literal secrets and unsafe bundles return 422.
- Generated artifacts follow `src/kiro/schemas/*.json`; `test/kiro-schema.test.mjs` validates the reference examples in `docs/reference/` against those schemas.
- Removed runtime routes (`/api/agent/execute`, `/api/agents`, `/api/history`, `/api/roles`, `/api/rag/*`, `/api/tools`, `/api/memory`, `/api/pipeline`, `/api/configs`, `/api/hooks/commit-approval/*`, `/api/mcp/status`) return 404 and are absent from the OpenAPI document; `test/api_test.mjs` and `test/openapi.test.mjs` assert this.
- Next creator route `frontend/src/app/agents/new/page.tsx` consumes the backend creator workflow/catalog and generates a downloadable bundle. It owns the state machine (mode select -> question flow -> review -> completion) and delegates:
  - `features/creator/lib/flow.ts` — guided navigation. The backend's `nextQuestion` only covers required questions, so the client walks `evaluation.visibleQuestions` with its own visited trail; this is what makes the 4 optional questions reachable and the back button work.
  - `features/creator/lib/session.ts` — `sessionStorage` draft, namespaced by workflow version.
  - `features/creator/lib/answer-labels.ts` — id -> human label formatting shared by review and presets.
  - `features/creator/components/option-picker.tsx` — the single option grid (search, chips, `maxSelections`, `custom:<slug>`) used by both the guided flow and the advanced dashboard.
- `frontend/src/lib/api.ts` only talks to `/api/v1/creator/*`; the ephemeral "probar temporalmente" registration was removed with `/api/agents`.

## Known Limitations

- No accounts, no saved blueprints, no revision history: drafts live only in the browser's `sessionStorage`.
- Huascar does not apply the bundle. The user copies files into the target project manually and reviews them.
- Applying a generated `security-policy.json` requires the consumer to implement enforcement; `docs/reference/security-policy-guide.md` documents how, with `hooks-implementation.ts` as the reference.
- `custom:<slug>` answers are preserved in the blueprint but produce an "adapter pending" warning; no adapter is generated.
- Preview is capped at 40 files and 256 KB, and HTTP bodies at 128 KB.
- Auth middleware captures env values at module load. Test/process env changes after import do not reconfigure auth.
- Next `NEXT_PUBLIC_API_URL` is build-time baked. `frontend/src/lib/api.ts` falls back to `http://localhost:3001`.
- `agent-creator/` (Vite) remains in the workspace as a legacy app; it is not the active Creator UI.

## Constraints

- Follow `AGENTS.md`: GitHub Issues are source of truth; PRs target `development`; do not push directly to `master` or `development`.
- Do not implement local tracking docs (`TODO.md`, backlog files) for pending work.
- Keep docs for agents direct, structured, and file/path-specific.
- New code should include tests; root unit tests run with `npm run test:unit`.
- Root backend target is TypeScript ESM (`type: module`) and uses `.js` import specifiers in source.
- Generation must stay pure: no filesystem, network, database, LLM, MCP or shell access in `src/creator/*`.
- Request JSON body limit is `128kb`; global request timeout defaults to `REQUEST_TIMEOUT_MS=120000`.
- CORS default origins are `http://localhost:3000,http://localhost:5173`; override with `CORS_ALLOWED_ORIGINS`.

## Module Dependency Graph

```text
src/server.ts
  -> src/app.ts
     -> src/config.ts
     -> src/middleware/{auth,sanitize,validation,notFound,errorHandler}.ts
     -> src/routes/{health,metrics,openapi,debug}.ts
        -> src/health.ts
     -> src/creator/router.ts
        -> src/creator/{catalog,decisionTree,generator,domain,etag}.ts
        -> src/creator/{skillsCatalog,mcpCatalog,modelsCatalog}.ts
        -> src/creator/agentProtocol.ts

frontend/src/app/agents/new/page.tsx
  -> frontend/src/lib/api.ts        (only /api/v1/creator/*)
  -> frontend/src/features/creator/*
  -> packages/types                 (@huascar/types)

docs/reference/*                     (documentation only, not imported)
```

## Critical Paths

- HTTP startup: `src/server.ts` -> `src/app.ts` -> middleware -> public creator router -> health/metrics/openapi -> auth boundary -> protected creator router.
- Evaluation: `POST /api/v1/creator/evaluate` -> `evaluateDecisionTree(answers)` -> visible questions, progress, recommendations, warnings, issues. Stateless: the client resends accumulated answers.
- Generation: `POST /api/v1/creator/preview|generate` -> validate complete tree -> `generateAgentBundle()` -> artifacts + manifest with SHA-256 + `INSTALL.md`/`WHY.md`.
- Agent protocol: `GET /api/v1/creator/agent/start` -> `POST /agent/answer` (repeat) -> `POST /agent/generate` -> bundle plus application instructions.
- Auth boundary: everything mounted after the `/api` auth middleware requires a key when `AUTH_REQUIRED=true`; health, metrics and the public creator endpoints are mounted before it.
- Graceful shutdown: `server.close()` drains open requests; there is no in-flight execution tracking, MCP pool or database to close.

## Do Not Touch / High-Risk Zones

- Generation determinism in `src/creator/generator.ts`: no timestamps, randomness or environment reads in artifact content; hashes are part of the contract.
- `WORKFLOW_VERSION`/`CATALOG_VERSION` in `src/creator/{decisionTree,catalog}.ts`: clients pin them and receive 409 on mismatch.
- Secret detection and path validation in the generator (rejects absolute paths, `..`, backslashes, duplicates, literal tokens).
- `src/middleware/auth.ts` fail-closed behavior when `AUTH_REQUIRED=true` and no keys are configured.
- `src/kiro/schemas/*.json` plus the examples in `docs/reference/`; schema tests are intentionally strict.
- Frontend API base URL behavior: `NEXT_PUBLIC_API_URL` is a build-time public env var.

## Non-Goals

- Do not reintroduce execution: no ReAct loop, LLM provider, MCP connection, RAG indexing or shell access in this repo (ADR-0008).
- Do not add a database or vector store; the Creator is stateless by design.
- Do not write generated files to disk or to the user's repository from the backend.
- Do not expand `AGENTS.md` into a full conventions/contributing guide here.
- Do not add new Creator features to `agent-creator/` (legacy app).

## How To Update This Document

- Update this file in the same PR that changes architecture, deploy topology, route shape, auth behavior, generation contract, or frontend/backend integration.
- Keep entries machine-readable: short bullets, explicit paths, concrete route/env names, no narrative history.
- Update the `Updated:` line with the edit date.
- If generated artifact shapes change, keep `src/kiro/schemas/*.json`, `docs/reference/*` and `test/kiro-schema.test.mjs` valid.
- Run at least `npm run test:unit` after editing this document.
