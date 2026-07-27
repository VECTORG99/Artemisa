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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
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
      <h3 className={`${titleSize} mb-2 text-center font-semibold text-white`}>Inicio Rapido</h3>
      <div className="flex items-center gap-2">
        <input
          value={url}
          readOnly
          role="textbox"
          aria-readonly="true"
          className={glassInput(`flex-1 font-mono text-white/80 ${inputClasses}`)}
        />
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copiar URL de inicio rápido"
          className={glassButton('shrink-0')}
        >
          {copied ? <LuCheck className="h-4 w-4" /> : <LuCopy className="h-4 w-4" />}
          <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
        </button>
      </div>
      {copied && (
        <p className="mt-2 text-sm text-emerald-400" aria-live="polite">
          ¡Copiado!
        </p>
      )}
    </div>
  );
}
