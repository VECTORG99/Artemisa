# Changelog

All notable changes to this project are documented here.

### Bug Fixes

- Integrate useTranslations into real components (#429) _(frontend)_

- Remove dead on_commit HITL stub, document real diff flow (#418) (#430) _(hooks)_

- Integrate PromptTemplate into HuascarEngine.executeTask (#419) (#428) _(engine)_

- Integrate emitWebhook into HuascarEngine.executeTask (#420) (#427) _(webhooks)_

- Add retry with registry-error fallback to npm audit job (#431) _(ci)_

- Creator UI redesign — 4 modes, landing-faithful glass (#422) _(frontend)_

- Emit schema-valid huascar/* artifacts so applied bundles work (#381) _(creator)_

- Repair e2e/eval infra, LLM provider compat, workspace docs (#380)

- Integration test supports problem+json error format (#347) _(test)_

- Final quality batch — stack-specific docs, VPS rec, problem+json, compact evaluate (#344) _(creator)_

- Quality enhancements — personalized steering, dynamic security, architecture recommendations (#343) _(creator)_

- 4 critical generation bugs — RAG patterns, MCP config, INSTALL.md (#342) _(creator)_

- Multi-tenancy isolation — derive tenant ID per API key (#314) _(arch)_

- Agent-creator Docker runs as non-root, local pinned serve (#312) _(devops)_

- Add circuit breaker for LLM provider calls (#311) _(arch)_

- Add **proto**/constructor/prototype sanitization middleware (#310) _(security)_

- Wire deep health check to /api/health, add liveness/readiness probes (#309) _(arch)_

- Frontend API URL defaults to localhost, warns on non-local (#308) _(security)_

- Batch reliability — CORS null origin, MCP idle cleanup, ErrorBoundary (#307)

- Batch hardening — 8 issues (#306) _(security)_

- Reliability and security improvements (18 issues) (#305)

- Add AUTH_REQUIRED=false to docker smoke test (#304) _(ci)_

- Update Next.js to 16.2.11, add sharp>=0.35.0, fix Turbopack root (#303) _(security)_

- Enable authentication by default (#302) _(security)_

- Block command injection via shell metacharacters (#301) _(security)_

- Harden debug routes — remove replay, restrict info, add TTL (#299) _(security)_

- Harden admin bypass — request-scoped, timing-safe, audited (#298) _(security)_

- Enforce role isolation on memory API (#297) _(security)_

- Harden pipeline endpoint with server-side limits (#296) _(security)_

- Eliminate timing oracle in auth token validation (#295) _(security)_

- Add auth headers to frontend API clients (#294) _(security)_

- Restrict client RAG sources to inline-only (#293) _(security)_

- Block client-side system_prompt injection (#292) _(security)_

- Enforce auth on Render deployment and remove hardcoded URL (#291) _(security)_

- Prevent DOM-based injection via URL query parameters (#290) _(frontend)_

- Robustness fixes for issues #209-#237 (#238) (#239)

- Robustness fixes for issues #209-#237 (#238)

- Use socket.destroyed to detect real client disconnection (#206) _(routes)_

- Cancel timed-out MCP executions with AbortSignal (#123) _(security)_

- Expand .gitignore for .env, IDE, and OS artifacts (#158) _(repo)_

- Bound and paginate execution history (#157) _(security)_

- Add dead code detection with knip (#161) _(tech-debt)_

- Harden backend — helmet, content-type, startup warnings (#131) _(security)_

- Resolve strict TypeScript fallout and integration test drift (#204) _(types)_

- Enforce tool selection and approval controls (#130) _(security)_

- Restrict local files accepted by RAG ingestion (#127) _(security)_

- Add allowlist for MCP env var interpolation (#125) _(security)_

- Replace bypassable denylist with structured allowlist (#119) _(security)_

- Protect /api/metrics with authentication (#136) _(security)_

- Configure restrictive CORS with explicit origins (#124) _(security)_

- Prevent SSRF and bound remote RAG downloads (#128) _(security)_

- Add .env.example for frontend API URL configuration (#154) _(deploy)_

- Add test utilities for race condition and env pollution prevention (#156) _(testing)_

- Pin MCP server package versions (#155) _(security)_

- Harden .dockerignore with complete secret exclusions (#117) _(security)_

- Make Store.close() idempotent (#96) (#203)

- Ignore env/OS artifacts and add consistent npm config (#88) (#202)

- Improve dashboard accessibility and metadata (#19 #41 #84) (#198)

- Harden agent registry execution (#191)

- Harden session reuse and retry delays (#186)

- Normalize selected role after dynamic load (#181)

- Harden RAG embedding readiness and auth (#175)

- Make provider fallback safe after tool calls (#170)

- Honor explicit system prompt for existing roles (#31) (#141)

- Producciónizar agent-creator — replace Vite dev server with static serve (#115) _(docker)_

- Frontend fallback to correct backend URL on Render (#114) _(deploy)_

- Restrict CORS origins and protect /api/metrics (#103) _(security)_

- Harden Docker config — resource limits, secrets exclusion, NODE_ENV (#102) _(devops)_

- Remove bypass from model args and fix MCP timeout cancellation (#105) _(security)_

- Remove variable shadowing in ReAct loop — use systemPrompt directly (#107)

- Update repo URL to match current name (Huascar) _(render)_

- MCP+ReAct Oracle remediations - hook on tool calls, client.close, timeout, mock path fix

- Set proper HTML title for Huascar agent creator

- Remove node_modules from git tracking

### CI/CD

- Automatizar changelog con git-cliff en releases

- Automatizar changelog con git-cliff en releases

- Add GitHub Actions workflow

### Chores

- Implement pre-commit hooks with husky + lint-staged (#112)

- Add monorepo management scripts to root package.json (#111)

- Add CODEOWNERS, PR template, and issue templates (#110)

- Add prettier and .editorconfig for consistent formatting (#109)

- Configure Renovate for automated dependency updates (#108)

- Rename project to Huascar

### Documentation

- Agregar READMEs a subproyectos del monorepo

- Agregar READMEs a subproyectos del monorepo

- Corregir licencias SDK y raiz del proyecto

- Corregir licencias SDK y raiz del proyecto

- Agregar documentacion comunitaria y guia para contribuidores humanos

- Agregar documentacion comunitaria y guia para contribuidores humanos

- Limpiar documentacion obsoleta y agregar docs de scripts

- Limpiar documentacion obsoleta y agregar docs de scripts

- Infraestructura de documentacion (templates, SEO, versiones, funding)

- Infraestructura de documentacion (templates, SEO, versiones, funding)

- Renovar README principal con contexto hackathon, homepage y badges

- Renovar README principal con contexto hackathon, homepage y badges

- Apply phase 7 review cleanup (#197)

- Expand AI agent directives (#14) (#196)

- Add AI contributor guide (#79) (#195)

- Expand coding conventions (#70) (#194)

- Add machine-readable project context (#86) (#193)

- Add architecture decision records (#45) (#192)

- Update AGENTS.md branching strategy — master is production branch (#113)

- Add AI-Driven Development directives (AGENTS.md)

- Expand implementation plan into a complete hackathon sprint roadmap

- Add Huascar title to README

### Features

- Creator UI Redesign (Base implementation) (#391)

- Expand cloud catalog — 44 AWS/Azure/GCP services + cloud-native recommendations (#346) _(creator)_

- Massive catalog expansion — 100+ technologies across all computing domains (#345) _(creator)_

- Landing minimalista, liquid glass y licencia MPL-2.0 (#315) _(frontend)_

- Implement 11 features — eval, engine, testing, config, MCP, DX, SDK (#208)

- DevContainer, config cache, MCP retry & status (#207)

- Migrate to npm workspaces (#146) _(monorepo)_

- Coverage reports, Docker build verification, deploy stages (#147) _(ci)_

- Expand CI with parallel lint, test, and security audit (#140) _(ci)_

- Update branch strategy — target master + development (#138) _(ci)_

- Frontend test infra with Vitest + RTL (#153) _(testing)_

- Release automation with semantic versioning (#159) _(ci)_

- Deep health monitoring with self-healing alerts (#151) _(ops)_

- Implement webhook event system for execution notifications (#164) _(integration)_

- Add OpenTelemetry scaffolding for ReAct loop tracing (#162) _(observability)_

- Enable strict TypeScript sub-flags (#160) _(type-safety)_

- Configure lint-staged for pre-commit type-check (#139) _(dx)_

- Configure Renovate for automated dependency updates (#137) _(deps)_

- Implement rate limiting per IP and global (#133) _(security)_

- Enhance structured logging with correlation IDs (#149) _(observability)_

- Add TypeScript config to agent-creator for JSX→TSX migration (#168) _(type-safety)_

- Configure prettier + .editorconfig for consistent formatting (#142) _(dx)_

- Add monorepo management scripts (#143) _(dx)_

- CODEOWNERS, PR template, and issue templates (#144) _(governance)_

- Implement audit log and policy engine (#134) _(security)_

- Zod validation for requests and environment (#148) _(type-safety)_

- Add integration test helpers and property-based testing utilities (#165) _(testing)_

- Mock engine with configurable scenarios (#71) (#201)

- Expand data-driven agent roles (#20) (#200)

- Add SQLite data retention policy (#80) (#199)

- Add Next.js agent creator route (#116) (#189)

- Add persistent agent registry (#98) (#187)

- Stream agent execution events (#97) (#184)

- Persist agent sessions (#35) (#183)

- Retry transient LLM failures (#46) (#182)

- Expose OpenAPI spec endpoint (#23) (#179)

- Validate Kiro JSON schemas (#22) (#178)

- Expose dynamic roles endpoint (#82) (#177)

- Improve RAG pipeline resilience (#55) (#174)

- Add ANN vector index for RAG search (#33) (#173)

- Improve RAG semantic chunking (#100) (#172)

- Skip unchanged RAG source reindexing (#48) (#171)

- Support LLM provider fallback chain (#30) (#163)

- Pool MCP connections across requests (#26) (#145)

- Add SQLite migration runner (#56) (#25) (#135)

- Add pino structured logging (#54) (#122)

- Require authentication for protected API routes (#106) _(security)_

- Render server-driven workflow _(agent-creator)_

- Add guided agent configuration backend _(creator)_

- Deploy production — Docker, docs, RAG vectorial, CI migration

- Deep robustness pass (3 phases, 3 Oracle reviews)

- Add request monitoring middleware + metrics endpoint

- Add Fly.io config for free-tier deploy

- Complete Phase 2 - RAG web URLs, test suite, deploy config

- Add RAG engine, SQLite persistence, integration tests

- Add Docker setup, comprehensive README, finalize project

- Phase 2+3 complete - Tailwind, knowledge fix, completion screen, error handling

- Phase 1 Oracle remediations - validation, dangerouslySetInnerHTML, HTTP errors

- Phase 1 - Vite + React + JS scaffold with 7-step questionnaire architecture

- Phase 3 complete - E2E integration with remediations

- Complete E2E integration - frontend calls backend API with real fetch

- Implement Phase 1 Backend with HuascarEngine and Express API

- Add base Kiro configuration files (steering, hooks, mcps, rag)

### Other

- Remove emojis from source files _(other)_

### Performance

- Enable WAL mode, prepared statements, and batch transactions (#432) _(store)_

- Parallelize server connects, circuit-break repeated failures (#382) _(mcp)_

### Refactor

- Split dashboard into components (#44) (#188)

- Split server into app and route modules (#42) (#176)

- Inject HuascarEngine dependencies (#89) (#169)

- Use structured AI SDK tool calling (#29) (#152)

- Make shutdown idempotent and graceful (#74) (#132)

- Add error taxonomy and central handler (#91) (#40) (#129)

- Extract config and security policy into declarative files

- Allow overriding OpenAI model via MODEL_ID env var

### Testing

- Add E2E agent creation demo — full flow with verification (#359)

- Add comprehensive security test suite for critical attack vectors (#313) _(security)_

<!-- generated by git-cliff -->
