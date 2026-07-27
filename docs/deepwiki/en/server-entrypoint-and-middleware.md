# Server Entrypoint and Middleware

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [.env.example](.env.example)
- [CONTEXT.md](CONTEXT.md)
- [src/app.ts](src/app.ts)
- [src/config.ts](src/config.ts)
- [src/errors.ts](src/errors.ts)
- [src/health.ts](src/health.ts)
- [src/logger.ts](src/logger.ts)
- [src/middleware/notFound.ts](src/middleware/notFound.ts)
- [src/routes/health.ts](src/routes/health.ts)
- [src/routes/metrics.ts](src/routes/metrics.ts)
- [src/routes/openapi.ts](src/routes/openapi.ts)
- [src/server.ts](src/server.ts)
- [test/health.test.mjs](test/health.test.mjs)
- [test/issue-267-deep-health.test.mjs](test/issue-267-deep-health.test.mjs)
- [test/logger.test.mjs](test/logger.test.mjs)
- [test/openapi.test.mjs](test/openapi.test.mjs)

</details>

This section details the backend initialization process and the request processing pipeline. The Artemisa backend is a stateless Express/TypeScript application focused exclusively on generating deterministic agent configurations. It utilizes a robust middleware stack for security, performance, and monitoring, while maintaining a "fail-closed" posture for production environments.

## Process Lifecycle and Server Entrypoint

The backend entrypoint is `src/server.ts`, which initializes the Express application and manages the process lifecycle, including graceful shutdowns and security validation at startup [src/server.ts:1-51](<>).

### Startup Validation

Before starting the listener, the server performs environment checks. In production mode (`NODE_ENV=production`), it issues warnings if critical security configurations like `BYPASS_SECRET` or `ARTEMISA_API_KEYS` are missing [src/server.ts:5-11](<>).

### Graceful Shutdown

The server implements a graceful shutdown mechanism to ensure in-flight requests are completed before the process terminates. This is particularly important for the `Creator` module, which, although stateless, may be processing CPU-intensive bundle generations [src/server.ts:19-39](<>).

| Signal               | Action                                                        | Exit Code |
| :------------------- | :------------------------------------------------------------ | :-------- |
| `SIGTERM` / `SIGINT` | Initiates graceful shutdown; stops accepting new connections. | `0`       |
| `uncaughtException`  | Logs fatal error and initiates shutdown.                      | `1`       |
| `unhandledRejection` | Logs fatal error and initiates shutdown.                      | `1`       |
| **Timeout**          | Forces exit after 15 seconds if connections fail to drain.    | `1`       |

**Sources:** [src/server.ts:13-51](<>), [src/config.ts:16-22](<>)

## Middleware Pipeline

The application wiring in `src/app.ts` defines a strict order of operations for every incoming request. The pipeline is designed to be "fail-closed," ensuring that security and validation occur before any business logic is executed [src/app.ts:20-137](<>).

### Security and Sanitization

1.  **Helmet**: Configures security headers to prevent XSS, clickjacking, and MIME sniffing. CSP is disabled as the server provides a JSON API rather than HTML [src/app.ts:25-30](<>).
2.  **CORS**: Restricts access to specific origins defined in `CORS_ALLOWED_ORIGINS`. It explicitly blocks `null` origins and caches preflight `OPTIONS` requests for 24 hours to reduce latency [src/app.ts:49-74](<>).
3.  **Content-Type Enforcement**: Ensures mutation requests use `application/json` [src/app.ts:32-33](<>).
4.  **Prototype Pollution Sanitization**: The `sanitizeRequestBody` middleware strips dangerous keys like `__proto__`, `constructor`, and `prototype` from request bodies to prevent injection attacks [src/app.ts:77-78](<>).

### Performance and Reliability

- **Compression**: Uses `gzip`/`brotli` for JSON responses over 1KB, significantly reducing the size of large catalog (~34KB) and workflow (~52KB) payloads [src/app.ts:37-47](<>).
- **Global Timeout**: Aborts requests that exceed the `REQUEST_TIMEOUT_MS` (default 120s) to prevent resource exhaustion [src/app.ts:109-117](<>).

### Rate Limiting

Artemisa employs tiered rate limiting to balance security with the high-frequency requirements of the Creator UI [src/app.ts:84-106](<>).

| Limiter          | Scope               | Default     | Rationale                                                                                    |
| :--------------- | :------------------ | :---------- | :------------------------------------------------------------------------------------------- |
| `globalLimiter`  | All routes          | 100 req/min | General DDoS protection.                                                                     |
| `creatorLimiter` | `/api/v1/creator/*` | 120 req/min | Accommodates the ~35 requests required for a full "Auto-largo" flow [src/app.ts:93-104](<>). |

### Request Processing Flow

The following diagram bridges the logical middleware stages to their specific implementation entities.

**Diagram: Middleware Entity Mapping**

```mermaid
graph TD
    subgraph "Request Entry"
        "Client Request" --> "app.ts"
    end

    subgraph "Security Layer"
        "app.ts" --> "helmetMiddleware[helmet]"
        "helmetMiddleware[helmet]" --> "corsMiddleware[cors]"
        "corsMiddleware[cors]" --> "sanitize[sanitizeRequestBody]"
    end

    subgraph "Validation Layer"
        "sanitize[sanitizeRequestBody]" --> "typeCheck[enforceJsonContentType]"
        "typeCheck[enforceJsonContentType]" --> "paramVal[validatePathParams]"
    end

    subgraph "Traffic Control"
        "paramVal[validatePathParams]" --> "globalLimiter[rateLimit]"
        "globalLimiter[rateLimit]" --> "timeout[Request Timeout Timer]"
    end

    subgraph "Routing"
        "timeout[Request Timeout Timer]" --> "creatorRouter[/api/v1/creator]"
        "creatorRouter[/api/v1/creator]" --> "auth[requireAuth]"
        "auth[requireAuth]" --> "protectedRoutes[Creator Protected Router]"
    end

    subgraph "Observability"
        "app.ts" -.-> "metrics[metricsMiddleware]"
        "metrics[metricsMiddleware]" -.-> "logger[requestLogger]"
    end
```

**Sources:** [src/app.ts:20-137](<>), [src/middleware/auth.ts:1-15](<>), [src/middleware/sanitize.ts:1-10](<>)

## Supporting Routes

The backend provides several infrastructure routes for monitoring and documentation, mounted under the `/api` prefix [src/app.ts:123-125](<>).

### Health Checks

Managed by `src/routes/health.ts`, these endpoints are used by Docker and orchestrators to monitor the service status [src/routes/health.ts:4-42](<>).

- `/api/health`: Performs a `deepHealthCheck()` reporting memory and disk usage. Returns `503` if the system is unhealthy [src/routes/health.ts:12-16](<>).
- `/api/health/live`: A simple liveness probe returning `200` [src/routes/health.ts:23-25](<>).
- `/api/health/ready`: A readiness probe ensuring the process can serve Creator requests [src/routes/health.ts:32-39](<>).

### Metrics and Monitoring

The `metricsRouter` provides a snapshot of HTTP traffic. It tracks `totalRequests`, `requestsByPath`, and `errorsByPath` [src/routes/metrics.ts:5-12](<>).

- **Protection**: In production, this route requires a `METRICS_SECRET` provided via the `x-metrics-token` header. It uses `crypto.timingSafeEqual` to prevent token extraction via timing attacks [src/routes/metrics.ts:60-74](<>).
- **Logging**: A `requestLogger` (based on `pino`) generates a unique 8-character `reqId` for every request to enable trace correlation [src/logger.ts:20-22](<>).

### OpenAPI Documentation

The `/api/openapi.json` route serves a static OpenAPI 3.1.0 specification [src/routes/openapi.ts:10-86](<>). This document reflects the post-ADR-0008 architecture, explicitly omitting all legacy runtime endpoints (e.g., execution, RAG, agents CRUD) [src/routes/openapi.ts:5-9](<>).

**Diagram: Infrastructure Route Map**

```mermaid
graph LR
    subgraph "Public API Surface"
        "/api/health" --> "deepHealthCheck()"
        "/api/health/live" --> "Liveness Status"
        "/api/health/ready" --> "Readiness Check"
        "/api/openapi.json" --> "openApiSpec"
    end

    subgraph "Protected API Surface"
        "/api/metrics" --> "MetricsState"
        "MetricsState" --> "METRICS_SECRET Validation"
    end

    subgraph "Code Entities"
        "deepHealthCheck()" --- "src/health.ts"
        "MetricsState" --- "src/routes/metrics.ts"
        "openApiSpec" --- "src/routes/openapi.ts"
    end
```

**Sources:** [src/routes/health.ts:1-42](<>), [src/routes/metrics.ts:1-90](<>), [src/routes/openapi.ts:1-93](<>), [src/health.ts:1-40](<>)
