'use client';

import { useState } from 'react';
import { glassButton, glassCard, glassCardInteractive } from '@/lib/glass';
import { detectArtifactLanguage, highlightArtifact } from '@/features/creator/lib/artifact-highlight';
import type { GeneratedAgentBundle } from '@huascar/types';

interface CompletionScreenProps {
  bundle: GeneratedAgentBundle;
  onRegister: () => void;
  registered: { id: string; name: string } | null;
  error?: string;
}

function downloadArtifact(path: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = path.replace(/\//g, '__');
  link.click();
  URL.revokeObjectURL(url);
}

function downloadBundleJson(bundle: GeneratedAgentBundle) {
  downloadArtifact('huascar-bundle.json', JSON.stringify(bundle, null, 2));
}

/**
 * Post-generation screen: browse every generated artifact inline (not just
 * a blind download button), download individually or as a full JSON bundle,
 * and register the agent for later use.
 */
export function CompletionScreen({ bundle, onRegister, registered, error }: CompletionScreenProps) {
  const [activePath, setActivePath] = useState(bundle.artifacts[0]?.path ?? '');
  const activeArtifact = bundle.artifacts.find((artifact) => artifact.path === activePath);

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Bundle generado</span>
        <h2 className="mt-3 text-2xl font-semibold text-white">
          {bundle.blueprint?.identity?.name ?? 'Agente generado'}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-zinc-400">
          {bundle.artifacts.length} artefactos listos. Revisa cada uno antes de aplicarlo a tu proyecto.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <nav className="flex flex-col gap-1">
          {bundle.artifacts.map((artifact) => (
            <button
              key={artifact.path}
              type="button"
              onClick={() => setActivePath(artifact.path)}
              className={`animate-fade-in-up truncate rounded-2xl px-3 py-2 text-left text-sm transition-colors ${
                artifact.path === activePath
                  ? 'bg-white/[0.08] text-zinc-100'
                  : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300'
              }`}
            >
              {artifact.path}
            </button>
          ))}
        </nav>

        {activeArtifact && (
          <div className={glassCard('flex flex-col gap-3 p-4')}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-zinc-200">{activeArtifact.path}</span>
              <button
                type="button"
                onClick={() => downloadArtifact(activeArtifact.path, activeArtifact.content)}
                className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
              >
                Descargar
              </button>
            </div>
            <pre className="max-h-96 overflow-auto rounded-2xl border border-white/[0.06] bg-black/30 p-3 text-xs text-zinc-300">
              {highlightArtifact(activeArtifact.content, detectArtifactLanguage(activeArtifact.path))}
            </pre>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={() => downloadBundleJson(bundle)} className={glassButton()}>
          Descargar bundle completo (JSON)
        </button>

        {registered ? (
          <span className={glassCardInteractive('cursor-default px-5 py-2.5 text-sm text-emerald-200')}>
            Agente registrado: {registered.name}
          </span>
        ) : (
          <button type="button" onClick={onRegister} className={glassButton('border-white/20 bg-white/[0.08]')}>
            Registrar agente
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  );
}
