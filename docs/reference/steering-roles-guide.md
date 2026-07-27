# Guía: los 7 roles de steering de referencia

[`steering-roles.json`](steering-roles.json) conserva los roles que usaba el runtime eliminado. Sirven como ejemplo de un `steering.json` bien formado: cada rol declara para qué existe, con qué herramientas trabaja, qué se le pide en el system prompt y con qué temperatura.

El Creator genera `artemisa/steering.json` a partir de las respuestas del usuario. Este archivo no se carga en ninguna ejecución; se usa para comparar y enriquecer lo generado.

## Estructura de un rol

```json
{
  "roles": {
    "PR_REVIEWER": {
      "name": "Senior Code Reviewer",
      "description": "Reviews code changes for correctness, security, maintainability, and performance risks.",
      "recommended_tools": ["git diff", "static analysis", "unit tests"],
      "examples": ["Review a pull request for exposed secrets"],
      "system_prompt": "Eres {{role_name}}, un revisor de código Senior. ...\n\n{{> _safety_prefix}}\n{{> _context_section}}",
      "temperature": 0.2
    }
  }
}
```

| Campo               | Para qué sirve                                                                         |
| ------------------- | -------------------------------------------------------------------------------------- |
| `name`              | Nombre legible del rol.                                                                |
| `description`       | Una frase con el alcance real; delimita qué no hace.                                   |
| `recommended_tools` | Herramientas que el rol necesita. Debe ser subconjunto de la allowlist de la política. |
| `examples`          | Tareas concretas; ayudan a elegir el rol correcto.                                     |
| `system_prompt`     | Instrucción del rol. Admite variables `{{var}}` y parciales `{{> _partial}}`.          |
| `temperature`       | Determinismo esperado: 0.2 para revisión y depuración, 0.4 para generación de código.  |

Los parciales viven en [`prompts/`](prompts): `_safety_prefix` (límites de seguridad), `_context_section` (contexto inyectado) y `_output_format` (formato de respuesta). Compartirlos evita repetir reglas de seguridad en siete prompts.

El esquema formal está en [`../../src/kiro/schemas/steering.schema.json`](../../src/kiro/schemas/steering.schema.json).

## Los siete roles

| Rol           | Nombre                 | Alcance                                                                                        | Temp. |
| ------------- | ---------------------- | ---------------------------------------------------------------------------------------------- | ----- |
| `PR_REVIEWER` | Senior Code Reviewer   | Revisa diffs: seguridad, anti-patrones, rendimiento. No aprueba código con secretos expuestos. | 0.2   |
| `SCAFFOLDER`  | Scaffold Architect     | Crea estructura base respetando convenciones locales; no borra código existente.               | 0.4   |
| `TESTER`      | Test Engineer          | Pruebas pequeñas y enfocadas del comportamiento observable, sin dependencias nuevas.           | 0.3   |
| `DOCUMENTER`  | Technical Documenter   | Documentación breve y verificable del comportamiento real, sin prosa decorativa.               | 0.3   |
| `REFACTORER`  | Refactoring Specialist | Mejora estructura sin cambiar comportamiento; cambios pequeños y reversibles.                  | 0.2   |
| `DEBUGGER`    | Debugging Specialist   | Reproduce, aísla causa raíz y aplica la corrección mínima segura.                              | 0.2   |
| `DEVOPS`      | DevOps Engineer        | CI, despliegue y configuración reproducibles; nunca expone secretos.                           | 0.2   |

## Qué hace bueno a este steering

- **Un rol, un resultado**: cada `description` excluye lo que el rol no debe hacer, así el agente no deriva en tareas ajenas.
- **Prohibiciones explícitas** en el prompt ("NUNCA apruebes código con secretos expuestas", "no elimines código existente") en lugar de instrucciones sólo positivas.
- **Herramientas mínimas por rol**: el revisor no necesita escritura de archivos.
- **Temperatura por tarea**: baja donde el error es costoso, algo más alta donde se genera código nuevo.
- **Reglas de seguridad centralizadas** en un parcial, no copiadas en cada rol.

## Cómo adaptarlos

1. Toma el rol más cercano al propósito declarado en el Creator (`pr-review` → `PR_REVIEWER`, `scaffold` → `SCAFFOLDER`, etc.).
2. Reemplaza el dominio genérico por el del proyecto: stack, convenciones, comandos de verificación reales.
3. Recorta `recommended_tools` a lo que la `security-policy.json` del bundle permite.
4. Mantén el system prompt en el idioma del equipo; los prompts de referencia están en español.
5. Versiona el archivo junto al código: un cambio de prompt es un cambio de comportamiento y merece revisión.

Ver también [`security-policy-guide.md`](security-policy-guide.md) para alinear herramientas del rol con la política de comandos.
