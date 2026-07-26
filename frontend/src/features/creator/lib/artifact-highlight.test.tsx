import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { detectArtifactLanguage, highlightArtifact } from './artifact-highlight';

function renderTokens(content: string, language: Parameters<typeof highlightArtifact>[1]) {
  return renderToStaticMarkup(<>{highlightArtifact(content, language)}</>);
}

describe('detectArtifactLanguage', () => {
  it('detects json files', () => {
    expect(detectArtifactLanguage('agent.json')).toBe('json');
  });

  it('detects markdown files', () => {
    expect(detectArtifactLanguage('README.md')).toBe('markdown');
    expect(detectArtifactLanguage('docs/guide.mdx')).toBe('markdown');
  });

  it('detects yaml files', () => {
    expect(detectArtifactLanguage('config.yml')).toBe('yaml');
    expect(detectArtifactLanguage('config.yaml')).toBe('yaml');
  });

  it('falls back to plain for unknown extensions', () => {
    expect(detectArtifactLanguage('script.sh')).toBe('plain');
  });
});

describe('highlightArtifact', () => {
  it('highlights JSON keys, string values, numbers and booleans', () => {
    const html = renderTokens('{"name": "Huascar", "count": 3, "active": true}', 'json');
    expect(html).toContain('Huascar');
    expect(html).toContain('<span');
    expect(html).toMatch(/class="[^"]*text-sky-300[^"]*"/); // key
    expect(html).toMatch(/class="[^"]*text-emerald-300[^"]*"/); // string value
    expect(html).toMatch(/class="[^"]*text-amber-300[^"]*"/); // number
    expect(html).toMatch(/class="[^"]*text-purple-300[^"]*"/); // boolean
  });

  it('highlights Markdown headers and inline code', () => {
    const html = renderTokens('# Title\n\nSome `code` and **bold** text', 'markdown');
    expect(html).toContain('Title');
    expect(html).toContain('code');
    expect(html).toContain('bold');
  });

  it('highlights YAML keys', () => {
    const html = renderTokens('name: huascar\nversion: 1.0', 'yaml');
    expect(html).toMatch(/class="[^"]*text-sky-300[^"]*"/);
    expect(html).toContain('huascar');
  });

  it('returns plain text unchanged for unknown languages', () => {
    const html = renderTokens('plain text content', 'plain');
    expect(html).toContain('plain text content');
    expect(html).not.toContain('<span');
  });
});
