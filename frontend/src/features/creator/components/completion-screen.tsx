'use client';

import { useEffect, useMemo, useState } from 'react';
import JSZip from 'jszip';
import {
  LuBraces,
  LuCheck,
  LuCircleAlert,
  LuClipboard,
  LuDownload,
  LuFileCode2,
  LuFileText,
  LuLayers,
  LuListChecks,
  LuPackage,
  LuServerCog,
  LuTriangleAlert,
} from 'react-icons/lu';
import { glassButton, glassCard, glassNotice, glassPill, glassPrimaryButton } from '@/lib/glass';
import { downloadFile } from '@/lib/utils';
import { detectArtifactLanguage, highlightArtifact } from '@/features/creator/lib/artifact-highlight';
import type { ArtifactKind, GeneratedAgentBundle, GeneratedArtifact } from '@artemisa/types';

interface CompletionScreenProps {
  bundle: GeneratedAgentBundle;
  error?: string;
}

type Tab = 'apply' | 'files' | 'platforms' | 'manifest';
type PlatformKey = 'cursor' | 'devin-desktop' | 'coderabbit' | 'kilo-code' | 'kiro' | 'portable';

const KIND_ICONS: Record<ArtifactKind, React.ComponentType<{ className?: string }>> = {
  configuration: LuServerCog,
  documentation: LuFileText,
  instruction: LuFileCode2,
  manifest: LuBraces,
  'agents-md': LuFileText,
  'cursor-rules': LuFileCode2,
  'devin-rules': LuFileCode2,
  'coderabbit-config': LuServerCog,
  'kilocode-rules': LuFileCode2,
};

const KIND_LABELS: Record<ArtifactKind, string> = {
  configuration: 'Configuración',
  documentation: 'Documentación',
  instruction: 'Instrucciones',
  manifest: 'Manifest',
  'agents-md': 'AGENTS.md',
  'cursor-rules': 'Cursor',
  'devin-rules': 'Devin Desktop',
  'coderabbit-config': 'CodeRabbit',
  'kilocode-rules': 'Kilo Code',
};

function getArtifactPlatform(path: string): PlatformKey {
  if (path === '.cursorrules' || path.startsWith('.cursor/')) return 'cursor';
  if (path === '.windsurfrules' || path.startsWith('.windsurf/')) return 'devin-desktop';
  if (path === '.coderabbit.yaml') return 'coderabbit';
  if (path === '.kilocodemodes' || path.startsWith('.kilocode/')) return 'kilo-code';
  if (path.startsWith('.kiro/')) return 'kiro';
  return 'portable';
}

const PLATFORM_LABELS: Record<PlatformKey, string> = {
  cursor: 'Cursor',
  'devin-desktop': 'Devin Desktop / Windsurf',
  coderabbit: 'CodeRabbit',
  'kilo-code': 'Kilo Code',
  kiro: 'Kiro',
  portable: 'Portátil / AGENTS.md',
};

const PLATFORM_ORDER: PlatformKey[] = ['cursor', 'devin-desktop', 'coderabbit', 'kilo-code', 'kiro', 'portable'];

function downloadArtifact(artifact: GeneratedArtifact) {
  downloadFile(artifact.path.replace(/\//g, '__'), artifact.content, artifact.mediaType);
}

function downloadBundleJson(bundle: GeneratedAgentBundle) {
  downloadFile('artemisa-bundle.json', JSON.stringify(bundle, null, 2), 'application/json');
}

/**
 * Downloads every artifact as a single .zip preserving the relative paths
 * declared by the generator (e.g. `artemisa/steering.json`, `docs/INSTALL.md`).
 * The manifest and blueprint are included at the root so the user can verify
 * integrity after extraction.
 */
async function downloadBundleZip(bundle: GeneratedAgentBundle) {
  const zip = new JSZip();
  for (const artifact of bundle.artifacts) {
    zip.file(artifact.path, artifact.content);
  }
  zip.file('manifest.json', JSON.stringify(bundle.manifest, null, 2));
  zip.file('artemisa.blueprint.json', JSON.stringify(bundle.blueprint, null, 2));
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${bundle.blueprint?.identity?.name?.toLowerCase().replace(/\s+/g, '-') ?? 'artemisa-agent'}.zip`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Post-generation screen. Beyond browsing the artifacts it surfaces the two
 * parts of the response that were previously discarded: the per-file SHA-256
 * from the manifest (the bundle's reproducibility claim is unverifiable
 * without it) and `applicationGuide`, which is the only place that explains
 * how to apply the bundle — Artemisa never writes these files itself.
 *
 * The default tab is "Cómo aplicarlo" (#567): the bundle is the only product
 * output, so the first thing the user should see is what to do with it.
 */
export function CompletionScreen({ bundle, error }: CompletionScreenProps) {
  const [tab, setTab] = useState<Tab>('apply');
  const [activePath, setActivePath] = useState(bundle.artifacts[0]?.path ?? '');
  const [showSuccessRing, setShowSuccessRing] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [copyError, setCopyError] = useState('');
  const [zipping, setZipping] = useState(false);
  const [zipError, setZipError] = useState('');

  const activeArtifact = bundle.artifacts.find((artifact) => artifact.path === activePath);

  const grouped = useMemo(() => {
    const map = new Map<ArtifactKind, GeneratedArtifact[]>();
    for (const artifact of bundle.artifacts) {
      const list = map.get(artifact.kind);
      if (list) list.push(artifact);
      else map.set(artifact.kind, [artifact]);
    }
    return [...map.entries()];
  }, [bundle.artifacts]);

  const platformGroups = useMemo(() => {
    const map = new Map<PlatformKey, GeneratedArtifact[]>();
    for (const artifact of bundle.artifacts) {
      const key = getArtifactPlatform(artifact.path);
      const list = map.get(key);
      if (list) list.push(artifact);
      else map.set(key, [artifact]);
    }
    return PLATFORM_ORDER.flatMap((key) => {
      const artifacts = map.get(key);
      return artifacts ? [[key, artifacts] as const] : [];
    });
  }, [bundle.artifacts]);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSuccessRing(false), 900);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(null), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy(key: string, content: string) {
    setCopyError('');
    try {
      await navigator.clipboard.writeText(content);
      setCopied(key);
    } catch {
      // Clipboard access is denied over plain HTTP and in some browsers.
      setCopyError('El navegador bloqueó el portapapeles. Usa «Descargar» para obtener el archivo.');
    }
  }

  async function handleDownloadZip() {
    setZipError('');
    setZipping(true);
    try {
      await downloadBundleZip(bundle);
    } catch {
      setZipError('No se pudo generar el ZIP. Descarga los archivos individualmente o el bundle JSON.');
    } finally {
      setZipping(false);
    }
  }

  const artifactPreview = activeArtifact && (
    <div className={glassCard('flex min-w-0 flex-col gap-3 rounded-2xl p-4')}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="block truncate text-sm font-medium text-zinc-200">{activeArtifact.path}</span>
          <span className="text-xs text-zinc-500">{activeArtifact.description}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => copy(activeArtifact.path, activeArtifact.content)}
            className={glassButton('px-3 py-1.5 text-xs')}
          >
            {copied === activeArtifact.path ? (
              <>
                <LuCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Copiado
              </>
            ) : (
              <>
                <LuClipboard className="h-3.5 w-3.5" aria-hidden="true" />
                Copiar
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => downloadArtifact(activeArtifact)}
            className={glassButton('px-3 py-1.5 text-xs')}
          >
            <LuDownload className="h-3.5 w-3.5" aria-hidden="true" />
            Descargar
          </button>
        </div>
      </div>

      <pre className="creator-scroll max-h-[42vh] overflow-auto rounded-2xl border border-white/[0.06] bg-black/30 p-3 text-xs leading-relaxed text-zinc-300">
        {highlightArtifact(activeArtifact.content, detectArtifactLanguage(activeArtifact.path))}
      </pre>

      <p className="truncate font-mono text-[10px] text-zinc-600" title={activeArtifact.sha256}>
        sha256 {activeArtifact.sha256}
      </p>
    </div>
  );

  const fileList = (groups: Array<readonly [string, GeneratedArtifact[]]>, groupLabel: string) => (
    <nav className="creator-scroll flex max-h-[52vh] flex-col gap-3 overflow-y-auto pr-1">
      {groups.map(([group, artifacts]) => {
        const Icon = groupLabel === 'platform' ? LuLayers : (KIND_ICONS[group as ArtifactKind] ?? LuFileCode2);
        return (
          <div key={group} className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5 px-1 text-[10px] font-medium uppercase tracking-wide text-zinc-600">
              <Icon className="h-3 w-3" aria-hidden="true" />
              {groupLabel === 'platform'
                ? PLATFORM_LABELS[group as PlatformKey]
                : (KIND_LABELS[group as ArtifactKind] ?? group)}
            </span>
            {artifacts.map((artifact) => (
              <button
                key={artifact.path}
                type="button"
                onClick={() => setActivePath(artifact.path)}
                title={artifact.path}
                className={`animate-fade-in-up flex items-center gap-2 truncate rounded-xl px-2.5 py-2 text-left text-xs transition-colors ${
                  artifact.path === activePath
                    ? 'border border-accent/40 bg-accent-deep/20 text-zinc-100'
                    : 'border border-transparent text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300'
                }`}
              >
                <span className="truncate">{artifact.path}</span>
              </button>
            ))}
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-center py-2" role="status" aria-live="polite">
        <span className="relative flex h-14 w-14 items-center justify-center">
          {showSuccessRing && (
            <span className="animate-success-ring absolute inset-0 rounded-full border-2 border-white/50" />
          )}
          <span className="animate-success-pop relative flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/[0.08] text-white">
            <LuCheck className="h-7 w-7" aria-hidden="true" />
          </span>
        </span>
      </div>

      <div className="text-center">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Bundle generado</span>
        <h2 className="mt-3 text-2xl font-semibold text-white">
          {bundle.blueprint?.identity?.name ?? 'Agente generado'}
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-zinc-400">
          {bundle.artifacts.length} artefactos listos. Artemisa no escribe nada en tu proyecto: revisa, descarga y copia
          los archivos tú mismo.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className={glassPill('py-0.5 text-[11px] text-zinc-400')}>Generador {bundle.generatorVersion}</span>
          <span className={glassPill('py-0.5 text-[11px] text-zinc-400')}>
            Destinos: {bundle.manifest.targets.join(', ') || '—'}
          </span>
        </div>
      </div>

      {/* ¿Qué sigue? — bloque fijo bajo el encabezado (#567).
          El bundle es el único output del producto, por lo que el siguiente
          paso debe estar siempre visible, no escondido detrás de una pestaña. */}
      <div className={glassCard('flex flex-col gap-3 rounded-2xl p-5')}>
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">¿Qué sigue?</span>
        <ol className="flex flex-col gap-2.5">
          <li className="flex gap-3 text-sm leading-relaxed text-zinc-300">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent-deep/20 text-xs tabular-nums text-zinc-200">
              1
            </span>
            <span>
              <strong className="font-medium text-zinc-100">Revisa los archivos</strong> en la pestaña «Archivos». Lee
              el blueprint, el steering y la política de seguridad antes de copiar nada.
            </span>
          </li>
          <li className="flex gap-3 text-sm leading-relaxed text-zinc-300">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent-deep/20 text-xs tabular-nums text-zinc-200">
              2
            </span>
            <span>
              <strong className="font-medium text-zinc-100">Descarga el ZIP</strong> y cópialo en la raíz de tu
              proyecto, respetando las rutas relativas de cada archivo.
            </span>
          </li>
          <li className="flex gap-3 text-sm leading-relaxed text-zinc-300">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent-deep/20 text-xs tabular-nums text-zinc-200">
              3
            </span>
            <span>
              <strong className="font-medium text-zinc-100">
                Valida con{' '}
                <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs text-white/80">docs/INSTALL.md</code>
              </strong>{' '}
              y confirma los hashes SHA-256 en «Manifest y hashes» para verificar que nada cambió.
            </span>
          </li>
        </ol>
      </div>

      {bundle.warnings.length > 0 && (
        <div className={glassNotice('warn', 'flex-col')}>
          <span className="flex items-center gap-2 font-medium">
            <LuTriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
            Advertencias del generador
          </span>
          <ul className="ml-6 list-disc space-y-1 text-amber-100/90">
            {bundle.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Botón de descarga ZIP destacado antes de las pestañas (#567):
          es la acción principal de la pantalla final. */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleDownloadZip}
          disabled={zipping}
          aria-busy={zipping}
          className={glassPrimaryButton('text-sm')}
        >
          <LuPackage className="h-4 w-4" aria-hidden="true" />
          {zipping ? 'Generando ZIP…' : 'Descargar todo (.zip)'}
        </button>
        <button type="button" onClick={() => downloadBundleJson(bundle)} className={glassButton('text-sm')}>
          <LuDownload className="h-4 w-4" aria-hidden="true" />
          Descargar bundle (JSON)
        </button>
      </div>

      {zipError && (
        <p className={glassNotice('warn')}>
          <LuTriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{zipError}</span>
        </p>
      )}

      <nav className="flex flex-wrap items-center justify-center gap-2" aria-label="Vistas del bundle">
        {[
          { id: 'apply' as Tab, label: 'Cómo aplicarlo', Icon: LuListChecks },
          { id: 'files' as Tab, label: 'Archivos', Icon: LuFileCode2 },
          { id: 'platforms' as Tab, label: 'Plataformas', Icon: LuLayers },
          { id: 'manifest' as Tab, label: 'Manifest y hashes', Icon: LuBraces },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-current={tab === item.id ? 'true' : undefined}
            className={
              tab === item.id
                ? glassPill('border-accent/60 bg-accent-deep/30 px-3.5 py-1.5 text-xs text-white')
                : glassPill('cursor-pointer px-3.5 py-1.5 text-xs text-zinc-400 hover:text-white')
            }
          >
            <item.Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {item.label}
          </button>
        ))}
      </nav>

      {tab === 'files' && (
        <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
          {fileList(grouped, 'kind')}
          {artifactPreview}
        </div>
      )}

      {tab === 'platforms' && (
        <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
          {fileList(platformGroups, 'platform')}
          {artifactPreview}
        </div>
      )}

      {tab === 'apply' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className={glassCard('flex flex-col gap-3 rounded-2xl p-5')}>
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Pasos de aplicación</span>
            <p className="text-sm leading-relaxed text-zinc-400">{bundle.applicationGuide.summary}</p>
            <ol className="flex flex-col gap-2">
              {bundle.applicationGuide.steps.map((step, index) => (
                <li key={index} className="flex gap-2.5 text-sm leading-relaxed text-zinc-300">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent-deep/20 text-[10px] tabular-nums text-zinc-200">
                    {index + 1}
                  </span>
                  <span className="min-w-0">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className={glassCard('flex flex-col gap-3 rounded-2xl p-5')}>
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Checklist de producción</span>
            {bundle.applicationGuide.productionChecklist.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Este agente no declara alcance de producción, así que el generador no añadió checklist operacional.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {bundle.applicationGuide.productionChecklist.map((item, index) => (
                  <li key={index} className="flex gap-2.5 text-sm leading-relaxed text-zinc-300">
                    <LuListChecks className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden="true" />
                    <span className="min-w-0">{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === 'manifest' && (
        <div className={glassCard('flex flex-col gap-3 rounded-2xl p-5')}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {bundle.manifest.artifactCount} archivos · agente {bundle.manifest.agent}
            </span>
            <button
              type="button"
              onClick={() => copy('manifest', JSON.stringify(bundle.manifest, null, 2))}
              className={glassButton('px-3 py-1.5 text-xs')}
            >
              {copied === 'manifest' ? (
                <>
                  <LuCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Copiado
                </>
              ) : (
                <>
                  <LuClipboard className="h-3.5 w-3.5" aria-hidden="true" />
                  Copiar manifest
                </>
              )}
            </button>
          </div>
          <p className="text-xs leading-relaxed text-zinc-500">
            El mismo conjunto de respuestas produce siempre estos hashes. Compáralos después de copiar los archivos para
            confirmar que nada se alteró en el camino.
          </p>
          <div className="creator-scroll max-h-[46vh] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-black/40 backdrop-blur">
                <tr className="text-[10px] uppercase tracking-wide text-zinc-600">
                  <th scope="col" className="px-2 py-2 font-medium">
                    Archivo
                  </th>
                  <th scope="col" className="px-2 py-2 font-medium">
                    Tipo
                  </th>
                  <th scope="col" className="px-2 py-2 font-medium">
                    SHA-256
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {bundle.manifest.files.map((file) => (
                  <tr key={file.path}>
                    <td className="max-w-[16rem] truncate px-2 py-2 text-zinc-300" title={file.path}>
                      {file.path}
                    </td>
                    <td className="px-2 py-2 text-zinc-500">{KIND_LABELS[file.kind] ?? file.kind}</td>
                    <td className="truncate px-2 py-2 font-mono text-[10px] text-zinc-600" title={file.sha256}>
                      {file.sha256.slice(0, 16)}…
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {copyError && (
        <p className={glassNotice('warn')}>
          <LuTriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{copyError}</span>
        </p>
      )}

      {error && (
        <div className={glassNotice('danger')} role="alert">
          <LuCircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
