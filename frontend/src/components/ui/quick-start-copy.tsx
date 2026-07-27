'use client';

import { useState } from 'react';
import { LuCheck, LuCopy } from 'react-icons/lu';
import { glassButton, glassInput } from '@/lib/glass';

interface QuickStartCopyProps {
  url: string;
  size?: 'sm' | 'md' | 'lg';
}

export function QuickStartCopy({ url, size = 'md' }: QuickStartCopyProps) {
  const [copied, setCopied] = useState(false);
  const copyText = `Configura mi agente de desarrollo con Huascar usando la configuración de este endpoint: ${url}`;

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
        Inicio Rápido: Pega en tu chat de IA
      </h3>
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={copyText}
          readOnly
          aria-readonly="true"
          aria-label="Prompt de inicio rápido para tu chat de IA"
          title={copyText}
          className={`${glassInput(`min-w-0 flex-1 truncate font-mono text-white/70 ${inputClasses}`)} cursor-default`}
        />
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copiar prompt de inicio rápido"
          title="Copiar"
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
        {copied ? '¡Copiado!' : ''}
      </p>
    </div>
  );
}
