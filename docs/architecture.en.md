<a id="arquitectura-de-artemisa"></a>

# Artemisa Architecture

Artemisa converts a decision tree into a reproducible configuration bundle (Markdown + JSON) and explains why it was built that way. **It does not run agents**: the Runtime (ReAct engine, LLM, RAG, MCP, SQLite) was removed in issue #584 — see [ADR-0008](adr/0008-remove-runtime-generator-only.md).

---

<a id="tabla-de-contenido"></a>

## Table of Contents

1. [Overview](#vision-general)
2. [System Modules](#modulos-del-sistema)
3. [Configuration System](#sistema-de-configuracion)
4. [Security Model](#modelo-de-seguridad)
5. [Creator Pipeline](#pipeline-del-creator)
6. [Generated Artifacts](#artefactos-generados)
7. [Reference Artifacts](#artefactos-de-referencia)
8. [Environment Variable Reference](#referencia-de-variables-de-entorno)
9. [Error Patterns](#patrones-de-error)
10. [Project Structure](#estructura-del-proyecto)
11. [Architectural Principles](#principios-arquitectonicos)

---

<a id="vision-general"></a>

## General Vision

```text
┌──────────────────────────────────────────────────────────────┐
│                        server.ts                              │
│  Express + middleware + shutdown (sin store, sin MCP pool)    │
└───────────┬───────────────────────────────────┬──────────────┘
            │ público                            │ protegido (API key)
┌───────────▼───────────────┐        ┌──────────▼───────────────┐
│ /api/health               │        │ /api/v1/creator/evaluate │
│ /api/metrics              │        │ /api/v1/creator/preview  │
│ /api/openapi.json         │        │ /api/v1/creator/generate │
│ /api/v1/creator/catalog   │        └──────────┬───────────────┘
│ /api/v1/creator/workflow  │                   │
│ /api/v1/creator/tutorial  │                   │
│ /api/v1/creator/agent/*   │                   │
└───────────┬───────────────┘                   │
            └───────────────┬───────────────────┘
                            │
              ┌─────────────▼──────────────┐
              │        src/creator/         │
              │  catalog → decisionTree →   │
              │  recomendaciones →          │
              │  generator (puro)           │
              └─────────────┬──────────────┘
                            │
              bundle JSON + manifest + SHA-256
```

The entire generation is a pure function of the body: no filesystem, network, database, LLM, MCP, or shell.

---

<a id="modulos-del-sistema"></a>

## System Modules

<a id="serverts"></a>

### `server.ts`

Entry point. Starts Express, warns if security configuration is missing in production, and handles `SIGTERM`/`SIGINT` by closing the server and draining open requests. There are no in-flight executions, MCP pool, or database to close.

<a id="appts"></a>

### `app.ts`

HTTP wiring: helmet, strict content-type, compression, CORS, 128 KB limit, body sanitization, path param validation, rate limiting (global and for the Creator), global timeout, public routes, auth boundary, and protected routes.

<a id="configts"></a>

### `config.ts`

Server configuration only: `port`, `host`, `requestTimeoutMs`. The rest of the variables are read where they are used: auth in `src/middleware/auth.ts`, rate limits in `src/app.ts`, metrics in `src/routes/metrics.ts`.

<a id="srccreator"></a>

### `src/creator/*`

| Module             | Responsibility                                                              |
| ------------------ | --------------------------------------------------------------------------- |
| `domain.ts`        | Catalog contracts, questions, assessment, blueprint, artifacts, and errors. |
| `catalog.ts`       | Versioned taxonomy and technology catalog, category search and validation.  |
| `decisionTree.ts`  | Conditions, visible questions, progress, validation, and recommendations.   |
| `generator.ts`     | Blueprint, documentation, Artemisa/Kiro/portable adapters and manifest.     |
| `skillsCatalog.ts` | Skills catalog that feeds the category `skill`.                             |
| `mcpCatalog.ts`    | Catalog of suggested MCP servers that feeds the category `mcp`.             |
| `modelsCatalog.ts` | Catalog of available models as bundle data.                                 |
| `agentProtocol.ts` | Onboarding protocol for AI agents (`/agent`, `/agent/start`, `/startup`).   |
| `etag.ts`          | ETag/304 for catalog and workflow responses.                                |
| `router.ts`        | Versioned REST API and Problem Details (`application/problem+json`).        |

<a id="srcroutes"></a>

### `src/routes/*`

- `health.ts`: `/api/health`, `/health/live`, `/health/ready`. Reports uptime, memory, and disk; there are no external dependencies to probe.
- `metrics.ts`: request/error counter per path, protected by `METRICS_SECRET`.
- `openapi.ts`: OpenAPI 3.1 document with the current routes.
- `debug.ts`: request inspector, disabled in production.

---

<a id="sistema-de-configuracion"></a>

## Configuration System

<a id="diseno"></a>

### Design

`src/config.ts` exposes only what the HTTP server needs:

1. Reads from `process.env` at the time of import.
2. Provides safe defaults.
3. Includes `import 'dotenv/config'` (self-contained, portable across entry points).
4. Uses the helper `envInt()` with clamping `>= 0`.

```ts
import { config } from './config.js';

config.server.port; // → 3001
config.server.host; // → '0.0.0.0'
config.server.requestTimeoutMs; // → 120000
```

<a id="como-agregar-una-nueva-variable"></a>

### How to add a new variable

1. If it is from the server, add the default in `src/config.ts`; if it belongs to a middleware or route, read it there.
2. Document it in `.env.example`.
3. Update `CONTEXT.md`/`docs/deployment.md` if the deployment changes.

---

<a id="modelo-de-seguridad"></a>

## Security Model

The backend does not execute commands or tools, so the security surface is that of a pure API:

- **Auth**: `src/middleware/auth.ts`. `AUTH_REQUIRED=true` requires `ARTEMISA_API_KEYS` (`Authorization: Bearer` or `X-API-Key`), compares with fixed-length HMAC, and fails closed if there are no keys (500, and in production the process doesn't start).
- **Route boundary**: catalog, workflow, tutorial, and agent protocol are public; `evaluate`, `preview`, and `generate` are behind auth.
- **Input limits**: 128 KB per body, global timeout (`REQUEST_TIMEOUT_MS`), global and Creator-specific rate limiting, `enforceJsonContentType`, `sanitizeRequestBody` (removes `__proto__`, `constructor`, `prototype`) and `validatePathParams`.
- **Generated bundle security**: relative paths without `..`, no backslashes or duplicates; maximum 40 files and 256 KB; rejection of literal secrets with known patterns; `${GITHUB_TOKEN}` references instead of values.
- **Headers**: helmet, CORS with explicit allowlist (`CORS_ALLOWED_ORIGINS`) and origin blocking `null`.

The security policy that Artemisa **generates** (`artemisa/security-policy.json`) is applied by whoever runs the agent. How to do it is documented in [`reference/security-policy-guide.md`](reference/security-policy-guide.md), with the reference implementation in [`reference/hooks-implementation.ts`](reference/hooks-implementation.ts).

---

<a id="pipeline-del-creator"></a>

## Creator Pipeline

````text
HTTP answers
  → parseCreatorAnswers
  → evaluateDecisionTree
  → recomendaciones deterministas
  → buildBlueprint
  → generadores de artefactos
  → validación de rutas/secretos/tamaño
  → contenido canónico + SHA-256
  → bundle JSON
```### State and Versions

The backend does not create sessions. Each call to `evaluate`, `preview`, or `generate` receives all accumulated responses. The client can set `workflowVersion` and `catalogVersion`; a mismatch responds `409` to avoid generating with rules different from those the user saw.

This allows going back, recalculating branches, and scaling horizontally without coordinating state. Persistence will be added along with login, ownership, and authorization.

<a id="estado-y-versiones"></a>
### Generator Invariants

1. Same input and same versions produce exactly the same content and hashes.
2. Generation does not use network, filesystem, LLM, MCP, database, or shell.
3. Absolute paths, traversal, backslashes, or duplicates are not accepted.
4. Literal secrets with known patterns are not allowed.5. The manifest lists all the artifacts and their SHA-256.
6. Kiro is only generated if `agent_targets` includes `kiro`.
7. RAG and PR review are only generated when their branches were enabled.
8. Production adds approval, operational checklist, and warnings even if the user does not select them explicitly.

<a id="invariantes-del-generador"></a>
### HTTP Contract

```text
GET  /api/v1/creator/catalog
GET  /api/v1/creator/workflow
GET  /api/v1/creator/tutorial
GET  /api/v1/creator/skills
GET  /api/v1/creator/mcps
GET  /api/v1/creator/models
POST /api/v1/creator/evaluate
POST /api/v1/creator/preview
POST /api/v1/creator/generate
GET  /api/v1/creator/agent
GET  /api/v1/creator/agent/start
POST /api/v1/creator/agent/answer
POST /api/v1/creator/agent/generate
GET  /api/v1/creator/startup
````

The Runtime routes (`/api/agent/execute`, `/api/agents`, `/api/history`, `/api/roles`, `/api/rag/*`, `/api/tools`, `/api/memory`, `/api/pipeline`, `/api/configs`, `/api/hooks/commit-approval/*`, `/api/mcp/status`) return 404 and are not in the OpenAPI document.

---

<a id="contrato-http"></a>

## Generated Artifacts

Always: `artemisa.blueprint.json`, `manifest.json`, `docs/INSTALL.md`, `docs/WHY.md`.

Conditionals according to responses: `AGENTS.md`, `skills/<agente>/SKILL.md`, `artemisa/steering.json`, `artemisa/security-policy.json`, `artemisa/governance.json`, `artemisa/mcps.json`, `artemisa/rag.json`, `artemisa/pr-review.json`, `.kiro/steering/<agente>.md`, `.kiro/hooks/<agente>-quality.json`, `.kiro/skills/<agente>/SKILL.md`, and the variants for Cursor, Devin, CodeRabbit, and Kilo Code.

The schemas of the JSON artifacts live in `src/kiro/schemas/*.json` and are validated in `test/kiro-schema.test.mjs` and `test/generated-artifacts-schema.test.mjs`.

`artemisa/governance.json` is a declarative contract of capabilities, autonomy, and approval: it describes what the target platform must enforce, not something that Artemisa activates.

---

<a id="artefactos-generados"></a>

## Reference Artifacts

`docs/reference/` preserves material from the removed Runtime as documentation (never uploaded to the server):

| File | Use || ------------------------------------------------------------------------ | -------------------------------------------------------- |
| [`steering-roles.json`](reference/steering-roles.json) | Seven roles curated with system prompt and temperature. |
| [`steering-roles-guide.md`](reference/steering-roles-guide.md) | How to read and adapt those roles. |
| [`security-policy.example.json`](reference/security-policy.example.json) | Real allowlist policy. |
| [`security-policy-guide.md`](reference/security-policy-guide.md) | How to apply the policy with command validation. |
| [`hooks-implementation.ts`](reference/hooks-implementation.ts) | Reference implementation of `before_action`. |
| [`mcps.example.json`](reference/mcps.example.json) | Declaration of MCP servers with secrets by variable. |
| [`rag.example.json`](reference/rag.example.json) | Knowledge sources for RAG. |
| [`prompts/`](reference/prompts) | Shared prompt partials. |

---

<a id="artefactos-de-referencia"></a>

## Environment Variables Reference

| Variable               | Default                                       | Description                                            |
| ---------------------- | --------------------------------------------- | ------------------------------------------------------ |
| `PORT`                 | `3001`                                        | HTTP server port                                       |
| `HOST`                 | `0.0.0.0`                                     | Network interface                                      |
| `REQUEST_TIMEOUT_MS`   | `120000`                                      | HTTP request timeout                                   |
| `LOG_LEVEL`            | `info`                                        | Pine verbosity                                         |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Allowed origins                                        |
| `AUTH_REQUIRED`        | `true`                                        | Requires API key on protected routes (`false` locally) |
| `ARTEMISA_API_KEYS`    | —                                             | Comma-separated list of API keys                       |
| `BYPASS_SECRET`        | —                                             | Emergency override; recorded in logs                   |
| `METRICS_SECRET`       | —                                             | Protects `/api/metrics` (mandatory in production)      |
| `RATE_LIMIT_GLOBAL`    | `100`                                         | Requests per minute per IP                             |
| `RATE_LIMIT_CREATOR`   | `120`                                         | Requests per minute for `/api/v1/creator`              |
| `RATE_LIMIT_AGENT`     | `30`                                          | Requests per minute for the agent protocol             |

---

<a id="referencia-de-variables-de-entorno"></a>

## Error Patterns

<a id="patrones-de-error"></a>

### Error Handling

| Scenario                                            | HTTP Response                           |
| --------------------------------------------------- | --------------------------------------- |
| Body is not an object or brings extra keys          | `400` with `issues[]`                   |
| Invalid Content-Type in mutation                    | `415`                                   |
| Responses with invalid type/option                  | `200` with `issues[]` in the evaluation |
| Obsolete workflow/catalog version                   | `409`                                   |
| Incomplete tree, literal secret, or insecure bundle | `422`                                   |
| Nonexistent path                                    | `404`                                   |
| API key is missing or invalid                       | `401` / `403`                           |
| Rate limit exceeded                                 | `429`                                   |
| Internal error                                      | `500`                                   |

Creator errors use `application/problem+json` with `issues[]` and field paths.

<a id="manejo-de-errores"></a>

### Principles

- `catch (err: unknown)` instead of `catch (err: any)`.
- `instanceof Error` to extract `.message`; `String(err)` as fallback.
- Throw subclasses of `AppError` (`src/errors.ts`) when the caller needs stable status.
- Never log secrets or API key values.

---

<a id="principios"></a>

## Project Structure

```text
artemisa/
├── src/
│   ├── app.ts                       # Cableado HTTP
│   ├── server.ts                    # Entry point + lifecycle
│   ├── config.ts                    # Config del servidor
│   ├── errors.ts                    # AppError + códigos
│   ├── health.ts                    # Deep health check (proceso)
│   ├── logger.ts                    # pino
│   ├── creator/                     # Catálogo, árbol, generador, protocolo
│   ├── middleware/                  # auth, validación, sanitize, errores
│   ├── routes/                      # health, metrics, openapi, debug
│   └── kiro/schemas/                # Esquemas de artefactos generados
├── frontend/                        # Next app: landing + Creator (/agents/new)
├── agent-creator/                   # App Vite legacy (sin desarrollo activo)
├── packages/types/                  # Tipos compartidos (@artemisa/types)
├── docs/
│   ├── architecture.md              # Este documento
│   ├── deployment.md               # Despliegue local, Docker y Render
│   ├── CONVENTIONS.md              # Convenciones de equipo
│   ├── debug-tooling.md            # Herramientas de debug (dev)
│   ├── use_cases.md                # Casos de uso
│   ├── adr/                        # Architecture Decision Records
│   └── reference/                  # Artefactos del runtime eliminado
├── test/                           # node:test (unit + contrato HTTP)
├── e2e/                            # Playwright
├── .env.example
├── docker/                        # Dockerfiles y compose files
├── scripts/                       # Scripts auxiliares
└── Makefile
```

---

<a id="estructura-del-proyecto"></a>

## Architectural Principles

1. **Generate, don't execute**: the backend produces files; applying them and running the agent is the user's responsibility.
2. **Purity**: generation does not touch network, disk, database, or processes.
3. **Determinism**: same responses and versions ⇒ same artifacts and hashes.
4. **Stateless**: there are no anonymous sessions or orphaned state before having identity.
5. **Fail-closed in auth**: without configured keys and with auth required, nothing protected is served.
6. **Explainability**: each recommendation includes reason, evidence, benefits, trade-offs, and alternatives.
7. **No circular dependencies**: modules import config, not the other way around.
