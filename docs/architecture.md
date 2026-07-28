# Arquitectura de Artemisa

Artemisa convierte un árbol de decisiones en un bundle de configuración reproducible (Markdown + JSON) y explica por qué fue construido así. **No ejecuta agentes**: solo genera archivos de configuración.

---

## Tabla de Contenido

1. [Vision General](#vision-general)
2. [Modulos del Sistema](#modulos-del-sistema)
3. [Sistema de Configuracion](#sistema-de-configuracion)
4. [Modelo de Seguridad](#modelo-de-seguridad)
5. [Pipeline del Creator](#pipeline-del-creator)
6. [Artefactos Generados](#artefactos-generados)
7. [Artefactos de Referencia](#artefactos-de-referencia)
8. [Referencia de Variables de Entorno](#referencia-de-variables-de-entorno)
9. [Patrones de Error](#patrones-de-error)
10. [Estructura del Proyecto](#estructura-del-proyecto)
11. [Principios Arquitectonicos](#principios-arquitectonicos)

---

## Vision General

```text
┌──────────────────────────────────────────────────────────────┐
│                        server.ts                              │
│  Express + middleware + shutdown (sin estado)                 │
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

Toda la generación es una función pura del body: sin filesystem, red, base de datos, llamadas a servicios externos ni shell.

---

## Modulos del Sistema

### `server.ts`

Punto de entrada. Levanta Express, advierte si falta configuración de seguridad en producción y maneja `SIGTERM`/`SIGINT` cerrando el servidor y drenando las peticiones abiertas. No hay ejecuciones en vuelo, conexiones externas ni base de datos que cerrar.

### `app.ts`

Cableado HTTP: helmet, content-type estricto, compresión, CORS, límite de 128 KB, sanitización de body, validación de path params, rate limiting (global y del Creator), timeout global, rutas públicas, frontera de auth y rutas protegidas.

### `config.ts`

Configuración del servidor únicamente: `port`, `host`, `requestTimeoutMs`. El resto de variables se leen donde se usan: auth en `src/middleware/auth.ts`, rate limits en `src/app.ts`, métricas en `src/routes/metrics.ts`.

### `src/creator/*`

| Módulo             | Responsabilidad                                                                    |
| ------------------ | ---------------------------------------------------------------------------------- |
| `domain.ts`        | Contratos de catálogo, preguntas, evaluación, blueprint, artefactos y errores.     |
| `catalog.ts`       | Taxonomía y catálogo tecnológico versionado, búsqueda y validación de categorías.  |
| `catalogQuery.ts`  | Índice por id, respuesta congelada sin filtros y búsqueda compartida de catálogos. |
| `decisionTree.ts`  | Condiciones, preguntas visibles, progreso, validación y recomendaciones.           |
| `generator.ts`     | Blueprint, documentación, adaptadores Artemisa/Kiro/portable y manifest.           |
| `skillsCatalog.ts` | Catálogo de skills que alimenta la categoría `skill`.                              |
| `mcpCatalog.ts`    | Catálogo de servidores MCP sugeridos que alimenta la categoría `mcp`.              |
| `modelsCatalog.ts` | Catálogo de modelos disponibles como dato del bundle.                              |
| `agentProtocol.ts` | Protocolo de onboarding para agentes de IA (`/agent`, `/agent/start`, `/startup`). |
| `etag.ts`          | ETag/304 para las respuestas de catálogo y workflow.                               |
| `router.ts`        | API REST versionada y Problem Details (`application/problem+json`).                |

### `src/routes/*`

- `health.ts`: `/api/health`, `/health/live`, `/health/ready`. Reporta uptime, memoria y disco; no hay dependencias externas que sondear.
- `metrics.ts`: contador de requests/errores por path, protegido por `METRICS_SECRET`.
- `openapi.ts`: documento OpenAPI 3.1 con las rutas vigentes.
- `debug.ts`: inspector de requests, deshabilitado en producción.

---

## Sistema de Configuracion

### Diseno

`src/config.ts` expone sólo lo que necesita el servidor HTTP:

1. Lee de `process.env` en el momento de importación.
2. Provee defaults seguros.
3. Incluye `import 'dotenv/config'` (autocontenido, portable entre entry points).
4. Usa el helper `envInt()` con clamping `>= 0`.

```ts
import { config } from './config.js';

config.server.port; // → 3001
config.server.host; // → '0.0.0.0'
config.server.requestTimeoutMs; // → 120000
```

### Como agregar una nueva variable

1. Si es del servidor, agregar el default en `src/config.ts`; si pertenece a un middleware o ruta, leerla ahí.
2. Documentarla en `.env.example`.
3. Actualizar `CONTEXT.md`/`docs/deployment.md` si cambia el despliegue.

---

## Modelo de Seguridad

El backend no ejecuta comandos ni herramientas, así que la superficie de seguridad es la de una API pura:

- **Auth**: `src/middleware/auth.ts`. `AUTH_REQUIRED=true` exige `ARTEMISA_API_KEYS` (`Authorization: Bearer` o `X-API-Key`), compara con HMAC de longitud fija y falla cerrado si no hay claves (500, y en producción el proceso no arranca).
- **Frontera de rutas**: catálogo, workflow, tutorial y protocolo de agentes son públicos; `evaluate`, `preview` y `generate` quedan detrás de auth.
- **Límites de entrada**: 128 KB por body, timeout global (`REQUEST_TIMEOUT_MS`), rate limiting global y específico del Creator, `enforceJsonContentType`, `sanitizeRequestBody` (elimina `__proto__`, `constructor`, `prototype`) y `validatePathParams`.
- **Seguridad del bundle generado**: rutas relativas sin `..`, sin backslashes ni duplicados; máximo 40 archivos y 256 KB; rechazo de secretos literales con patrones conocidos; referencias `${GITHUB_TOKEN}` en vez de valores.
- **Cabeceras**: helmet, CORS con allowlist explícita (`CORS_ALLOWED_ORIGINS`) y bloqueo del origen `null`.

La política de seguridad que Artemisa **genera** (`artemisa/security-policy.json`) la aplica quien ejecuta el agente. Cómo hacerlo está documentado en [`reference/security-policy-guide.md`](reference/security-policy-guide.md), con la implementación de referencia en [`reference/hooks-implementation.ts`](reference/hooks-implementation.ts).

---

## Pipeline del Creator

```text
HTTP answers
  → parseCreatorAnswers
  → evaluateDecisionTree
  → recomendaciones deterministas
  → buildBlueprint
  → generadores de artefactos
  → validación de rutas/secretos/tamaño
  → contenido canónico + SHA-256
  → bundle JSON
```

### Estado y versiones

El backend no crea sesiones. Cada llamada a `evaluate`, `preview` o `generate` recibe todas las respuestas acumuladas. El cliente puede fijar `workflowVersion` y `catalogVersion`; un mismatch responde `409` para no generar con reglas distintas de las que vio el usuario.

Esto permite volver atrás, recalcular ramas y escalar horizontalmente sin coordinar estado. El Creator es stateless por diseño: no hay base de datos, sesiones ni almacenamiento persistente.

### Invariantes del generador

1. Mismo input y mismas versiones producen exactamente el mismo contenido y hashes.
2. La generación no usa red, filesystem, servicios externos, base de datos ni shell.
3. No se aceptan rutas absolutas, traversal, backslashes o duplicados.
4. No se permiten secretos literales con patrones conocidos.
5. El manifest lista todos los artefactos y sus SHA-256.
6. Kiro sólo se genera si `agent_targets` incluye `kiro`.
7. RAG y PR review sólo se generan cuando sus ramas fueron habilitadas.
8. Producción agrega aprobación, checklist operacional y warnings aunque el usuario no los seleccione explícitamente.

### Contrato HTTP

```text
GET  /api/v1/creator/catalog
GET  /api/v1/creator/workflow
GET  /api/v1/creator/tutorial
GET  /api/v1/creator/skills
GET  /api/v1/creator/mcps
GET  /api/v1/creator/models
GET  /api/v1/creator/docs
POST /api/v1/creator/evaluate
POST /api/v1/creator/preview
POST /api/v1/creator/generate
GET  /api/v1/creator/agent
GET  /api/v1/creator/agent/start
POST /api/v1/creator/agent/answer
POST /api/v1/creator/agent/generate
GET  /api/v1/creator/startup
```

Las rutas de ejecución heredadas devuelven 404 y no están en el documento OpenAPI.

---

## Artefactos Generados

Siempre: `artemisa.blueprint.json`, `manifest.json`, `docs/INSTALL.md`, `docs/WHY.md`.

Condicionales según respuestas: `AGENTS.md`, `skills/<agente>/SKILL.md`, `artemisa/steering.json`, `artemisa/security-policy.json`, `artemisa/governance.json`, `artemisa/mcps.json`, `artemisa/rag.json`, `artemisa/pr-review.json`, `.kiro/steering/<agente>.md`, `.kiro/hooks/<agente>-quality.json`, `.kiro/skills/<agente>/SKILL.md`, y las variantes para Cursor, Devin, CodeRabbit y Kilo Code.

Los esquemas de los artefactos JSON viven en `src/kiro/schemas/*.json` y se validan en `test/kiro-schema.test.mjs` y `test/generated-artifacts-schema.test.mjs`.

`artemisa/governance.json` es un contrato declarativo de capacidades, autonomía y aprobación: describe lo que la plataforma destino debe aplicar, no algo que Artemisa active.

---

## Artefactos de Referencia

`docs/reference/` contiene ejemplos y guías de referencia para los artefactos que genera el Creator (nunca se carga en el servidor):

| Archivo                                                                  | Uso                                                      |
| ------------------------------------------------------------------------ | -------------------------------------------------------- |
| [`steering-roles.json`](reference/steering-roles.json)                   | Siete roles curados con system prompt y temperatura.     |
| [`steering-roles-guide.md`](reference/steering-roles-guide.md)           | Cómo leer y adaptar esos roles.                          |
| [`security-policy.example.json`](reference/security-policy.example.json) | Política allowlist real.                                 |
| [`security-policy-guide.md`](reference/security-policy-guide.md)         | Cómo aplicar la política con validación de comandos.     |
| [`hooks-implementation.ts`](reference/hooks-implementation.ts)           | Implementación de referencia de `before_action`.         |
| [`mcps.example.json`](reference/mcps.example.json)                       | Declaración de servidores MCP con secretos por variable. |
| [`rag.example.json`](reference/rag.example.json)                         | Fuentes de conocimiento para RAG.                        |
| [`prompts/`](reference/prompts)                                          | Parciales de prompt compartidos.                         |

---

## Referencia de Variables de Entorno

| Variable               | Default                                       | Descripcion                                          |
| ---------------------- | --------------------------------------------- | ---------------------------------------------------- |
| `PORT`                 | `3001`                                        | Puerto del servidor HTTP                             |
| `HOST`                 | `0.0.0.0`                                     | Interfaz de red                                      |
| `REQUEST_TIMEOUT_MS`   | `120000`                                      | Timeout por petición HTTP                            |
| `LOG_LEVEL`            | `info`                                        | Verbosidad de pino                                   |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Orígenes permitidos                                  |
| `AUTH_REQUIRED`        | `true`                                        | Exige API key en rutas protegidas (`false` en local) |
| `ARTEMISA_API_KEYS`    | —                                             | Lista de API keys separadas por coma                 |
| `BYPASS_SECRET`        | —                                             | Override de emergencia; se redacta en logs           |
| `METRICS_SECRET`       | —                                             | Protege `/api/metrics` (obligatorio en producción)   |
| `RATE_LIMIT_GLOBAL`    | `100`                                         | Requests por minuto por IP                           |
| `RATE_LIMIT_CREATOR`   | `120`                                         | Requests por minuto para `/api/v1/creator`           |
| `RATE_LIMIT_AGENT`     | `30`                                          | Requests por minuto para el protocolo de agentes     |

---

## Patrones de Error

### Manejo de errores

| Escenario                                           | Respuesta HTTP                        |
| --------------------------------------------------- | ------------------------------------- |
| Body no es objeto o trae claves extra               | `400` con `issues[]`                  |
| Content-Type inválido en mutación                   | `415`                                 |
| Respuestas con tipo/opción inválida                 | `200` con `issues[]` en la evaluación |
| Versión de workflow/catálogo obsoleta               | `409`                                 |
| Árbol incompleto, secreto literal o bundle inseguro | `422`                                 |
| Ruta inexistente                                    | `404`                                 |
| Falta o es inválida la API key                      | `401` / `403`                         |
| Rate limit excedido                                 | `429`                                 |
| Error interno                                       | `500`                                 |

Los errores del Creator usan `application/problem+json` con `issues[]` y rutas de campo.

### Principios

- `catch (err: unknown)` en lugar de `catch (err: any)`.
- `instanceof Error` para extraer `.message`; `String(err)` como fallback.
- Lanzar subclases de `AppError` (`src/errors.ts`) cuando el caller necesita status estable.
- Nunca registrar secretos ni valores de API keys.

---

## Estructura del Proyecto

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
│   ├── deployment.md               # Despliegue local, Docker y DigitalOcean
│   ├── CONVENTIONS.md              # Convenciones de equipo
│   ├── debug-tooling.md            # Herramientas de debug (dev)
│   ├── adr/                        # Architecture Decision Records
│   └── reference/                  # Ejemplos y guías de referencia
├── test/                           # node:test (unit + contrato HTTP)
├── e2e/                            # Playwright
├── .env.example
├── docker/                        # Dockerfiles y compose files
├── scripts/                       # Scripts auxiliares
└── Makefile
```

---

## Principios Arquitectonicos

1. **Generar, no ejecutar**: el backend produce archivos; aplicarlos y correr el agente es del usuario.
2. **Pureza**: la generación no toca red, disco, base de datos ni procesos.
3. **Determinismo**: mismas respuestas y versiones ⇒ mismos artefactos y hashes.
4. **Stateless**: no hay sesiones anónimas ni estado huérfano antes de tener identidad.
5. **Fail-closed en auth**: sin claves configuradas y con auth requerida, no se sirve nada protegido.
6. **Explicabilidad**: cada recomendación incluye motivo, evidencia, beneficios, trade-offs y alternativas.
7. **Sin dependencias circulares**: los módulos importan config, no al revés.
