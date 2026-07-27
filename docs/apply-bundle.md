# Applying a Bundle

> Artemisa generates configuration files; it does not write them to your project. This guide explains how to take a generated bundle and apply it manually, verify its integrity, and handle custom options.

---

## What's in a bundle

Every bundle includes these core files:

| File                      | Purpose                                                          |
| ------------------------- | ---------------------------------------------------------------- |
| `artemisa.blueprint.json` | Canonical model of all your decisions                            |
| `manifest.json`           | File inventory with SHA-256 hashes                               |
| `docs/INSTALL.md`         | Step-by-step install and validation guide                        |
| `docs/WHY.md`             | Explanation of objective, stack, environment and recommendations |

Depending on your answers, additional artifacts are generated:

| Condition                    | Artifacts                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------- |
| Dev, Kiro or portable target | `AGENTS.md`                                                                      |
| Skills enabled               | `skills/<agent>/SKILL.md`                                                        |
| Artemisa target              | `artemisa/steering.json`, `security-policy.json`, `governance.json`, `mcps.json` |
| Artemisa + RAG               | `artemisa/rag.json`                                                              |
| Artemisa + PR review         | `artemisa/pr-review.json`                                                        |
| Kiro target                  | `.kiro/steering/<agent>.md`                                                      |
| Kiro + hooks                 | `.kiro/hooks/<agent>-quality.json`                                               |
| Kiro + skills                | `.kiro/skills/<agent>/SKILL.md`                                                  |

---

## Step 1: Download the bundle

From the Creator's completion screen:

- **"Descargar todo (.zip)"** — downloads a ZIP with all artifacts preserving their relative paths, plus `manifest.json` and `artemisa.blueprint.json` at the root.
- **"Descargar bundle (JSON)"** — downloads the full bundle as a single JSON object (you'll need to unpack it manually).
- **Individual download** — each artifact can be downloaded separately from the "Archivos" tab.

The ZIP is the recommended option for applying the full bundle.

---

## Step 2: Review before copying

Before copying anything to your project:

1. Open `docs/WHY.md` — understand why each recommendation was made.
2. Open `artemisa/security-policy.json` (if generated) — review the allowlist of allowed commands and paths.
3. Open `artemisa/steering.json` (if generated) — review the roles, system prompts and tool permissions.
4. Check the warnings shown in the Creator — they flag potential issues (e.g., SQLite in production, deploy privileges).

> **Never copy files without reading them first.** These files define what your agent can do. A misconfigured steering or security policy can grant excessive permissions.

---

## Step 3: Copy files to your project

Unzip the bundle and copy the files to your project root, preserving the relative paths:

```bash
cd /path/to/your-project
unzip /path/to/artemisa-agent.zip
```

The directory structure should look like:

```text
your-project/
├── AGENTS.md
├── docs/
│   ├── INSTALL.md
│   └── WHY.md
├── artemisa/
│   ├── steering.json
│   ├── security-policy.json
│   ├── governance.json
│   └── mcps.json
├── .kiro/                  # only if Kiro target
│   ├── steering/
│   ├── hooks/
│   └── skills/
├── skills/                 # only if skills enabled
├── artemisa.blueprint.json
└── manifest.json
```

> If you already have an `AGENTS.md` or `docs/` directory, merge carefully — don't overwrite existing content without reviewing it.

---

## Step 4: Verify integrity with SHA-256 hashes

The `manifest.json` contains a SHA-256 hash for every generated file. After copying, verify that the files match:

```bash
cd /path/to/your-project
# Example: verify steering.json
sha256sum artemisa/steering.json
# Compare the output with the hash in manifest.json
```

To verify all files at once:

```bash
# Using jq and sha256sum
jq -r '.files[] | "\(.sha256)  \(.path)"' manifest.json | sha256sum -c -
```

If any file doesn't match, it was modified during copy — re-download and copy again.

---

## Step 5: Follow INSTALL.md

`docs/INSTALL.md` contains the specific installation steps for your agent configuration. It includes:

- Dependencies to install
- Environment variables to set
- Validation commands to run
- Production checklist (if production environment was selected)

Follow it step by step.

---

## Handling `custom:` options

If you used `custom:<slug>` for any technology (e.g., `custom:my-framework`), the bundle will include:

- The custom value in `artemisa.blueprint.json`
- A warning: "adaptador pendiente" (pending adapter)
- Documentation in `WHY.md` explaining the custom decision

**What to do:**

1. The generated artifacts won't include specific configuration for your custom technology.
2. You'll need to write the configuration manually, following the patterns of similar technologies in the bundle.
3. Use the `security-policy.json` allowlist as a template — add your custom tool's commands to the allowlist.

---

## `.kiro/` vs `artemisa/` vs `AGENTS.md`

| Target      | Where                 | Use when                                                                                           |
| ----------- | --------------------- | -------------------------------------------------------------------------------------------------- |
| `AGENTS.md` | Project root          | Universal — works with any AI agent that reads AGENTS.md (Cursor, Claude Code, Windsurf, etc.)     |
| `artemisa/` | `artemisa/` directory | When applying the generated Artemisa steering format (steering, security policy, governance, MCPs) |
| `.kiro/`    | `.kiro/` directory    | When using Kiro (AWS's agentic IDE) — steering, hooks and skills in Kiro's format                  |

You can have multiple targets in the same bundle (e.g., both `AGENTS.md` and `.kiro/`). They're complementary, not mutually exclusive.

---

## Common mistakes

| Mistake                                       | Fix                                                                     |
| --------------------------------------------- | ----------------------------------------------------------------------- |
| Copying files to the wrong directory          | Always copy to the project root, preserving relative paths              |
| Overwriting an existing `AGENTS.md`           | Merge manually — keep your existing project-specific rules              |
| Not verifying hashes                          | Run `sha256sum -c` against `manifest.json` after copying                |
| Ignoring warnings                             | Review all warnings in the Creator before applying                      |
| Copying `security-policy.json` without review | This file defines what your agent is allowed to do — review every entry |
