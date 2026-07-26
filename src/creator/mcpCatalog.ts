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
    | 'storage';
  official: boolean;
  tags: string[];
  sourceUrl: string;
}

export const MCP_CATALOG_VERSION = '1.1.0';

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
];

const mcpIndex = new Map(mcpCatalog.map((item) => [item.id, item]));

/** Look up a single MCP server by its catalog id. */
export function getMcpById(id: string): McpCatalogItem | undefined {
  return mcpIndex.get(id);
}

export function getMcpCatalog(filter?: { category?: string; q?: string }): {
  version: string;
  items: McpCatalogItem[];
} {
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
