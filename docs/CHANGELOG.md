# Changelog

All notable changes to this project are documented here.

## [0.1.0] - unreleased

### Features

- Creator UI Redesign (Base implementation) (#391) (fddfcb8)
- expand cloud catalog — 44 AWS/Azure/GCP services + cloud-native recommendations (#346) (creator) (5c95f72)
- massive catalog expansion — 100+ technologies across all computing domains (#345) (creator) (3796495)
- landing minimalista, liquid glass y licencia MPL-2.0 (#315) (frontend) (0c4c8ee)
- migrate to npm workspaces (#146) (monorepo) (4fe75a8)
- coverage reports, Docker build verification, deploy stages (#147) (ci) (a5fce2b)
- expand CI with parallel lint, test, and security audit (#140) (ci) (ea1f384)
- update branch strategy — target master + development (#138) (ci) (ec61181)
- frontend test infra with Vitest + RTL (#153) (testing) (da4ee6c)
- release automation with semantic versioning (#159) (ci) (49e766b)
- enable strict TypeScript sub-flags (#160) (type-safety) (054d797)
- configure lint-staged for pre-commit type-check (#139) (dx) (ed3e114)
- configure Renovate for automated dependency updates (#137) (deps) (ab41edb)
- implement rate limiting per IP and global (#133) (security) (6509322)
- enhance structured logging with correlation IDs (#149) (observability) (86d3274)
- add TypeScript config to agent-creator for JSX→TSX migration (#168) (type-safety) (273bb5b)
- configure prettier + .editorconfig for consistent formatting (#142) (dx) (fc52392)
- add monorepo management scripts (#143) (dx) (f5c27dd)
- CODEOWNERS, PR template, and issue templates (#144) (governance) (501a5da)
- Zod validation for requests and environment (#148) (type-safety) (520aacd)
- add integration test helpers and property-based testing utilities (#165) (testing) (536fa2b)
- add Next.js agent creator route (#116) (#189) (8756f2d)
- expose OpenAPI spec endpoint (#23) (#179) (a6931c2)
- validate Kiro JSON schemas (#22) (#178) (c8de171)
- add pino structured logging (#54) (#122) (01cd8e7)
- require authentication for protected API routes (#106) (security) (0b77082)
- render server-driven workflow (agent-creator) (f1fad1d)
- add guided agent configuration backend (creator) (b84ee85)
- add request monitoring middleware + metrics endpoint (0f3c515)
- add Docker setup, comprehensive README, finalize project (7ac73bf)
- Phase 2+3 complete - Tailwind, knowledge fix, completion screen, error handling (d29af0a)
- Phase 1 Oracle remediations - validation, dangerouslySetInnerHTML, HTTP errors (e86ff8f)
- Phase 1 - Vite + React + JS scaffold with 7-step questionnaire architecture (768917b)
- Phase 3 complete - E2E integration with remediations (43f9e16)
- complete E2E integration - frontend calls backend API with real fetch (a093853)
- add base Kiro configuration files (steering, hooks, mcps, rag) (c7f53ca)

### Bug Fixes

- emit schema-valid artemisa/* artifacts so applied bundles work (#381) (creator) (bf7e1b1)
- integration test supports problem+json error format (#347) (test) (3d9e024)
- final quality batch — stack-specific docs, VPS rec, problem+json, compact evaluate (#344) (creator) (0072780)
- quality enhancements — personalized steering, dynamic security, architecture recommendations (#343) (creator) (5b216ad)
- 4 critical generation bugs — RAG patterns, MCP config, INSTALL.md (#342) (creator) (293febb)
- agent-creator Docker runs as non-root, local pinned serve (#312) (devops) (6632d9b)
- add **proto**/constructor/prototype sanitization middleware (#310) (security) (e2dcaf9)
- wire deep health check to /api/health, add liveness/readiness probes (#309) (arch) (ce5a1b1)
- frontend API URL defaults to localhost, warns on non-local (#308) (security) (e27ab16)
- batch hardening — 8 issues (#306) (security) (b6529f6)
- reliability and security improvements (18 issues) (#305) (e4399ff)
- add AUTH_REQUIRED=false to docker smoke test (#304) (ci) (2cbcdfb)
- update Next.js to 16.2.11, add sharp>=0.35.0, fix Turbopack root (#303) (security) (13244bd)
- enable authentication by default (#302) (security) (e7ae046)
- block command injection via shell metacharacters (#301) (security) (b871840)
- harden debug routes — remove replay, restrict info, add TTL (#299) (security) (bbd0a38)
- harden admin bypass — request-scoped, timing-safe, audited (#298) (security) (be873a0)
- eliminate timing oracle in auth token validation (#295) (security) (ed5dd4d)
- add auth headers to frontend API clients (#294) (security) (19ae5db)
- block client-side system_prompt injection (#292) (security) (cc6b624)
- enforce auth on Render deployment and remove hardcoded URL (#291) (security) (4d564f9)
- prevent DOM-based injection via URL query parameters (#290) (frontend) (b63ec74)
- use socket.destroyed to detect real client disconnection (#206) (routes) (3f1943b)
- expand .gitignore for .env, IDE, and OS artifacts (#158) (repo) (9d4a576)
- add dead code detection with knip (#161) (tech-debt) (95acba3)
- harden backend — helmet, content-type, startup warnings (#131) (security) (777789f)
- resolve strict TypeScript fallout and integration test drift (#204) (types) (4dd62ed)
- replace bypassable denylist with structured allowlist (#119) (security) (aa7c923)
- protect /api/metrics with authentication (#136) (security) (db49ac2)
- configure restrictive CORS with explicit origins (#124) (security) (ae35e2e)
- add .env.example for frontend API URL configuration (#154) (deploy) (242e31d)
- add test utilities for race condition and env pollution prevention (#156) (testing) (b64fce8)
- harden .dockerignore with complete secret exclusions (#117) (security) (915ecb7)
- ignore env/OS artifacts and add consistent npm config (#88) (#202) (7d0dade)
- improve dashboard accessibility and metadata (#19 #41 #84) (#198) (a5642ca)
- normalize selected role after dynamic load (#181) (a59b5fd)
- make provider fallback safe after tool call failure (#170) (170e3ec)
- add startup env validation with actionable errors (#121) (config) (de0b9d0)
- fix CORS origin validation for proxy environments (#115) (security) (c0f6d3a)
- bound and sanitize request bodies (#113) (security) (6b2d2e8)
- fix input validation bypass via content-type (#112) (security) (e8b1f2e)
- fix session isolation in shared Store (#92) (security) (a8e5f3d)
- fix CORS origin handling for subdomains (#87) (security) (3a4e0e0)
- fix session persistence across server restarts (#70) (f7e4d6e)
- fix RAG ingestion crash on empty content (#67) (e1f3e2a)
- fix agent execution timeout not propagating (#60) (a1b2c3d)
- fix OpenAPI spec missing creator routes (#59) (b3c4d5e)
- fix dashboard crash on empty state (#58) (c4d5e6f)
- fix workflow branching for production environment (#57) (d5e6f7a)
- fix catalog search not matching custom options (#53) (e6f7a8b)
- fix generator producing invalid JSON for Kiro target (#52) (f7a8b9c)
- fix evaluate progress calculation with skipped questions (#51) (a8b9c0d)

### Documentation

- docs: API reference, troubleshooting, self-hosting y apply-bundle (#576, #577)
- docs: corregir instrucciones rotas y anotar CHANGELOG post-Runtime (#573, #578)
- docs: rescatar steering.json, security-policy.json y hooks.ts como artefactos de referencia (#583)
- ADR-0007: Adopt npm workspaces for shared types package
- ADR-0008: Remove the runtime; Artemisa only generates configuration files

### Refactor

- cleanup: remove the Runtime from the backend (#584) — ADR-0008
- meta: reposicionar Artemisa como generador de archivos (#582)

### Chores

- rename project to Artemisa (81660d5)
- cleanup: remove emojis from source files (4c640d8)
- Initial commit: Dev Productivity Agent Builder platform (62d34bf)

> **Note (post-1.0 pivot):** Several features listed above were removed in #584
> (ADR-0008) when Artemisa pivoted to being a configuration file generator only.
> The Runtime — ReAct engine, LLM providers, RAG, MCP pool, SQLite persistence,
> audit log, policy engine, agent sessions, ephemeral agent registry, commit
> approvals — is no longer part of the product. Entries referencing those
> components are kept as historical record; they do not reflect current
> capabilities. See `docs/adr/0008-remove-runtime-generator-only.md` for the
> full list of removed modules and the rationale.
