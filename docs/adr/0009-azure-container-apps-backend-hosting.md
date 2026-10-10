# ADR-0009: Host the backend on Azure Container Apps (Consumption)

## Status

Accepted

## Context

- Before this decision the backend ran on DigitalOcean App Platform via `.do/app.yaml` (`instance_count: 1`, `basic-xxs`) and the frontend on Netlify. Hosting had never been recorded as an explicit decision, so the deploy path was documented per-provider rather than chosen. The DigitalOcean account and its credentials have since been cancelled, and `.do/app.yaml` was removed once Azure was serving.
- Per ADR-0008 the backend only generates configuration files: no database, no filesystem writes, no network calls during generation, no persistent disk. Every request is a pure function of its body. Cost is therefore dominated by CPU-seconds awake, not by state, storage or egress.
- `docker/Dockerfile.backend` already exists as a multi-stage build running as a non-root user with a `HEALTHCHECK`, and `src/routes/health.ts` already exposes `/api/health`, `/health/live` and `/health/ready`.
- `server.ts` already drains in-flight requests on `SIGTERM`/`SIGINT`, which is what a managed container platform sends when it recycles or scales a replica.
- Availability targets a single backend with no failover region. Multi-region is out of scope for this project's traffic.
- The image registry is a cost and supply-chain decision, not just a hosting one. Container Apps accepts arbitrary registries as an image source, and the identity model differs by environment type: a workload-profiles environment can pull with a system-assigned managed identity, but the Consumption-only environment this project needs provisions an **express** environment, and express environments reject `registries[].identity` outright with `ExpressEnvironmentFeatureNotSupported`. Verified by deployment, not by reading docs.

## Decision

- Deploy **only the backend** to Azure Container Apps on the Consumption plan, at about USD 9.29/month with `minReplicas: 1`. The frontend stays on Netlify and is not part of this deploy path. `agent-creator/` is not deployed at all (legacy, superseded by `frontend/agents/new`).
- `infra/main.bicep` owns the infrastructure. It creates one `Microsoft.ContainerRegistry`, one `Microsoft.App/managedEnvironments` and one `Microsoft.App/containerApps`. No role assignment: the deploy service principal needs only `Contributor` on the resource group.
- `workloadProfiles` is **omitted** from the environment, not set to `[]`. Omitting it yields a Consumption-only environment. An empty array creates a workload profiles environment, which bills a USD 0.10/h management fee (~USD 73/month) before any container runs.
- No `logAnalyticsConfiguration` and no `appInsightsConfiguration` are attached, so console output is not billed per GB ingested.
- The container runs at 0.25 vCPU / 0.5 GiB with `minReplicas: 1`, `maxReplicas: 5`, and a built-in HTTP scale rule at `concurrentRequests: 10`. `minReplicas` defaults to 1 rather than 2 to stay inside a USD 10/month budget; see Revisit Conditions.
- Liveness and readiness probes point at the existing `/health/live` and `/health/ready`. This is what lets the platform restart a wedged process without human intervention.
- Images are built by GitHub Actions from `docker/Dockerfile.backend`, pushed to Azure Container Registry, and tagged with the short commit SHA so a tag is immutable and a rollback target always resolves to the content it named.
- The container app pulls the image with the **ACR admin credential**, delivered as a `@secure()` Bicep parameter. The workflow reads it at deploy time with `az acr credential show` and hands it to the template inside a 600-mode file, so it never lands in GitHub, never lands in a process list and needs no rotation by anyone. A managed identity was the first choice and is not available here — see Alternatives Considered.
- `.github/workflows/deploy-azure.yml` gates the deploy on `https://<fqdn>/api/health` returning 200 and reverts to the previous image when the gate fails. A broken release cannot stay live while reporting success.
- `TRUST_PROXY=1` and `PUBLIC_BASE_URL` are declared in the Bicep rather than left to defaults, because both are prerequisites for correct behavior behind a TLS-terminating proxy and both fail silently when absent.
- The frontend authenticates with the same `ARTEMISA_API_KEYS` value it previously used against DigitalOcean, delivered as Netlify's `NEXT_PUBLIC_API_KEY`.

## Alternatives Considered

- Azure Kubernetes Service (AKS): rejected. The control plane with Uptime SLA costs ~USD 72/month plus nodes (~USD 148/month for two `D2as v5`), roughly USD 220/month total, for three stateless containers and no database. It buys no availability property that Container Apps does not already provide, and adds version upgrades, ingress, cert-manager and RBAC as ongoing work.
- Azure App Service B1 Linux: rejected. B1 is ~USD 55/month in `eastus` and its scale-out and deployment slots only unlock at S1 (~USD 69/month). Container Apps includes both in the Consumption price.
- Azure Functions Consumption: rejected. Its free grant would cover the traffic, but it requires rewriting `src/app.ts` (helmet, CORS, compression, rate limiting, body limits) into the Functions programming model, and the in-memory rate limiter does not hold across instances.
- A single burstable VM running `docker/docker-compose.production.yml`: rejected as the primary path. It is comparably cheap (~USD 9/month) but makes the host a single point of failure and transfers OS patching, TLS renewal and process supervision to a maintainer. It remains a reasonable fallback if the Azure account is unavailable.
- `ghcr.io` over Azure Container Registry: **accepted, then reversed, then partially reversed again.** GHCR has no registry fee but pulls with a PAT that only a human can create and that expires, so it fails late and silently. ACR Basic costs USD 0.1666/day (~USD 5.00/month) and was chosen to buy a managed identity instead. That half of the reasoning did not survive contact with Azure.
- Managed identity (`registries[].identity` + `AcrPull`): **rejected by the platform.** The Consumption-only environment provisions an express environment, and express environments return `ExpressEnvironmentFeatureNotSupported` for system-assigned managed identity on registry auth. The alternatives were both worse: a workload-profiles environment accepts it but bills USD 0.10/h (~USD 73/month), and going back to `ghcr.io` restores the expiring PAT. The ACR admin credential stays, because it costs nothing extra, works on express, and the workflow fetches it at deploy time so no human ever handles it.
- ACR admin credentials over a stored GitHub secret: **accepted.** The credential is read in the deploy job and passed as a `@secure` parameter through a 600-mode temp file. It is more exposed than a managed identity in principle, and less exposed than a PAT in practice, because it never enters a source control system and no one has to remember to rotate it.
- Container Apps secret store over Azure Key Vault: accepted for now. Key Vault adds a resource and a managed identity for three secrets on a project with one backend. Revisit if the secret count grows or if policy requires customer-managed key custody.

## Consequences

- The deploy cost is about USD 9.29/month (ACR Basic USD 5.00 + Container Apps ~USD 4.29 at `minReplicas: 1`) and roughly USD 15/month worst case at `minReplicas: 2` with normal traffic. Raising `minReplicas` to 2 buys availability-zone spread for ~USD 5.92 more and breaks a USD 10/month budget, which is why it is not the default.
- Availability depends on probes and `minReplicas >= 1`, not on the process being supervised. A wedged Node process is restarted by the platform rather than noticed by a human.
- Container Apps guarantees 99.95% monthly uptime with service credits, which is about 22 minutes of allowed downtime per month. There is no failover region, so a full region outage takes the API down.
- The deploy path is now split across two providers: backend on Azure, frontend on Netlify. A CORS or URL mismatch between them fails as `403 API_CORS_FORBIDDEN` with no other symptom, so `CORS_ALLOWED_ORIGINS` must track the Netlify origin exactly.
- `NEXT_PUBLIC_API_URL` is baked at build time, so repointing the frontend requires a Netlify rebuild, not just a variable change.
- Without `TRUST_PROXY=1` every request appears to originate from Container Apps' proxy, the per-IP rate limiter treats all users as one source, and real users are blocked after `RATE_LIMIT_GLOBAL` requests per minute. This is the most likely self-inflicted outage in this design and is why the value is pinned in the Bicep.
- Express environments cannot use a managed identity for registry auth, so the ACR admin credential is the only pull path on this plan. If the project ever moves to a workload-profiles environment (which would require accepting the ~USD 73/month management fee, or finding a cheaper way to get a non-express environment), switching to `registries[].identity` is a small, well-scoped change that deletes the credential path entirely.
- `.do/app.yaml` and the DigitalOcean deploy path have been **removed**. There is no second backend anymore, so a saturation event or a region outage is a plain outage with nothing to fail over to.

## Revisit Conditions

- Monthly cost exceeds roughly USD 50 without a corresponding traffic increase; check for an accidentally attached workload profiles environment or Log Analytics workspace before scaling anything down.
- Backend traffic sustains more than ~10 concurrent requests, or a full Auto-largo Creator run needs more than `RATE_LIMIT_CREATOR` headroom; raise `maxReplicas` or move to a workload profile.
- A database, durable state or server-side accounts are introduced, which breaks the stateless premise this pricing rests on (see ADR-0008).
- Availability requirements exceed 99.95%, which implies a second region behind a global traffic manager.
- ~~DigitalOcean is decommissioned and `.do/app.yaml` plus its section in `docs/deployment.md` and the DigitalOcean describe block in `test/deploy-security.test.mjs` are removed.~~ **Done.** The account was cancelled, and the config, its documentation section and its test block are gone.
