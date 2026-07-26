'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { LuMonitor } from 'react-icons/lu';

import {
  CompletionScreen,
  DynamicQuestion,
  FineTuningDashboard,
  ModeSelect,
  type CreatorMode,
  PresetsGallery,
  ReviewScreen,
  StepContainer,
} from '@/features/creator/components';
import type { CreatorPreset } from '@/features/creator/presets/presets';
import { buildShortFlowDefaults, SHORT_FLOW_QUESTION_IDS } from '@/features/creator/presets/short-flow';
import { GlassBackButton, GlassIconButton } from '@/components/ui/glass-icon-button';
import { glassButton } from '@/lib/glass';
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
  DecisionEvaluation,
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
  const [mode, setMode] = useState<CreatorMode | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [catalogVersion, setCatalogVersion] = useState('');

  const [answers, setAnswers] = useState<CreatorAnswers>({});
  const [question, setQuestion] = useState<DecisionQuestion | null>(null);

  const [progress, setProgress] = useState(0);

  const [bundle, setBundle] = useState<GeneratedAgentBundle | null>(null);
  const [registered, setRegistered] = useState<RegisteredAgent | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [questionHistory, setQuestionHistory] = useState<string[]>([]);

  const [evaluationData, setEvaluationData] = useState<DecisionEvaluation | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [generating, setGenerating] = useState(false);

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
        setEvaluationData(evaluation);
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

  /** Auto-corto asks only SHORT_FLOW_QUESTION_IDS, in the order the full
   * tree would visit them, skipping the rest entirely. */
  function nextShortFlowQuestion(evaluation: DecisionEvaluation): DecisionQuestion | null {
    const answeredIds = new Set(Object.keys(evaluation.answers));
    return (
      evaluation.visibleQuestions.find(
        (item) => SHORT_FLOW_QUESTION_IDS.includes(item.id) && !answeredIds.has(item.id),
      ) ?? null
    );
  }

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
      await new Promise((r) => setTimeout(r, 150));
      setAnswers(evaluation.answers);
      setProgress(evaluation.progress.percent);
      setEvaluationData(evaluation);

      if (mode === 'auto-corto') {
        const short = nextShortFlowQuestion(evaluation);
        if (short) {
          setQuestionHistory((h) => [...h, question.id]);
          setQuestion(short);
          return;
        }
        // Curated subset answered — fill the rest with safe defaults and
        // jump straight to review.
        await finishShortFlow(evaluation.answers);
        return;
      }

      if (evaluation.progress.complete) {
        setQuestion(null);
        setIsReviewing(true);
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

  /** Applies buildShortFlowDefaults() for every answer the curated subset
   * didn't cover, re-evaluates, and opens Review. */
  async function finishShortFlow(collected: CreatorAnswers) {
    if (!workflow) return;
    try {
      const withDefaults = { ...buildShortFlowDefaults(collected), ...collected };
      const evaluation = await creator.evaluate(withDefaults, { workflowVersion: workflow.version, catalogVersion });
      setAnswers(evaluation.answers);
      setEvaluationData(evaluation);
      setProgress(evaluation.progress.percent);
      if (evaluation.progress.complete) {
        setQuestion(null);
        setIsReviewing(true);
      } else {
        // A default didn't cover a required branch (e.g. an unexpected
        // condition) — fall back to asking whatever is still missing.
        setQuestion(evaluation.nextQuestion);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la configuración corta.');
    }
  }

  async function goBack() {
    if (!workflow || questionHistory.length === 0) return;
    setError('');
    const prevHistory = [...questionHistory];
    prevHistory.pop();
    setQuestionHistory(prevHistory);

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
      setEvaluationData(evaluation);
      setQuestion(evaluation.nextQuestion);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo volver atrás.');
    } finally {
      setTransitioning(false);
    }
  }

  async function handleGenerate() {
    if (!workflow) return;
    setGenerating(true);
    setError('');
    try {
      const generated = await creator.generate(answers, {
        workflowVersion: workflow.version,
        catalogVersion,
      });
      setBundle(generated);
      setIsReviewing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el agente.');
    } finally {
      setGenerating(false);
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

  function selectMode(next: CreatorMode) {
    setError('');
    setMode(next);
  }

  function backToModeSelect() {
    setMode(null);
    setIsReviewing(false);
    setError('');
  }

  /** Presets mode: apply a fully-answered preset, validate it against the
   * real decision tree, and open Review — same "edit before generating"
   * path as every other mode. */
  async function applyPreset(preset: CreatorPreset) {
    if (!workflow) return;
    setGenerating(true);
    setError('');
    try {
      const evaluation = await creator.evaluate(preset.answers, {
        workflowVersion: workflow.version,
        catalogVersion,
      });
      setAnswers(evaluation.answers);
      setEvaluationData(evaluation);
      setProgress(evaluation.progress.percent);
      if (evaluation.progress.complete) {
        setIsReviewing(true);
      } else {
        setQuestion(evaluation.nextQuestion);
        setError('El preset necesita una decisión adicional antes de generar (ver pregunta abajo).');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo aplicar el preset.');
    } finally {
      setGenerating(false);
    }
  }

  const canContinue =
    question?.type === 'boolean' || (Array.isArray(value) ? value.length > 0 : String(value).trim().length > 0);

  /**
   * Fine-tuning mode: evaluate the accumulated dashboard answers against the
   * backend decision tree, then move to the review screen (same one the
   * automated wizard uses) so recommendations/warnings stay consistent
   * across both modes.
   */
  async function evaluateAndReview() {
    if (!workflow) return;
    setGenerating(true);
    setError('');
    try {
      const evaluation = await creator.evaluate(answers, { workflowVersion: workflow.version, catalogVersion });
      setAnswers(evaluation.answers);
      setEvaluationData(evaluation);
      if (evaluation.progress.complete) {
        setIsReviewing(true);
      } else {
        setQuestion(evaluation.nextQuestion);
        setError(
          'Faltan decisiones requeridas por el árbol (ver siguiente pregunta abajo). El dashboard cubre los campos configurables directamente; el resto usa valores por defecto seguros una vez completado.',
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo evaluar la configuración.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center md:hidden">
        <LuMonitor className="mb-6 h-10 w-10 text-zinc-500" aria-hidden="true" />
        <h1 className="text-xl font-semibold text-zinc-100">Usa un computador para diseñar agentes</h1>
        <p className="mt-3 text-sm text-zinc-400">
          El creador de agentes requiere una pantalla más grande para la mejor experiencia.
        </p>
        <GlassBackButton href="/" label="Volver al inicio" className="mt-8" />
      </div>

      <div className="hidden md:block">
        {!mode && !loading && (
          <StepContainer>
            <ModeSelect onSelect={selectMode} />
          </StepContainer>
        )}

        {mode === 'presets' && !isReviewing && !bundle && !loading && (
          <StepContainer>
            <PresetsGallery onSelect={applyPreset} onBack={backToModeSelect} />
          </StepContainer>
        )}

        {mode === 'avanzado' && !isReviewing && !bundle && !loading && (
          <div className="relative flex h-screen flex-col items-center justify-center overflow-hidden px-4 py-6 text-zinc-100 sm:px-8">
            <SpaceSimulation showBlackHole={false} />
            <div className="absolute left-4 top-6 z-20 sm:left-8">
              <GlassIconButton onClick={backToModeSelect} label="Cambiar modo" />
            </div>
            <div className="relative z-10 mx-auto w-full max-w-6xl">
              <FineTuningDashboard
                answers={answers}
                onChange={setAnswers}
                onGenerate={evaluateAndReview}
                generating={generating}
                error={error}
              />
            </div>
          </div>
        )}

        {(mode === 'auto-corto' || mode === 'auto-largo') && !isReviewing && !bundle && !loading && (
          <StepContainer progress={progress} progressLabel={question?.section}>
            {error && (
              <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-4 text-sm text-red-200">
                {error}
              </div>
            )}

            {question && (
              <div
                className={`transition-all duration-200 ${
                  transitioning ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'
                }`}
              >
                <DynamicQuestion
                  question={question}
                  options={options}
                  value={value}
                  onChange={(next) => setAnswers((current) => ({ ...current, [question.id]: next }))}
                />

                <div className="mt-8 flex items-center justify-between">
                  {questionHistory.length > 0 ? (
                    <GlassIconButton onClick={goBack} label="Atrás" />
                  ) : (
                    <GlassIconButton onClick={backToModeSelect} label="Cambiar modo" />
                  )}
                  <button
                    type="button"
                    onClick={submitAnswer}
                    disabled={!canContinue}
                    className={`${glassButton('px-6 py-2.5 font-medium')} disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    Continuar →
                  </button>
                </div>
              </div>
            )}
          </StepContainer>
        )}

        {isReviewing && evaluationData && (
          <StepContainer progress={100} progressLabel="Revisión">
            <ReviewScreen
              answers={answers}
              recommendations={evaluationData.recommendations}
              warnings={evaluationData.warnings}
              onGenerate={handleGenerate}
              generating={generating}
              error={error}
            />
          </StepContainer>
        )}

        {bundle && (
          <StepContainer progress={100} progressLabel="Completado">
            <CompletionScreen
              bundle={bundle}
              onRegister={registerGeneratedAgent}
              registered={registered}
              error={error}
            />
          </StepContainer>
        )}
      </div>
    </>
  );
}
