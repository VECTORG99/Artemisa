'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamicImport from 'next/dynamic';
import { LuArrowLeft, LuArrowRight, LuKeyboard, LuMonitor, LuRotateCcw, LuSkipForward, LuX } from 'react-icons/lu';

import {
  CompletionScreen,
  CreatorFatalError,
  CreatorLoading,
  DynamicQuestion,
  FineTuningDashboard,
  ModeSelect,
  type CreatorMode,
  PresetsGallery,
  ReviewScreen,
  ShortcutsOverlay,
  StepContainer,
} from '@/features/creator/components';
import type { CreatorPreset } from '@/features/creator/presets/presets';
import { buildShortFlowDefaults } from '@/features/creator/presets/short-flow';
import {
  canAdvance,
  defaultAnswer,
  flowPosition,
  flowProgress,
  flowQuestionIds,
  type GuidedMode,
  resolveNextStep,
  resolvePreviousStep,
} from '@/features/creator/lib/flow';
import { clearDraft, loadDraft, saveDraft } from '@/features/creator/lib/session';
import { GlassBackButton, GlassIconButton } from '@/components/ui/glass-icon-button';
import { glassButton, glassNotice, glassPrimaryButton } from '@/lib/glass';
import { ApiError, creator, registerAgent } from '@/lib/api';
import type { AgentConfig } from '@/types/agent';
import type {
  Catalog,
  CatalogItem,
  CreatorAnswers,
  CreatorAnswerValue,
  DecisionEvaluation,
  DecisionQuestion,
  GeneratedAgentBundle,
  QuestionOption,
  Workflow,
} from '@huascar/types';

const SpaceSimulation = dynamicImport(
  () => import('@/features/landing/components/space-simulation').then((m) => m.SpaceSimulation),
  { ssr: false },
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface RegisteredAgent {
  id: string;
  name: string;
  config?: unknown;
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

/**
 * Turns a failure into something the user can act on. `ApiError` carries the
 * HTTP status, and the three the Creator can realistically hit each need a
 * different instruction — a raw "Too many requests" string tells the user
 * nothing about waiting, and a 409 means their draft is stale, not broken.
 */
function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 429)
      return 'Demasiadas peticiones seguidas al creador. Espera unos segundos y vuelve a intentarlo; tus respuestas se conservan.';
    if (err.status === 409)
      return 'El backend actualizó el árbol de decisiones. Reinicia el borrador para continuar con la versión nueva.';
    if (err.status === 422)
      return `El árbol está incompleto o una respuesta no es válida. ${err.problem?.detail ?? ''}`.trim();
    if (err.problem?.detail) return err.problem.detail;
  }
  return err instanceof Error && err.message ? err.message : fallback;
}

// ─── Transition wrapper ───────────────────────────────────────────────────────

type TransitionPhase = 'enter' | 'visible' | 'exit';

/**
 * Simple fade + vertical slide. No blur, no scale — just opacity and a tiny
 * translateY so the eye reads "next step" without any distracting effects.
 *
 * The curve is a custom ease-out that decelerates gently (like iOS page
 * transitions), and the duration is kept short (220ms) so the UI feels
 * responsive rather than theatrical.
 */
const PHASE_CLASSES: Record<TransitionPhase, string> = {
  exit: 'opacity-0 translate-y-2',
  enter: 'opacity-0 translate-y-2',
  visible: 'opacity-100 translate-y-0',
};

function AnimatedPanel({ phase, children }: { phase: TransitionPhase; children: React.ReactNode }) {
  return (
    <div className={`w-full transition-[opacity,transform] duration-220 ease-out ${PHASE_CLASSES[phase]}`}>
      {children}
    </div>
  );
}

/**
 * Runs a state change between an exit and an enter animation, and guarantees
 * the pending timer is dropped on unmount.
 */
function usePanelTransition() {
  const [phase, setPhase] = useState<TransitionPhase>('visible');
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => {
      for (const id of timers.current) window.clearTimeout(id);
      timers.current = [];
    },
    [],
  );

  const enter = useCallback(() => {
    setPhase('enter');
    const id = window.requestAnimationFrame(() => window.requestAnimationFrame(() => setPhase('visible')));
    return () => window.cancelAnimationFrame(id);
  }, []);

  const run = useCallback(
    (action: () => void) => {
      setPhase('exit');
      const id = window.setTimeout(() => {
        action();
        enter();
      }, 180); // slightly shorter than the CSS duration so the swap is invisible
      timers.current.push(id);
    },
    [enter],
  );

  return { phase, setPhase, run, enter };
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Status = 'loading' | 'fatal' | 'ready';

export default function NewAgentPage() {
  const [status, setStatus] = useState<Status>('loading');
  const [fatalError, setFatalError] = useState('');
  const [retrying, setRetrying] = useState(false);

  const [mode, setMode] = useState<CreatorMode | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);

  const [answers, setAnswers] = useState<CreatorAnswers>({});
  const [evaluation, setEvaluation] = useState<DecisionEvaluation | null>(null);

  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [visited, setVisited] = useState<string[]>([]);
  /** Set when a question was opened from Review, so submitting returns there. */
  const [returnToReview, setReturnToReview] = useState(false);

  const [reviewing, setReviewing] = useState(false);
  const [bundle, setBundle] = useState<GeneratedAgentBundle | null>(null);
  const [registered, setRegistered] = useState<RegisteredAgent | null>(null);

  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [draftNotice, setDraftNotice] = useState<{ mode: string; count: number } | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const { phase, setPhase, run, enter } = usePanelTransition();

  const catalogVersion = catalog?.version ?? '';
  const workflowVersion = workflow?.version ?? '';

  // ── Bootstrap ───────────────────────────────────────────────────────────────

  const bootstrap = useCallback(async () => {
    setFatalError('');
    try {
      const [catalogData, workflowData] = await Promise.all([creator.getCatalog(), creator.getWorkflow()]);
      setCatalog(catalogData);
      setWorkflow(workflowData);

      const versions = { workflowVersion: workflowData.version, catalogVersion: catalogData.version };
      const draft = loadDraft(workflowData.version);
      const initial = await creator.evaluate(draft?.answers ?? {}, versions);

      setEvaluation(initial);
      setAnswers(initial.answers);

      if (draft?.mode) {
        setMode(draft.mode);
        setVisited(draft.visited);
        setCurrentQuestionId(draft.currentQuestionId);
        setReviewing(draft.reviewing && initial.progress.complete);
        setDraftNotice({ mode: draft.mode, count: Object.keys(initial.answers).length });
      } else {
        setCurrentQuestionId(initial.nextQuestion?.id ?? null);
      }

      setStatus('ready');
    } catch (err) {
      setFatalError(errorMessage(err, 'El backend del creador no respondió.'));
      setStatus('fatal');
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  // Auto-dismiss draft notice after 5s
  useEffect(() => {
    if (!draftNotice) return;
    const timer = setTimeout(() => setDraftNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [draftNotice]);

  async function retryBootstrap() {
    setRetrying(true);
    setStatus('loading');
    await bootstrap();
    setRetrying(false);
  }

  // ── Derived flow state ──────────────────────────────────────────────────────

  const guidedMode: GuidedMode | null = mode === 'auto-corto' || mode === 'auto-largo' ? mode : null;

  const flowIds = useMemo(() => {
    if (!evaluation || !guidedMode) return [];
    return flowQuestionIds(evaluation.visibleQuestions, guidedMode);
  }, [evaluation, guidedMode]);

  const question = useMemo<DecisionQuestion | null>(() => {
    if (!evaluation || !currentQuestionId) return null;
    return evaluation.visibleQuestions.find((item) => item.id === currentQuestionId) ?? null;
  }, [evaluation, currentQuestionId]);

  const value = question ? (answers[question.id] ?? defaultAnswer(question)) : '';

  const options = useMemo<(QuestionOption | CatalogItem)[]>(() => {
    if (!question) return [];
    if (question.options) return question.options;
    return (catalog?.items ?? []).filter((item) => question.catalogCategories?.includes(item.category));
  }, [catalog, question]);

  /** Ids the tree accepts for `custom` questions (skills_selection / mcps_selection). */
  const allowedIds = useMemo(() => {
    if (!question || question.type !== 'custom') return undefined;
    return (catalog?.items ?? [])
      .filter((item) => question.catalogCategories?.includes(item.category))
      .map((item) => item.id);
  }, [catalog, question]);

  const questionIssues = useMemo(() => {
    if (!evaluation || !question) return [];
    return evaluation.issues.filter((issue) => issue.path === `answers.${question.id}`);
  }, [evaluation, question]);

  const progress = useMemo(() => {
    if (!guidedMode) return evaluation?.progress.percent ?? 0;
    return flowProgress(flowIds, visited, currentQuestionId);
  }, [guidedMode, evaluation, flowIds, visited, currentQuestionId]);

  const position = useMemo(() => flowPosition(flowIds, currentQuestionId), [flowIds, currentQuestionId]);

  const inQuestionFlow = Boolean(question && !reviewing && !bundle && (guidedMode || returnToReview));
  const advanceAllowed = question ? canAdvance(question, value) : false;
  const isOptional = Boolean(question && !question.required);

  // ── Draft persistence ───────────────────────────────────────────────────────

  useEffect(() => {
    if (status !== 'ready' || !workflowVersion) return;
    if (!mode) {
      clearDraft();
      return;
    }
    saveDraft({ workflowVersion, mode, answers, visited, currentQuestionId, reviewing });
  }, [status, workflowVersion, mode, answers, visited, currentQuestionId, reviewing]);

  // ── Evaluation helpers ──────────────────────────────────────────────────────

  const evaluate = useCallback(
    (next: CreatorAnswers) => creator.evaluate(next, { workflowVersion, catalogVersion }),
    [workflowVersion, catalogVersion],
  );

  function setAnswer(next: CreatorAnswerValue) {
    if (!question) return;
    setAnswers((current) => ({ ...current, [question.id]: next }));
  }

  /**
   * Auto-corto only asks a curated subset, so the remaining required answers
   * are filled with the safe defaults before Review. User answers always win
   * over defaults.
   */
  const withShortFlowDefaults = useCallback(
    (collected: CreatorAnswers): CreatorAnswers => ({ ...buildShortFlowDefaults(collected), ...collected }),
    [],
  );

  const openReview = useCallback(
    (evaluated: DecisionEvaluation) => {
      setEvaluation(evaluated);
      setAnswers(evaluated.answers);
      setCurrentQuestionId(null);
      setReturnToReview(false);
      setReviewing(true);
      setPhase('enter');
      enter();
    },
    [enter, setPhase],
  );

  async function submitAnswer() {
    if (!question || !workflow || busy) return;
    if (!advanceAllowed) return;

    setError('');
    setBusy(true);
    setPhase('exit');

    const submitted: CreatorAnswers = { ...answers };
    if (value === undefined || (typeof value === 'string' && value.trim().length === 0 && isOptional)) {
      delete submitted[question.id];
    } else {
      submitted[question.id] = value as CreatorAnswerValue;
    }

    try {
      const evaluated = await evaluate(submitted);
      setEvaluation(evaluated);
      setAnswers(evaluated.answers);

      // An answer the backend rejected must not advance the flow, otherwise the
      // value is silently dropped and the user only finds out at Review.
      const rejected = evaluated.issues.some((issue) => issue.path === `answers.${question.id}`);
      if (rejected) {
        setPhase('visible');
        return;
      }

      if (returnToReview && evaluated.progress.complete) {
        openReview(evaluated);
        return;
      }

      if (!guidedMode) {
        setPhase('visible');
        return;
      }

      if (guidedMode === 'auto-corto') {
        const step = resolveNextStep(evaluated, guidedMode, visited, question.id);
        setVisited(step.visited);
        if (step.question) {
          setCurrentQuestionId(step.question.id);
          setPhase('enter');
          enter();
          return;
        }
        // Curated subset finished: merge the safe defaults for everything it
        // does not ask, then open Review. Only if the tree still isn't closed
        // does the user get asked one more question.
        const completed = await evaluate(withShortFlowDefaults(evaluated.answers));
        if (completed.progress.complete) {
          openReview(completed);
        } else {
          setEvaluation(completed);
          setAnswers(completed.answers);
          setCurrentQuestionId(completed.nextQuestion?.id ?? null);
          setError(
            'La configuración corta necesita una decisión adicional antes de generar. Respóndela para continuar.',
          );
          setPhase('enter');
          enter();
        }
        return;
      }

      const step = resolveNextStep(evaluated, guidedMode, visited, question.id);
      setVisited(step.visited);
      if (step.question) {
        setCurrentQuestionId(step.question.id);
        setPhase('enter');
        enter();
        return;
      }
      if (step.blocking) {
        // Auto-largo walks every visible question, so this only happens if the
        // backend requires something outside the mode's list. Asking it beats
        // opening a Review whose "Generar" would fail with 422.
        setCurrentQuestionId(step.blocking.id);
        setPhase('enter');
        enter();
        return;
      }
      openReview(evaluated);
    } catch (err) {
      setError(errorMessage(err, 'No se pudo evaluar la respuesta.'));
      setPhase('visible');
    } finally {
      setBusy(false);
    }
  }

  /** Optional questions can be left unanswered without blocking the flow. */
  async function skipQuestion() {
    if (!question || !guidedMode || busy || question.required) return;
    setError('');
    setBusy(true);
    setPhase('exit');

    const withoutAnswer = { ...answers };
    delete withoutAnswer[question.id];

    try {
      const evaluated = await evaluate(withoutAnswer);
      setEvaluation(evaluated);
      setAnswers(evaluated.answers);
      const step = resolveNextStep(evaluated, guidedMode, visited, question.id);
      setVisited(step.visited);
      if (step.question) {
        setCurrentQuestionId(step.question.id);
        setPhase('enter');
        enter();
        return;
      }
      if (guidedMode === 'auto-corto') {
        const completed = await evaluate(withShortFlowDefaults(evaluated.answers));
        openReview(completed);
        return;
      }
      if (step.blocking) {
        setCurrentQuestionId(step.blocking.id);
        setPhase('enter');
        enter();
        return;
      }
      openReview(evaluated);
    } catch (err) {
      setError(errorMessage(err, 'No se pudo omitir la pregunta.'));
      setPhase('visible');
    } finally {
      setBusy(false);
    }
  }

  /**
   * One step back inside the question flow. The previous answer is kept so the
   * user can adjust it — the old implementation popped the trail but deleted
   * the *current* question's answer, so the backend returned the same question
   * and the button appeared to do nothing.
   */
  function goBackOneQuestion() {
    if (!guidedMode || busy) return;
    const step = resolvePreviousStep(visited, flowIds);
    if (!step.questionId) return;
    setError('');
    run(() => {
      setVisited(step.visited);
      setCurrentQuestionId(step.questionId);
      setReturnToReview(false);
    });
  }

  // ── Mode navigation ────────────────────────────────────────────────────────

  function selectMode(next: CreatorMode) {
    setError('');
    run(() => {
      setMode(next);
      setReviewing(false);
      setBundle(null);
      setReturnToReview(false);
      if (next === 'auto-corto' || next === 'auto-largo') {
        const ids = evaluation ? flowQuestionIds(evaluation.visibleQuestions, next) : [];
        const stillValid = currentQuestionId && ids.includes(currentQuestionId);
        setVisited((current) => current.filter((id) => ids.includes(id)));
        setCurrentQuestionId(stillValid ? currentQuestionId : (ids[0] ?? null));
      }
    });
  }

  function backToModeSelect() {
    run(() => {
      setMode(null);
      setReviewing(false);
      setBundle(null);
      setReturnToReview(false);
      setError('');
    });
  }

  function resetDraft() {
    clearDraft();
    run(() => {
      setMode(null);
      setAnswers({});
      setVisited([]);
      setCurrentQuestionId(evaluation?.nextQuestion?.id ?? null);
      setReviewing(false);
      setBundle(null);
      setRegistered(null);
      setReturnToReview(false);
      setError('');
    });
    void evaluate({})
      .then((evaluated) => {
        setEvaluation(evaluated);
        setAnswers(evaluated.answers);
        setCurrentQuestionId(evaluated.nextQuestion?.id ?? null);
      })
      .catch((err: unknown) => setError(errorMessage(err, 'No se pudo reiniciar el borrador.')));
  }

  /** Leaves a single-answer edit without applying it. */
  function cancelEdit() {
    setError('');
    run(() => {
      setReturnToReview(false);
      setCurrentQuestionId(null);
      setReviewing(true);
    });
  }

  /**
   * Back semantics, from the innermost state outwards:
   * single-answer edit → review → question flow → mode select → landing.
   */
  function handleBackButton() {
    if (!mode) {
      window.location.href = '/';
      return;
    }
    if (returnToReview) {
      cancelEdit();
      return;
    }
    if (bundle) {
      run(() => {
        setBundle(null);
        setRegistered(null);
        setReviewing(true);
      });
      return;
    }
    if (reviewing) {
      if (guidedMode && visited.length > 0) {
        run(() => {
          setReviewing(false);
          const step = resolvePreviousStep(visited, flowIds);
          setVisited(step.visited);
          setCurrentQuestionId(step.questionId);
        });
        return;
      }
      backToModeSelect();
      return;
    }
    if (inQuestionFlow && visited.length > 0) {
      goBackOneQuestion();
      return;
    }
    backToModeSelect();
  }

  // ── Generation ─────────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!workflow) return;
    setGenerating(true);
    setError('');
    try {
      const generated = await creator.generate(answers, { workflowVersion, catalogVersion });
      run(() => {
        setBundle(generated);
        setReviewing(false);
      });
    } catch (err) {
      setError(errorMessage(err, 'No se pudo generar el agente.'));
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
      if (err instanceof ApiError && err.status === 429) {
        setError(
          'Has alcanzado el límite de pruebas efímeras para tu IP. Vuelve a intentarlo en ~1 hora; el agente se conserva para descargar.',
        );
        return;
      }
      setError(errorMessage(err, 'No se pudo registrar el agente.'));
    }
  }

  /** Opens a single question from Review and returns there once answered. */
  function editAnswer(questionId: string) {
    if (!evaluation) return;
    const exists = evaluation.visibleQuestions.some((item) => item.id === questionId);
    if (!exists) return;
    setError('');
    run(() => {
      setReviewing(false);
      setReturnToReview(true);
      setVisited((current) => current.filter((id) => id !== questionId));
      setCurrentQuestionId(questionId);
    });
  }

  /** Presets mode: apply a complete answer set, validate it, open Review. */
  async function applyPreset(preset: CreatorPreset) {
    if (!workflow) return;
    setGenerating(true);
    setError('');
    try {
      const evaluated = await evaluate(preset.answers);
      if (evaluated.progress.complete) {
        run(() => {
          setEvaluation(evaluated);
          setAnswers(evaluated.answers);
          setVisited(evaluated.visibleQuestions.map((item) => item.id));
          setCurrentQuestionId(null);
          setReviewing(true);
        });
        return;
      }
      // A preset that no longer closes the tree (backend workflow changed)
      // continues as a guided flow instead of dead-ending on an error.
      run(() => {
        setMode('auto-largo');
        setEvaluation(evaluated);
        setAnswers(evaluated.answers);
        setVisited(
          flowQuestionIds(evaluated.visibleQuestions, 'auto-largo').filter(
            (id) => id !== evaluated.nextQuestion?.id && evaluated.answeredQuestionIds.includes(id),
          ),
        );
        setCurrentQuestionId(evaluated.nextQuestion?.id ?? null);
        setError(
          `El preset «${preset.name}» necesita una decisión adicional con la versión actual del árbol. Complétala para continuar.`,
        );
      });
    } catch (err) {
      setError(errorMessage(err, 'No se pudo aplicar el preset.'));
    } finally {
      setGenerating(false);
    }
  }

  /** Advanced mode: validate the dashboard answers, then open Review. */
  async function evaluateAndReview() {
    if (!workflow) return;
    setGenerating(true);
    setError('');
    try {
      const evaluated = await evaluate(answers);
      if (evaluated.progress.complete) {
        run(() => {
          setEvaluation(evaluated);
          setAnswers(evaluated.answers);
          setReviewing(true);
        });
        return;
      }
      setEvaluation(evaluated);
      setAnswers(evaluated.answers);
      setError(
        evaluated.issues.length > 0
          ? `El backend rechazó ${evaluated.issues.length} respuesta(s): ${evaluated.issues.map((issue) => issue.message).join(' ')}`
          : `Faltan respuestas obligatorias. La primera es «${evaluated.nextQuestion?.prompt ?? 'desconocida'}».`,
      );
    } catch (err) {
      setError(errorMessage(err, 'No se pudo evaluar la configuración.'));
    } finally {
      setGenerating(false);
    }
  }

  // ── Keyboard shortcuts (issue #386) ────────────────────────────────────────

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = Boolean(target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

      if (event.key === '?' && !typing) {
        event.preventDefault();
        setShortcutsOpen((current) => !current);
        return;
      }
      if (shortcutsOpen) return;

      if (event.key === 'Escape' && mode) {
        event.preventDefault();
        backToModeSelect();
        return;
      }
      if (event.key === 'ArrowLeft' && event.altKey) {
        event.preventDefault();
        handleBackButton();
        return;
      }
      if (event.key === 'Enter' && inQuestionFlow) {
        const multiline = target?.tagName === 'TEXTAREA';
        if (multiline && !event.ctrlKey && !event.metaKey) return;
        event.preventDefault();
        void submitAnswer();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // `submitAnswer` and `handleBackButton` close over the current step; the
    // dependency list is intentionally the state that changes a step.
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  // A question panel wins over the mode's own panel: editing one answer from
  // Review (`returnToReview`) has to work in Presets and Avanzado too, not just
  // in the guided modes.
  const showQuestionPanel = inQuestionFlow;
  const showAdvanced = mode === 'avanzado' && !reviewing && !bundle && !showQuestionPanel;
  const showPresets = mode === 'presets' && !reviewing && !bundle && !showQuestionPanel;

  return (
    <>
      {/* Mobile fallback (issue #385): the Creator needs a wide viewport for the
          catalog grids and the generated bundle, so it is not rendered below md. */}
      <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center md:hidden">
        <LuMonitor className="mb-6 h-10 w-10 text-zinc-500" aria-hidden="true" />
        <h1 className="text-xl font-semibold text-zinc-100">Usa un computador para diseñar agentes</h1>
        <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-400">
          El creador muestra el catálogo completo de tecnologías y el bundle generado archivo por archivo. Necesita una
          pantalla más amplia.
        </p>
        <GlassBackButton href="/" label="Volver al inicio" className="mt-8" />
      </div>

      {/* Desktop Creator */}
      <div className="hidden md:block">
        {/* Persistent background — renders once, never re-mounts */}
        <div className="fixed inset-0 z-0">
          <SpaceSimulation showBlackHole={false} maxMeteors={8} meteorSpawnRate={0.4} />
        </div>

        <main className="relative flex h-screen flex-col items-center justify-center overflow-hidden px-4 py-6 text-zinc-50 sm:px-8">
          {/* Back control — outside the animated area so it never flickers */}
          {status === 'ready' && (
            <div className="absolute left-4 top-6 z-20 sm:left-8">
              <GlassBackButton href="/" label="Volver al inicio" />
            </div>
          )}

          {/* Utilities — shortcuts help, and reset while a draft exists */}
          {status === 'ready' && (
            <div className="absolute right-4 top-6 z-20 flex items-center gap-2 sm:right-8">
              {mode && <GlassIconButton onClick={resetDraft} label="Reiniciar borrador" icon={LuRotateCcw} />}
              <GlassIconButton onClick={() => setShortcutsOpen(true)} label="Atajos de teclado" icon={LuKeyboard} />
            </div>
          )}

          {status === 'loading' && <CreatorLoading />}

          {status === 'fatal' && (
            <CreatorFatalError message={fatalError} onRetry={retryBootstrap} retrying={retrying} />
          )}

          {status === 'ready' && (
            <AnimatedPanel phase={phase}>
              {!mode && (
                <StepContainer>
                  <ModeSelect onSelect={selectMode} />
                </StepContainer>
              )}

              {showPresets && (
                <StepContainer size="wide">
                  <PresetsGallery onSelect={applyPreset} applying={generating} catalog={catalog} workflow={workflow} />
                </StepContainer>
              )}

              {showAdvanced && (
                <div className="relative z-10 mx-auto w-full max-w-7xl">
                  <FineTuningDashboard
                    answers={answers}
                    onChange={setAnswers}
                    onGenerate={evaluateAndReview}
                    generating={generating}
                    error={error}
                    issues={evaluation?.issues ?? []}
                    catalog={catalog}
                    workflow={workflow}
                  />
                </div>
              )}

              {showQuestionPanel && question && (
                <StepContainer
                  progress={progress}
                  progressLabel={returnToReview ? `Editando · ${question.section}` : question.section}
                  stepLabel={guidedMode && !returnToReview ? `Paso ${position.step} de ${position.total}` : undefined}
                  withActionBar
                >
                  {error && (
                    <div className={glassNotice('warn', 'mb-6')} role="status">
                      <span>{error}</span>
                    </div>
                  )}
                  <DynamicQuestion
                    question={question}
                    options={options}
                    value={value}
                    onChange={setAnswer}
                    issues={questionIssues}
                    allowedIds={allowedIds}
                  />
                </StepContainer>
              )}

              {reviewing && evaluation && (
                <StepContainer progress={100} progressLabel="Revisión final" size="wide">
                  <ReviewScreen
                    answers={answers}
                    workflow={workflow}
                    catalog={catalog}
                    recommendations={evaluation.recommendations}
                    warnings={evaluation.warnings}
                    issues={evaluation.issues}
                    onGenerate={handleGenerate}
                    onEditAnswer={editAnswer}
                    generating={generating}
                    error={error}
                  />
                </StepContainer>
              )}

              {bundle && (
                <StepContainer progress={100} progressLabel="Bundle generado" size="wide">
                  <CompletionScreen
                    bundle={bundle}
                    onRegister={registerGeneratedAgent}
                    registered={registered}
                    error={error}
                  />
                </StepContainer>
              )}
            </AnimatedPanel>
          )}

          {/* Action bar — only during the guided question flow */}
          {status === 'ready' && showQuestionPanel && (
            <div className="absolute inset-x-0 bottom-6 z-20 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={returnToReview ? cancelEdit : goBackOneQuestion}
                disabled={busy || (!returnToReview && visited.length === 0)}
                className={glassButton('w-40 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-30')}
              >
                <LuArrowLeft className="h-4 w-4" aria-hidden="true" />
                {returnToReview ? 'Cancelar' : 'Atrás'}
              </button>

              {isOptional && !returnToReview && (
                <button
                  type="button"
                  onClick={skipQuestion}
                  disabled={busy}
                  className={glassButton('w-40 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-30')}
                >
                  <LuSkipForward className="h-4 w-4" aria-hidden="true" />
                  Omitir
                </button>
              )}

              <button
                type="button"
                onClick={submitAnswer}
                disabled={!advanceAllowed || busy}
                className={glassPrimaryButton('w-40 py-2.5 text-sm')}
              >
                {busy ? 'Evaluando…' : returnToReview ? 'Guardar' : 'Continuar'}
                <LuArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Draft restored toast (#566) */}
          {draftNotice && (
            <div
              className="fixed bottom-6 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/10 bg-zinc-900/95 px-5 py-2.5 shadow-xl backdrop-blur-md"
              role="status"
              aria-live="polite"
            >
              <span className="text-sm text-zinc-300">
                Borrador restaurado: {draftNotice.count} respuesta{draftNotice.count !== 1 ? 's' : ''} recuperada
                {draftNotice.count !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={() => {
                  setDraftNotice(null);
                  resetDraft();
                }}
                className="text-xs font-medium text-red-400 transition-colors hover:text-red-300"
              >
                Reiniciar
              </button>
              <button
                type="button"
                onClick={() => setDraftNotice(null)}
                aria-label="Cerrar aviso"
                className="text-zinc-500 transition-colors hover:text-white"
              >
                <LuX className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          )}

          <ShortcutsOverlay open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
        </main>
      </div>
    </>
  );
}
