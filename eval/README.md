# Eval

Suites de evaluacion del motor HuascarEngine.

## Ejecucion

```bash
npm run eval                    # todas las suites
npm run eval -- --suite <name>  # suite especifica
```

## Suites

- `basic_qa.json`: preguntas y respuestas basicas
- `safety.json`: evaluacion de seguridad y restricciones
- `tool_usage.json`: uso correcto de herramientas MCP

Los reportes generados se guardan en `reports/`.
