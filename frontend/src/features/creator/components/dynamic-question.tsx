'use client';

import { useEffect, useMemo } from 'react';
import { LuCheck, LuCircleAlert, LuX } from 'react-icons/lu';
import { glassInput, glassNotice, glassOptionCard, glassPill } from '@/lib/glass';
import type { AnswerIssue, CatalogItem, DecisionQuestion, QuestionOption } from '@artemisa/types';
import { OptionPicker, type PickerOption } from './option-picker';
import { SkillsBrowser } from './skills-browser';
import { McpBrowser } from './mcp-browser';

type AnswerValue = string | boolean | string[];

/** Backend limits from validateQuestionAnswer() in src/creator/decisionTree.ts. */
const TEXT_MAX = 120;
const TEXTAREA_MAX = 4000;

interface DynamicQuestionProps {
  question: DecisionQuestion;
  options: (QuestionOption | CatalogItem)[];
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
  /** Validation issues returned by /evaluate for this question. */
  issues?: AnswerIssue[];
  /** Ids the decision tree accepts for a `custom` question (skills / MCPs). */
  allowedIds?: string[];
}

function toPickerOptions(options: (QuestionOption | CatalogItem)[]): PickerOption[] {
  return options.map((option) => ({
    id: option.id,
    label: option.label,
    description: option.description,
    category: 'category' in option ? option.category : undefined,
    tags: 'tags' in option ? option.tags : undefined,
  }));
}

/**
 * Renders any question type from the backend's decision tree: text,
 * textarea, boolean, select, multiselect, catalog-select,
 * catalog-multiselect and the two `custom` browsers.
 *
 * Everything the backend validates is enforced here — max length,
 * `maxSelections`, and for the `custom` questions the narrower set of ids the
 * tree accepts — so a completed question can never produce a payload that
 * comes back with `issues[]`.
 */
export function DynamicQuestion({ question, options, value, onChange, issues = [], allowedIds }: DynamicQuestionProps) {
  const optional = !question.required;

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="w-full">
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{question.section}</span>
          {optional && <span className={glassPill('py-0.5 text-[10px] text-zinc-500')}>Opcional</span>}
        </div>
        <h2 className="mx-auto mt-3 max-w-2xl text-balance text-2xl font-semibold text-white">{question.prompt}</h2>
        {question.description && (
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">{question.description}</p>
        )}
      </div>

      {issues.length > 0 && (
        <div className={glassNotice('danger', 'w-full text-left')} role="alert">
          <LuCircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="flex flex-col gap-0.5">
            {issues.map((issue, index) => (
              <span key={index}>{issue.message}</span>
            ))}
          </span>
        </div>
      )}

      <div className="w-full text-left">
        <QuestionInput
          question={question}
          options={options}
          value={value}
          onChange={onChange}
          allowedIds={allowedIds}
        />
      </div>
    </div>
  );
}

function QuestionInput({
  question,
  options,
  value,
  onChange,
  allowedIds,
}: {
  question: DecisionQuestion;
  options: (QuestionOption | CatalogItem)[];
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
  allowedIds?: string[];
}) {
  const pickerOptions = useMemo(() => toPickerOptions(options), [options]);

  if (question.type === 'custom') {
    const selected = Array.isArray(value) ? value : [];
    // The /skills and /mcps endpoints are broader than the `skill` / `mcp`
    // catalog categories the tree validates against, so the browsers are
    // restricted to the accepted ids. Without this a valid-looking pick comes
    // back as an issue and is discarded.
    if (question.id === 'skills_selection') {
      return <SkillsBrowser selected={selected} onChange={onChange} allowedIds={allowedIds} />;
    }
    if (question.id === 'mcps_selection') {
      return <McpBrowser selected={selected} onChange={onChange} allowedIds={allowedIds} />;
    }
    return (
      <OptionPicker
        options={pickerOptions}
        multiple
        value={selected}
        onChange={onChange}
        max={question.maxSelections}
        ariaLabel={question.prompt}
        allowCustom
      />
    );
  }

  if (question.type === 'textarea' || question.type === 'text') {
    return (
      <TextAnswer
        question={question}
        value={typeof value === 'string' ? value : ''}
        onChange={onChange}
        multiline={question.type === 'textarea'}
      />
    );
  }

  if (question.type === 'boolean') {
    return <BooleanAnswer value={typeof value === 'boolean' ? value : undefined} onChange={onChange} />;
  }

  const multiple = question.type === 'multiselect' || question.type === 'catalog-multiselect';
  const isCatalog = question.type === 'catalog-select' || question.type === 'catalog-multiselect';

  return (
    <OptionPicker
      options={pickerOptions}
      multiple={multiple}
      value={multiple ? (Array.isArray(value) ? value : []) : typeof value === 'string' ? value : ''}
      onChange={onChange}
      max={multiple ? question.maxSelections : undefined}
      ariaLabel={question.prompt}
      allowCustom={isCatalog}
      showIcons={isCatalog}
    />
  );
}

function TextAnswer({
  question,
  value,
  onChange,
  multiline,
}: {
  question: DecisionQuestion;
  value: string;
  onChange: (next: string) => void;
  multiline: boolean;
}) {
  const max = multiline ? TEXTAREA_MAX : TEXT_MAX;
  const remaining = max - value.length;
  const near = remaining <= max * 0.1;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
      {multiline ? (
        <textarea
          autoFocus
          className={glassInput('creator-scroll h-40 resize-none')}
          placeholder={question.placeholder}
          maxLength={max}
          value={value}
          aria-label={question.prompt}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          autoFocus
          type="text"
          className={glassInput()}
          placeholder={question.placeholder}
          maxLength={max}
          value={value}
          aria-label={question.prompt}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      <div className="flex items-center justify-between gap-3 text-[11px]">
        <span className="text-zinc-600">{multiline ? 'Ctrl + Enter para continuar' : 'Enter para continuar'}</span>
        <span className={`tabular-nums ${near ? 'text-warn' : 'text-zinc-600'}`}>
          {value.length} / {max}
        </span>
      </div>
    </div>
  );
}

/**
 * Tri-state yes/no. `undefined` means "not answered yet": the previous version
 * defaulted to `false`, which rendered "No" as already chosen and made an
 * unanswered question indistinguishable from a deliberate no.
 */
function BooleanAnswer({ value, onChange }: { value: boolean | undefined; onChange: (next: boolean) => void }) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      const key = event.key.toLowerCase();
      if (key === 's') {
        event.preventDefault();
        onChange(true);
      }
      if (key === 'n') {
        event.preventDefault();
        onChange(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onChange]);

  const choices: { id: 'yes' | 'no'; label: string; hint: string; selected: boolean; next: boolean }[] = [
    { id: 'yes', label: 'Sí', hint: 'S', selected: value === true, next: true },
    { id: 'no', label: 'No', hint: 'N', selected: value === false, next: false },
  ];

  return (
    <div className="mx-auto grid w-full max-w-md gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="Sí o no">
      {choices.map((choice) => (
        <button
          key={choice.id}
          type="button"
          role="radio"
          aria-checked={choice.selected}
          onClick={() => onChange(choice.next)}
          className={glassOptionCard(choice.selected, false, 'items-center text-center')}
        >
          <span className="flex w-full items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-medium text-zinc-100">
              {choice.id === 'yes' ? (
                <LuCheck className="h-4 w-4 text-zinc-400" aria-hidden="true" />
              ) : (
                <LuX className="h-4 w-4 text-zinc-400" aria-hidden="true" />
              )}
              {choice.label}
            </span>
            {choice.selected ? (
              <LuCheck className="h-3.5 w-3.5 text-white" aria-hidden="true" />
            ) : (
              <kbd className="rounded border border-white/[0.08] px-1 font-mono text-[10px] text-zinc-600">
                {choice.hint}
              </kbd>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
