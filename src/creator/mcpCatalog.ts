/**
 * Curated, versioned snapshot of real MCP servers — not a live fetch.
 *
 * Same rationale as skillsCatalog.ts: static data instead of querying
 * mcpservers.org at request time, to keep the Creator stateless/network-free
 * and match the project's current low-infra-load priority. Entries are
 * curated from https://mcpservers.org — a representative sample of listed
 * servers, not the full directory. Update by re-curating from the source.
 */

export interface McpCatalogItem {
  id: string;
  name: string;
  description: string;
  category:
    | 'development'
    | 'productivity'
    | 'database'
    | 'search'
    | 'web-scraping'
    | 'file-system'
    | 'version-control'
    | 'communication'
    | 'cloud-service'
    | 'observability'
    | 'storage'
    | 'security'
    | 'ai-model'
    | 'analytics'
    | 'payments'
    | 'design'
    | 'cms';
  official: boolean;
  tags: string[];
  sourceUrl: string;
}

const MCP_CATALOG_VERSION = '1.2.0';

export const mcpCatalog: McpCatalogItem[] = [
  {
    id: 'github-mcp-server',
    name: 'GitHub MCP',
    description:
      'Servidor oficial de GitHub para búsqueda de repositorios, issues, pull requests, contexto de código y flujos de trabajo de GitHub.',
    category: 'version-control',
    official: true,
    tags: ['github', 'pull-requests', 'issues'],
    sourceUrl: 'https://mcpservers.org/es/servers/github-mcp-server',
  },
  {
    id: 'playwright-mcp-server',
    name: 'Playwright MCP',
    description:
      'Automatización de navegadores, inspección de páginas, capturas de pantalla e interacción web para agentes.',
    category: 'web-scraping',
    official: true,
    tags: ['browser', 'automation', 'testing'],
    sourceUrl: 'https://mcpservers.org/es/servers/playwright-mcp-server',
  },
  {
    id: 'context7-mcp-server',
    name: 'Context7 MCP',
    description:
      'Incorpora documentación de bibliotecas actualizada y específica por versión, con ejemplos de código, en las indicaciones de codificación.',
    category: 'development',
    official: true,
    tags: ['documentation', 'context', 'libraries'],
    sourceUrl: 'https://mcpservers.org/es/servers/context7-mcp-server',
  },
  {
    id: 'deepwiki',
    name: 'DeepWiki by Devin',
    description: 'Servidor MCP remoto que proporciona contexto y respuestas sobre bases de código impulsadas por IA.',
    category: 'development',
    official: true,
    tags: ['codebase', 'context', 'qa'],
    sourceUrl: 'https://mcpservers.org/es/servers/devin/deepwiki',
  },
  {
    id: 'firecrawl-mcp-server',
    name: 'Firecrawl MCP',
    description: 'Añade capacidades de raspado web y búsqueda estructurada a clientes LLM.',
    category: 'web-scraping',
    official: true,
    tags: ['scraping', 'search', 'web'],
    sourceUrl: 'https://mcpservers.org/es/servers/firecrawl-mcp-server',
  },
  {
    id: 'exa-mcp',
    name: 'Exa MCP',
    description: 'Motor de búsqueda diseñado específicamente para consumo por agentes de IA.',
    category: 'search',
    official: true,
    tags: ['search', 'retrieval'],
    sourceUrl: 'https://mcpservers.org/es/servers/exa-labs/exa-mcp-server',
  },
  {
    id: 'supabase-mcp-server',
    name: 'Supabase MCP',
    description: 'Gestión de proyectos, bases de datos, autenticación, almacenamiento y funciones edge de Supabase.',
    category: 'database',
    official: true,
    tags: ['postgres', 'database', 'auth'],
    sourceUrl: 'https://mcpservers.org/es/servers/supabase-mcp-server',
  },
  {
    id: 'cloudflare-mcp',
    name: 'Cloudflare MCP',
    description: 'Despliega, configura e interroga recursos en la plataforma de desarrolladores de Cloudflare.',
    category: 'cloud-service',
    official: true,
    tags: ['cloudflare', 'workers', 'kv'],
    sourceUrl: 'https://mcpservers.org/es/servers/cloudflare/mcp-server-cloudflare',
  },
  {
    id: 'chrome-devtools-mcp',
    name: 'Chrome DevTools MCP',
    description: 'Controla e inspecciona un navegador Chrome en vivo desde agentes de codificación.',
    category: 'development',
    official: true,
    tags: ['browser', 'debugging', 'devtools'],
    sourceUrl: 'https://mcpservers.org/es/servers/chrome-devtools-mcp-server',
  },
  {
    id: 'atlassian-mcp-server',
    name: 'Atlassian MCP',
    description: 'Conecta agentes de IA a Jira, Confluence, Opsgenie y otros productos de Atlassian.',
    category: 'productivity',
    official: true,
    tags: ['jira', 'confluence', 'project-management'],
    sourceUrl: 'https://mcpservers.org/es/servers/atlassian-mcp-server',
  },
  {
    id: 'railway-mcp',
    name: 'Railway MCP',
    description:
      'Interacción en lenguaje natural con proyectos e infraestructura de Railway: despliegue, entornos y variables.',
    category: 'cloud-service',
    official: true,
    tags: ['deployment', 'infrastructure', 'railway'],
    sourceUrl: 'https://mcpservers.org/es/servers/railway-mcp',
  },
  {
    id: 'granola-mcp',
    name: 'Granola MCP',
    description: 'Conecta agentes a notas de reuniones de Granola: transcripciones, búsqueda e insights.',
    category: 'communication',
    official: true,
    tags: ['meetings', 'notes', 'transcripts'],
    sourceUrl: 'https://mcpservers.org/es/servers/granola-mcp',
  },
  {
    id: 'slack-mcp-server',
    name: 'Slack MCP',
    description: 'Servidor oficial de Slack para leer canales, enviar mensajes y gestionar workspaces desde agentes.',
    category: 'communication',
    official: true,
    tags: ['slack', 'chat', 'notifications'],
    sourceUrl: 'https://mcpservers.org/es/servers/slack-mcp-server',
  },
  {
    id: 'discord-mcp-server',
    name: 'Discord MCP',
    description: 'Interacción con servidores de Discord: canales, mensajes y gestión de roles para bots de agentes.',
    category: 'communication',
    official: false,
    tags: ['discord', 'chat', 'bots'],
    sourceUrl: 'https://mcpservers.org/es/servers/discord-mcp-server',
  },
  {
    id: 'linear-mcp-server',
    name: 'Linear MCP',
    description: 'Servidor oficial de Linear para crear, actualizar y consultar issues, proyectos y ciclos.',
    category: 'productivity',
    official: true,
    tags: ['linear', 'issues', 'project-management'],
    sourceUrl: 'https://mcpservers.org/es/servers/linear-mcp-server',
  },
  {
    id: 'notion-mcp-server',
    name: 'Notion MCP',
    description: 'Servidor oficial de Notion: lectura y escritura de páginas, bases de datos y bloques.',
    category: 'productivity',
    official: true,
    tags: ['notion', 'docs', 'databases'],
    sourceUrl: 'https://mcpservers.org/es/servers/notion-mcp-server',
  },
  {
    id: 'jira-mcp-server',
    name: 'Jira MCP',
    description: 'Gestión de tickets, sprints y flujos de trabajo de Jira desde agentes de IA.',
    category: 'productivity',
    official: false,
    tags: ['jira', 'tickets', 'agile'],
    sourceUrl: 'https://mcpservers.org/es/servers/jira-mcp-server',
  },
  {
    id: 'confluence-mcp-server',
    name: 'Confluence MCP',
    description: 'Lectura y creación de páginas de documentación en espacios de Confluence.',
    category: 'productivity',
    official: false,
    tags: ['confluence', 'documentation', 'wiki'],
    sourceUrl: 'https://mcpservers.org/es/servers/confluence-mcp-server',
  },
  {
    id: 'aws-mcp-server',
    name: 'AWS MCP',
    description: 'Consulta y gestiona recursos de AWS (CloudWatch, S3, Lambda, EC2) desde agentes de codificación.',
    category: 'cloud-service',
    official: true,
    tags: ['aws', 's3', 'cloudwatch', 'lambda'],
    sourceUrl: 'https://mcpservers.org/es/servers/aws-mcp-server',
  },
  {
    id: 'gcp-mcp-server',
    name: 'Google Cloud MCP',
    description: 'Gestión de recursos de Google Cloud Platform: Compute Engine, Cloud Storage, BigQuery.',
    category: 'cloud-service',
    official: false,
    tags: ['gcp', 'bigquery', 'compute'],
    sourceUrl: 'https://mcpservers.org/es/servers/gcp-mcp-server',
  },
  {
    id: 'azure-mcp-server',
    name: 'Azure MCP',
    description: 'Servidor oficial de Microsoft para gestionar recursos de Azure desde agentes de IA.',
    category: 'cloud-service',
    official: true,
    tags: ['azure', 'microsoft', 'cloud'],
    sourceUrl: 'https://mcpservers.org/es/servers/azure-mcp-server',
  },
  {
    id: 'sentry-mcp-server',
    name: 'Sentry MCP',
    description: 'Servidor oficial de Sentry para consultar errores, stack traces y performance issues.',
    category: 'observability',
    official: true,
    tags: ['sentry', 'errors', 'monitoring'],
    sourceUrl: 'https://mcpservers.org/es/servers/sentry-mcp-server',
  },
  {
    id: 'datadog-mcp-server',
    name: 'Datadog MCP',
    description: 'Consulta métricas, logs, dashboards y alertas de Datadog desde agentes de observabilidad.',
    category: 'observability',
    official: false,
    tags: ['datadog', 'metrics', 'logs'],
    sourceUrl: 'https://mcpservers.org/es/servers/datadog-mcp-server',
  },
  {
    id: 'pagerduty-mcp-server',
    name: 'PagerDuty MCP',
    description: 'Gestión de incidentes, escalamiento y on-call schedules de PagerDuty desde agentes.',
    category: 'observability',
    official: false,
    tags: ['pagerduty', 'incidents', 'on-call'],
    sourceUrl: 'https://mcpservers.org/es/servers/pagerduty-mcp-server',
  },
  {
    id: 'grafana-mcp-server',
    name: 'Grafana MCP',
    description: 'Servidor oficial de Grafana para consultar dashboards, paneles y datasources.',
    category: 'observability',
    official: true,
    tags: ['grafana', 'dashboards', 'metrics'],
    sourceUrl: 'https://mcpservers.org/es/servers/grafana-mcp-server',
  },
  {
    id: 'google-drive-mcp-server',
    name: 'Google Drive MCP',
    description: 'Búsqueda, lectura y escritura de archivos y documentos en Google Drive y Google Docs.',
    category: 'storage',
    official: false,
    tags: ['google-drive', 'docs', 'files'],
    sourceUrl: 'https://mcpservers.org/es/servers/google-drive-mcp-server',
  },
  {
    id: 'aws-s3-mcp-server',
    name: 'AWS S3 MCP',
    description: 'Operaciones de lectura, escritura y listado de objetos en buckets de Amazon S3.',
    category: 'storage',
    official: false,
    tags: ['s3', 'storage', 'aws'],
    sourceUrl: 'https://mcpservers.org/es/servers/aws-s3-mcp-server',
  },
  {
    id: 'dropbox-mcp-server',
    name: 'Dropbox MCP',
    description: 'Acceso a archivos y carpetas de Dropbox: listar, leer, subir y compartir desde agentes.',
    category: 'storage',
    official: false,
    tags: ['dropbox', 'files', 'storage'],
    sourceUrl: 'https://mcpservers.org/es/servers/dropbox-mcp-server',
  },
  {
    id: 'postgres-mcp-server',
    name: 'Postgres MCP',
    description: 'Consultas de solo lectura y exploración de esquemas sobre bases de datos PostgreSQL.',
    category: 'database',
    official: true,
    tags: ['postgres', 'sql', 'database'],
    sourceUrl: 'https://mcpservers.org/es/servers/postgres-mcp-server',
  },
  {
    id: 'mongodb-mcp-server',
    name: 'MongoDB MCP',
    description: 'Servidor oficial de MongoDB para consultar colecciones, ejecutar agregaciones y explorar esquemas.',
    category: 'database',
    official: true,
    tags: ['mongodb', 'nosql', 'database'],
    sourceUrl: 'https://mcpservers.org/es/servers/mongodb-mcp-server',
  },
  {
    id: 'stripe-mcp-server',
    name: 'Stripe MCP',
    description: 'Servidor oficial de Stripe para gestionar clientes, pagos, suscripciones y facturación.',
    category: 'development',
    official: true,
    tags: ['stripe', 'payments', 'billing'],
    sourceUrl: 'https://mcpservers.org/es/servers/stripe-mcp-server',
  },
  {
    id: 'figma-mcp-server',
    name: 'Figma MCP',
    description: 'Servidor oficial de Figma para extraer diseños, componentes y tokens directamente en el código.',
    category: 'development',
    official: true,
    tags: ['figma', 'design', 'components'],
    sourceUrl: 'https://mcpservers.org/es/servers/figma-mcp-server',
  },
  {
    id: 'vercel-mcp-server',
    name: 'Vercel MCP',
    description: 'Servidor oficial de Vercel para gestionar despliegues, dominios y variables de entorno de proyectos.',
    category: 'cloud-service',
    official: true,
    tags: ['vercel', 'deployment', 'hosting'],
    sourceUrl: 'https://mcpservers.org/es/servers/vercel-mcp-server',
  },
  // ─── version-control (+3) ────────────────────────────────────────────
  {
    id: 'gitlab-mcp-server',
    name: 'GitLab MCP',
    description: 'Gestión de repos, merge requests, pipelines y CI/CD de GitLab.',
    category: 'version-control',
    official: true,
    tags: ['gitlab', 'ci-cd', 'merge-requests'],
    sourceUrl: 'https://mcpservers.org/es/servers/gitlab-mcp-server',
  },
  {
    id: 'bitbucket-mcp-server',
    name: 'Bitbucket MCP',
    description: 'Repos, pull requests y pipelines de Atlassian Bitbucket.',
    category: 'version-control',
    official: false,
    tags: ['bitbucket', 'atlassian', 'pipelines'],
    sourceUrl: 'https://mcpservers.org/es/servers/bitbucket-mcp-server',
  },
  {
    id: 'gitea-mcp-server',
    name: 'Gitea MCP',
    description: 'Alternativa self-hosted para repos Git con issues y CI.',
    category: 'version-control',
    official: false,
    tags: ['gitea', 'self-hosted', 'git'],
    sourceUrl: 'https://mcpservers.org/es/servers/gitea-mcp-server',
  },
  // ─── development (+5) ────────────────────────────────────────────────
  {
    id: 'cursor-mcp-server',
    name: 'Cursor MCP',
    description: 'Extensiones y contexto para el editor Cursor.',
    category: 'development',
    official: true,
    tags: ['cursor', 'editor', 'ide'],
    sourceUrl: 'https://mcpservers.org/es/servers/cursor-mcp-server',
  },
  {
    id: 'docker-mcp-server',
    name: 'Docker MCP',
    description: 'Gestión de contenedores, imágenes y compose desde agentes.',
    category: 'development',
    official: true,
    tags: ['docker', 'containers', 'devops'],
    sourceUrl: 'https://mcpservers.org/es/servers/docker-mcp-server',
  },
  {
    id: 'kubernetes-mcp-server',
    name: 'Kubernetes MCP',
    description: 'Inspección y gestión de clusters, pods y deployments.',
    category: 'development',
    official: false,
    tags: ['kubernetes', 'k8s', 'orchestration'],
    sourceUrl: 'https://mcpservers.org/es/servers/kubernetes-mcp-server',
  },
  {
    id: 'terraform-mcp-server',
    name: 'Terraform MCP',
    description: 'Plan, apply y state de infraestructura como código.',
    category: 'development',
    official: true,
    tags: ['terraform', 'iac', 'hashicorp'],
    sourceUrl: 'https://mcpservers.org/es/servers/terraform-mcp-server',
  },
  {
    id: 'npm-mcp-server',
    name: 'npm MCP',
    description: 'Búsqueda de paquetes, versiones, vulnerabilidades y metadata.',
    category: 'development',
    official: false,
    tags: ['npm', 'packages', 'nodejs'],
    sourceUrl: 'https://mcpservers.org/es/servers/npm-mcp-server',
  },
  // ─── productivity (+6) ───────────────────────────────────────────────
  {
    id: 'asana-mcp-server',
    name: 'Asana MCP',
    description: 'Tareas, proyectos y workspaces de Asana.',
    category: 'productivity',
    official: true,
    tags: ['asana', 'tasks', 'project-management'],
    sourceUrl: 'https://mcpservers.org/es/servers/asana-mcp-server',
  },
  {
    id: 'clickup-mcp-server',
    name: 'ClickUp MCP',
    description: 'Proyectos, tareas, espacios y documentos de ClickUp.',
    category: 'productivity',
    official: true,
    tags: ['clickup', 'tasks', 'project-management'],
    sourceUrl: 'https://mcpservers.org/es/servers/clickup-mcp-server',
  },
  {
    id: 'todoist-mcp-server',
    name: 'Todoist MCP',
    description: 'Tareas personales y de equipo con prioridades y etiquetas.',
    category: 'productivity',
    official: false,
    tags: ['todoist', 'tasks', 'personal'],
    sourceUrl: 'https://mcpservers.org/es/servers/todoist-mcp-server',
  },
  {
    id: 'airtable-mcp-server',
    name: 'Airtable MCP',
    description: 'Bases de datos relacionales, vistas y automaciones.',
    category: 'productivity',
    official: true,
    tags: ['airtable', 'database', 'no-code'],
    sourceUrl: 'https://mcpservers.org/es/servers/airtable-mcp-server',
  },
  {
    id: 'monday-mcp-server',
    name: 'Monday MCP',
    description: 'Boards, items y automaciones de Monday.com.',
    category: 'productivity',
    official: false,
    tags: ['monday', 'boards', 'project-management'],
    sourceUrl: 'https://mcpservers.org/es/servers/monday-mcp-server',
  },
  {
    id: 'obsidian-mcp-server',
    name: 'Obsidian MCP',
    description: 'Notas en Markdown, backlinks y búsqueda en vaults.',
    category: 'productivity',
    official: false,
    tags: ['obsidian', 'notes', 'markdown'],
    sourceUrl: 'https://mcpservers.org/es/servers/obsidian-mcp-server',
  },
  // ─── database (+5) ──────────────────────────────────────────────────
  {
    id: 'neon-mcp-server',
    name: 'Neon MCP',
    description: 'Postgres serverless con branching, SQL y documentación.',
    category: 'database',
    official: true,
    tags: ['neon', 'postgres', 'serverless'],
    sourceUrl: 'https://mcpservers.org/es/servers/neon-mcp-server',
  },
  {
    id: 'redis-mcp-server',
    name: 'Redis MCP',
    description: 'Operaciones key-value, streams y pub/sub.',
    category: 'database',
    official: false,
    tags: ['redis', 'cache', 'key-value'],
    sourceUrl: 'https://mcpservers.org/es/servers/redis-mcp-server',
  },
  {
    id: 'mysql-mcp-server',
    name: 'MySQL MCP',
    description: 'Consultas, esquemas y administración de MySQL/MariaDB.',
    category: 'database',
    official: false,
    tags: ['mysql', 'mariadb', 'sql'],
    sourceUrl: 'https://mcpservers.org/es/servers/mysql-mcp-server',
  },
  {
    id: 'turso-mcp-server',
    name: 'Turso MCP',
    description: 'SQLite distribuido edge con libSQL.',
    category: 'database',
    official: false,
    tags: ['turso', 'sqlite', 'edge'],
    sourceUrl: 'https://mcpservers.org/es/servers/turso-mcp-server',
  },
  {
    id: 'clickhouse-mcp-server',
    name: 'ClickHouse MCP',
    description: 'Consultas OLAP de alto rendimiento sobre datos columnares.',
    category: 'database',
    official: false,
    tags: ['clickhouse', 'olap', 'analytics'],
    sourceUrl: 'https://mcpservers.org/es/servers/clickhouse-mcp-server',
  },
  // ─── communication (+3) ─────────────────────────────────────────────
  {
    id: 'email-mcp-server',
    name: 'Email MCP',
    description: 'Envío, lectura y gestión de emails via SMTP/IMAP.',
    category: 'communication',
    official: false,
    tags: ['email', 'smtp', 'imap'],
    sourceUrl: 'https://mcpservers.org/es/servers/email-mcp-server',
  },
  {
    id: 'telegram-mcp-server',
    name: 'Telegram MCP',
    description: 'Mensajes, bots y gestión de grupos de Telegram.',
    category: 'communication',
    official: false,
    tags: ['telegram', 'messaging', 'bots'],
    sourceUrl: 'https://mcpservers.org/es/servers/telegram-mcp-server',
  },
  {
    id: 'microsoft-teams-mcp-server',
    name: 'Microsoft Teams MCP',
    description: 'Canales, mensajes y reuniones de Teams.',
    category: 'communication',
    official: false,
    tags: ['teams', 'microsoft', 'collaboration'],
    sourceUrl: 'https://mcpservers.org/es/servers/microsoft-teams-mcp-server',
  },
  // ─── cloud-service (+4) ─────────────────────────────────────────────
  {
    id: 'fly-io-mcp-server',
    name: 'Fly.io MCP',
    description: 'Apps, machines, volumes y secrets de Fly.io.',
    category: 'cloud-service',
    official: false,
    tags: ['fly-io', 'edge', 'deployment'],
    sourceUrl: 'https://mcpservers.org/es/servers/fly-io-mcp-server',
  },
  {
    id: 'render-mcp-server',
    name: 'Render MCP',
    description: 'Servicios, deploys y bases de datos de Render.',
    category: 'cloud-service',
    official: false,
    tags: ['render', 'paas', 'deployment'],
    sourceUrl: 'https://mcpservers.org/es/servers/render-mcp-server',
  },
  {
    id: 'netlify-mcp-server',
    name: 'Netlify MCP',
    description: 'Deploys, functions y forms de Netlify.',
    category: 'cloud-service',
    official: false,
    tags: ['netlify', 'jamstack', 'deployment'],
    sourceUrl: 'https://mcpservers.org/es/servers/netlify-mcp-server',
  },
  {
    id: 'digitalocean-mcp-server',
    name: 'DigitalOcean MCP',
    description: 'Droplets, kubernetes, databases y spaces.',
    category: 'cloud-service',
    official: false,
    tags: ['digitalocean', 'cloud', 'infrastructure'],
    sourceUrl: 'https://mcpservers.org/es/servers/digitalocean-mcp-server',
  },
  // ─── search (+4) ────────────────────────────────────────────────────
  {
    id: 'tavily-mcp-server',
    name: 'Tavily MCP',
    description: 'Búsqueda web optimizada para agentes con extracción de contenido.',
    category: 'search',
    official: true,
    tags: ['tavily', 'web-search', 'extraction'],
    sourceUrl: 'https://mcpservers.org/es/servers/tavily-mcp-server',
  },
  {
    id: 'brave-search-mcp-server',
    name: 'Brave Search MCP',
    description: 'Búsqueda web privada con API de Brave.',
    category: 'search',
    official: true,
    tags: ['brave', 'search', 'privacy'],
    sourceUrl: 'https://mcpservers.org/es/servers/brave-search-mcp-server',
  },
  {
    id: 'serpapi-mcp-server',
    name: 'SerpAPI MCP',
    description: 'Resultados de Google, Bing, Yahoo y otros motores.',
    category: 'search',
    official: false,
    tags: ['serpapi', 'google', 'search-engines'],
    sourceUrl: 'https://mcpservers.org/es/servers/serpapi-mcp-server',
  },
  {
    id: 'algolia-mcp-server',
    name: 'Algolia MCP',
    description: 'Búsqueda instantánea en índices configurados.',
    category: 'search',
    official: false,
    tags: ['algolia', 'search', 'indexing'],
    sourceUrl: 'https://mcpservers.org/es/servers/algolia-mcp-server',
  },
  // ─── web-scraping (+3) ──────────────────────────────────────────────
  {
    id: 'browserbase-mcp-server',
    name: 'Browserbase MCP',
    description: 'Navegadores cloud headless para scraping a escala.',
    category: 'web-scraping',
    official: true,
    tags: ['browserbase', 'headless', 'cloud-browser'],
    sourceUrl: 'https://mcpservers.org/es/servers/browserbase-mcp-server',
  },
  {
    id: 'apify-mcp-server',
    name: 'Apify MCP',
    description: 'Web scraping y automatización con actors pre-construidos.',
    category: 'web-scraping',
    official: false,
    tags: ['apify', 'scraping', 'automation'],
    sourceUrl: 'https://mcpservers.org/es/servers/apify-mcp-server',
  },
  {
    id: 'crawl4ai-mcp-server',
    name: 'Crawl4AI MCP',
    description: 'Extracción de contenido web estructurado para LLMs.',
    category: 'web-scraping',
    official: false,
    tags: ['crawl4ai', 'extraction', 'llm'],
    sourceUrl: 'https://mcpservers.org/es/servers/crawl4ai-mcp-server',
  },
  // ─── observability (+2) ─────────────────────────────────────────────
  {
    id: 'newrelic-mcp-server',
    name: 'New Relic MCP',
    description: 'APM, logs, dashboards e incidents de New Relic.',
    category: 'observability',
    official: false,
    tags: ['newrelic', 'apm', 'monitoring'],
    sourceUrl: 'https://mcpservers.org/es/servers/newrelic-mcp-server',
  },
  {
    id: 'axiom-mcp-server',
    name: 'Axiom MCP',
    description: 'Logs, trazas y métricas serverless de Axiom.',
    category: 'observability',
    official: false,
    tags: ['axiom', 'logs', 'serverless'],
    sourceUrl: 'https://mcpservers.org/es/servers/axiom-mcp-server',
  },
  // ─── storage (+2) ───────────────────────────────────────────────────
  {
    id: 'onedrive-mcp-server',
    name: 'OneDrive MCP',
    description: 'Archivos, carpetas y colaboración de Microsoft OneDrive.',
    category: 'storage',
    official: false,
    tags: ['onedrive', 'microsoft', 'files'],
    sourceUrl: 'https://mcpservers.org/es/servers/onedrive-mcp-server',
  },
  {
    id: 'box-mcp-server',
    name: 'Box MCP',
    description: 'Archivos, carpetas, búsqueda y Box AI.',
    category: 'storage',
    official: true,
    tags: ['box', 'storage', 'enterprise'],
    sourceUrl: 'https://mcpservers.org/es/servers/box-mcp-server',
  },
  // ─── security (NEW +4) ──────────────────────────────────────────────
  {
    id: 'snyk-mcp-server',
    name: 'Snyk MCP',
    description: 'Escaneo de vulnerabilidades en código y dependencias.',
    category: 'security',
    official: false,
    tags: ['snyk', 'vulnerabilities', 'supply-chain'],
    sourceUrl: 'https://mcpservers.org/es/servers/snyk-mcp-server',
  },
  {
    id: 'vault-mcp-server',
    name: 'HashiCorp Vault MCP',
    description: 'Gestión de secretos, PKI y acceso dinámico.',
    category: 'security',
    official: false,
    tags: ['vault', 'secrets', 'hashicorp'],
    sourceUrl: 'https://mcpservers.org/es/servers/vault-mcp-server',
  },
  {
    id: '1password-mcp-server',
    name: '1Password MCP',
    description: 'Acceso seguro a secretos y credenciales desde agentes.',
    category: 'security',
    official: true,
    tags: ['1password', 'secrets', 'credentials'],
    sourceUrl: 'https://mcpservers.org/es/servers/1password-mcp-server',
  },
  {
    id: 'sonarqube-mcp-server',
    name: 'SonarQube MCP',
    description: 'Calidad de código, deuda técnica y cobertura.',
    category: 'security',
    official: false,
    tags: ['sonarqube', 'code-quality', 'sast'],
    sourceUrl: 'https://mcpservers.org/es/servers/sonarqube-mcp-server',
  },
  // ─── ai-model (NEW +3) ──────────────────────────────────────────────
  {
    id: 'openai-mcp-server',
    name: 'OpenAI MCP',
    description: 'Modelos GPT, embeddings, imágenes y moderación.',
    category: 'ai-model',
    official: false,
    tags: ['openai', 'gpt', 'embeddings'],
    sourceUrl: 'https://mcpservers.org/es/servers/openai-mcp-server',
  },
  {
    id: 'replicate-mcp-server',
    name: 'Replicate MCP',
    description: 'Ejecución de modelos ML open-source en la nube.',
    category: 'ai-model',
    official: false,
    tags: ['replicate', 'ml', 'inference'],
    sourceUrl: 'https://mcpservers.org/es/servers/replicate-mcp-server',
  },
  {
    id: 'huggingface-mcp-server',
    name: 'Hugging Face MCP',
    description: 'Modelos, datasets y spaces de Hugging Face.',
    category: 'ai-model',
    official: false,
    tags: ['huggingface', 'models', 'datasets'],
    sourceUrl: 'https://mcpservers.org/es/servers/huggingface-mcp-server',
  },
  // ─── analytics (NEW +3) ─────────────────────────────────────────────
  {
    id: 'posthog-mcp-server',
    name: 'PostHog MCP',
    description: 'Eventos, funnels, feature flags y session recordings.',
    category: 'analytics',
    official: false,
    tags: ['posthog', 'product-analytics', 'feature-flags'],
    sourceUrl: 'https://mcpservers.org/es/servers/posthog-mcp-server',
  },
  {
    id: 'amplitude-mcp-server',
    name: 'Amplitude MCP',
    description: 'Analytics de producto y behavioral insights.',
    category: 'analytics',
    official: true,
    tags: ['amplitude', 'analytics', 'behavioral'],
    sourceUrl: 'https://mcpservers.org/es/servers/amplitude-mcp-server',
  },
  {
    id: 'mixpanel-mcp-server',
    name: 'Mixpanel MCP',
    description: 'Eventos, cohortes y reportes de producto.',
    category: 'analytics',
    official: false,
    tags: ['mixpanel', 'events', 'analytics'],
    sourceUrl: 'https://mcpservers.org/es/servers/mixpanel-mcp-server',
  },
  // ─── payments (NEW +2) ──────────────────────────────────────────────
  {
    id: 'paddle-mcp-server',
    name: 'Paddle MCP',
    description: 'Suscripciones, pagos y merchant-of-record.',
    category: 'payments',
    official: false,
    tags: ['paddle', 'subscriptions', 'payments'],
    sourceUrl: 'https://mcpservers.org/es/servers/paddle-mcp-server',
  },
  {
    id: 'mercury-mcp-server',
    name: 'Mercury MCP',
    description: 'Cuentas, transacciones, balances y tarjetas.',
    category: 'payments',
    official: true,
    tags: ['mercury', 'banking', 'fintech'],
    sourceUrl: 'https://mcpservers.org/es/servers/mercury-mcp-server',
  },
  // ─── design (NEW +2) ────────────────────────────────────────────────
  {
    id: 'canva-mcp-server',
    name: 'Canva MCP',
    description: 'Diseños, assets, exportación y comentarios.',
    category: 'design',
    official: true,
    tags: ['canva', 'design', 'graphics'],
    sourceUrl: 'https://mcpservers.org/es/servers/canva-mcp-server',
  },
  {
    id: 'excalidraw-mcp-server',
    name: 'Excalidraw MCP',
    description: 'Diagramas interactivos hand-drawn.',
    category: 'design',
    official: true,
    tags: ['excalidraw', 'diagrams', 'whiteboard'],
    sourceUrl: 'https://mcpservers.org/es/servers/excalidraw-mcp-server',
  },
  // ─── cms (NEW +2) ───────────────────────────────────────────────────
  {
    id: 'sanity-mcp-server',
    name: 'Sanity MCP',
    description: 'CMS headless con contenido estructurado y GROQ.',
    category: 'cms',
    official: false,
    tags: ['sanity', 'cms', 'headless'],
    sourceUrl: 'https://mcpservers.org/es/servers/sanity-mcp-server',
  },
  {
    id: 'contentful-mcp-server',
    name: 'Contentful MCP',
    description: 'Contenido headless, assets y modelos de contenido.',
    category: 'cms',
    official: false,
    tags: ['contentful', 'cms', 'headless'],
    sourceUrl: 'https://mcpservers.org/es/servers/contentful-mcp-server',
  },
];

const mcpIndex = new Map(mcpCatalog.map((item) => [item.id, item]));

// #407: pre-computed, frozen response for the no-filter hot path.
const fullMcpResponse = Object.freeze({
  version: MCP_CATALOG_VERSION,
  items: mcpCatalog,
});

/** Look up a single MCP server by its catalog id. */
export function getMcpById(id: string): McpCatalogItem | undefined {
  return mcpIndex.get(id);
}

export function getMcpCatalog(filter?: { category?: string; q?: string }): {
  version: string;
  items: McpCatalogItem[];
} {
  // #407: the no-filter response is immutable per deploy; return a frozen
  // pre-computed instance instead of scanning on every request.
  if (!filter?.category && !filter?.q) {
    return fullMcpResponse;
  }
  let items = mcpCatalog;
  if (filter?.category) {
    items = items.filter((item) => item.category === filter.category);
  }
  if (filter?.q) {
    const q = filter.q.toLowerCase();
    items = items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  }
  return { version: MCP_CATALOG_VERSION, items };
}
