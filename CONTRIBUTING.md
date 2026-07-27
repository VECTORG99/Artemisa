# Guia para Contribuidores

Bienvenido a Artemisa. Este proyecto acepta contribuciones de humanos y agentes de IA.

- **Contribuidores humanos**: leer esta seccion. Para cambios de codigo, la guia detallada para IA mas abajo tambien aplica.
- **Agentes de IA**: la seccion "AI Contributor Guide" es tu entrada principal.

## Dónde vive la documentación

Toda la documentación del proyecto vive en el repositorio bajo `docs/`:

| Archivo / directorio   | Contenido                                                            |
| ---------------------- | -------------------------------------------------------------------- |
| `README.md`            | Introducción, arquitectura, quick start y roadmap.                   |
| `CONTEXT.md`           | Estado del proyecto, módulos, rutas críticas y zonas de alto riesgo. |
| `CONTRIBUTING.md`      | Este archivo — guía para contribuidores humanos y agentes.           |
| `docs/architecture.md` | Motor, capas y decisiones de diseño.                                 |
| `docs/deployment.md`   | Despliegue local, Docker y Render.                                   |
| `docs/CONVENTIONS.md`  | Convenciones de código, tests, API y Git.                            |
| `docs/adr/`            | Architecture Decision Records.                                       |

El **Wiki de GitHub está deshabilitado** intencionalmente: tener dos lugares para la documentación crea confusión sobre cuál está actualizado. Toda la documentación técnica y de usuario vive con el código para que sea revisable, versionable y consultable sin salir del repositorio.

## Flujo para humanos

1. Busca un issue con label `good first issue` o `help wanted`.
2. Crea un branch desde `origin/development` con prefijo `feature/`, `fix/` o `docs/`.
3. Haz cambios enfocados en el issue. Sin refactors ni formateo no solicitado.
4. Ejecuta `npm run test:unit` y `npx tsc --noEmit`.
5. Abre un PR a `development` con `Closes #N` en el cuerpo.
6. Espera revision. Los mantenedores revisan PRs semanalmente.

## Primeros pasos

```bash
git clone https://github.com/VECTORG99/Artemisa
cd Artemisa
npm ci
cp .env.example .env
npm run dev
```

Lee `README.md` para entender la arquitectura y `docs/CONVENTIONS.md` para las convenciones de codigo.

---

# AI Contributor Guide

Audience: AI agents changing this repository. Keep changes issue-scoped, schema-valid, tested, and routed through PRs to `development`.

## Quick Reference

| Scenario                                   | Read first                                                   | Change here                                      | Required check                                           |
| ------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------ | -------------------------------------------------------- |
| Any code/doc change                        | `AGENTS.md`, `docs/CONVENTIONS.md`                           | Issue branch from `origin/development`           | `git diff`, relevant tests                               |
| Architecture/route/auth/deploy integration | `CONTEXT.md`, relevant `docs/adr/*`                          | Smallest owning module                           | Update `CONTEXT.md` if state changed                     |
| Add backend route                          | `src/app.ts`, nearby `src/routes/*.ts`, `test/app.test.mjs`  | `src/routes/<resource>.ts`, `src/app.ts`         | `npm run test:unit`, `npx tsc --noEmit`                  |
| Change request validation                  | Target route/parser tests                                    | Route-owned parser/helper                        | Unit test for accepted/rejected input                    |
| Change decision tree / catalog             | `src/creator/decisionTree.ts`, `src/creator/catalog.ts`      | Question/option owner + version bump if breaking | `npm run test:unit`                                      |
| Change generated artifacts                 | `src/creator/generator.ts`, `test/CreatorGenerator.test.mjs` | Generator only; keep output deterministic        | `npm run test:unit`                                      |
| Change generated artifact schema           | `src/kiro/schemas/*.json`                                    | Schema + generator together                      | `npm run test:unit`                                      |
| Update reference artifacts                 | `docs/reference/README.md`                                   | `docs/reference/*`                               | `node --import tsx/esm --test test/kiro-schema.test.mjs` |
| Add frontend route                         | Existing `frontend/src/app/**/page.tsx` pattern              | `frontend/src/app/<route>/page.tsx`              | Frontend build/test if available                         |
| OpenAPI/API contract change                | `src/routes/openapi.ts`, route tests                         | OpenAPI + route response together                | `npm run test:unit`                                      |
| Env/config change                          | `src/config.ts`, `.env.example` if present                   | Config boundary only                             | Config/unit test, no secret output                       |

## PR Quality Gate

- [ ] Issue exists and PR body includes `Closes #<number>`.
- [ ] Branch is based on current `origin/development`.
- [ ] Scope only covers the issue; no drive-by refactors or formatting.
- [ ] New behavior has the smallest useful test, or skip reason is in PR body.
- [ ] `npm run test:unit` passed, or failure/blocker is documented.
- [ ] `npx tsc --noEmit` passed, or failure/blocker is documented.
- [ ] Generated artifacts still validate against `src/kiro/schemas/*.json`.
- [ ] Public API changes update tests and OpenAPI docs together.
- [ ] Generator changes keep output deterministic (same answers -> same hashes).
- [ ] Auth/deploy/frontend-backend integration changes update `CONTEXT.md`.
- [ ] No secrets, tokens, raw `.env` values, generated databases, or build artifacts committed.
- [ ] PR targets `development`, not `master`.

## Architecture Rules / Constraints

- Backend entrypoint: `src/server.ts` -> `src/app.ts`; app wiring stays thin.
- The backend only generates configuration files (#584): no execution engine, LLM, RAG, MCP, database or filesystem writes.
- Route modules own HTTP parsing/status/response shape; `src/creator/*` owns catalog, tree, recommendations and generation.
- The Creator is stateless and deterministic: same answers + versions -> same artifacts and SHA-256 hashes.
- Auth boundary lives in `src/middleware/auth.ts`; do not weaken fail-closed behavior when `AUTH_REQUIRED=true`.
- Generated artifacts must match `src/kiro/schemas/*.json`; reference examples in `docs/reference/` are tested by `test/kiro-schema.test.mjs`.
- Frontends are separate install domains (`frontend/`, `agent-creator/`); do not introduce root workspaces unless an issue explicitly requires it.
- Root TypeScript is ESM; source imports use `.js` specifiers.
- No new dependency for behavior that Node, TypeScript, Express, CSS, or an installed package already covers.
- Generated/build output and local tracking docs are not source changes.

## How To Test Changes

Run from repository root unless noted.

```bash
npm run test:unit
npx tsc --noEmit
```

Useful narrower checks:

```bash
node --import tsx/esm --test test/kiro-schema.test.mjs
node --import tsx/esm --test test/contributing.test.mjs
node --import tsx/esm --test test/CreatorGenerator.test.mjs
npm run test:all
```

Frontend checks are separate dependency domains; run only when that app changed:

```bash
npm --prefix frontend run build
npm --prefix agent-creator run build
```

## Recipes

### Add Catalog Technology

1. Edit `src/creator/catalog.ts` in the matching category tuple list; keep ids kebab-case and stable.
2. If the option changes recommendations, update `src/creator/decisionTree.ts` and its test.
3. Bump `CATALOG_VERSION` only when an existing id/meaning changes (clients pin versions and get 409).
4. Run `npm run test:unit`.

### Add Generated Artifact

1. Emit it from `src/creator/generator.ts` under the condition that requires it; keep content deterministic (no dates, no randomness).
2. Keep paths relative, without `..`, backslashes or duplicates; stay under the 40 files / 256 KB preview budget.
3. Never inline secrets: use `${ENV_VAR}` references.
4. If the artifact is JSON with a schema, keep `src/kiro/schemas/*.json` in sync.
5. Add coverage in `test/CreatorGenerator.test.mjs`, then run `npm run test:unit`.

### Update Reference Artifacts

1. Reference material for generated bundles lives in `docs/reference/` (steering roles, security policy, hooks implementation, MCP/RAG examples).
2. Keep JSON examples schema-valid: `test/kiro-schema.test.mjs` validates them against `src/kiro/schemas/*.json`.
3. Document intent in the matching guide (`security-policy-guide.md`, `steering-roles-guide.md`) instead of adding runtime code.
4. Run `npm run test:unit`.

### Add Endpoint

1. Add or update the owning route in `src/routes/`.
2. Mount it in `src/app.ts` at the correct auth boundary.
3. Validate params/body at the route boundary; return stable status codes and JSON shapes.
4. Update `src/routes/openapi.ts` if public contract changes.
5. Add route tests, then run `npm run test:unit` and `npx tsc --noEmit`.

### Add Frontend Route

1. Add `frontend/src/app/<route>/page.tsx` using existing app-router patterns.
2. Put shared API calls in `frontend/src/lib/api.ts` only when at least two callers need them now.
3. Keep `NEXT_PUBLIC_API_URL` behavior unchanged unless the issue is deploy/config-specific.
4. Run the relevant frontend build/test command if dependencies are installed.
