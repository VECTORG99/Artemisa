'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  LuBot,
  LuBrainCircuit,
  LuCog,
  LuDatabase,
  LuKeyRound,
  LuLayers,
  LuMessageSquareText,
  LuPlug,
  LuSettings2,
  LuSparkles,
  LuTarget,
  LuWrench,
} from 'react-icons/lu';
import { SiAnthropic, SiGoogle, SiMeta, SiOllama } from 'react-icons/si';
import type { CreatorAnswers, McpCatalogItem, SkillCatalogItem } from '@huascar/types';
import { creator } from '@/lib/api';
import { glassCard, glassInput, glassPanel, glassPill } from '@/lib/glass';
import { Switch } from './switch';

// ─── Provider catalog (UI-only beyond openai/anthropic/local) ────────────────
// src/engine/LlmProvider.ts only resolves openai | anthropic | local from
// LLM_PROVIDER_CHAIN. The rest are shown so the dashboard reads as a real,
// extensible provider list, but are flagged as preview — same honesty
// convention as the existing ModelTuningPanel.

interface ProviderOption {
  id: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  wired: boolean;
}

const PROVIDERS: ProviderOption[] = [
  { id: 'anthropic', label: 'Anthropic', Icon: SiAnthropic, wired: true },
  { id: 'openai', label: 'OpenAI', Icon: LuBot, wired: true },
  { id: 'local', label: 'Local / OpenAI-compatible', Icon: SiOllama, wired: true },
  { id: 'google', label: 'Google Gemini', Icon: SiGoogle, wired: false },
  { id: 'meta', label: 'Meta Llama', Icon: SiMeta, wired: false },
];

const TONE_OPTIONS = [
  { id: 'technical', label: 'Técnico' },
  { id: 'formal', label: 'Formal' },
  { id: 'casual', label: 'Directo' },
];

const CAPABILITY_OPTIONS: { id: string; label: string; description: string }[] = [
  { id: 'read-repository', label: 'Leer repositorio', description: 'Analiza código y documentación.' },
  { id: 'edit-code', label: 'Proponer cambios', description: 'Genera parches, sin aplicarlos automáticamente.' },
  { id: 'run-tests', label: 'Ejecutar pruebas', description: 'Comandos de calidad allowlisted.' },
  { id: 'review-pr', label: 'Revisar PR', description: 'Lee diffs y publica o prepara comentarios.' },
  { id: 'manage-issues', label: 'Gestionar issues', description: 'Lee o actualiza trabajo planificado.' },
  {
    id: 'inspect-infrastructure',
    label: 'Inspeccionar infraestructura',
    description: 'Consulta estado operacional en modo lectura.',
  },
  { id: 'operate-production', label: 'Operar producción', description: 'Requiere aprobación obligatoria.' },
  { id: 'deploy', label: 'Desplegar', description: 'Promoción controlada con aprobación y rollback.' },
  { id: 'analyze-data', label: 'Analizar datos', description: 'Lee datasets y genera reportes.' },
  { id: 'scan-vulnerabilities', label: 'Escanear vulnerabilidades', description: 'Herramientas de seguridad.' },
  { id: 'automate-workflows', label: 'Automatizar workflows', description: 'Crea y ejecuta pipelines.' },
  { id: 'generate-reports', label: 'Generar reportes', description: 'Documentación y dashboards.' },
];

const KNOWLEDGE_SOURCE_OPTIONS = [
  { id: 'repository-docs', label: 'Documentación del repositorio' },
  { id: 'source-code', label: 'Código fuente' },
  { id: 'web-documentation', label: 'Documentación web' },
  { id: 'tickets', label: 'Issues y tickets' },
  { id: 'runbooks', label: 'Runbooks operacionales' },
  { id: 'rag-vector-store', label: 'RAG vectorial (corpus indexado)' },
];

const TARGET_OPTIONS = [
  { id: 'huascar', label: 'Huascar', description: 'Motor nativo: steering, governance, security policy.' },
  { id: 'kiro', label: 'Kiro', description: 'Steering, hooks y skills bajo .kiro/.' },
  { id: 'portable', label: 'Portable', description: 'AGENTS.md y skills independientes.' },
];

type SectionId = 'identity' | 'model' | 'capabilities' | 'knowledge' | 'skills' | 'mcps' | 'targets';

const SECTIONS: { id: SectionId; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'identity', label: 'Identidad', Icon: LuTarget },
  { id: 'model', label: 'Modelo', Icon: LuBrainCircuit },
  { id: 'capabilities', label: 'Capacidades', Icon: LuKeyRound },
  { id: 'knowledge', label: 'Conocimiento / RAG', Icon: LuDatabase },
  { id: 'skills', label: 'Skills', Icon: LuSparkles },
  { id: 'mcps', label: 'MCPs', Icon: LuPlug },
  { id: 'targets', label: 'Targets', Icon: LuLayers },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toArray(value: unknown): string[] {
  return Array.isArray(value) ? (value as string[]) : [];
}

interface FineTuningDashboardProps {
  answers: CreatorAnswers;
  onChange: (next: CreatorAnswers) => void;
  onGenerate: () => void;
  generating: boolean;
  error?: string;
}

/**
 * Dense, all-at-once configuration panel for fine-tuning mode — the "manual
 * control" experience required by issue #390: switches for capabilities,
 * multiple model providers, extensive RAG/knowledge fields, direct skill and
 * MCP pickers. Writes straight into the same `answers` shape the automated
 * wizard produces, so both modes feed the same /evaluate → /preview flow.
 */
export function FineTuningDashboard({ answers, onChange, onGenerate, generating, error }: FineTuningDashboardProps) {
  const [activeSection, setActiveSection] = useState<SectionId>('identity');
  const [skills, setSkills] = useState<SkillCatalogItem[]>([]);
  const [mcps, setMcps] = useState<McpCatalogItem[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [mcpsLoading, setMcpsLoading] = useState(true);
  const [skillQuery, setSkillQuery] = useState('');
  const [mcpQuery, setMcpQuery] = useState('');

  const [provider, setProvider] = useState('anthropic');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [tone, setTone] = useState('technical');
  const [restrictions, setRestrictions] = useState('');

  useEffect(() => {
    creator
      .getSkills()
      .then((res) => setSkills(res.items))
      .catch(() => setSkills([]))
      .finally(() => setSkillsLoading(false));
    creator
      .getMcps()
      .then((res) => setMcps(res.items))
      .catch(() => setMcps([]))
      .finally(() => setMcpsLoading(false));
  }, []);

  const set = <K extends string>(key: K, value: CreatorAnswers[K]) => onChange({ ...answers, [key]: value });

  const capabilities = toArray(answers.capabilities);
  const knowledgeSources = toArray(answers.knowledge_sources);
  const skillsSelection = toArray(answers.skills_selection);
  const targets = toArray(answers.agent_targets);

  const toggleInArray = (key: string, id: string) => {
    const current = toArray(answers[key]);
    set(key, current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const filteredSkills = useMemo(() => {
    const q = skillQuery.trim().toLowerCase();
    if (!q) return skills;
    return skills.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  }, [skills, skillQuery]);

  const filteredMcps = useMemo(() => {
    const q = mcpQuery.trim().toLowerCase();
    if (!q) return mcps;
    return mcps.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  }, [mcps, mcpQuery]);

  const readyToGenerate = Boolean(
    String(answers.agent_name || '').trim() &&
    String(answers.objective || '').trim() &&
    String(answers.purpose || '').trim(),
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
      {/* Sidebar navigation — fixed height, same as the main panel, so
          switching sections never resizes the component. */}
      <aside className={`flex h-[70vh] flex-col rounded-3xl p-3 ${glassPanel()}`}>
        <nav className="flex flex-col gap-1 overflow-y-auto">
          {SECTIONS.map((section) => {
            const active = section.id === activeSection;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                  active ? 'bg-white/[0.08] text-white' : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
                }`}
              >
                <section.Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{section.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-4 border-t border-white/[0.06] pt-4">
          <button
            type="button"
            onClick={onGenerate}
            disabled={!readyToGenerate || generating}
            className={`flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-white transition-colors ${
              readyToGenerate
                ? 'border border-white/20 bg-white/[0.08] hover:bg-white/[0.14]'
                : 'cursor-not-allowed border border-white/[0.06] bg-white/[0.02] text-zinc-600'
            }`}
          >
            {generating ? 'Generando...' : 'Generar bundle'}
          </button>
          {!readyToGenerate && (
            <p className="mt-2 text-center text-[11px] text-zinc-600">Completa Identidad para habilitar</p>
          )}
        </div>
      </aside>

      {/* Main panel — same fixed height as the sidebar. Content past the
          fixed height scrolls internally; the panel itself never grows or
          shrinks when switching between sections (Identidad, MCPs, etc). */}
      <div className={`flex h-[70vh] min-w-0 flex-col rounded-3xl p-6 sm:p-8 ${glassPanel()}`}>
        <div className="flex-1 overflow-y-auto pr-1">
          {error && (
            <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {activeSection === 'identity' && (
            <div className="flex flex-col gap-5">
              <SectionHeader
                icon={LuTarget}
                title="Identidad del agente"
                description="Lo que define qué es y para qué existe."
              />
              <Field label="Nombre">
                <input
                  value={String(answers.agent_name || '')}
                  onChange={(event) => set('agent_name', event.target.value)}
                  placeholder="Platform Reviewer"
                  className={glassInput()}
                />
              </Field>
              <Field label="Propósito">
                <input
                  value={String(answers.purpose || '')}
                  onChange={(event) => set('purpose', event.target.value)}
                  placeholder="development, pr-review, ops, data-analysis..."
                  className={glassInput()}
                />
              </Field>
              <Field label="Objetivo">
                <textarea
                  value={String(answers.objective || '')}
                  onChange={(event) => set('objective', event.target.value)}
                  rows={3}
                  placeholder="Qué debe lograr el agente, en una frase verificable."
                  className={glassInput('resize-none')}
                />
              </Field>
              <Field label="Criterio de éxito">
                <textarea
                  value={String(answers.success_criteria || '')}
                  onChange={(event) => set('success_criteria', event.target.value)}
                  rows={2}
                  placeholder="Cómo se sabe que el agente cumplió su objetivo."
                  className={glassInput('resize-none')}
                />
              </Field>
            </div>
          )}

          {activeSection === 'model' && (
            <div className="flex flex-col gap-6">
              <SectionHeader
                icon={LuBrainCircuit}
                title="Modelo y proveedor"
                description="El backend resuelve openai / anthropic / local vía LLM_PROVIDER_CHAIN. El resto se muestra como vista previa."
              />

              <Field label="Proveedor">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {PROVIDERS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setProvider(option.id)}
                      className={`flex items-center justify-between gap-2 rounded-2xl border p-3.5 text-left transition-colors ${
                        provider === option.id
                          ? 'border-white/30 bg-white/[0.08]'
                          : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 text-sm text-zinc-100">
                        <option.Icon className="h-4 w-4 shrink-0" />
                        {option.label}
                      </span>
                      {!option.wired && <span className={glassPill('text-[10px] text-amber-300')}>preview</span>}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label={`Temperature (${temperature.toFixed(2)})`}>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.05}
                  value={temperature}
                  onChange={(event) => setTemperature(Number(event.target.value))}
                  className="h-auto w-full cursor-pointer accent-white"
                />
                <div className="mt-1 flex justify-between text-[11px] text-zinc-600">
                  <span>Preciso</span>
                  <span>Creativo</span>
                </div>
              </Field>

              <Field label={`Max tokens de salida (${maxTokens})`}>
                <input
                  type="range"
                  min={512}
                  max={16384}
                  step={512}
                  value={maxTokens}
                  onChange={(event) => setMaxTokens(Number(event.target.value))}
                  className="h-auto w-full cursor-pointer accent-white"
                />
              </Field>

              <p className={`${glassPill('w-fit text-[11px] text-amber-300')}`}>
                Provider / temperature / max tokens aún no se aplican al bundle generado — el generador es determinista
                y no invoca al LLM.
              </p>
            </div>
          )}

          {activeSection === 'capabilities' && (
            <div className="flex flex-col gap-6">
              <SectionHeader
                icon={LuKeyRound}
                title="Capacidades y autonomía"
                description="Concede sólo lo necesario. Cada switch corresponde a una capacidad real del blueprint."
              />

              <div className="grid gap-2.5 sm:grid-cols-2">
                {CAPABILITY_OPTIONS.map((option) => (
                  <Switch
                    key={option.id}
                    label={option.label}
                    description={option.description}
                    checked={capabilities.includes(option.id)}
                    onChange={() => toggleInArray('capabilities', option.id)}
                  />
                ))}
              </div>

              <div className="grid gap-2.5 border-t border-white/[0.06] pt-5 sm:grid-cols-2">
                <Switch
                  label="Aprobación humana obligatoria"
                  description="Requerido para producción, escritura, deploy y privilegios elevados."
                  checked={answers.human_approval === true}
                  onChange={(next) => set('human_approval', next)}
                />
                <Switch
                  label="Hooks habilitados"
                  description="Genera hooks de calidad revisables (.kiro/hooks o equivalente)."
                  checked={answers.hooks_enabled === true}
                  onChange={(next) => set('hooks_enabled', next)}
                />
                <Switch
                  label="PR review especializado"
                  description="Rúbrica, severidades y permisos. Nunca activa auto-merge."
                  checked={answers.pr_review_enabled === true}
                  onChange={(next) => set('pr_review_enabled', next)}
                />
                <Switch
                  label="Skills habilitadas"
                  description="Genera SKILL.md reutilizables a partir de tu selección."
                  checked={answers.skills_enabled === true}
                  onChange={(next) => set('skills_enabled', next)}
                />
              </div>
            </div>
          )}

          {activeSection === 'knowledge' && (
            <div className="flex flex-col gap-6">
              <SectionHeader
                icon={LuDatabase}
                title="Conocimiento y RAG"
                description="El preview sólo documenta fuentes; no lee archivos ni URLs ni indexa nada."
              />

              <Switch
                label="Conocimiento adicional al prompt"
                description="Activa RAG o instrucciones versionadas cuando el contexto no cabe en una regla breve."
                checked={answers.knowledge_enabled === true}
                onChange={(next) => set('knowledge_enabled', next)}
              />

              {answers.knowledge_enabled === true && (
                <Field label="Fuentes (máx. 8)">
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {KNOWLEDGE_SOURCE_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => toggleInArray('knowledge_sources', option.id)}
                        className={`flex items-center gap-2.5 rounded-2xl border p-3.5 text-left text-sm transition-colors ${
                          knowledgeSources.includes(option.id)
                            ? 'border-white/30 bg-white/[0.08] text-white'
                            : 'border-white/[0.08] bg-white/[0.02] text-zinc-300 hover:bg-white/[0.04]'
                        }`}
                      >
                        {option.id === 'rag-vector-store' ? (
                          <LuDatabase className="h-4 w-4 shrink-0" aria-hidden="true" />
                        ) : (
                          <LuLayers className="h-4 w-4 shrink-0" aria-hidden="true" />
                        )}
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-zinc-600">{knowledgeSources.length} / 8 seleccionadas</p>
                </Field>
              )}
            </div>
          )}

          {activeSection === 'skills' && (
            <div className="flex flex-col gap-5">
              <SectionHeader
                icon={LuSparkles}
                title="Skills"
                description="Catálogo curado de skills reales — selección directa, sin árbol de preguntas."
              />
              <input
                value={skillQuery}
                onChange={(event) => setSkillQuery(event.target.value)}
                placeholder="Buscar por nombre, descripción o tag..."
                className={glassInput()}
              />
              {skillsLoading ? (
                <p className="py-8 text-center text-sm text-zinc-500">Cargando catálogo...</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredSkills.map((skill) => {
                    const isSelected = skillsSelection.includes(skill.id);
                    return (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => toggleInArray('skills_selection', skill.id)}
                        className={glassCard(
                          `flex flex-col gap-1.5 p-4 text-left transition-colors ${isSelected ? 'border-white/30 bg-white/[0.08]' : 'hover:bg-white/[0.04]'}`,
                        )}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="font-medium text-zinc-100">{skill.name}</span>
                          {isSelected && <LuSparkles className="h-3.5 w-3.5 shrink-0 text-white" aria-hidden="true" />}
                        </span>
                        <span className="text-xs text-zinc-500">{skill.description}</span>
                        <span className={glassPill('mt-1 w-fit text-[10px] text-zinc-500')}>{skill.focus}</span>
                      </button>
                    );
                  })}
                  {filteredSkills.length === 0 && (
                    <p className="col-span-2 py-8 text-center text-sm text-zinc-500">Sin resultados.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {activeSection === 'mcps' && (
            <div className="flex flex-col gap-5">
              <SectionHeader
                icon={LuPlug}
                title="Servidores MCP"
                description="Integraciones reales curadas de mcpservers.org."
              />
              <input
                value={mcpQuery}
                onChange={(event) => setMcpQuery(event.target.value)}
                placeholder="Buscar por nombre, descripción o tag..."
                className={glassInput()}
              />
              {mcpsLoading ? (
                <p className="py-8 text-center text-sm text-zinc-500">Cargando catálogo...</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredMcps.map((mcp) => (
                    <div key={mcp.id} className={glassCard('flex flex-col gap-1.5 p-4')}>
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-medium text-zinc-100">{mcp.name}</span>
                        {mcp.official && <span className={glassPill('text-[10px] text-emerald-300')}>oficial</span>}
                      </span>
                      <span className="text-xs text-zinc-500">{mcp.description}</span>
                      <span className={glassPill('mt-1 w-fit text-[10px] text-zinc-500')}>{mcp.category}</span>
                    </div>
                  ))}
                  {filteredMcps.length === 0 && (
                    <p className="col-span-2 py-8 text-center text-sm text-zinc-500">Sin resultados.</p>
                  )}
                </div>
              )}
              <p className="text-[11px] text-zinc-600">
                Servidores MCP mostrados como referencia curada. Antes de producción fija versiones exactas y aplica
                allowlists en sandbox.
              </p>
            </div>
          )}

          {activeSection === 'targets' && (
            <div className="flex flex-col gap-6">
              <SectionHeader
                icon={LuLayers}
                title="Targets y personalidad"
                description="Formatos de salida y tono del agente."
              />

              <Field label="Targets del bundle">
                <div className="grid gap-2.5 sm:grid-cols-3">
                  {TARGET_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleInArray('agent_targets', option.id)}
                      className={`flex flex-col gap-1.5 rounded-2xl border p-4 text-left transition-colors ${
                        targets.includes(option.id)
                          ? 'border-white/30 bg-white/[0.08]'
                          : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]'
                      }`}
                    >
                      <span className="text-sm font-medium text-zinc-100">{option.label}</span>
                      <span className="text-xs text-zinc-500">{option.description}</span>
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Tono">
                <div className="flex gap-2.5">
                  {TONE_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setTone(option.id)}
                      className={glassPill(
                        `cursor-pointer px-3.5 py-1.5 text-xs transition-colors ${tone === option.id ? 'border-white/30 bg-white/[0.1] text-white' : 'hover:border-white/20'}`,
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Restricciones / persona">
                <textarea
                  value={restrictions}
                  onChange={(event) => {
                    setRestrictions(event.target.value);
                    set('agent_persona', event.target.value);
                  }}
                  rows={3}
                  placeholder="Tono, límites de estilo, temas a evitar..."
                  className={glassInput('resize-none')}
                />
              </Field>

              <p className={`${glassPill('w-fit gap-1.5 text-[11px] text-zinc-500')}`}>
                <LuMessageSquareText className="h-3 w-3" aria-hidden="true" />
                Se guarda en agent_persona, un campo opcional ya soportado por el blueprint.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Small building blocks ────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-white/[0.06] pb-5">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04]">
        <Icon className="h-4 w-4 text-zinc-300" aria-hidden="true" />
      </span>
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-0.5 text-sm text-zinc-500">{description}</p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

// Re-exported so the page can reference generic settings/tools icons without
// importing react-icons directly in multiple places.
export const dashboardIcons = { LuCog, LuSettings2, LuWrench };
