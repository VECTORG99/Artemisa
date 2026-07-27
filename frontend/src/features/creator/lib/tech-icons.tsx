/**
 * Brand/category icon resolution for Creator catalog items (issue #389).
 *
 * Option cards in `/agents/new` render a catalog item id (`typescript`,
 * `aws-lambda`, `github-mcp`, ...). This module turns that id into an icon so
 * the cards show a recognizable logo instead of plain text.
 *
 * Fallback chain, applied by `<TechIcon />`:
 *   1. `techIcon(id)` — exact brand/semantic icon for the catalog id.
 *   2. `categoryIcon(category)` — generic Lucide icon for the catalog category.
 *   3. `LuCircleDot` — neutral dot, used when neither id nor category is known.
 *
 * Notes on the icon sets:
 * - `react-icons/si` (Simple Icons) provides the real brand marks.
 * - `react-icons/lu` (Lucide) provides generic shapes.
 * - Simple Icons no longer ships Amazon/AWS or Microsoft Azure marks (verified
 *   against react-icons 5.7.0: zero `SiAmazon*` / `SiAzure*` exports), so those
 *   catalog ids are mapped to semantic Lucide icons that describe the service
 *   (queue, function, CDN, firewall, ...) instead of a logo. This keeps cloud
 *   service cards distinguishable from one another.
 * - Every imported symbol below was verified to exist in react-icons 5.7.0.
 *
 * Icons are decorative: the option card always renders the technology label
 * next to them, so they are `aria-hidden` and add no accessible name.
 */
import type { IconType } from 'react-icons';
import {
  SiAnsible,
  SiApacheairflow,
  SiApachecassandra,
  SiApacheflink,
  SiApachehadoop,
  SiApachekafka,
  SiApachespark,
  SiAngular,
  SiArgo,
  SiAssemblyscript,
  SiAstro,
  SiBitbucket,
  SiBrave,
  SiBurpsuite,
  SiC,
  SiCelery,
  SiCircleci,
  SiClojure,
  SiCloudflare,
  SiCoderabbit,
  SiConsul,
  SiCplusplus,
  SiCursor,
  SiCypress,
  SiDart,
  SiDatadog,
  SiDjango,
  SiDocker,
  SiDotnet,
  SiDvc,
  SiElastic,
  SiElasticsearch,
  SiElixir,
  SiEnvoyproxy,
  SiEthereum,
  SiExpo,
  SiExpress,
  SiFalco,
  SiFastapi,
  SiFastify,
  SiFirebase,
  SiFlask,
  SiFlutter,
  SiFlydotio,
  SiFortran,
  SiGin,
  SiGithub,
  SiGithubactions,
  SiGitlab,
  SiGnubash,
  SiGo,
  SiGooglebigquery,
  SiGooglecloud,
  SiGooglecloudspanner,
  SiGooglecloudstorage,
  SiGoogledataflow,
  SiGoogledataproc,
  SiGooglegemini,
  SiGooglepubsub,
  SiGrafana,
  SiGraphql,
  SiHaskell,
  SiHelm,
  SiHuggingface,
  SiIpfs,
  SiIstio,
  SiJaeger,
  SiJavascript,
  SiJenkins,
  SiJira,
  SiJulia,
  SiK3S,
  SiKalilinux,
  SiKaniko,
  SiKotlin,
  SiKubernetes,
  SiLangchain,
  SiLaravel,
  SiLinux,
  SiLua,
  SiMarkdown,
  SiMetasploit,
  SiMlflow,
  SiMongodb,
  SiMysql,
  SiN8N,
  SiNestjs,
  SiNextdotjs,
  SiNginx,
  SiNim,
  SiNixos,
  SiNomad,
  SiNuxt,
  SiNvidia,
  SiOllama,
  SiOnnx,
  SiOpenid,
  SiOpenjdk,
  SiOpentelemetry,
  SiOpenzeppelin,
  SiOpencv,
  SiOwasp,
  SiPandas,
  SiPerl,
  SiPhoenixframework,
  SiPhp,
  SiPodman,
  SiPolkadot,
  SiPolygon,
  SiPostgresql,
  SiPrefect,
  SiPrometheus,
  SiPulumi,
  SiPytest,
  SiPython,
  SiPytorch,
  SiQdrant,
  SiQuarkus,
  SiR,
  SiRay,
  SiReact,
  SiRedis,
  SiRender,
  SiRuby,
  SiRubyonrails,
  SiRust,
  SiScala,
  SiScikitlearn,
  SiSentry,
  SiSolidity,
  SiSonarqubeserver,
  SiSpacy,
  SiSpringboot,
  SiSqlite,
  SiSvelte,
  SiSwift,
  SiTemporal,
  SiTensorflow,
  SiTerraform,
  SiTraefikproxy,
  SiTrivy,
  SiTypescript,
  SiVault,
  SiVercel,
  SiVitest,
  SiVllm,
  SiVuedotjs,
  SiWeb3Dotjs,
  SiWeightsandbiases,
  SiWindsurf,
  SiWireguard,
  SiWireshark,
  SiZig,
} from 'react-icons/si';
import {
  LuActivity,
  LuAppWindow,
  LuArrowLeftRight,
  LuAtom,
  LuAudioWaveform,
  LuBlocks,
  LuBookOpen,
  LuBot,
  LuBoxes,
  LuBrainCircuit,
  LuBrickWall,
  LuBug,
  LuChartBar,
  LuChartLine,
  LuCircleDot,
  LuCloud,
  LuCode,
  LuCoins,
  LuContainer,
  LuCpu,
  LuDatabase,
  LuDatabaseZap,
  LuFileCode,
  LuFileSearch,
  LuFileText,
  LuFlaskConical,
  LuFolderGit2,
  LuFolderTree,
  LuGauge,
  LuGitBranch,
  LuGitPullRequest,
  LuGlobe,
  LuHardDrive,
  LuKeyRound,
  LuLayers,
  LuListChecks,
  LuLock,
  LuMailbox,
  LuMonitor,
  LuNetwork,
  LuPackage,
  LuPlug,
  LuRadioTower,
  LuScale,
  LuScanSearch,
  LuScrollText,
  LuSearch,
  LuServer,
  LuServerCog,
  LuShieldAlert,
  LuShieldCheck,
  LuShieldHalf,
  LuShuffle,
  LuSiren,
  LuSmartphone,
  LuSparkles,
  LuSplit,
  LuSquareFunction,
  LuTable,
  LuTerminal,
  LuTicket,
  LuTimer,
  LuUserCheck,
  LuWaves,
  LuWorkflow,
} from 'react-icons/lu';

/**
 * Catalog item id -> icon. Ids come from `src/creator/catalog.ts` (backend);
 * keep this map in sync when catalog items are added.
 */
const TECH_ICONS: Record<string, IconType> = {
  // --- language ---
  typescript: SiTypescript,
  javascript: SiJavascript,
  python: SiPython,
  java: SiOpenjdk,
  kotlin: SiKotlin,
  csharp: SiDotnet,
  go: SiGo,
  rust: SiRust,
  php: SiPhp,
  ruby: SiRuby,
  swift: SiSwift,
  dart: SiDart,
  cpp: SiCplusplus,
  elixir: SiElixir,
  assembly: SiAssemblyscript,
  zig: SiZig,
  nim: SiNim,
  scala: SiScala,
  'r-lang': SiR,
  julia: SiJulia,
  solidity: SiSolidity,
  lua: SiLua,
  haskell: SiHaskell,
  clojure: SiClojure,
  fortran: SiFortran,
  bash: SiGnubash,
  sql: LuTable,
  perl: SiPerl,
  vhdl: SiC,

  // --- frontend ---
  react: SiReact,
  nextjs: SiNextdotjs,
  vue: SiVuedotjs,
  nuxt: SiNuxt,
  angular: SiAngular,
  svelte: SiSvelte,
  sveltekit: SiSvelte,
  astro: SiAstro,

  // --- backend ---
  express: SiExpress,
  nestjs: SiNestjs,
  fastify: SiFastify,
  fastapi: SiFastapi,
  django: SiDjango,
  flask: SiFlask,
  'spring-boot': SiSpringboot,
  quarkus: SiQuarkus,
  'aspnet-core': SiDotnet,
  gin: SiGin,
  laravel: SiLaravel,
  rails: SiRubyonrails,
  phoenix: SiPhoenixframework,

  // --- mobile ---
  'react-native': SiReact,
  flutter: SiFlutter,
  'android-native': SiKotlin,
  'ios-native': SiSwift,
  expo: SiExpo,

  // --- data-ai ---
  pandas: SiPandas,
  spark: SiApachespark,
  pytorch: SiPytorch,
  tensorflow: SiTensorflow,
  langchain: SiLangchain,
  llamaindex: LuFileSearch,
  'vercel-ai-sdk': SiVercel,
  ollama: SiOllama,
  'scikit-learn': SiScikitlearn,
  huggingface: SiHuggingface,
  mlflow: SiMlflow,
  kubeflow: SiKubernetes,
  ray: SiRay,
  dbt: LuLayers,
  airflow: SiApacheairflow,
  kafka: SiApachekafka,
  flink: SiApacheflink,
  dvc: SiDvc,
  'weights-biases': SiWeightsandbiases,
  onnx: SiOnnx,
  triton: SiNvidia,
  'lora-finetuning': LuSparkles,
  vllm: SiVllm,
  'stable-diffusion': LuSparkles,
  opencv: SiOpencv,
  spacy: SiSpacy,

  // --- database ---
  postgresql: SiPostgresql,
  mysql: SiMysql,
  sqlite: SiSqlite,
  mongodb: SiMongodb,
  dynamodb: LuDatabaseZap,
  redis: SiRedis,
  cassandra: SiApachecassandra,
  elasticsearch: SiElasticsearch,
  pgvector: SiPostgresql,
  pinecone: LuAtom,
  qdrant: SiQdrant,

  // --- architecture (no brands; semantic Lucide shapes) ---
  'modular-monolith': LuBlocks,
  monolith: LuPackage,
  microservices: LuBoxes,
  serverless: LuSquareFunction,
  'event-driven': LuRadioTower,
  hexagonal: LuBrickWall,
  'clean-architecture': LuLayers,
  cqrs: LuSplit,
  'data-pipeline': LuWaves,

  // --- testing ---
  'unit-tests': SiVitest,
  'integration-tests': SiPytest,
  'e2e-tests': SiCypress,
  'contract-tests': LuArrowLeftRight,
  sast: SiSonarqubeserver,
  'dependency-scan': SiTrivy,

  // --- cicd ---
  'github-actions': SiGithubactions,
  'gitlab-ci': SiGitlab,
  jenkins: SiJenkins,
  circleci: SiCircleci,
  'azure-devops': LuWorkflow,
  argocd: SiArgo,

  // --- infrastructure ---
  terraform: SiTerraform,
  pulumi: SiPulumi,
  cloudformation: LuFileCode,
  bicep: LuFileCode,
  ansible: SiAnsible,
  crossplane: SiKubernetes,
  cdk: LuFileCode,
  nixos: SiNixos,

  // --- container ---
  docker: SiDocker,
  'docker-compose': SiDocker,
  kubernetes: SiKubernetes,
  k3s: SiK3S,
  helm: SiHelm,
  nomad: SiNomad,
  podman: SiPodman,
  buildkit: SiKaniko,
  'argocd-deploy': SiArgo,

  // --- cloud: AWS (Simple Icons has no AWS marks; semantic icons instead) ---
  'aws-ec2': LuServer,
  'aws-ecs': LuContainer,
  'aws-eks': SiKubernetes,
  'aws-lambda': LuSquareFunction,
  'aws-s3': LuHardDrive,
  'aws-rds': LuDatabase,
  'aws-sqs': LuMailbox,
  'aws-sns': LuRadioTower,
  'aws-eventbridge': LuShuffle,
  'aws-api-gateway': LuGlobe,
  'aws-cognito': LuUserCheck,
  'aws-bedrock': LuBrainCircuit,
  'aws-cloudfront': LuNetwork,
  'aws-waf': LuBrickWall,
  'aws-guardduty': LuShieldAlert,
  'aws-kinesis': LuAudioWaveform,
  'aws-glue': LuWaves,
  'aws-athena': LuSearch,
  'aws-emr': SiApachehadoop,
  'aws-elasticache': SiRedis,
  'aws-step-functions': LuWorkflow,
  'aws-codepipeline': LuGitBranch,
  'aws-iot-core': LuCpu,

  // --- cloud: Azure (Simple Icons has no Azure marks) ---
  'azure-vm': LuServer,
  'azure-container-apps': LuContainer,
  'azure-aks': SiKubernetes,
  'azure-cosmos-db': LuDatabase,
  'azure-functions': LuSquareFunction,
  'azure-app-service': LuAppWindow,
  'azure-service-bus': LuMailbox,
  'azure-event-grid': LuShuffle,
  'azure-openai': LuBrainCircuit,
  'azure-sentinel': LuSiren,
  'azure-front-door': LuNetwork,
  'azure-redis': SiRedis,
  'azure-synapse': LuChartBar,
  'azure-data-factory': LuWaves,
  'azure-devops-boards': LuListChecks,
  'azure-iot-hub': LuCpu,

  // --- cloud: GCP + managed hosting ---
  'gcp-compute': SiGooglecloud,
  'gcp-cloud-run': SiGooglecloud,
  'gcp-gke': SiKubernetes,
  'gcp-bigquery': SiGooglebigquery,
  'gcp-pubsub': SiGooglepubsub,
  'gcp-cloud-functions': SiGooglecloud,
  'gcp-app-engine': SiGooglecloud,
  'gcp-firestore': SiFirebase,
  'gcp-spanner': SiGooglecloudspanner,
  'gcp-dataflow': SiGoogledataflow,
  'gcp-dataproc': SiGoogledataproc,
  'gcp-cloud-armor': LuShieldHalf,
  'gcp-vertex-search': SiGooglegemini,
  'gcp-cloud-sql': SiGooglecloudstorage,
  'gcp-iot-core': LuCpu,
  vercel: SiVercel,
  render: SiRender,
  flyio: SiFlydotio,
  vps: SiLinux,

  // --- observability ---
  opentelemetry: SiOpentelemetry,
  'prometheus-grafana': SiPrometheus,
  cloudwatch: LuGauge,
  datadog: SiDatadog,
  sentry: SiSentry,
  'elastic-observability': SiElastic,
  jaeger: SiJaeger,
  loki: SiGrafana,
  'vector-observ': LuAudioWaveform,

  // --- security ---
  oidc: SiOpenid,
  'secrets-manager': LuKeyRound,
  'least-privilege': LuLock,
  sbom: LuScrollText,
  'container-scan': SiTrivy,
  'policy-as-code': LuScale,

  // --- repository ---
  github: SiGithub,
  gitlab: SiGitlab,
  bitbucket: SiBitbucket,
  'azure-repos': LuFolderGit2,
  'local-repository': LuFolderTree,

  // --- agent-platform ---
  // The 7 catalog targets (src/creator/catalog.ts, category 'agent-platform').
  // Brand marks come from Simple Icons when one exists; Kilo Code has no
  // Simple Icon entry so it falls back to a semantic Lucide shape. Each card
  // also renders the platform label, so the icon is decorative (aria-hidden).
  huascar: LuBot,
  'agents-md': SiMarkdown,
  cursor: SiCursor,
  'devin-desktop': SiWindsurf,
  coderabbit: SiCoderabbit,
  'kilo-code': LuBoxes,
  kiro: LuSparkles,
  portable: LuFileText,

  // --- knowledge ---
  'repository-docs': LuBookOpen,
  'source-code': LuCode,
  'web-documentation': LuGlobe,
  tickets: LuTicket,
  runbooks: LuTerminal,
  'rag-vector-store': LuAtom,

  // --- blockchain ---
  ethereum: SiEthereum,
  hardhat: SiOpenzeppelin,
  foundry: SiSolidity,
  web3js: SiWeb3Dotjs,
  ipfs: SiIpfs,
  polygon: SiPolygon,
  substrate: SiPolkadot,
  'cosmos-sdk': LuCoins,

  // --- cybersecurity ---
  burpsuite: SiBurpsuite,
  metasploit: SiMetasploit,
  nmap: LuScanSearch,
  wireshark: SiWireshark,
  'owasp-zap': SiOwasp,
  'snort-suricata': LuSiren,
  wazuh: LuShieldCheck,
  'kali-tools': SiKalilinux,
  osquery: LuTerminal,
  vault: SiVault,
  trivy: SiTrivy,
  falco: SiFalco,
  sonarqube: SiSonarqubeserver,

  // --- networking ---
  nginx: SiNginx,
  envoy: SiEnvoyproxy,
  istio: SiIstio,
  consul: SiConsul,
  traefik: SiTraefikproxy,
  wireguard: SiWireguard,
  cloudflare: SiCloudflare,

  // --- mlops ---
  sagemaker: LuBrainCircuit,
  'vertex-ai': SiGooglecloud,
  'azure-ml': LuBrainCircuit,
  bentoml: LuPackage,
  seldon: SiKubernetes,
  evidently: LuChartLine,
  'label-studio': LuListChecks,
  feast: LuTable,

  // --- automation ---
  n8n: SiN8N,
  temporal: SiTemporal,
  prefect: SiPrefect,
  celery: SiCelery,
  bull: SiRedis,
  'step-functions': LuWorkflow,
  'github-actions-wf': SiGithubactions,

  // --- skill ---
  'code-reviewer': LuGitPullRequest,
  'security-auditor': LuShieldCheck,
  'test-master': LuFlaskConical,
  'devops-engineer': LuServerCog,
  'api-designer': SiGraphql,
  'database-optimizer': LuDatabase,
  'architecture-designer': LuBlocks,
  'legacy-modernizer': LuTimer,

  // --- mcp ---
  'github-mcp': SiGithub,
  'atlassian-mcp': SiJira,
  'context7-mcp': LuBookOpen,
  'postgres-mcp': SiPostgresql,
  'playwright-mcp': LuMonitor,
  'brave-search': SiBrave,
};

/** Category id -> generic Lucide icon, used when the item id has no entry. */
const CATEGORY_ICONS: Record<string, IconType> = {
  language: LuCode,
  frontend: LuMonitor,
  backend: LuServer,
  mobile: LuSmartphone,
  'data-ai': LuBrainCircuit,
  database: LuDatabase,
  architecture: LuBlocks,
  testing: LuFlaskConical,
  cicd: LuGitBranch,
  infrastructure: LuLayers,
  container: LuContainer,
  cloud: LuCloud,
  observability: LuActivity,
  security: LuShieldCheck,
  repository: LuFolderGit2,
  'agent-platform': LuBot,
  knowledge: LuBookOpen,
  blockchain: LuCoins,
  cybersecurity: LuBug,
  networking: LuNetwork,
  mlops: LuCpu,
  automation: LuWorkflow,
  skill: LuSparkles,
  mcp: LuPlug,
};

/** Neutral placeholder when neither the id nor the category is recognized. */
const FALLBACK_ICON: IconType = LuCircleDot;

/** Strip the `custom:` prefix used by the Creator for user-provided entries. */
function normalizeId(id: string): { slug: string; isCustom: boolean } {
  const trimmed = id.trim();
  if (trimmed.startsWith('custom:')) {
    return { slug: trimmed.slice('custom:'.length).toLowerCase(), isCustom: true };
  }
  return { slug: trimmed.toLowerCase(), isCustom: false };
}

/**
 * Brand (or semantic) icon for a catalog item id.
 * Returns `null` for unknown ids and for any `custom:*` entry, since a
 * user-defined technology has no logo we can trust.
 */
export function techIcon(id: string): IconType | null {
  if (!id) return null;
  const { slug, isCustom } = normalizeId(id);
  if (isCustom) return null;
  return TECH_ICONS[slug] ?? null;
}

/** Generic icon for a catalog category; always resolves to something. */
export function categoryIcon(category: string): IconType {
  if (!category) return FALLBACK_ICON;
  return CATEGORY_ICONS[category.trim().toLowerCase()] ?? FALLBACK_ICON;
}

/**
 * Decorative icon for an option card: brand icon -> category icon -> dot.
 * Always `aria-hidden`, because the adjacent label already names the item.
 */
export function TechIcon({
  id,
  category,
  className,
  style,
}: {
  id: string;
  category?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Icon = techIcon(id) ?? (category ? categoryIcon(category) : FALLBACK_ICON);
  return <Icon aria-hidden="true" focusable="false" className={className} style={style} />;
}
