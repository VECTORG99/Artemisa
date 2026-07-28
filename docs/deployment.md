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
- **DigitalOcean / production**: your backend deployment URL

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

## 6. DigitalOcean App Platform

The `.do/app.yaml` at the project root deploys the **backend only** as a Docker web service on DigitalOcean App Platform.

### Steps

1. Connect your GitHub repo (`VECTORG99/Artemisa`) to DigitalOcean App Platform.
2. App Platform auto-detects `.do/app.yaml` and configures the service.
3. Set `ARTEMISA_API_KEYS`, `BYPASS_SECRET` and `METRICS_SECRET` manually in the DigitalOcean dashboard (App → Settings → Environment Variables).
4. Copy the `ARTEMISA_API_KEYS` value to your frontend hosting (Netlify) as `NEXT_PUBLIC_API_KEY`. The frontend uses this key when calling protected Creator routes (`/evaluate`, `/preview`, `/generate`).
5. In your frontend hosting, set `NEXT_PUBLIC_API_URL` to the deployed DigitalOcean service URL (e.g. `https://artemisa-backend-xxxxx.ondigitalocean.app`).
6. Deploy. Subsequent pushes to `master` trigger automatic deploys.

> No persistent disk is required: the Creator is stateless and writes nothing to the filesystem. No `OPENAI_API_KEY` or other LLM credentials are needed.

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

- **`ARTEMISA_API_KEYS`**, **`BYPASS_SECRET`** and **`METRICS_SECRET`** should never be committed. Use `.env` (gitignored) for local dev, or DigitalOcean's secret env vars for production.
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
