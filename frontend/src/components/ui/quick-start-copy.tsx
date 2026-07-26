'use client';

import { useState } from 'react';
import { LuCheck, LuCopy } from 'react-icons/lu';
import { glassButton, glassCard, glassInput, glassPill } from '@/lib/glass';

interface QuickStartCopyProps {
  url: string;
  size?: 'sm' | 'md' | 'lg';
  showCompatible?: boolean;
}

const COMPATIBLE_AGENTS = ['Claude', 'ChatGPT', 'Copilot', 'Cursor', 'Devin', 'Gemini', 'Warp', 'Aider'];

export function QuickStartCopy({ url, size = 'md', showCompatible = false }: QuickStartCopyProps) {
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

  const containerPadding = {
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  }[size];

  const titleSize = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }[size];

  return (
    <div className={glassCard(`w-full max-w-2xl text-left ${containerPadding}`)}>
      <div className="flex items-center gap-2">
        <span className="text-accent" aria-hidden="true">
          ⚡
        </span>
        <h3 className={`${titleSize} font-semibold text-white`}>Inicio Rápido vía IA</h3>
      </div>
      <p className="mt-1 text-sm text-zinc-400">
        Pega esto en tu IA favorita y ella configura tu agente automáticamente.
      </p>
      <div className="mt-4 flex items-center gap-2">
        <input
          value={url}
          readOnly
          role="textbox"
          aria-readonly="true"
          className={glassInput(`flex-1 font-mono text-zinc-300 ${inputClasses}`)}
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
      {showCompatible && (
        <div className="mt-4 flex flex-wrap gap-2">
          {COMPATIBLE_AGENTS.map((agent) => (
            <span key={agent} className={glassPill('text-[10px] text-zinc-400')}>
              {agent}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
