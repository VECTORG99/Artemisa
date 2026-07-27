# Deployment Guide

> The Runtime was removed in #584 (ADR-0008). The backend only generates configuration files: there is no database, LLM provider, MCP pool, RAG index or persistent disk. This guide reflects the simplified deployment.

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

| Variable            | Required                            | Default | Description                                                                           |
| ------------------- | ----------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| `AUTH_REQUIRED`     | No                                  | `false` | When `true`, protected routes require an API key. Fails closed if keys are missing.   |
| `ARTEMISA_API_KEYS` | **Yes** (when `AUTH_REQUIRED=true`) | —       | Comma-separated valid API keys. Sent via `Authorization: Bearer` or `X-API-Key`.      |
| `BYPASS_SECRET`     | No                                  | —       | Emergency override of auth checks (auto-redacted from logs, auto-generated on Render) |

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

- **Docker Compose**: `http://backend:3001` (set in `docker-compose.yml` build args)
- **Local dev**: `http://localhost:3001`
- **Render / production**: your backend deployment URL

> `NEXT_PUBLIC_API_URL` is consumed at **build time** by Next.js and baked into the JS bundle. Changing it requires a rebuild.

### Agent Creator (Vite)

| Variable             | Required | Default                 | Description                           |
| -------------------- | -------- | ----------------------- | ------------------------------------- |
| `VITE_API_URL`       | No       | `http://localhost:3001` | Backend API URL for the Vite dev tool |
> The `agent-creator/` Vite app is legacy (superseded by `frontend/agents/new`, issue #390). It remains in the workspace but is not the active Creator UI.

---

## 4. Service Ports

| Service                  | Container Port | Host Port | Notes                             |
| ------------------------ | -------------- | --------- | --------------------------------- |
| **Backend** (Express)    | `3001`         | `3001`    | JSON API                          |
| **Frontend** (Next.js)   | `3000`         | `3000`    | Dashboard UI                      |
| **Agent Creator** (Vite) | `5173`         | `5173`    | Dev tool (optional in production) |

All services share the `artemisa-network` bridge network.

---

## 5. Building Individual Services

```bash
# Backend
docker build -f Dockerfile.backend -t artemisa-backend .

# Frontend (must pass build-arg)
docker build -f Dockerfile.frontend \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:3001 \
  -t artemisa-frontend \
  ./frontend

# Agent Creator (optional)
docker build -f Dockerfile.agent-creator -t artemisa-agent-creator .
```

> The backend Docker image no longer requires `python3 make g++` or a `better-sqlite3` native rebuild: the build is a pure `npm ci` + `tsc` + `npm prune`.

---

## 6. Render.com Deployment

The `render.yaml` at the project root deploys the **backend only** as a Docker web service.

```yaml
# render.yaml — key settings
services:
  - type: web
    name: artemisa-backend
    plan: starter
    runtime: docker
    dockerfilePath: ./Dockerfile.backend
    healthCheckPath: /api/health
    envVars:
      - key: PORT
        value: 3001
      - key: NODE_ENV
        value: production
      - key: AUTH_REQUIRED
        value: 'true'
      - key: ARTEMISA_API_KEYS
        generateValue: true
      - key: CORS_ALLOWED_ORIGINS
        value: 'https://artemisa.vercel.app'
      - key: BYPASS_SECRET
        generateValue: true
      - key: METRICS_SECRET
        generateValue: true
```

### Steps

1. Connect your GitHub repo to Render.
2. Render auto-detects `render.yaml` → create a **Blueprint**.
3. `ARTEMISA_API_KEYS`, `BYPASS_SECRET` and `METRICS_SECRET` are auto-generated by Render.
4. Copy the generated `ARTEMISA_API_KEYS` value to your Vercel project as `NEXT_PUBLIC_API_KEY`. The frontend uses this key when calling protected Creator routes (`/evaluate`, `/preview`, `/generate`).
5. In Vercel, set `NEXT_PUBLIC_API_URL` to the deployed Render service URL (e.g. `https://artemisa-backend.onrender.com`).
6. Deploy. The `plan: starter` line keeps the instance always on, eliminating the cold-start delay described in #663.

> No persistent disk is required: the Creator is stateless and writes nothing to the filesystem. No `OPENAI_API_KEY` or other LLM credentials are needed.

---

## 7. Local Development

```bash
# Install all dependencies (root + frontend + agent-creator via workspaces)
make install

# Or manually from the repo root ONLY (npm workspaces hoists shared deps):
npm ci

# Start development servers (each in its own terminal):
npm run dev              # Backend (tsx watch, port 3001)
cd frontend && npm run dev  # Frontend (Next.js, port 3000)
cd agent-creator && npm run dev  # Agent Creator (Vite, port 5173)
```

> **Do not** run `npm ci` inside `frontend/` or `agent-creator/` — the repo uses npm workspaces (ADR-0007) and the authoritative lockfile lives at the root. Per-app lockfiles are not maintained.

---

## 8. Production Considerations

### Secrets Management

- **`ARTEMISA_API_KEYS`**, **`BYPASS_SECRET`** and **`METRICS_SECRET`** should never be committed. Use `.env` (gitignored) for local dev, or Render's secret env vars for production.
- The backend redacts `BYPASS_SECRET` from logs automatically.

### Health Checks

All three Docker images include `HEALTHCHECK` instructions:

- **Backend**: `GET /api/health` → expects 200
- **Frontend**: `GET /` → expects 200
- **Agent Creator**: `GET /` → expects 200

The backend health endpoint reports process-level signals only (memory, disk, uptime). There is no database probe.

### Resource Limits (Docker)

No resource constraints are set in `docker-compose.yml`. For production, consider adding:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 256M
```

> The stateless Creator uses significantly less memory than the previous runtime. 256M is a reasonable starting ceiling; tune based on observed usage.

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
