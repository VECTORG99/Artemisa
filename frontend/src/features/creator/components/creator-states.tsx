'use client';

import Link from 'next/link';
import { LuLoaderCircle, LuRefreshCw } from 'react-icons/lu';
import { glassButton, glassCard, glassPrimaryButton } from '@/lib/glass';
import { useTranslations } from '@/i18n';

interface CreatorLoadingProps {
  message?: string;
}

export function CreatorLoading({ message }: CreatorLoadingProps) {
  const t = useTranslations('creator');
  return (
    <div className="flex h-[70vh] flex-col items-center justify-center gap-4" role="status" aria-live="polite">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={glassStyleSolid()}>
        <LuLoaderCircle className="h-6 w-6 animate-spin text-zinc-400" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-semibold text-white">{message ?? t.loading.title}</h2>
      <p className="sr-only">{t.loading.sr}</p>
    </div>
  );
}

interface CreatorFatalErrorProps {
  message: string;
  onRetry: () => void;
  retrying?: boolean;
}

export function CreatorFatalError({ message, onRetry, retrying }: CreatorFatalErrorProps) {
  const t = useTranslations('creator');
  const common = useTranslations('common');
  return (
    <div className="flex h-[70vh] flex-col items-center justify-center px-4">
      <div className={glassCard('flex max-w-md flex-col items-center gap-5 rounded-3xl p-8 text-center')}>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
          <span className="text-lg font-bold text-red-400">!</span>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">{t.fatalError.title}</h2>
          <p className="mt-2 text-sm text-zinc-400">{t.fatalError.description}</p>
          {message && (
            <code className="mt-3 block max-h-32 overflow-auto rounded-lg bg-zinc-950 p-3 text-left text-xs text-zinc-600">
              {message}
            </code>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={onRetry} disabled={retrying} className={glassPrimaryButton('text-sm')}>
            <LuRefreshCw className="h-4 w-4" aria-hidden="true" />
            {t.fatalError.retry}
          </button>
          <Link href="/" className={glassButton('text-sm')}>
            {t.fatalError.backHome}
          </Link>
        </div>
      </div>
    </div>
  );
}

function glassStyleSolid(): React.CSSProperties {
  return {
    backdropFilter: 'blur(9px) saturate(140%)',
    WebkitBackdropFilter: 'blur(9px) saturate(140%)',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
  };
}
