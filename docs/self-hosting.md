# Self-Hosting Guide

> Artemisa only generates configuration files. The backend is a stateless Express server — no database, no LLM API keys, no persistent disk, no MCP connections. This makes self-hosting significantly simpler than the previous Runtime-based deployment.

---

## Prerequisites

- **Node.js** 20.x
- A reverse proxy with TLS (Caddy, Nginx, Traefik) for public deployments
- A process manager (systemd, PM2, Docker) to keep the server running

---

## Quick Start (VPS / bare metal)

### 1. Clone and install

```bash
git clone https://github.com/VECTORG99/Artemisa
cd Artemisa
npm ci          # from the root only (npm workspaces)
cp .env.example .env
```

### 2. Configure environment

Edit `.env` with production values:

```bash
# Required for production
AUTH_REQUIRED=true
ARTEMISA_API_KEYS=generate-a-long-random-key-here
BYPASS_SECRET=another-long-random-string
METRICS_SECRET=yet-another-long-random-string

# CORS — list your frontend origins
CORS_ALLOWED_ORIGINS=https://your-domain.com

# Optional
PORT=3001
HOST=127.0.0.1    # bind to localhost; reverse proxy handles public traffic
LOG_LEVEL=info
```

Generate secure keys:

```bash
openssl rand -hex 32    # use for ARTEMISA_API_KEYS, BYPASS_SECRET, METRICS_SECRET
```

### 3. Build and start

```bash
npm run build
npm run start
```

Verify:

```bash
curl http://localhost:3001/api/health
# → {"status":"healthy",...}
```

---

## systemd service

Create `/etc/systemd/system/artemisa.service`:

```ini
[Unit]
Description=Artemisa Backend (Creator)
After=network.target

[Service]
Type=simple
User=artemisa
WorkingDirectory=/opt/artemisa
EnvironmentFile=/opt/artemisa/.env
ExecStart=/usr/bin/node --import tsx/esm src/server.ts
Restart=always
RestartSec=5

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/opt/artemisa

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable artemisa
sudo systemctl start artemisa
sudo systemctl status artemisa
```

---

## Reverse Proxy with TLS

### Caddy (recommended — auto-HTTPS)

```bash
# /etc/caddy/Caddyfile
your-domain.com {
    reverse_proxy localhost:3001
}
```

```bash
sudo systemctl restart caddy
```

Caddy automatically provisions and renews Let's Encrypt certificates.

### Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Frontend deployment

The frontend is a Next.js app that can be deployed separately (Vercel, Netlify, or self-hosted):

```bash
cd frontend
NEXT_PUBLIC_API_URL=https://your-backend-domain.com npm run build
npm run start
```

> `NEXT_PUBLIC_API_URL` is baked into the JS bundle at build time. Changing it requires a rebuild.

---

## Docker (self-hosted)

```bash
docker build -f Dockerfile.backend -t artemisa-backend .
docker run -d \
  --name artemisa \
  -p 127.0.0.1:3001:3001 \
  --env-file .env \
  --restart unless-stopped \
  artemisa-backend
```

No volume mounts needed — the Creator is stateless.

---

## Health monitoring

```bash
# Deep health
curl http://localhost:3001/api/health

# Liveness (always 200 if process is up)
curl http://localhost:3001/api/health/live

# Readiness (200 only if ready to serve)
curl http://localhost:3001/api/health/ready
```

For systemd, add a health check:

```ini
# In [Service] section
ExecStartPost=/bin/sleep 2
ExecStartPost=/usr/bin/curl -sf http://localhost:3001/api/health/live
RestartSec=10
```

---

## Security checklist

- [ ] `AUTH_REQUIRED=true` with a strong `ARTEMISA_API_KEYS`
- [ ] `BYPASS_SECRET` set (emergency override, auto-redacted from logs)
- [ ] `METRICS_SECRET` set (protects `/api/metrics`)
- [ ] `CORS_ALLOWED_ORIGINS` lists only your frontend origins
- [ ] TLS terminated at the reverse proxy
- [ ] Backend binds to `127.0.0.1` (not `0.0.0.0`) when behind a proxy
- [ ] `LOG_LEVEL=info` or higher in production (not `debug`)
- [ ] Firewall allows only ports 80/443 at the reverse proxy

---

## What you do NOT need

Because the Runtime was removed (#584, ADR-0008):

- ❌ No `OPENAI_API_KEY` or any LLM credentials
- ❌ No SQLite database or persistent disk
- ❌ No MCP server connections
- ❌ No RAG vector index
- ❌ No `ARTEMISA_DB_PATH`
- ❌ No database migrations or init scripts
- ❌ No backup strategy for runtime state

The entire deployment is a single stateless Node.js process behind a reverse proxy.
