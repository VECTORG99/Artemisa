# Reference Material and Documentation

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [AGENTS.md](AGENTS.md)
- [docs/CONVENTIONS.md](docs/CONVENTIONS.md)
- [docs/api-reference.md](docs/api-reference.md)
- [docs/apply-bundle.md](docs/apply-bundle.md)
- [docs/architecture.md](docs/architecture.md)
- [docs/deployment.md](docs/deployment.md)
- [docs/images/creator-flow.svg](docs/images/creator-flow.svg)
- [docs/self-hosting.md](docs/self-hosting.md)
- [docs/troubleshooting.md](docs/troubleshooting.md)
- [docs/use_cases.md](docs/use_cases.md)
- [scripts/README.md](scripts/README.md)
- [test/conventions.test.mjs](test/conventions.test.mjs)

</details>

This section provides a technical overview of the `docs/` directory and the supporting material available for understanding, deploying, and utilizing Artemisa. Following the architectural pivot in **ADR-0008**, the system transitioned from an execution engine to a deterministic configuration generator [docs/architecture.md:3-3](<>). Consequently, the documentation focuses on the generation lifecycle, the application of resulting artifacts, and the preserved reference materials from the legacy runtime.

## Documentation Structure

The documentation is organized to support both human developers and AI agents (e.g., Cursor, Claude Code) through machine-readable directives [AGENTS.md:1-3](<>).

| Category                | Description                                    | Key Files                                    |
| :---------------------- | :--------------------------------------------- | :------------------------------------------- |
| **Project Standards**   | Coding styles, AI workflows, and PR gates.     | `AGENTS.md`, `docs/CONVENTIONS.md`           |
| **Operations**          | Deployment, Self-hosting, and Troubleshooting. | `docs/deployment.md`, `docs/self-hosting.md` |
| **Technical Reference** | API specifications and artifact definitions.   | `docs/api-reference.md`, `docs/reference/`   |
| **Architecture**        | Design decisions and system modules.           | `docs/architecture.md`, `docs/adr/*.md`      |

**Sources:** [AGENTS.md:5-11](<>), [docs/architecture.md:7-20](<>)

---

## API Reference and Discovery

The backend exposes a stateless REST API under `/api/v1/creator` [docs/api-reference.md:8-9](<>). It includes endpoints for catalog discovery, workflow evaluation, and bundle generation.

### Core Creator Endpoints

- `GET /catalog`: Returns the versioned technology taxonomy [docs/api-reference.md:25-27](<>).
- `GET /workflow`: Returns the dynamic decision tree logic [docs/api-reference.md:51-53](<>).
- `POST /evaluate`: Recalculates the tree state based on current `CreatorAnswers` [docs/api-reference.md:111-113](<>).
- `POST /generate`: Produces the final `GeneratedAgentBundle` with SHA-256 integrity hashes [docs/api-reference.md:169-171](<>).

### AI Agent Protocol

Artemisa includes a specialized onboarding protocol designed for LLMs to self-configure.

- `GET /agent/start`: Entry point for AI-driven configuration [docs/api-reference.md:189-191](<>).
- `GET /startup`: Returns a Markdown-formatted onboarding guide for agents [docs/api-reference.md:223-225](<>).

**Sources:** [docs/api-reference.md:12-17](<>), [docs/api-reference.md:177-179](<>)

---

## Deployment and Self-Hosting

Artemisa is designed for high portability. Since the removal of the runtime, the backend requires no database, LLM keys, or persistent storage [docs/self-hosting.md:218-230](<>).

### System Deployment Map

The following diagram bridges the conceptual deployment zones with the specific code entities responsible for configuration.

**Deployment Entity Mapping**

```mermaid
graph TD
    subgraph "Public Space"
        [Browser/Agent] -->|NEXT_PUBLIC_API_URL| [Frontend_NextJS]
    end

    subgraph "Server Space"
        [Frontend_NextJS] -->|JSON_API| [Express_App]
        [Express_App] --> [Auth_Middleware]
        [Express_App] --> [Creator_Module]
    end

    subgraph "Configuration Entities"
        [Auth_Middleware] -.->|Reads| [ARTEMISA_API_KEYS]
        [Express_App] -.->|Reads| [CORS_ALLOWED_ORIGINS]
        [Creator_Module] -.->|Uses| [CreatorCatalog]
    end

    style [Express_App] stroke-dasharray: 5 5
```

**Sources:** [docs/deployment.md:43-66](<>), [docs/self-hosting.md:28-44](<>), [docs/architecture.md:62-64](<>)

---

## Bundle Application and Reference

When a user completes the Creator flow, they receive a bundle containing blueprints and target-specific artifacts (e.g., `steering.json`, `security-policy.json`).

### Key Artifacts

- `artemisa.blueprint.json`: The canonical model of all user decisions [docs/apply-bundle.md:13-13](<>).
- `manifest.json`: A file inventory with SHA-256 hashes for integrity verification [docs/apply-bundle.md:14-14](<>).
- `docs/WHY.md`: An auto-generated explanation of architectural trade-offs [docs/apply-bundle.md:16-16](<>).

For detailed instructions on how to integrate these files into a target project, see **[Applying a Bundle (#8.1)](#)**.

### Reference Material

The `docs/reference/` directory contains preserved artifacts from the legacy runtime (e.g., `steering-roles.json`, `hooks-implementation.ts`). These serve as templates for users implementing the generated configurations in their own environments [AGENTS.md:18-18](<>).

For details on the steering roles and security policy models, see **[Reference Artifacts (#8.2)](#)**.

---

## Troubleshooting and Use Cases

The documentation provides a guide for common failure modes, such as:

- **409 Version Mismatch**: Occurs when the frontend uses an cached workflow version incompatible with the backend [docs/troubleshooting.md:68-73](<>).
- **422 Unsafe Bundle**: Triggered by secret detection or incomplete decision trees [docs/troubleshooting.md:82-93](<>).
- **Rate Limiting**: The `RATE_LIMIT_CREATOR` defaults to 120 RPM to accommodate the multiple `/evaluate` calls required for a full flow [docs/troubleshooting.md:51-56](<>).

**Sources:** [docs/troubleshooting.md:1-100](<>), [docs/use_cases.md:1-24](<>)
