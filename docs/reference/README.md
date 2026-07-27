# Artefactos de referencia

Artemisa genera archivos de configuración; no ejecuta agentes. Este directorio conserva los artefactos que usaba el runtime eliminado en el issue #584 como **referencia curada** para los bundles que produce el Creator.

Ninguno de estos archivos se carga en tiempo de ejecución. Son ejemplos versionados y documentados.

| Archivo                                                        | Qué es                                                                        |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [`steering-roles.json`](steering-roles.json)                   | Siete roles con system prompt, herramientas y temperatura.                    |
| [`steering-roles-guide.md`](steering-roles-guide.md)           | Cómo leer y adaptar esos roles en un `steering.json` generado.                |
| [`security-policy.example.json`](security-policy.example.json) | Política allowlist real usada por el runtime anterior.                        |
| [`security-policy-guide.md`](security-policy-guide.md)         | Cómo aplicar una `security-policy.json` con validación de comandos.           |
| [`hooks-implementation.ts`](hooks-implementation.ts)           | Implementación de referencia de `before_action` y `validateCommand`.          |
| [`mcps.example.json`](mcps.example.json)                       | Ejemplo de declaración de servidores MCP con secretos por variable.           |
| [`rag.example.json`](rag.example.json)                         | Ejemplo de fuentes de conocimiento para RAG.                                  |
| [`prompts/`](prompts)                                          | Parciales de prompt (`_safety_prefix`, `_context_section`, `_output_format`). |

Los esquemas JSON que validan estos archivos siguen en `src/kiro/schemas/` porque el Creator genera artefactos con la misma forma.
