# Guide: the 7 reference steering roles

[`steering-roles.json`](steering-roles.json) preserves the roles used by the removed runtime. They serve as an example of a well-formed `steering.json`: each role declares why it exists, which tools it works with, what is asked of it in the system prompt, and with what temperature.

The Creator generates `artemisa/steering.json` from the user's answers. This file is not loaded by any runtime; it is used to compare against and enrich what is generated.

## Role structure

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

| Field               | Purpose                                                                       |
| ------------------- | ----------------------------------------------------------------------------- |
| `name`              | Human-readable role name.                                                     |
| `description`       | One sentence with the real scope; delimits what it does not do.               |
| `recommended_tools` | Tools the role needs. Must be a subset of the policy allowlist.               |
| `examples`          | Concrete tasks; help choose the right role.                                   |
| `system_prompt`     | Role instruction. Supports `{{var}}` variables and `{{> _partial}}` partials. |
| `temperature`       | Expected determinism: 0.2 for review and debugging, 0.4 for code generation.  |

The partials live in [`prompts/`](prompts): `_safety_prefix` (safety limits), `_context_section` (injected context) and `_output_format` (response format). Sharing them avoids repeating safety rules across seven prompts.

The formal schema is in [`../../src/kiro/schemas/steering.schema.json`](../../src/kiro/schemas/steering.schema.json).

## The seven roles

| Role          | Name                   | Scope                                                                                            | Temp. |
| ------------- | ---------------------- | ------------------------------------------------------------------------------------------------ | ----- |
| `PR_REVIEWER` | Senior Code Reviewer   | Reviews diffs: security, anti-patterns, performance. Does not approve code with exposed secrets. | 0.2   |
| `SCAFFOLDER`  | Scaffold Architect     | Creates base structure respecting local conventions; does not delete existing code.              | 0.4   |
| `TESTER`      | Test Engineer          | Small, focused tests of observable behavior, without new dependencies.                           | 0.3   |
| `DOCUMENTER`  | Technical Documenter   | Brief, verifiable documentation of actual behavior, without decorative prose.                    | 0.3   |
| `REFACTORER`  | Refactoring Specialist | Improves structure without changing behavior; small, reversible changes.                         | 0.2   |
| `DEBUGGER`    | Debugging Specialist   | Reproduces, isolates root cause, and applies the minimal safe fix.                               | 0.2   |
| `DEVOPS`      | DevOps Engineer        | Reproducible CI, deployment, and configuration; never exposes secrets.                           | 0.2   |

## What makes this steering good

- **One role, one outcome**: each `description` excludes what the role must not do, so the agent does not drift into unrelated tasks.
- **Explicit prohibitions** in the prompt ("NEVER approve code with exposed secrets", "do not delete existing code") instead of only positive instructions.
- **Minimal tools per role**: the reviewer does not need file write access.
- **Temperature per task**: low where errors are costly, slightly higher where new code is generated.
- **Centralized safety rules** in a partial, not copied into each role.

## How to adapt them

1. Pick the role closest to the purpose declared in the Creator (`pr-review` → `PR_REVIEWER`, `scaffold` → `SCAFFOLDER`, etc.).
2. Replace the generic domain with the project's: stack, conventions, real verification commands.
3. Trim `recommended_tools` to what the bundle's `security-policy.json` allows.
4. Keep the system prompt in the team's language; the reference prompts are in Spanish.
5. Version the file alongside the code: a prompt change is a behavior change and deserves review.

See also [`security-policy-guide.md`](security-policy-guide.md) to align role tools with the command policy.
