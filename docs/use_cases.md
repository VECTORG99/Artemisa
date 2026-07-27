# Casos de Uso

Huascar permite disenar y generar configuracion de agentes de desarrollo y operacion mediante un arbol de decisiones determinista.

## Creator

- Disenar agentes desde cero: seleccionar stack, arquitectura, cloud, CI/CD, observabilidad y permisos.
- Obtener bundles de configuracion reproducibles con blueprint, manifest hash y guias de instalacion.
- Evaluar multiples caminos arquitectonicos cambiando respuestas y recalculando el arbol.
- Generar configuracion target para Huascar, Kiro o portable.
- Documentar por que se eligio cada pieza del stack (`docs/WHY.md` generado).

## Fuera de alcance

Huascar no ejecuta agentes: no hay motor ReAct, LLM, RAG, MCP ni base de datos (#584).
La aplicacion del bundle y la ejecucion del agente ocurren en la plataforma que elija el usuario.
Como referencia de que aplicar y como, ver `docs/reference/`.

## Público objetivo

- Equipos de desarrollo que quieren estandarizar la configuracion de sus agentes.
- Proyectos que necesitan documentacion de arquitectura explicable (WHY.md, INSTALL.md).
- Usuarios de Kiro y Huascar que buscan un creador visual de configuraciones.
