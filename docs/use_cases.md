# Casos de Uso

Huascar permite disenar y generar configuracion de agentes de desarrollo y operacion mediante un arbol de decisiones determinista.

## Creator

- Disenar agentes desde cero: seleccionar stack, arquitectura, cloud, CI/CD, observabilidad y permisos.
- Obtener bundles de configuracion reproducibles con blueprint, manifest hash y guias de instalacion.
- Evaluar multiples caminos arquitectonicos cambiando respuestas y recalculando el arbol.
- Generar configuracion target para Huascar, Kiro o portable.

## Runtime

- Ejecutar tareas con el motor ReAct usando steering, RAG, MCP y hooks.
- Integrar fuentes de conocimiento locales para contexto de agentes.
- Revisar PRs con criterios configurables.
- Ejecutar agentes registrados con sesiones persistentes en SQLite.

## Público objetivo

- Equipos de desarrollo que quieren estandarizar la configuracion de sus agentes.
- Proyectos que necesitan documentacion de arquitectura explicable (WHY.md, INSTALL.md).
- Usuarios de Kiro y Huascar que buscan un creador visual de configuraciones.
