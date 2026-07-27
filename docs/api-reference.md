# API Reference

> The Runtime was removed in #584 (ADR-0008). The only API surface is the Creator.
> All Runtime routes (`/api/agent/execute`, `/api/history`, `/api/roles`, `/api/rag/*`,
> `/api/tools`, `/api/memory`, `/api/pipeline`, `/api/agents`, `/api/configs`,
> `/api/hooks/*`) return 404 and are not in the OpenAPI document.

Base URL: `/api/v1/creator`

---

## Authentication

| Scope     | Routes                                                                                          | Auth                              |
| --------- | ----------------------------------------------------------------------------------------------- | --------------------------------- |
| Public    | `GET /catalog`, `/workflow`, `/tutorial`, `/skills`, `/mcps`, `/models`, `/agent/*`, `/startup` | None                              |
| Protected | `POST /evaluate`, `/preview`, `/generate`                                                       | API key when `AUTH_REQUIRED=true` |

When auth is enabled, send the API key via `Authorization: Bearer <key>` or `X-API-Key: <key>`. See [auth docs](#authentication-1).

---

## Creator API

### `GET /catalog`

Returns the versioned technology catalog (languages, frameworks, databases, architectures, cloud, CI/CD, IaC, containers, observability, security, repositories, knowledge, agent platforms).

**Auth:** None

**Query params (optional):**

| Param         | Example      | Description           |
| ------------- | ------------ | --------------------- |
| `category`    | `cloud`      | Filter by category    |
| `environment` | `production` | Filter by environment |
| `q`           | `kubernetes` | Free-text search      |

**Response:** `200 application/json`

```json
{
  "version": "1.0.0",
  "categories": [...],
  "technologies": [...]
}
```

---

### `GET /workflow`

Returns the decision tree contract: questions, conditions, sections and branching logic. The client must not hardcode the question order.

**Auth:** None

**Response:** `200 application/json`

---

### `GET /tutorial`

Returns the fictional tutorial (rescuing an API in production) with `skippable: true`.

**Auth:** None

**Response:** `200 application/json`

---

### `GET /skills`

Returns the skill catalog available for generation.

**Auth:** None

**Response:** `200 application/json`

---

### `GET /mcps`

Returns the MCP server catalog available for generation.

**Auth:** None

**Response:** `200 application/json`

---

### `GET /models`

Returns the model catalog (for agent platform targets).

**Auth:** None

**Response:** `200 application/json`

---

### `GET /docs`

Returns a catalog of official documentation files with metadata (title, description, category, size). Allows AI agents to discover and consume the project's documentation programmatically.

**Auth:** None

**Response:** `200 application/json`

---

### `POST /evaluate`

Recalculates the decision tree from accumulated answers. Returns the next visible question, progress, recommendations, warnings and issues.

**Auth:** API key (when `AUTH_REQUIRED=true`)

**Body:**

```json
{
  "workflowVersion": "1.0.0",
  "catalogVersion": "1.0.0",
  "answers": {
    "agent_name": "Platform Reviewer",
    "purpose": "pr-review",
    "objective": "Revisar cambios y explicar riesgos sin hacer merge.",
    "success_criteria": "Cada PR recibe hallazgos priorizados con evidencia."
  }
}
```

**Response:** `200 application/json`

```json
{
  "workflowVersion": "1.0.0",
  "nextQuestion": { "id": "project_stage", "section": "Proyecto", "prompt": "..." },
  "progress": { "answered": 4, "total": 19, "percent": 21, "complete": false },
  "recommendations": [],
  "warnings": [],
  "issues": []
}
```

The `total` changes because it only counts visible questions for the current branch.

---

### `POST /preview`

Requires a complete tree and returns the full bundle: blueprint, artifacts, manifest, install guide and warnings.

**Auth:** API key (when `AUTH_REQUIRED=true`)

**Body:** Same as `/evaluate` with all required answers.

**Response:** `200 application/json` — the complete `GeneratedAgentBundle`.

**Errors:**

| Status | Cause                                                              |
| ------ | ------------------------------------------------------------------ |
| `422`  | Tree incomplete, invalid answers, literal secret, or unsafe bundle |
| `409`  | Workflow/catalog version mismatch                                  |
| `400`  | Structurally invalid body                                          |

---

### `POST /generate`

Semantic alias of `/preview`. Generates the bundle in memory; does not write files or execute the agent.

**Auth:** API key (when `AUTH_REQUIRED=true`)

---

## Endpoints for AI Agents

These public endpoints are designed for AI agents (Claude, GPT, Copilot, Devin, etc.) to consume the Creator without authentication. All return JSON except `GET /startup`, which returns Markdown by default or JSON if `Accept: application/json` is sent.

### `GET /agent`

Returns the complete onboarding protocol.

**Auth:** None

---

### `GET /agent/start`

Returns the first question + a summarized catalog.

**Auth:** None

---

### `POST /agent/answer`

Sends accumulated answers, receives the next question.

**Auth:** None

**Body:**

```json
{
  "answers": { "agent_name": "...", "purpose": "..." }
}
```

---

### `POST /agent/generate`

Generates the bundle with application instructions.

**Auth:** None

**Body:** Same as `/preview`.

---

### `GET /startup`

Returns a self-contained Markdown onboarding document (or JSON with `Accept: application/json`).

**Auth:** None

---

## Health Checks

| Route                   | Description                                                | Status codes                            |
| ----------------------- | ---------------------------------------------------------- | --------------------------------------- |
| `GET /api/health`       | Deep health check (memory, disk, uptime)                   | `200` healthy/degraded, `503` unhealthy |
| `GET /api/health/live`  | Liveness probe — always `200` if process is running        | `200`                                   |
| `GET /api/health/ready` | Readiness probe — `200` only if Creator can serve requests | `200` ready, `503` not ready            |

Used by Docker `HEALTHCHECK` and container orchestrators. No database probe (the Creator is stateless).

---

## Metrics

### `GET /api/metrics`

Returns HTTP metrics (request count, latency histogram, status distribution).

**Auth:** `METRICS_SECRET` token via `Authorization: Bearer <token>`.

---

## OpenAPI

### `GET /api/openapi.json`

Returns the OpenAPI 3.1 document for all active routes.

**Auth:** None

---

## Authentication

When `AUTH_REQUIRED=true` (recommended for production), protected routes require an API key:

| Variable            | Required                      | Description                                                   |
| ------------------- | ----------------------------- | ------------------------------------------------------------- |
| `AUTH_REQUIRED`     | No (default `false`)          | When `true`, protected routes fail closed without a valid key |
| `ARTEMISA_API_KEYS` | Yes (if `AUTH_REQUIRED=true`) | Comma-separated valid API keys                                |
| `BYPASS_SECRET`     | No                            | Emergency override (auto-redacted from logs)                  |

Send the key via:

```
Authorization: Bearer <key>
X-API-Key: <key>
```

Auth validation is constant-time (HMAC-based) to prevent timing oracles. See [docs/deployment.md](deployment.md) for configuration details.

---

## Error Format

Creator errors use `application/problem+json` (RFC 9457) with `issues[]` containing field paths:

```json
{
  "type": "https://artemisa.dev/problems/validation",
  "title": "Validation Error",
  "status": 422,
  "detail": "Tree incomplete",
  "issues": [{ "field": "answers.cloud_provider", "message": "Required question not answered" }]
}
```

| Status | Cause                                                              |
| ------ | ------------------------------------------------------------------ |
| `400`  | Structurally invalid body or disallowed properties                 |
| `401`  | Auth required but no key provided                                  |
| `403`  | Auth key invalid                                                   |
| `409`  | Workflow/catalog version mismatch                                  |
| `422`  | Tree incomplete, invalid answers, literal secret, or unsafe bundle |
| `429`  | Rate limit exceeded                                                |
| `500`  | Internal error                                                     |

---

## Rate Limits

| Variable             | Default   | Scope                             |
| -------------------- | --------- | --------------------------------- |
| `RATE_LIMIT_GLOBAL`  | `100` rpm | All routes, per IP                |
| `RATE_LIMIT_CREATOR` | `120` rpm | `/api/v1/creator/*`, per IP       |
| `RATE_LIMIT_AGENT`   | `30` rpm  | `/api/v1/creator/agent/*`, per IP |

A full Auto-largo run costs ~35 requests (one `/evaluate` per step).
