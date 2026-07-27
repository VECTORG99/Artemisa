# Use Cases

Artemisa allows designing and generating configuration for development and operations agents through a deterministic decision tree.

## Creator

- Design agents from scratch: select stack, architecture, cloud, CI/CD, observability, and permissions.
- Obtain reproducible configuration bundles with blueprint, manifest hash, and installation guides.
- Evaluate multiple architectural paths by changing answers and recalculating the tree.
- Generate target configuration for Artemisa, Kiro, or portable.
- Document why each piece of the stack was chosen (`docs/WHY.md` generated).

## Out of Scope

Artemisa does not execute agents: there is no ReAct engine, LLM, RAG, MCP, or database (#584).
The application of the bundle and the execution of the agent occur on the platform chosen by the user.
As a reference for what to apply and how, see `docs/reference/`.

## Target audience

- Development teams that want to standardize the configuration of their agents.
- Projects that need explainable architecture documentation (WHY.md, INSTALL.md).
- Users of Kiro and Artemisa who are looking for a visual configuration builder.
