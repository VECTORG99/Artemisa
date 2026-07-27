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
    sm: 'text-xs py-2',
    md: 'text-sm py-2.5',
    lg: 'text-base py-3',
  }[size];

  const titleSize = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }[size];

  return (
    <div className="w-full max-w-2xl">
      <h3 className={`${titleSize} mb-2 text-center font-semibold text-white`}>Inicio Rápido: Pega en tu chat de IA</h3>
      <div className="flex items-start gap-2">
        <textarea
          value={copyText}
          readOnly
          rows={2}
          role="textbox"
          aria-readonly="true"
          aria-label="Prompt de inicio rápido para tu chat de IA"
          className={`${glassInput(`flex-1 font-mono text-white/80 ${inputClasses}`)} resize-none`}
        />
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copiar prompt de inicio rápido"
          className={`${glassButton('shrink-0')} mt-0.5`}
        >
          {copied ? (
            <LuCheck className="h-4 w-4" aria-hidden="true" />
          ) : (
            <LuCopy className="h-4 w-4" aria-hidden="true" />
          )}
          <span>Copiar</span>
        </button>
      </div>
      {/* Single announcement channel for screen readers (#572):
          the button label change is visual (icon swap); the aria-live
          region is the only spoken announcement. */}
      <p className="mt-2 min-h-5 text-sm text-emerald-400" aria-live="polite">
        {copied ? '¡Copiado!' : ''}
      </p>
    </div>
  );
}
