'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { glassStyle } from '@/features/landing/components/landing-modal';
import { creator, registerAgent } from '@/lib/api';
import type { AgentConfig } from '@/types/agent';
import type {
  Catalog,
  CatalogItem,
  CreatorAnswers,
  DecisionQuestion,
  GeneratedAgentBundle,
  QuestionOption,
  Workflow,
} from '@huascar/types';

const SpaceSimulation = dynamic(
  () => import('@/features/landing/components/space-simulation').then((m) => m.SpaceSimulation),
  { ssr: false },
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface RegisteredAgent {
  id: string;
  name: string;
  config?: unknown;
}

function defaultAnswer(question: DecisionQuestion): string | boolean | string[] {
  if (question.type === 'boolean') return false;
  if (question.type === 'multiselect' || question.type === 'catalog-multiselect') return [];
  return '';
}

function parseJsonArtifact<T>(bundle: GeneratedAgentBundle, path: string): T | null {
  const artifact = bundle.artifacts.find((item) => item.path === path);
  if (!artifact) return null;
  try {
    return JSON.parse(artifact.content) as T;
  } catch {
    return null;
  }
}

function buildRegistryConfig(bundle: GeneratedAgentBundle, answers: CreatorAnswers): AgentConfig {
  const steering = parseJsonArtifact<AgentConfig['steering']>(bundle, 'huascar/steering.json');
  const rag = parseJsonArtifact<{ knowledge_bases?: unknown[] }>(bundle, 'huascar/rag.json');
  const mcps = parseJsonArtifact<Record<string, unknown>>(bundle, 'huascar/mcps.json');
  const mcpNames = mcps
    ? Object.keys(mcps.mcpServers && typeof mcps.mcpServers === 'object' ? mcps.mcpServers : mcps)
    : [];
  const prompt = typeof answers.objective === 'string' ? answers.objective : 'Agente generado desde el creador.';
  return {
    steering: steering ?? { roles: { GENERATED_AGENT: { system_prompt: prompt } } },
    ...(rag?.knowledge_bases ? { knowledge: rag.knowledge_bases } : {}),
    ...(mcpNames.length ? { tools: mcpNames } : {}),
    ...(rag ? { rag: { sources: rag.knowledge_bases ?? [] } } : {}),
    ...(mcps ? { mcps: mcpNames } : {}),
  };
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NewAgentPage() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [catalogVersion, setCatalogVersion] = useState('');
  const [answers, setAnswers] = useState<CreatorAnswers>({});
  const [question, setQuestion] = useState<DecisionQuestion | null>(null);
  const [progress, setProgress] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [bundle, setBundle] = useState<GeneratedAgentBundle | null>(null);
  const [registered, setRegistered] = useState<RegisteredAgent | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [questionHistory, setQuestionHistory] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([creator.getCatalog(), creator.getWorkflow()])
      .then(([catalogData, workflowData]) => {
        setCatalog(catalogData);
        setWorkflow(workflowData);
        setCatalogVersion(catalogData.version);
        return creator.evaluate({}, { workflowVersion: workflowData.version, catalogVersion: catalogData.version });
      })
      .then((evaluation) => {
        setQuestion(evaluation.nextQuestion);
        setProgress(evaluation.progress.percent);
        setTotalQuestions(evaluation.progress.total);
        setAnsweredCount(evaluation.progress.answered);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const value = question ? (answers[question.id] ?? defaultAnswer(question)) : '';
  const options = useMemo<(QuestionOption | CatalogItem)[]>(() => {
    if (!question) return [];
    if (question.options) return question.options;
    return (catalog?.items ?? []).filter((item) => question.catalogCategories?.includes(item.category));
  }, [catalog, question]);

  async function submitAnswer() {
    if (!workflow || !question) return;
    setError('');
    const nextAnswers = { ...answers, [question.id]: value };
    try {
      setTransitioning(true);
      const evaluation = await creator.evaluate(nextAnswers, {
        workflowVersion: workflow.version,
        catalogVersion,
      });
      // Small delay for transition
      await new Promise((r) => setTimeout(r, 150));
      setAnswers(evaluation.answers);
      setProgress(evaluation.progress.percent);
      setTotalQuestions(evaluation.progress.total);
      setAnsweredCount(evaluation.progress.answered);
      if (evaluation.progress.complete) {
        const generated = await creator.generate(evaluation.answers, {
          workflowVersion: workflow.version,
          catalogVersion,
        });
        setBundle(generated);
        setQuestion(null);
      } else {
        setQuestionHistory((h) => [...h, question.id]);
        setQuestion(evaluation.nextQuestion);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo evaluar la respuesta.');
    } finally {
      setTransitioning(false);
    }
  }

  async function goBack() {
    if (!workflow || questionHistory.length === 0) return;
    setError('');
    const prevHistory = [...questionHistory];
    prevHistory.pop();
    setQuestionHistory(prevHistory);

    // Remove current question answer and re-evaluate
    const nextAnswers = { ...answers };
    if (question) delete nextAnswers[question.id];

    try {
      setTransitioning(true);
      const evaluation = await creator.evaluate(nextAnswers, {
        workflowVersion: workflow.version,
        catalogVersion,
      });
      await new Promise((r) => setTimeout(r, 150));
      setAnswers(evaluation.answers);
      setProgress(evaluation.progress.percent);
      setTotalQuestions(evaluation.progress.total);
      setAnsweredCount(evaluation.progress.answered);
      setQuestion(evaluation.nextQuestion);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo volver atrás.');
    } finally {
      setTransitioning(false);
    }
  }

  async function registerGeneratedAgent() {
    if (!bundle) return;
    setError('');
    try {
      const name = bundle.blueprint?.identity?.name || String(answers.agent_name || 'Generated Agent');
      setRegistered(await registerAgent(name, buildRegistryConfig(bundle, answers)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el agente.');
    }
  }

  const canContinue =
    question?.type === 'boolean' || (Array.isArray(value) ? value.length > 0 : String(value).trim().length > 0);

  return (
    <>
      {/* Mobile block */}
      <MobileBlock />

      {/* Desktop creator */}
      <div className="hidden md:block allow-scroll">
        <main className="relative min-h-screen overflow-x-hidden text-zinc-50">
          {/* Space background */}
          <div className="fixed inset-0 z-0">
            <SpaceSimulation />
          </div>

          {/* Top bar */}
          <TopBar
            progress={progress}
            answeredCount={answeredCount}
            totalQuestions={totalQuestions}
            complete={!!bundle}
          />

          {/* Content */}
          <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 pb-32 pt-20">
            {loading && (
              <div style={glassStyle} className="rounded-2xl px-8 py-6">
                <p className="text-zinc-400">Cargando workflow...</p>
              </div>
            )}

            {error && (
              <div className="mb-4 max-w-2xl rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-4 text-sm text-red-200 backdrop-blur-sm">
                {error}
              </div>
            )}

            {/* Question card with transitions */}
            {question && !loading && (
              <div
                className={`w-full max-w-2xl transition-all duration-200 ${
                  transitioning ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'
                }`}
              >
                <QuestionCard
                  question={question}
                  options={options}
                  value={value}
                  onChange={(next) => setAnswers((current) => ({ ...current, [question.id]: next }))}
                  onSubmit={submitAnswer}
                  onBack={questionHistory.length > 0 ? goBack : undefined}
                  canContinue={canContinue}
                />
              </div>
            )}

            {/* Bundle view */}
            {bundle && !loading && (
              <BundleView
                bundle={bundle}
                answers={answers}
                registered={registered}
                onRegister={registerGeneratedAgent}
              />
            )}
          </div>

          {/* Summary strip */}
          {Object.keys(answers).length > 0 && !bundle && <SummaryStrip answers={answers} />}
        </main>
      </div>
    </>
  );
}

// ─── Mobile Block ─────────────────────────────────────────────────────────────

function MobileBlock() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-center md:hidden">
      <div className="mb-6 text-4xl">🖥️</div>
      <h1 className="text-xl font-semibold text-zinc-100">Usa un computador para diseñar agentes</h1>
      <p className="mt-3 text-sm text-zinc-400">
        El creador de agentes requiere una pantalla más grande para la mejor experiencia.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full border border-emerald-500/30 bg-emerald-600/20 px-6 py-3 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-600/30"
      >
        ← Volver al inicio
      </Link>
    </div>
  );
}

// ─── Top Bar ──────────────────────────────────────────────────────────────────

function TopBar({
  progress,
  answeredCount,
  totalQuestions,
  complete,
}: {
  progress: number;
  answeredCount: number;
  totalQuestions: number;
  complete: boolean;
}) {
  const dots = Array.from({ length: totalQuestions }, (_, i) => i);

  return (
    <div className="fixed left-0 right-0 top-0 z-30 px-4 py-3">
      <div style={glassStyle} className="mx-auto flex max-w-3xl items-center justify-between rounded-full px-6 py-3">
        <Link href="/" className="text-sm text-zinc-400 transition-colors hover:text-emerald-400">
          ← Huascar
        </Link>

        {!complete && totalQuestions > 0 && (
          <div className="flex items-center gap-1.5">
            {dots.map((i) => {
              const isAnswered = i < answeredCount;
              const isActive = i === answeredCount;
              return (
                <div
                  key={i}
                  className={`h-2 w-2 rounded-full transition-all duration-300 ${
                    isActive
                      ? 'scale-125 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                      : isAnswered
                        ? 'bg-emerald-500'
                        : 'bg-zinc-700'
                  }`}
                />
              );
            })}
          </div>
        )}

        {complete && <span className="text-xs font-medium text-emerald-400">✓ Completo</span>}

        <span className="text-xs tabular-nums text-zinc-500">{progress}%</span>
      </div>
    </div>
  );
}

// ─── Question Card ────────────────────────────────────────────────────────────

function QuestionCard({
  question,
  options,
  value,
  onChange,
  onSubmit,
  onBack,
  canContinue,
}: {
  question: DecisionQuestion;
  options: (QuestionOption | CatalogItem)[];
  value: string | boolean | string[];
  onChange: (value: string | boolean | string[]) => void;
  onSubmit: () => void;
  onBack?: () => void;
  canContinue: boolean;
}) {
  return (
    <div style={glassStyle} className="rounded-2xl p-8">
      {/* Section pill */}
      <span className="inline-block rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
        {question.section}
      </span>

      {/* Title */}
      <h2 className="mt-5 text-2xl font-semibold leading-tight text-zinc-100">{question.prompt}</h2>

      {/* Description */}
      {question.description && <p className="mt-2 text-sm leading-relaxed text-zinc-400">{question.description}</p>}

      {/* Input area */}
      <div className="mt-6">
        <QuestionInput question={question} options={options} value={value} onChange={onChange} />
      </div>

      {/* Action bar */}
      <div className="mt-8 flex items-center justify-between">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-zinc-400 transition-colors hover:text-emerald-400"
          >
            ← Atrás
          </button>
        ) : (
          <div />
        )}
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canContinue}
          className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-900/30 transition-all hover:bg-emerald-500 hover:shadow-emerald-800/40 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:shadow-none"
          style={canContinue ? { boxShadow: '0 4px 20px rgba(16,185,129,0.25)' } : undefined}
        >
          Continuar →
        </button>
      </div>
    </div>
  );
}

// ─── Question Input ───────────────────────────────────────────────────────────

function QuestionInput({
  question,
  options,
  value,
  onChange,
}: {
  question: DecisionQuestion;
  options: (QuestionOption | CatalogItem)[];
  value: string | boolean | string[];
  onChange: (value: string | boolean | string[]) => void;
}) {
  const inputBase =
    'w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all';

  if (question.type === 'textarea') {
    return (
      <textarea
        className={`${inputBase} h-32 resize-none`}
        placeholder={question.placeholder}
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (question.type === 'text') {
    return (
      <input
        className={inputBase}
        placeholder={question.placeholder}
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (question.type === 'boolean') {
    return (
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`flex w-full items-center gap-3 rounded-xl border px-5 py-4 text-left transition-all ${
          value
            ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
            : 'border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-600'
        }`}
      >
        <div
          className={`flex h-5 w-5 items-center justify-center rounded-md border transition-all ${
            value ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-600 bg-zinc-900'
          }`}
        >
          {value && (
            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <span className="font-medium">Sí, activar</span>
      </button>
    );
  }

  if (question.type === 'select' || question.type === 'catalog-select') {
    return (
      <div className="grid gap-2">
        {options.map((option) => {
          const isSelected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`group relative rounded-xl border px-5 py-4 text-left transition-all duration-200 ${
                isSelected
                  ? 'border-emerald-500/60 bg-emerald-500/10 shadow-[0_0_12px_rgba(52,211,153,0.15)]'
                  : 'border-white/[0.06] bg-white/[0.02] hover:scale-[1.01] hover:border-white/[0.12] hover:bg-white/[0.04]'
              }`}
              style={!isSelected ? { backdropFilter: 'blur(4px)' } : undefined}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className={`block font-medium ${isSelected ? 'text-emerald-200' : 'text-zinc-200'}`}>
                    {option.label}
                  </span>
                  {option.description && (
                    <span className={`mt-1 block text-xs ${isSelected ? 'text-emerald-300/70' : 'text-zinc-500'}`}>
                      {option.description}
                    </span>
                  )}
                </div>
                {isSelected && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
                    <svg
                      className="h-3 w-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  // multiselect / catalog-multiselect
  const selected = Array.isArray(value) ? value : [];
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const isSelected = selected.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(isSelected ? selected.filter((id) => id !== option.id) : [...selected, option.id])}
            className={`group relative rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
              isSelected
                ? 'border-emerald-500/60 bg-emerald-500/10 shadow-[0_0_12px_rgba(52,211,153,0.15)]'
                : 'border-white/[0.06] bg-white/[0.02] hover:scale-[1.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
            }`}
            style={!isSelected ? { backdropFilter: 'blur(4px)' } : undefined}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${
                  isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-600 bg-zinc-900'
                }`}
              >
                {isSelected && (
                  <svg
                    className="h-2.5 w-2.5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div>
                <span className={`block text-sm font-medium ${isSelected ? 'text-emerald-200' : 'text-zinc-200'}`}>
                  {option.label}
                </span>
                {option.description && (
                  <span className={`mt-0.5 block text-xs ${isSelected ? 'text-emerald-300/70' : 'text-zinc-500'}`}>
                    {option.description}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Bundle View ──────────────────────────────────────────────────────────────

function BundleView({
  bundle,
  answers,
  registered,
  onRegister,
}: {
  bundle: GeneratedAgentBundle;
  answers: CreatorAnswers;
  registered: RegisteredAgent | null;
  onRegister: () => void;
}) {
  return (
    <div className="w-full max-w-2xl space-y-6">
      {/* Header card */}
      <div style={glassStyle} className="rounded-2xl p-8">
        <span className="inline-block rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
          ✓ Bundle generado
        </span>
        <h2 className="mt-5 text-2xl font-semibold text-zinc-100">
          {bundle.blueprint?.identity?.name || answers.agent_name}
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          {bundle.artifacts.length} artefactos listos para aplicar en tu proyecto.
        </p>

        {registered ? (
          <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">
            ✓ Agente registrado: <span className="font-medium">{registered.name}</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={onRegister}
            className="mt-6 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:bg-emerald-500"
            style={{ boxShadow: '0 4px 20px rgba(16,185,129,0.25)' }}
          >
            Registrar agente
          </button>
        )}
      </div>

      {/* Artifacts list */}
      <div className="grid gap-3">
        {bundle.artifacts.map((artifact, i) => (
          <div
            key={artifact.path}
            style={{
              ...glassStyle,
              animationDelay: `${i * 80}ms`,
            }}
            className="animate-fade-in-up rounded-xl px-5 py-4"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{artifact.mediaType === 'application/json' ? '📄' : '📝'}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-200">{artifact.path}</p>
                <p className="mt-0.5 truncate text-xs text-zinc-500">{artifact.description}</p>
              </div>
              <span className="shrink-0 rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-500">
                {artifact.kind}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Back to dashboard */}
      <div className="text-center">
        <Link href="/dashboard" className="inline-block text-sm text-zinc-400 transition-colors hover:text-emerald-400">
          Ir al dashboard →
        </Link>
      </div>
    </div>
  );
}

// ─── Summary Strip ────────────────────────────────────────────────────────────

function SummaryStrip({ answers }: { answers: CreatorAnswers }) {
  const entries = Object.entries(answers).filter(([, v]) => {
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'boolean') return v;
    return String(v).trim().length > 0;
  });

  if (entries.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 px-4 py-3">
      <div
        style={glassStyle}
        className="mx-auto flex max-w-3xl items-center gap-2 overflow-x-auto rounded-full px-5 py-2.5"
      >
        <span className="shrink-0 text-xs text-zinc-500">Resumen:</span>
        {entries.map(([key, val]) => (
          <span
            key={key}
            className="shrink-0 rounded-full border border-zinc-700/50 bg-zinc-800/50 px-3 py-1 text-xs text-zinc-300"
          >
            {Array.isArray(val) ? val.join(', ') : typeof val === 'boolean' ? '✓' : String(val).slice(0, 30)}
          </span>
        ))}
      </div>
    </div>
  );
}
