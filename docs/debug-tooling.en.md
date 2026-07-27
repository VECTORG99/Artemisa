# Debug Tooling

Development-only tools for inspecting requests against the Creator backend.

## Request Inspector

Captures the last 50 requests with timing breakdown.

```bash
# List recent requests
curl http://localhost:3001/api/debug/requests

# Get specific request details
curl http://localhost:3001/api/debug/requests/<id>
```

## Timing Breakdown

Include `X-Debug: true` header to get timing info in responses:

```bash
curl -H "X-Debug: true" -X POST http://localhost:3001/api/v1/creator/evaluate \
  -H "Content-Type: application/json" \
  -d '{"answers": {}}'
```

There is no replay endpoint: Creator requests are pure functions of their body,
so the client can simply re-send them.

## System Stats

```bash
curl http://localhost:3001/api/debug/stats
```

## Security

All debug routes are **disabled in production** (`NODE_ENV=production`).
They return 404 when disabled.
