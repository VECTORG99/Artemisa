/**
 * Minimal, dependency-free syntax highlighting for artifact previews.
 *
 * Full syntax-highlighting libraries (Shiki, Prism) pull in non-trivial
 * bundle weight (grammars, themes, WASM in Shiki's case). Since the Creator
 * only needs to preview JSON, Markdown and YAML artifacts — not run a full
 * code editor — a small regex-based tokenizer keeps the bundle lean while
 * still giving a "VS Code-like" preview.
 *
 * Each highlighter returns an array of React nodes (strings for plain text,
 * `<span>` for tokens) so callers can render them directly inside a `<pre>`.
 */
import type { ReactNode } from 'react';

export type ArtifactLanguage = 'json' | 'markdown' | 'yaml' | 'plain';

/** Guess the artifact "language" from its file path, for highlighting purposes. */
export function detectArtifactLanguage(path: string): ArtifactLanguage {
  const lower = path.toLowerCase();
  if (lower.endsWith('.json')) return 'json';
  if (lower.endsWith('.md') || lower.endsWith('.mdx')) return 'markdown';
  if (lower.endsWith('.yml') || lower.endsWith('.yaml')) return 'yaml';
  return 'plain';
}

let tokenKeySeed = 0;
function nextTokenKey(): string {
  tokenKeySeed += 1;
  return `tok-${tokenKeySeed}`;
}

const JSON_TOKEN_RE =
  /("(?:\\.|[^"\\])*"(?=\s*:))|("(?:\\.|[^"\\])*")|(\b-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|(\btrue\b|\bfalse\b|\bnull\b)/g;

/** Tokenize a JSON string into highlighted spans: keys, string values, numbers, booleans/null. */
function highlightJson(content: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  JSON_TOKEN_RE.lastIndex = 0;
  while ((match = JSON_TOKEN_RE.exec(content))) {
    if (match.index > lastIndex) {
      nodes.push(content.slice(lastIndex, match.index));
    }
    const [full, key, str, num, bool] = match;
    let className = 'text-zinc-300';
    if (key) className = 'text-sky-300';
    else if (str) className = 'text-emerald-300';
    else if (num) className = 'text-amber-300';
    else if (bool) className = 'text-purple-300';

    nodes.push(
      <span key={nextTokenKey()} className={className}>
        {full}
      </span>,
    );
    lastIndex = match.index + full.length;
  }
  if (lastIndex < content.length) {
    nodes.push(content.slice(lastIndex));
  }
  return nodes;
}

const MARKDOWN_LINE_RE = /^(#{1,6})\s+(.*)$/;
const MARKDOWN_INLINE_RE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)/g;

/** Tokenize Markdown line-by-line: headers, inline code, bold, italics. */
function highlightMarkdown(content: string): ReactNode[] {
  const lines = content.split('\n');
  const nodes: ReactNode[] = [];

  lines.forEach((line, lineIndex) => {
    const headerMatch = MARKDOWN_LINE_RE.exec(line);
    if (headerMatch) {
      nodes.push(
        <span key={nextTokenKey()} className="font-semibold text-sky-300">
          {headerMatch[1]} {headerMatch[2]}
        </span>,
      );
    } else if (line.trim().startsWith('```')) {
      nodes.push(
        <span key={nextTokenKey()} className="text-zinc-500">
          {line}
        </span>,
      );
    } else {
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      MARKDOWN_INLINE_RE.lastIndex = 0;
      while ((match = MARKDOWN_INLINE_RE.exec(line))) {
        if (match.index > lastIndex) {
          nodes.push(line.slice(lastIndex, match.index));
        }
        const [full, code, bold, italic] = match;
        if (code) {
          nodes.push(
            <span key={nextTokenKey()} className="rounded bg-white/[0.08] px-1 text-amber-300">
              {full}
            </span>,
          );
        } else if (bold) {
          nodes.push(
            <span key={nextTokenKey()} className="font-semibold text-zinc-100">
              {full}
            </span>,
          );
        } else if (italic) {
          nodes.push(
            <span key={nextTokenKey()} className="italic text-zinc-300">
              {full}
            </span>,
          );
        }
        lastIndex = match.index + full.length;
      }
      if (lastIndex < line.length) {
        nodes.push(line.slice(lastIndex));
      }
    }
    if (lineIndex < lines.length - 1) nodes.push('\n');
  });

  return nodes;
}

const YAML_LINE_RE = /^(\s*)([\w.-]+)(:)(.*)$/;

/** Tokenize YAML line-by-line: keys before `:` get highlighted, values stay plain. */
function highlightYaml(content: string): ReactNode[] {
  const lines = content.split('\n');
  const nodes: ReactNode[] = [];

  lines.forEach((line, lineIndex) => {
    const match = YAML_LINE_RE.exec(line);
    if (match) {
      const [, indent, key, colon, rest] = match;
      nodes.push(indent);
      nodes.push(
        <span key={nextTokenKey()} className="text-sky-300">
          {key}
        </span>,
      );
      nodes.push(colon);
      nodes.push(<span key={nextTokenKey()} className="text-emerald-300">{rest}</span>);
    } else {
      nodes.push(line);
    }
    if (lineIndex < lines.length - 1) nodes.push('\n');
  });

  return nodes;
}

/** Highlight `content` according to `language`. Falls back to plain text. */
export function highlightArtifact(content: string, language: ArtifactLanguage): ReactNode[] {
  switch (language) {
    case 'json':
      return highlightJson(content);
    case 'markdown':
      return highlightMarkdown(content);
    case 'yaml':
      return highlightYaml(content);
    default:
      return [content];
  }
}
