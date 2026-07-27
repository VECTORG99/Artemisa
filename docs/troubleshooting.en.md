# Troubleshooting

> Artemisa only generates configuration files. The Runtime (ReAct, LLM, RAG, MCP, SQLite) was removed in #584. Problems related to agent execution, MCP connections, RAG indexing or session expiry are **not part of the product** and are not covered here.

---

## Creator does not load catalog or workflow

**Symptom:** The page `/agents/new` shows a connection error or an empty list of questions.

**Probable cause:** `NEXT_PUBLIC_API_URL` is not configured or the backend is not running.

**Solution:**

1. Verify that the backend responds:
   ```bash
   curl http://localhost:3001/api/health
   ```
2. Check `NEXT_PUBLIC_API_URL` in the frontend:
   - **Local dev:** `http://localhost:3001`
   - **Docker Compose:** `http://backend:3001` (set in `docker/docker-compose.yml`)

- **Production:** the URL of your deployed backend

3. `NEXT_PUBLIC_API_URL` is baked into the bundle at build time. If you change it, you need a rebuild:
   ```bash
   cd frontend && npm run build
   ```

---

## 401 when doing preview or generate

**Symptom:** `POST /api/v1/creator/preview` returns 401.

**Cause:** `AUTH_REQUIRED=true` and a valid API key was not sent.

**Solution:**

1. Verify that `ARTEMISA_API_KEYS` is configured in the backend.
2. Send the key in the header:
   ```
   Authorization: Bearer <tu-key>
   ```
   or
   ```
   X-API-Key: <tu-key>
   ```
3. If you use the frontend, configure the key in the client (next feature — for now use curl or the public endpoint `/agent/generate`).

---

## 429 Rate limited mid-flow

**Symptom:** After several questions, the Creator returns 429.

**Cause:** The Creator makes ~35 requests in Auto-long (one `/evaluate` per step). The default rate limit is 120 rpm for `/api/v1/creator/*`.

**Solution:**

- Increase `RATE_LIMIT_CREATOR` if your environment allows it:
  ```bash
  RATE_LIMIT_CREATOR=200
  ```
- Auto-short mode makes only 8 requests and is less prone to this.
- The public `/agent/*` endpoints have a separate limit of 30 rpm (`RATE_LIMIT_AGENT`).

---

## 409 Obsolete workflow version

**Symptom:** `POST /evaluate` returns 409 with a version message.

**Cause:** The backend changed workflow or catalog version, and the client is sending an older version.

**Solution:**

1. Reload `GET /api/v1/creator/workflow` and `GET /api/v1/creator/catalog` to get the current versions.
2. Restart the draft on the frontend ("Restart draft" button).
3. If it persists, clear `sessionStorage` from the browser.

---

## 422 Insecure bundle or incomplete tree

**Symptom:** `POST /preview` or `/generate` returns 422.

**Possible causes:**

| Message                   | Cause                                                                            |
| ------------------------- | -------------------------------------------------------------------------------- |
| "Tree incomplete"         | Mandatory question responses are missing                                         |
| "Literal secret detected" | An answer contains a token or private key                                        |
| "Unsafe bundle"           | The generator detected a combination of responses that produces an unsafe bundle |

**Solution:**

- Complete all mandatory questions (progress must show `complete: true`).
- Never paste real secrets in the responses. Use references like `${GITHUB_TOKEN}`.
- Check the warnings (`warnings[]`) in `/evaluate`'s response — they indicate what is missing.

---

## Options `custom:` generate warning

**Symptom:** When using `custom:mi-framework`, the Creator shows "adapter pending".

**Cause:** Custom options do not have a specific artifact generator. The blueprint preserves them, but the generated files do not include configuration for that technology.

**Solution:**

- The warning is expected and does not block generation.
- `WHY.md` documents the custom decisions in its explanatory sections.
- You will have to manually write the configuration for the custom technology in your project.

---

## CORS blocked

**Symptom:** The deployed frontend cannot call the backend; CORS error in the browser console.

**Cause:** The frontend origin is not in `CORS_ALLOWED_ORIGINS`.

**Solution:**

```bash
CORS_ALLOWED_ORIGINS=https://tu-frontend.com,https://www.tu-frontend.com
```

Restart the backend after changing this variable.

---

## The ZIP doesn't download

**Symptom:** The "Download all (.zip)" button does not produce a file.

**Possible causes:**

- The browser blocked the download (popup blocker).
- Error generating the ZIP on the client (insufficient memory for very large bundles).

**Solution:**

- Allow popups/downloads for the site.
- Use "Download bundle (JSON)" as an alternative and unpack manually.
- Or download the artifacts individually from the "Files" tab.
