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
    | 'cloud-service';
  official: boolean;
  tags: string[];
  sourceUrl: string;
}

export const MCP_CATALOG_VERSION = '1.0.0';

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
];

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
