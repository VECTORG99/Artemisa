# ADR-0008: Remove the runtime; Artemisa only generates configuration files

## Status

Accepted

## Context

- The product scope settled on one job: turn a decision tree into a reproducible bundle of configuration files (Markdown + JSON) with a manifest, hashes and an explanation of why it was built that way.
- The runtime (`src/engine/*`, `/api/agent/execute`, `/api/agents`, `/api/history`, `/api/roles`, `/api/rag/*`, `/api/tools`, `/api/memory`, `/api/pipeline`, `/api/configs`, `/api/hooks/commit-approval/*`, `/api/mcp/status`) executed tasks with a ReAct loop, LLM providers, MCP connections, RAG indexing and SQLite persistence.
- Executing agents safely requires per-agent sandboxing, workload identity, tool allowlists, quotas, auditing and authorization — none of which were implemented, and all of which are out of scope for a generator.
- The runtime carried the entire operational surface of the project: a native SQLite dependency, LLM/MCP SDKs, API keys, migrations, a persistent disk on Render, and roughly half of the test suite.
- The Creator was already stateless and never depended on `Store`, the engine, or any network call.

## Decision

- Delete the runtime from the backend: engine, execution routes, persistence (SQLite + migrations), webhooks, execution telemetry, in-flight tracking, commit approvals and the eval harness.
- Keep only what the Creator needs: `src/creator/*`, `src/routes/{health,metrics,openapi,debug}.ts`, `src/middleware/*`, `src/errors.ts`, `src/logger.ts`, a server-only `src/config.ts`, and `src/kiro/schemas/*.json` for artifact validation.
- Remove `better-sqlite3`, `ai`, `@ai-sdk/*` and `@modelcontextprotocol/sdk` from backend dependencies.
- Preserve the valuable runtime artifacts as documented reference material under `docs/reference/` (steering roles, security policy example, hook implementation, MCP/RAG examples, prompt partials) instead of keeping dead code.
- Keep `requireAuth` on `/api/v1/creator/evaluate|preview|generate`; health and metrics stay public (metrics still gated by `METRICS_SECRET`).

## Alternatives Considered

- Keep the runtime behind a feature flag: rejected; unexecuted code with credentials, native modules and a database still has to be maintained, audited and deployed.
- Extract the runtime into a separate package/repo: rejected for now; nothing consumes it, and the git history already preserves it. A future execution product can start from that history with a proper security design.
- Keep SQLite only for Creator drafts: rejected; drafts live in `sessionStorage` and the stateless contract is what makes generation reproducible and horizontally scalable.

## Consequences

- Deployment needs no API keys, no persistent disk and no native build step; the Docker image and `render.yaml` shrink accordingly.
- Runtime routes now return 404 and are absent from `/api/openapi.json`.
- Ephemeral agent registration disappears from the Creator UI (`/api/agents` no longer exists), so the bundle download is the only output.
- ADR-0001 through ADR-0006 were superseded by this decision and have been deleted; their rationale is preserved in git history if someone builds an execution layer elsewhere.
- Anyone applying a generated bundle needs documentation instead of a running engine, which is what `docs/reference/` now provides.

## Revisit Conditions

- A separate, security-reviewed execution service is scoped as a product (sandboxing, authorization, quotas, audit).
- The Creator needs durable server-side state (accounts, saved blueprints, revision history), which would reintroduce a database — but for the Creator, not for execution.
- Applying bundles automatically (for example via reviewable PRs) becomes a requirement.
