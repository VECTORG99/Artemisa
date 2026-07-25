'use client';

import { useState } from 'react';
import { glassButton, glassInput, glassPill } from '@/lib/glass';
import type { CatalogItem, DecisionQuestion, QuestionOption } from '@huascar/types';
import { SkillsBrowser } from './skills-browser';
import { McpBrowser } from './mcp-browser';

type AnswerValue = string | boolean | string[];

interface DynamicQuestionProps {
  question: DecisionQuestion;
  options: (QuestionOption | CatalogItem)[];
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  /** Extra controls shown behind the "Avanzado" toggle for this question,
   * e.g. temperature/model pickers in fine-tuning mode. Omit to hide the
   * toggle entirely for questions with nothing advanced to show. */
  advancedControls?: React.ReactNode;
}

/**
 * Renders any question type from the backend's decision tree: text,
 * textarea, boolean, select, multiselect, catalog-select,
 * catalog-multiselect. Every question can optionally reveal an "Avanzado"
 * panel — this is how fine-tuning-level control stays reachable from any
 * point in the automated flow, not just a separate mode (per project
 * direction: "en cualquier pregunta puedas intervenir y entrar").
 */
export function DynamicQuestion({ question, options, value, onChange, advancedControls }: DynamicQuestionProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{question.section}</span>
        <h2 className="mt-3 text-2xl font-semibold text-zinc-50">{question.prompt}</h2>
        {question.description && <p className="mt-2 text-zinc-400">{question.description}</p>}
      </div>

      <QuestionInput question={question} options={options} value={value} onChange={onChange} />

      {advancedControls && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setShowAdvanced((current) => !current)}
            className="self-start text-xs text-zinc-500 underline-offset-4 transition-colors hover:text-zinc-300 hover:underline"
          >
            {showAdvanced ? '– Ocultar avanzado' : '+ Avanzado'}
          </button>
          {showAdvanced && (
            <div className="rounded-lg border border-white/[0.06] bg-black/20 p-4">{advancedControls}</div>
          )}
        </div>
      )}
    </div>
  );
}

function QuestionInput({
  question,
  options,
  value,
  onChange,
}: {
  question: DecisionQuestion;
  options: (QuestionOption | CatalogItem)[];
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
}) {
  if (question.type === 'custom') {
    const selected = Array.isArray(value) ? value : [];
    if (question.id === 'skills_selection') {
      return <SkillsBrowser selected={selected} onChange={onChange} />;
    }
    if (question.id === 'mcps_selection') {
      return <McpBrowser selected={selected} onChange={onChange} />;
    }
    return <div className="text-sm text-zinc-400">Custom input no implementado para {question.id}</div>;
  }

  if (question.type === 'textarea') {
    return (
      <textarea
        className={glassInput('h-40 resize-none')}
        placeholder={question.placeholder}
        value={String(value)}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (question.type === 'text') {
    return (
      <input
        className={glassInput()}
        placeholder={question.placeholder}
        value={String(value)}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (question.type === 'boolean') {
    const checked = Boolean(value);
    return (
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={glassButton(checked ? 'border-white/30 bg-white/[0.1]' : '')}
        >
          Sí
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={glassButton(!checked && value !== '' ? 'border-white/30 bg-white/[0.1]' : '')}
        >
          No
        </button>
      </div>
    );
  }

  if (question.type === 'select' || question.type === 'catalog-select') {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const isSelected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`flex flex-col gap-1 rounded-lg border p-3 text-left text-sm transition-colors ${
                isSelected
                  ? 'border-white/30 bg-white/[0.08] text-zinc-100'
                  : 'border-white/[0.08] bg-white/[0.02] text-zinc-300 hover:border-white/20 hover:bg-white/[0.05]'
              }`}
            >
              <span className="font-medium">{option.label}</span>
              {option.description && <span className="text-xs text-zinc-500">{option.description}</span>}
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
            className={`flex flex-col gap-1 rounded-lg border p-3 text-left text-sm transition-colors ${
              isSelected
                ? 'border-white/30 bg-white/[0.08] text-zinc-100'
                : 'border-white/[0.08] bg-white/[0.02] text-zinc-300 hover:border-white/20 hover:bg-white/[0.05]'
            }`}
          >
            <span className="flex items-center justify-between gap-2 font-medium">
              {option.label}
              {isSelected && <span className={glassPill('text-[10px] text-emerald-300')}>✓</span>}
            </span>
            {option.description && <span className="text-xs text-zinc-500">{option.description}</span>}
          </button>
        );
      })}
    </div>
  );
}
