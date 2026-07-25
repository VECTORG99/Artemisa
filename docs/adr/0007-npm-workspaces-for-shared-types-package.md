# ADR-0007: Adopt npm workspaces for shared types package

## Status

Accepted

## Context

- ADR-0005 decided against npm workspaces, keeping backend, `frontend/`, and `agent-creator/` as separate install domains.
- ADR-0005's revisit condition was: "A shared library is needed by root backend and frontend."
- `packages/types` (`@huascar/types`) now exists as a shared TypeScript types package consumed by both the backend and `frontend/`.
- Root `package.json` currently declares `"workspaces": ["packages/*", "frontend", "agent-creator"]`.
- `agent-creator/` still keeps its own `package-lock.json` history but is hoisted through the root workspace install; `frontend/` no longer keeps its own lockfile (removed in the same change that introduced workspaces).
- `npm ci` must run from the repo root to install all workspaces; `npm --prefix <app> ci` fails because per-app lockfiles are no longer authoritative. `npm --prefix <app> run <script>` still works for build/dev/test scripts.

## Decision

- Use npm workspaces (`packages/*`, `frontend`, `agent-creator`) as the dependency management model for this repo.
- Keep `packages/types` as the shared contract between backend and frontend for Creator domain types (catalog, workflow, blueprint shapes).
- Install dependencies exclusively from the repo root (`npm ci` / `npm install`); do not run `npm ci` inside `frontend/` or `agent-creator/`.
- Per-app scripts (`build`, `dev`, `test`, `lint`) remain runnable via `npm --prefix <app> run <script>` or `cd <app> && npm run <script>`.

## Alternatives Considered

- Keep ADR-0005 layout and duplicate shared types manually in both backend and frontend: rejected; caused drift risk between Creator catalog/workflow contracts on each side.
- Split shared types into a published npm package: rejected for now; adds registry/versioning overhead with only two consumers in the same repo.
- Move `agent-creator/` and `frontend/` dependencies fully into the root `package.json`: rejected; keeps app-specific tooling (Vite vs Next) isolated per ADR-0005's original reasoning, workspaces only shares what's declared.

## Consequences

- `packages/types` changes propagate to backend and frontend without manual copying.
- Single root lockfile (`package-lock.json`) now covers backend, frontend, and agent-creator; frontend dependency churn does rewrite the root lockfile (this reverses one of ADR-0005's stated consequences).
- CI and local setup must run `npm ci` at the repo root before any per-app command; running installs from within `frontend/` or `agent-creator/` will fail or produce an inconsistent state.
- Docs (`AGENTS.md`, `CONTEXT.md`) must describe the repo as workspace-based; agents should not assume separate per-app install domains.

## Revisit Conditions

- `packages/types` is removed or replaced by codegen/OpenAPI-derived types, removing the only cross-app shared dependency.
- Workspace hoisting causes a native-module or version-resolution conflict between backend and frontend dependencies that outweighs the shared-types benefit.
- The repo splits into separate deployable repos, reintroducing independent versioning needs.
