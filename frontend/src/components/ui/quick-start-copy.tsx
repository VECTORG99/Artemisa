'use client';

import { useState } from 'react';
import { LuCheck, LuCopy } from 'react-icons/lu';
import { glassButton, glassInput } from '@/lib/glass';
import { useTranslations } from '@/i18n';

interface QuickStartCopyProps {
  url: string;
  size?: 'sm' | 'md' | 'lg';
}

export function QuickStartCopy({ url, size = 'md' }: QuickStartCopyProps) {
  const t = useTranslations('common');
  const [copied, setCopied] = useState(false);
  const copyText = t.quickStartPrompt.replace('{url}', url);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silently ignore environments without clipboard support.
    }
  };

  const inputClasses = {
    sm: 'text-xs py-1.5',
    md: 'text-xs py-1.5',
    lg: 'text-sm py-2',
  }[size];

  return (
    <div className="mx-auto w-full max-w-xl">
      <h3 className="mb-1.5 text-center text-[11px] font-medium uppercase tracking-wide text-zinc-400">
        {t.quickStartTitle}
      </h3>
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={copyText}
          readOnly
          aria-readonly="true"
          aria-label={t.quickStartTitle}
          title={copyText}
          className={`${glassInput(`min-w-0 flex-1 truncate font-mono text-white/70 ${inputClasses}`)} cursor-default`}
        />
        <button
          type="button"
          onClick={handleCopy}
          aria-label={t.copyPromptAria}
          title={t.copyAria}
          className={`${glassButton('shrink-0 px-2 py-1.5')}`}
        >
          {copied ? (
            <LuCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
          ) : (
            <LuCopy className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      </div>
      {/* Single announcement channel for screen readers (#572):
          the button label change is visual (icon swap); the aria-live
          region is the only spoken announcement. */}
      <p className="mt-1 min-h-4 text-center text-[11px] text-emerald-400" aria-live="polite">
        {copied ? t.copiedFeedback : ''}
      </p>
    </div>
  );
}
