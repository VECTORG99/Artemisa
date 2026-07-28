import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { render } from '@/test/utils';
import { SkillsBrowser } from './skills-browser';
import { McpBrowser } from './mcp-browser';

const skills = [
  {
    id: 'debug-diagnose',
    name: 'Debug & Diagnose',
    description: 'Aísla la causa raíz con evidencia.',
    focus: 'development',
    tags: ['debugging'],
    sourceUrl: 'https://example.test/debug',
    sourceName: 'awesome-skills',
  },
  {
    id: 'threat-model',
    name: 'Threat Model',
    description: 'Modela amenazas del sistema.',
    focus: 'security',
    tags: ['security'],
    sourceUrl: 'https://example.test/threat',
    sourceName: 'awesome-skills',
  },
];

const mcps = [
  {
    id: 'github-mcp-server',
    name: 'GitHub MCP',
    description: 'Issues y pull requests.',
    category: 'version-control',
    official: true,
    tags: ['github'],
    sourceUrl: 'https://example.test/github',
  },
  {
    id: 'exa-mcp',
    name: 'Exa MCP',
    description: 'Motor de búsqueda para agentes.',
    category: 'search',
    official: false,
    tags: ['search'],
    sourceUrl: 'https://example.test/exa',
  },
];

vi.mock('@/lib/api', () => ({
  creator: {
    getSkills: () => Promise.resolve({ version: '1.0.0', items: skills }),
    getMcps: () => Promise.resolve({ version: '1.0.0', items: mcps }),
  },
}));

describe('CatalogBrowser through SkillsBrowser', () => {
  it('filters by free text and by focus chip', async () => {
    render(<SkillsBrowser selected={[]} onChange={() => {}} />);

    await waitFor(() => expect(screen.getByText('Debug & Diagnose')).toBeInTheDocument());
    expect(screen.getByText('Threat Model')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'AMENAZAS' } });
    expect(screen.queryByText('Debug & Diagnose')).not.toBeInTheDocument();
    expect(screen.getByText('Threat Model')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Seguridad' }));
    expect(screen.queryByText('Debug & Diagnose')).not.toBeInTheDocument();
    expect(screen.getByText('Threat Model')).toBeInTheDocument();
  });

  it('honours initialFocus, allowedIds and toggles selection', async () => {
    const onChange = vi.fn();
    render(
      <SkillsBrowser
        selected={['debug-diagnose']}
        onChange={onChange}
        initialFocus="development"
        allowedIds={['debug-diagnose']}
      />,
    );

    await waitFor(() => expect(screen.getByText('Debug & Diagnose')).toBeInTheDocument());
    expect(screen.queryByText('Threat Model')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Seguridad' })).not.toBeInTheDocument();

    const card = screen.getByRole('checkbox', { checked: true });
    fireEvent.click(card);
    expect(onChange).toHaveBeenCalledWith([]);
  });
});

describe('CatalogBrowser through McpBrowser', () => {
  it('labels categories and marks official servers', async () => {
    render(<McpBrowser selected={[]} onChange={() => {}} />);

    await waitFor(() => expect(screen.getByText('GitHub MCP')).toBeInTheDocument());
    expect(screen.getAllByText('Control de versiones').length).toBeGreaterThan(0);
    expect(screen.getByText('Oficial')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Búsqueda' }));
    expect(screen.queryByText('GitHub MCP')).not.toBeInTheDocument();
    expect(screen.getByText('Exa MCP')).toBeInTheDocument();
  });
});
