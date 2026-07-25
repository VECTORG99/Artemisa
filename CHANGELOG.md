# Changelog

## Unreleased

### Creator

- Implementacion completa del arbol de decisiones con 26 preguntas
- API REST Creator v1 (catalog, workflow, tutorial, evaluate, preview, generate)
- Generacion de bundles con blueprint, manifest, INSTALL.md y WHY.md
- Targets Huascar, Kiro y portable con artefactos condicionales
- Catastro tecnologico versionado con 12+ categorias
- Recomendaciones explicables deterministas
- Validacion de seguridad: no filesystem, no red, no LLM en el Creator
- Tests unitarios y de integracion para ramas, validacion y determinismo

### UI

- Agent Creator Vite con renderizado dinamico desde workflow API
- Tutorial visual skippable
- Recomendaciones y warnings antes de generar
- Descarga de bundle JSON y artefactos individuales

### Runtime

- HuascarEngine con bucle ReAct, RAG, MCP y hooks
- Historial SQLite de ejecuciones
- Sesiones de agentes registrados
- Configuracion Kiro (steering, MCPs, RAG, security-policy, governance)

### DevOps

- CI con typecheck, tests unitarios y de integracion, audit de seguridad
- Docker Compose para desarrollo local
- CI/CD deployments
