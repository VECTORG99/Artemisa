# Reference artifacts

Artemisa generates configuration files; it does not execute agents. This directory preserves the artifacts used by the runtime removed in issue #584 as a **curated reference** for the bundles produced by the Creator.

None of these files are loaded at runtime. They are versioned, documented examples.

| File                                                           | What it is                                                                |
| -------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [`steering-roles.json`](steering-roles.json)                   | Seven roles with system prompt, tools and temperature.                    |
| [`steering-roles-guide.md`](steering-roles-guide.md)           | How to read and adapt those roles into a generated `steering.json`.       |
| [`security-policy.example.json`](security-policy.example.json) | Real allowlist policy used by the previous Artemisa runtime.              |
| [`security-policy-guide.md`](security-policy-guide.md)         | How to apply a `security-policy.json` with command validation.            |
| [`hooks-implementation.ts`](hooks-implementation.ts)           | Reference implementation of `before_action` and `validateCommand`.        |
| [`mcps.example.json`](mcps.example.json)                       | Example declaration of MCP servers with secrets per environment variable. |
| [`rag.example.json`](rag.example.json)                         | Example knowledge sources for RAG.                                        |
| [`prompts/`](prompts)                                          | Prompt partials (`_safety_prefix`, `_context_section`, `_output_format`). |

The JSON schemas that validate these files remain in `src/kiro/schemas/` because the Creator generates artifacts with the same shape.
