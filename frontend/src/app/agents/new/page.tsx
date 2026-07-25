'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import {
  CompletionScreen,
  DynamicQuestion,
  ModelTuningPanel,
  type ModelTuningState,
  ModeSelect,
  type CreatorMode,
  ReviewScreen,
  StepContainer,
} from '@/features/creator/components';
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

  // State for ultra-technical parameters
  const [tuningState, setTuningState] = useState<ModelTuningState>({
    provider: 'openai',
    temperature: 0.7,
  });

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

  const canContinue =
    question?.type === 'boolean' || (Array.isArray(value) ? value.length > 0 : String(value).trim().length > 0);

  // Advanced controls shown on fine-tuning or behind advanced button
  const advancedControls = (
    <div className="mt-4">
      <ModelTuningPanel value={tuningState} onChange={setTuningState} />
    </div>
  );

  return (
    <>
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

      <div className="hidden md:block">
        {!mode && !loading && (
          <StepContainer>
            <ModeSelect onSelect={setMode} />
          </StepContainer>
        )}

        {mode && !isReviewing && !bundle && !loading && (
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
                  advancedControls={advancedControls}
                />

                <div className="mt-8 flex items-center justify-between">
                  {questionHistory.length > 0 ? (
                    <button
                      type="button"
                      onClick={goBack}
                      className="text-sm text-zinc-400 transition-colors hover:text-emerald-400"
                    >
                      ← Atrás
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setMode(null)}
                      className="text-sm text-zinc-400 transition-colors hover:text-emerald-400"
                    >
                      ← Cambiar modo
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={submitAnswer}
                    disabled={!canContinue}
                    className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-900/30 transition-all hover:bg-emerald-500 hover:shadow-emerald-800/40 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:shadow-none"
                    style={canContinue ? { boxShadow: '0 4px 20px rgba(16,185,129,0.25)' } : undefined}
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
