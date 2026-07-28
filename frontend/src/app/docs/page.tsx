'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkGithubBlockquoteAlert from 'remark-github-blockquote-alert';
import rehypeRaw from 'rehype-raw';
import { LuArrowLeft, LuFileText, LuBookOpen, LuScale, LuServer, LuChevronRight, LuMenu, LuX } from 'react-icons/lu';
import { useLocale, useTranslations, type Locale } from '@/i18n';

interface DocLink {
  path: string;
  label: string;
}

interface DocSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  docs: DocLink[];
}

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/VECTORG99/Artemisa/development';

const SECTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  project: LuFileText,
  architecture: LuServer,
  guides: LuBookOpen,
  reference: LuScale,
};

function localizeDocPath(path: string, locale: Locale): string {
  if (locale === 'es') return path;
  return path.replace(/\.md$/, '.en.md');
}

export default function DocsPage() {
  const { locale } = useLocale();
  const t = useTranslations('docs');
  const sections = useMemo<DocSection[]>(
    () =>
      t.sections.map((section) => ({
        ...section,
        icon: SECTION_ICONS[section.id] ?? LuFileText,
      })),
    [t],
  );

  const [activePath, setActivePath] = useState<string | null>(null);
  const [activeLabel, setActiveLabel] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchDoc = useCallback(
    async (path: string, label: string) => {
      const localizedPath = localizeDocPath(path, locale);
      setActivePath(localizedPath);
      setActiveLabel(label);
      setLoading(true);
      setError('');
      setContent('');
      setSidebarOpen(false);
      try {
        let res = await fetch(`${GITHUB_RAW_BASE}/${localizedPath}`);
        // If the English translation is missing, fall back to the original Spanish doc.
        if (!res.ok && locale === 'en' && localizedPath.endsWith('.en.md')) {
          const fallbackPath = path;
          setActivePath(fallbackPath);
          res = await fetch(`${GITHUB_RAW_BASE}/${fallbackPath}`);
        }
        if (!res.ok) throw new Error(t.fetchError.replace('{status}', String(res.status)));
        const text = await res.text();
        setContent(text);
      } catch (err) {
        setError(err instanceof Error ? err.message : t.loadError);
      } finally {
        setLoading(false);
      }
    },
    [locale, t],
  );

  // Load README by default
  useEffect(() => {
    const readme = t.sections[0]?.docs[0];
    if (readme) fetchDoc(readme.path, readme.label);
  }, [fetchDoc, t]);

  const sidebar = (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      {sections.map((section) => {
        const SectionIcon = section.icon;
        return (
          <div key={section.title} className="mb-5">
            <h2 className="flex items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              <SectionIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {section.title}
            </h2>
            <ul className="mt-1.5 flex flex-col">
              {section.docs.map((doc) => (
                <li key={doc.path}>
                  <button
                    type="button"
                    onClick={() => fetchDoc(doc.path, doc.label)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${
                      activePath === localizeDocPath(doc.path, locale)
                        ? 'bg-white/[0.08] font-medium text-white'
                        : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
                    }`}
                  >
                    {activePath === localizeDocPath(doc.path, locale) && (
                      <LuChevronRight className="h-3 w-3 shrink-0 text-red-400" aria-hidden="true" />
                    )}
                    <span className={activePath === localizeDocPath(doc.path, locale) ? '' : 'pl-5'}>{doc.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      {/* Desktop sidebar */}
      <aside className="hidden h-full w-72 shrink-0 flex-col border-r border-white/[0.08] bg-zinc-950/80 lg:flex">
        <div className="shrink-0 border-b border-white/[0.08] px-5 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
          >
            <LuArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            {t.back}
          </Link>
          <h1 className="mt-3 text-lg font-bold text-white">{t.title}</h1>
        </div>
        {sidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex h-full w-72 flex-col border-r border-white/[0.08] bg-zinc-950 shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-5 py-4">
              <h1 className="text-lg font-bold text-white">{t.title}</h1>
              <button
                onClick={() => setSidebarOpen(false)}
                aria-label={t.closeMenu}
                className="rounded-full p-1.5 text-zinc-500 transition-colors hover:text-white"
              >
                <LuX className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            {sidebar}
          </aside>
        </div>
      )}

      {/* Content panel */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex shrink-0 items-center gap-3 border-b border-white/[0.08] px-4 py-3 lg:px-8">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label={t.openMenu}
            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white lg:hidden"
          >
            <LuMenu className="h-5 w-5" aria-hidden="true" />
          </button>

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white lg:hidden"
          >
            <LuArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>

          <span className="flex-1 text-sm font-medium text-zinc-300">{activeLabel}</span>

          {activePath && (
            <a
              href={`https://github.com/VECTORG99/Artemisa/blob/development/${activePath}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
            >
              {t.viewOnGitHub}
            </a>
          )}
        </div>

        {/* Document content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-8 lg:px-12">
            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-white" />
                <span className="ml-3 text-sm text-zinc-500">{t.loading}</span>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">{error}</div>
            )}

            {content && !loading && (
              <article className="text-[15px] leading-relaxed text-zinc-300 [&_h1]:mb-4 [&_h1]:mt-8 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-white [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:border-b [&_h2]:border-white/[0.06] [&_h2]:pb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-white [&_h4]:mb-1 [&_h4]:mt-4 [&_h4]:text-base [&_h4]:font-semibold [&_h4]:text-zinc-200 [&_p]:mt-3 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mt-1.5 [&_a]:text-red-400 [&_a]:underline [&_a]:decoration-red-400/30 hover:[&_a]:decoration-red-400 [&_code]:rounded [&_code]:bg-zinc-800/80 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm [&_code]:text-zinc-200 [&_pre]:mt-3 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-white/[0.08] [&_pre]:bg-zinc-900 [&_pre]:p-5 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-sm [&_table]:mt-4 [&_table]:w-full [&_table]:text-sm [&_th]:border [&_th]:border-white/10 [&_th]:bg-zinc-800/50 [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-left [&_th]:font-medium [&_th]:text-zinc-200 [&_td]:border [&_td]:border-white/10 [&_td]:px-4 [&_td]:py-2.5 [&_blockquote]:mt-3 [&_blockquote]:border-l-2 [&_blockquote]:border-red-500/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-zinc-400 [&_hr]:my-8 [&_hr]:border-white/[0.06] [&_strong]:text-zinc-100 [&_img]:mt-4 [&_img]:rounded-xl [&_img]:border [&_img]:border-white/[0.08]">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, [remarkGithubBlockquoteAlert, { tagName: 'blockquote' }]]}
                  rehypePlugins={[rehypeRaw]}
                >
                  {content}
                </ReactMarkdown>
              </article>
            )}

            {!content && !loading && !error && (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                <LuFileText className="mb-3 h-10 w-10" aria-hidden="true" />
                <p className="text-sm">{t.selectDocument}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
