# CI/CD and Code Quality

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [.editorconfig](.editorconfig)
- [.github/CODEOWNERS](.github/CODEOWNERS)
- [.github/CODE_OF_CONDUCT.md](.github/CODE_OF_CONDUCT.md)
- [.github/ISSUE_TEMPLATE/bug_report.md](.github/ISSUE_TEMPLATE/bug_report.md)
- [.github/ISSUE_TEMPLATE/feature_request.md](.github/ISSUE_TEMPLATE/feature_request.md)
- [.github/SECURITY.md](.github/SECURITY.md)
- [.github/cliff.toml](.github/cliff.toml)
- [.github/pull_request_template.md](.github/pull_request_template.md)
- [.github/renovate.json](.github/renovate.json)
- [.github/workflows/ci-extended.yml](.github/workflows/ci-extended.yml)
- [.github/workflows/ci.yml](.github/workflows/ci.yml)
- [.github/workflows/release.yml](.github/workflows/release.yml)
- [.husky/pre-commit](.husky/pre-commit)
- [.lintstagedrc](.lintstagedrc)
- [.prettierignore](.prettierignore)
- [.prettierrc](.prettierrc)
- [Makefile](Makefile)
- [docker/Caddyfile.agent-creator](docker/Caddyfile.agent-creator)
- [docker/Dockerfile.agent-creator](docker/Dockerfile.agent-creator)
- [src/middleware/errorHandler.ts](src/middleware/errorHandler.ts)
- [test/batch-security-hardening.test.mjs](test/batch-security-hardening.test.mjs)
- [tsconfig.json](tsconfig.json)

</details>

This page documents the automated pipelines, quality enforcement mechanisms, and security sharding strategies implemented in the Artemisa repository. The system is designed to maintain a high bar for code quality across the monorepo while ensuring the stateless Creator backend remains secure and deterministic.

## GitHub Actions Workflows

Artemisa utilizes three primary GitHub Actions workflows to manage the lifecycle of the code from pull request to production release.

### 1. Primary CI (`ci.yml`)

The core CI pipeline runs on every push and pull request to `master` and `development` branches [.github/workflows/ci.yml:4-7](<>). It is divided into three parallel jobs:

- **Lint**: Performs static analysis using `tsc --noEmit` for type checking and `prettier --check` for formatting [.github/workflows/ci.yml:19-22](<>).
- **Test (Sharded)**: Executes backend tests using the native Node.js test runner. To optimize execution time, tests are sharded across three parallel runners using a matrix strategy [.github/workflows/ci.yml:29-30](<>). Shard 1 additionally handles the integration test suite [.github/workflows/ci.yml:43-45](<>).
- **Security**: Runs `npm audit` with a custom retry mechanism to handle potential npm registry brownouts or network errors (e.g., `ECONNRESET`, `503`) [.github/workflows/ci.yml:63-94](<>). It specifically targets critical vulnerabilities and is configured to be blocking (no `continue-on-error`) to prevent insecure code from merging [.github/workflows/ci.yml:47-92](<>).

### 2. Extended CI (`ci-extended.yml`)

Handles resource-intensive tasks that do not need to block the immediate feedback loop of the primary CI.

- **Coverage**: Generates code coverage reports using `c8` and uploads them as artifacts [.github/workflows/ci-extended.yml:20-27](<>).
- **Docker Build Verification**: Validates that all Dockerfiles (`backend`, `frontend`, and `agent-creator`) build correctly from the monorepo root [.github/workflows/ci-extended.yml:36-67](<>). It includes a health check verification where the backend container is started and polled at `/api/health` to ensure it is operational [.github/workflows/ci-extended.yml:68-80](<>).

### 3. Release Pipeline (`release.yml`)

Automates versioning and changelog generation when code reaches the `master` branch [.github/workflows/release.yml:3-5](<>).

- **git-cliff**: Uses `git-cliff` to calculate the next semantic version and generate `docs/CHANGELOG.md` based on conventional commits [.github/workflows/release.yml:30-40](<>).
- **Automated Tagging**: Updates `package.json`, creates a git tag, and generates a GitHub Release with the extracted changelog notes [.github/workflows/release.yml:42-65](<>).

**Sources:** [.github/workflows/ci.yml:1-99](<>), [.github/workflows/ci-extended.yml:1-81](<>), [.github/workflows/release.yml:1-66](<>)

## Code Quality and Enforcement

Artemisa enforces a strict set of rules for code style and structural integrity.

### Linting and Formatting

The project uses `Prettier` for code formatting, configured with a 120-character print width and single quotes [.prettierrc:1-9](<>). Certain directories like `dist`, `.next`, and `coverage` are ignored to prevent unnecessary processing [.prettierignore:1-13](<>).

### TypeScript Configuration

The root `tsconfig.json` defines the standard for the backend and shared packages:

- **Target**: `ES2022` with `NodeNext` module resolution [.tsconfig.json:3-4](<>).
- **Strictness**: `strict: true` and `noUncheckedIndexedAccess: true` are enabled to minimize runtime errors [.tsconfig.json:7-11](<>).
- **Dead Code**: `noUnusedLocals` and `noUnusedParameters` are enforced at the compiler level [.tsconfig.json:12-13](<>).

### Pre-commit Hooks

Local quality is enforced via `husky` and `lint-staged`. Before every commit, the system runs:

1.  `tsc --noEmit`: Ensures the change hasn't broken types.
2.  `prettier --write`: Automatically formats staged files.

**Sources:** [tsconfig.json:1-20](<>), [.prettierrc:1-9](<>), [.prettierignore:1-13](<>)

## Security Hardening Verification

Artemisa includes a specialized test suite, `test/batch-security-hardening.test.mjs`, which acts as a meta-linter to ensure security configurations do not regress.

| Feature Verified     | Implementation Detail                                                                                    | Source                                             |
| :------------------- | :------------------------------------------------------------------------------------------------------- | :------------------------------------------------- |
| **Error Leakage**    | `errorHandler.ts` must use `toLowerCase() === 'production'` and never include `stack` in JSON responses. | [test/batch-security-hardening.test.mjs:7-17](<>)  |
| **Timing Attacks**   | `metrics.ts` must use `crypto.timingSafeEqual` for token comparison.                                     | [test/batch-security-hardening.test.mjs:19-22](<>) |
| **CI Integrity**     | `ci.yml` must not contain `continue-on-error: true` in the security job.                                 | [test/batch-security-hardening.test.mjs:24-35](<>) |
| **Docker Security**  | `docker-compose.production.yml` must have empty `env_file` arrays to prevent accidental env loading.     | [test/batch-security-hardening.test.mjs:37-41](<>) |
| **Frontend Headers** | `next.config.ts` must include `X-Content-Type-Options` and `Referrer-Policy`.                            | [test/batch-security-hardening.test.mjs:49-55](<>) |

### CI/CD Data Flow and Security Sharding

The following diagram illustrates how code moves through the CI pipeline and how security checks are isolated.

```mermaid
graph TD
    subgraph "Developer Environment"
        "Dev[Developer]" -- "git commit" --> "Husky[Husky Hooks]"
        "Husky" --> "LintStaged[lint-staged]"
        "LintStaged" --> "TSC[tsc --noEmit]"
        "LintStaged" --> "Prettier[prettier --write]"
    end

    "Husky" -- "git push" --> "GitHub[GitHub Actions]"

    subgraph "ci.yml (Primary CI)"
        "GitHub" --> "LintJob[Job: lint]"
        "GitHub" --> "TestJob[Job: test]"
        "GitHub" --> "SecJob[Job: security]"

        "TestJob" --> "Shard1[Shard 1: Unit + Integration]"
        "TestJob" --> "Shard2[Shard 2: Unit]"
        "TestJob" --> "Shard3[Shard 3: Unit]"

        "SecJob" --> "Audit[npm audit --audit-level=critical]"
        "Audit" -- "Fail: Registry Error" --> "Retry[Retry Loop (3x)]"
        "Audit" -- "Fail: Vulnerability" --> "HardFail[Immediate Failure]"
    end

    subgraph "release.yml"
        "GitHub" -- "Merge to master" --> "Cliff[git-cliff]"
        "Cliff" --> "Changelog[Update docs/CHANGELOG.md]"
        "Changelog" --> "Tag[git tag vX.Y.Z]"
        "Tag" --> "GHRelease[gh release create]"
    end
```

**Sources:** [.github/workflows/ci.yml:25-98](<>), [test/batch-security-hardening.test.mjs:24-35](<>), [.github/workflows/release.yml:30-66](<>)

## Operational Safety in Code

The backend implementation of the `errorHandler` middleware demonstrates the "fail-safe" approach to security and quality. It ensures that while developers get full context in logs, external users receive only sanitized information.

```mermaid
graph TD
    "Err[Error Occurs]" --> "EH[errorHandler.ts]"
    "EH" --> "Log[logger.error]"
    "Log" -- "Includes" --> "Stack[err.stack]"
    "EH" --> "ProdCheck{isProduction?}"
    "ProdCheck" -- "Yes" --> "SafeResp[JSON Response: code + message]"
    "ProdCheck" -- "No" --> "DevResp[JSON Response: code + message + details]"

    style "Stack" stroke-dasharray: 5 5
    style "SafeResp" stroke-width: 2px
```

**Implementation Details:**

- **Logging**: The `logger.error` call in `src/middleware/errorHandler.ts` captures the full error object, including the stack trace, for server-side debugging [src/middleware/errorHandler.ts:8-9](<>).
- **Response Sanitization**: The `isProduction` flag (derived from `NODE_ENV`) determines if `formatted.details` are included in the response [src/middleware/errorHandler.ts:7-19](<>). The stack trace is explicitly excluded from the response payload regardless of environment [src/middleware/errorHandler.ts:11-12](<>).

**Sources:** [src/middleware/errorHandler.ts:1-21](<>), [test/batch-security-hardening.test.mjs:7-17](<>)
