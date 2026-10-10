# Deployment Guide

> The backend only generates configuration files: there is no database, external API keys, persistent disk or vector store. This guide reflects the simplified deployment.

## 1. Prerequisites

- **Docker** + Docker Compose (v2)
- **Node.js** 20.x (for local dev)
- **make** (convenience, optional)

---

## 2. Quick Start with Docker

```bash
# 1. Create .env from template (then edit with your keys)
cp .env.example .env

# 2. Build all images
make docker-build

# 3. Start services in detached mode
make docker-up

# Check logs
make docker-logs

# Stop and clean up
make docker-down
```

Or without `make`:

```bash
docker compose build
docker compose up -d
```

This starts three services (see Service Ports below). The frontend waits for the backend health check before starting.

---

## 3. Environment Variables

All environment variables are defined in `.env.example`. Variables are grouped by category below.

### Server

| Variable             | Required | Default   | Description                             |
| -------------------- | -------- | --------- | --------------------------------------- |
| `PORT`               | No       | `3001`    | Backend HTTP listen port                |
| `HOST`               | No       | `0.0.0.0` | Backend bind address                    |
| `REQUEST_TIMEOUT_MS` | No       | `120000`  | Max time (ms) for a single HTTP request |

### Logging

| Variable    | Required | Default | Description                                           |
| ----------- | -------- | ------- | ----------------------------------------------------- |
| `LOG_LEVEL` | No       | `info`  | Log verbosity: fatal, error, warn, info, debug, trace |

### CORS

| Variable               | Required | Default                                       | Description                     |
| ---------------------- | -------- | --------------------------------------------- | ------------------------------- |
| `CORS_ALLOWED_ORIGINS` | No       | `http://localhost:3000,http://localhost:5173` | Comma-separated allowed origins |

A blocked origin gets `403 API_CORS_FORBIDDEN`.

### Public origin and proxies

| Variable          | Required                 | Default | Description                                                                                          |
| ----------------- | ------------------------ | ------- | ---------------------------------------------------------------------------------------------------- |
| `PUBLIC_BASE_URL` | **Yes** (public deploys) | —       | Origin advertised to agents in `/api/v1/creator/agent` and `/startup`; falls back to request headers |
| `TRUST_PROXY`     | No                       | —       | Trusted proxy hop count for Express (`1` behind a single proxy) so rate limits key on the client IP  |

Without `PUBLIC_BASE_URL` the advertised origin comes from `Host`/`X-Forwarded-Host`/`Origin`, which the caller controls, so a forged header can point agents at another server. Only enable `TRUST_PROXY` when a proxy really terminates the connection; otherwise clients can spoof `X-Forwarded-For`.

### Metrics

| Variable         | Required       | Default | Description                                         |
| ---------------- | -------------- | ------- | --------------------------------------------------- |
| `METRICS_SECRET` | **Yes** (prod) | —       | Token required to read `/api/metrics` in production |

### Authentication

The Creator is stateless, but `/api/v1/creator/evaluate|preview|generate` are protected when auth is enabled.

| Variable            | Required                            | Default | Description                                                                         |
| ------------------- | ----------------------------------- | ------- | ----------------------------------------------------------------------------------- |
| `AUTH_REQUIRED`     | No                                  | `false` | When `true`, protected routes require an API key. Fails closed if keys are missing. |
| `ARTEMISA_API_KEYS` | **Yes** (when `AUTH_REQUIRED=true`) | —       | Comma-separated valid API keys. Sent via `Authorization: Bearer` or `X-API-Key`.    |
| `BYPASS_SECRET`     | No                                  | —       | Emergency override of auth checks (auto-redacted from logs)                         |

### Rate Limiting (requests per minute)

| Variable             | Required | Default | Description                                                                       |
| -------------------- | -------- | ------- | --------------------------------------------------------------------------------- |
| `RATE_LIMIT_GLOBAL`  | No       | `100`   | Global per-IP request limit                                                       |
| `RATE_LIMIT_CREATOR` | No       | `120`   | Creator re-evaluates the tree per step; a full Auto-largo run costs ~35 requests. |
| `RATE_LIMIT_AGENT`   | No       | `30`    | Public `/api/v1/creator/agent/*` onboarding flow limit                            |

### Frontend (Next.js)

| Variable              | Required | Default     | Description                      |
| --------------------- | -------- | ----------- | -------------------------------- |
| `NEXT_PUBLIC_API_URL` | **Yes**  | _see below_ | Backend API URL (build-time arg) |

Defaults per environment:

- **Docker Compose**: `http://backend:3001` (set in `docker/docker-compose.yml` build args)
- **Local dev**: `http://localhost:3001`
- **Production**: your backend deployment URL

> `NEXT_PUBLIC_API_URL` is consumed at **build time** by Next.js and baked into the JS bundle. Changing it requires a rebuild.

---

## 4. Service Ports

| Service                | Container Port | Host Port | Notes                |
| ---------------------- | -------------- | --------- | -------------------- |
| **Backend** (Express)  | `3001`         | `3001`    | JSON API             |
| **Frontend** (Next.js) | `3000`         | `3000`    | Landing + Creator UI |

All services share the `artemisa-network` bridge network.

---

## 5. Building Individual Services

```bash
# Backend
docker build -f docker/Dockerfile.backend -t artemisa-backend .

# Frontend (must pass build-arg)
docker build -f docker/Dockerfile.frontend \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:3001 \
  -t artemisa-frontend .

```

> The backend Docker image requires only `npm ci` + `tsc` + `npm prune`.

---

## 6. Azure Container Apps (backend only, ~USD 10/month)

`infra/main.bicep` deploys **only the backend** to Azure Container Apps on the
Consumption plan. The frontend stays on Netlify. Full walkthrough, including
the one-time Azure and GitHub setup, is in `infra/README.md`.

Deploy runs from `.github/workflows/deploy-azure.yml`:

- `push` to `master` touching the backend (release), or manual dispatch.
- Builds `docker/Dockerfile.backend`, pushes to Azure Container Registry, deploys
  the Bicep, then gates on `https://<fqdn>/api/health` returning 200.
- A failing health gate reverts the container to the previous image, so a
  broken release cannot stay live and be reported as successful.
- The image is pulled with the ACR admin credential, which the workflow reads at
  deploy time (`az acr credential show`) and passes to the Bicep as a `@secure`
  parameter, so it never enters GitHub. A managed identity would be cleaner, but
  the Consumption-only environment provisions an _express_ environment and
  express environments reject `registries[].identity` — see ADR-0009.

Measured against the Azure Retail Prices API, the running cost is about
**USD 9.29/month**: ACR Basic is USD 0.1666/day (USD 5.00/month) plus
USD 0.10/GB stored, and Container Apps with `minReplicas: 1` at 0.25 vCPU /
0.5 GiB comes to about USD 4.29/month after the free grant. Raising to
`minReplicas: 2` adds availability-zone spread for roughly USD 5.92 more,
which would exceed a USD 10/month budget on its own.

Three settings hold that number, and none should be "fixed" without reading
`infra/README.md` first:

- `workloadProfiles` is **omitted** from the environment (not `[]`). Omitting
  it yields a Consumption-only environment; an empty array creates a workload
  profiles environment that bills a USD 0.10/h management fee (~USD 73/month)
  before a single container runs.
- No `logAnalyticsConfiguration` is attached, so console logs are not billed
  per GB. Note that the `az` CLI creates a Log Analytics workspace by default
  unless `--logs-destination none` is passed; the Bicep omits the property, so
  it never triggers that.
- `minReplicas` defaults to 1, which keeps the container warm without a cold
  start while staying inside the budget.

`TRUST_PROXY=1` and `PUBLIC_BASE_URL` are set in the Bicep, not left to
defaults. Without `TRUST_PROXY`, Container Apps terminates TLS and Express sees
the proxy IP as the client IP; the per-IP rate limiter then treats every user
as one source and blocks them all after `RATE_LIMIT_GLOBAL` requests per
minute.

To point the Netlify frontend at it, set `NEXT_PUBLIC_API_URL` to the Container
App URL and trigger a **rebuild** — `NEXT_PUBLIC_*` values are baked into the
bundle at build time. The same value goes to `ARTEMISA_API_KEYS` in Netlify as
`NEXT_PUBLIC_API_KEY` when auth is enabled.

`agent-creator/` is not deployed; the active Creator is `frontend/agents/new`.

---

## 7. Frontend Deploy (Netlify) — Verifying Production Matches `master`

The production landing lives on Netlify (`https://artemisa-ai.netlify.app`). Netlify is configured from its dashboard (there is no `netlify.toml`), so a stale or unconnected branch is invisible from the repo. Issue #710 was exactly that: `v1.5.0` was released and production kept serving a pre-#705 bundle.

### The build marker

`frontend/scripts/write-sw-version.mjs` runs on `prebuild` and writes `public/sw-version.js` with the deployed commit, taken from the first available host variable:

`COMMIT_REF` (Netlify) → `VERCEL_GIT_COMMIT_SHA` → `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA` → `GITHUB_SHA` → `COMMIT_SHA` → `<pkgVersion>-<timestamp>` (local fallback).

So the live commit is one request away:

```bash
curl -s "https://artemisa-ai.netlify.app/sw-version.js?cachebust=$RANDOM"
# self.ARTEMISA_SW_VERSION = "3ac4ab4...";
```

A marker like `0.1.0-1785202857704` (version + timestamp) means the build ran **without** a commit variable — the deploy cannot be verified and the host settings need fixing.

### Automated check

```bash
git fetch origin
node scripts/verify-prod-deploy.mjs                        # vs origin/master
node scripts/verify-prod-deploy.mjs --ref origin/development
node scripts/verify-prod-deploy.mjs --url https://staging.example.com
```

Exit code `0` means production matches the ref; `1` means mismatch, unreachable, or a non-commit marker.

### Content spot-check

The marker proves which commit is live; it is the authoritative check. A content check is complementary and only proves that a specific string reached the served HTML.

Pick a string that is in the **server-rendered** output. The landing's content sections are client components, so their `data-testid` attributes (`value-prop-card`, `tech-chip`, …) never appear in the initial HTML — grepping them returns `0` even on a correct deployment. Inline styles hoisted into the document do appear:

```bash
HTML=$(curl -s "https://artemisa-ai.netlify.app/?cachebust=$RANDOM")
echo "$HTML" | grep -o 'blur(9px)' | wc -l   # 2 — the single glass layer of the nav and footer
echo "$HTML" | grep -c 'artemisa'            # > 0 — sanity check that the page rendered
```

To compare against what the current tree produces, build and serve it locally and diff the same greps:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001 npm --prefix frontend run build
npm --prefix frontend run start -- --port 3000
curl -s http://localhost:3000/ | grep -o 'blur(9px)' | wc -l
```

Always pass a cache-buster against production: Netlify's CDN and the service worker both cache the HTML.

### When production is behind

1. Check the deploy list in Netlify (Site → Deploys): a build can be queued, failed, or locked to a published deploy.
2. Confirm the site's production branch is `master` (Site configuration → Build & deploy → Branches).
3. Confirm `NEXT_PUBLIC_API_URL` (and `NEXT_PUBLIC_API_KEY` if auth is on) are set in Netlify; `NEXT_PUBLIC_*` values are baked at build time, so changing them requires a **rebuild**, not a redeploy of the cached build.
4. Trigger a rebuild without cache: Deploys → Trigger deploy → _Clear cache and deploy site_, or with the CLI:

```bash
npx netlify-cli deploy --build --prod --dir frontend/.next
```

5. Re-run `node scripts/verify-prod-deploy.mjs` and the content spot-check.

### Preview providers

A Vercel project was still connected to the repository while production lives on Netlify. Its build rate limit reported `Deployment rate limited — retry in 24 hours` as a failed **deployment check** on PRs (for example #705), which is noise unrelated to the code.

Vercel's Git deployments are therefore disabled from the repository itself:

```json
// vercel.json (also frontend/vercel.json and agent-creator/vercel.json)
{
  "git": { "deploymentEnabled": false }
}
```

`git.deploymentEnabled: false` turns off automatic deployments for every branch, so no Vercel check is posted on pull requests. The flag lives in all three `vercel.json` of the repo (root, `frontend/` and `agent-creator/`) because Vercel reads it from the project's **Root Directory**, which may be any of them depending on how the project was created. Existing deployments are untouched and re-enabling is a one-line change.

To remove the integration entirely instead, disconnect it in the Vercel project (Project → Settings → Git → Disconnect). Only checks produced by `.github/workflows/*` gate merges.

---

## 8. Local Development

```bash
# Install all dependencies (root + frontend via workspaces)
make install

# Or manually from the repo root ONLY (npm workspaces hoists shared deps):
npm ci

# Start development servers (each in its own terminal):
npm run dev              # Backend (tsx watch, port 3001)
cd frontend && npm run dev  # Frontend (Next.js, port 3000)
```

> **Do not** run `npm ci` inside `frontend/` or any other workspace subdirectory — the repo uses npm workspaces (ADR-0007) and the authoritative lockfile lives at the root. Per-app lockfiles are not maintained.

---

## 9. Production Considerations

### Secrets Management

- **`ARTEMISA_API_KEYS`**, **`BYPASS_SECRET`** and **`METRICS_SECRET`** should never be committed. Use `.env` (gitignored) for local dev, or the Container App's own secret store in production — the Bicep takes them as `@secure` parameters, so they never enter the repository.
- The backend redacts `BYPASS_SECRET` from logs automatically.

### Health Checks

All three Docker images include `HEALTHCHECK` instructions:

- **Backend**: `GET /api/health` → expects 200
- **Frontend**: `GET /` → expects 200
- **Agent Creator**: `GET /` → expects 200

The backend health endpoint reports process-level signals only (memory, disk, uptime). There is no database probe.

### Resource Limits (Docker)

No resource constraints are set in `docker/docker-compose.yml`. For production, consider adding:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 256M
```

> The stateless Creator uses little memory. 256M is a reasonable starting ceiling; tune based on observed usage.

### Post-Deploy Verification

After `make docker-up`, verify all services are running:

```bash
curl -s http://localhost:3001/api/health   # Backend → {"status":"healthy",...}
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000  # Frontend → 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173  # Agent Creator → 200
```

### TLS / Reverse Proxy

For public deployments, services expose raw HTTP. Add a reverse proxy (Caddy, Nginx, Traefik) in front for TLS termination. Caddy is the simplest — single binary, auto-HTTPS via Let's Encrypt:

```bash
# Example: Caddy reverse-proxy in front of the frontend service
caddy reverse-proxy --from your-domain.com --to localhost:3000
```

### Horizontal Scaling

The Creator is stateless and deterministic: every request is a pure function of its body. You can run multiple replicas behind a load balancer without session affinity, shared storage, or sticky routing. The only per-instance state is the in-process metrics and debug buffers, which are not shared.
