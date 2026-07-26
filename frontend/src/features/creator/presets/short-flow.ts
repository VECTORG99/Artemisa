/**
 * Auto-corto mode: a curated subset of the full decision tree (see
 * src/creator/decisionTree.ts) plus sensible, safe defaults for everything
 * else. The user answers ~8 key questions; the rest is filled in
 * automatically so /evaluate reports progress.complete === true without
 * walking the full 26-question tree. Review screen still lets the user see
 * and edit every answer — including the defaulted ones — before
 * generating.
 */

export const SHORT_FLOW_QUESTION_IDS: string[] = [
  'agent_name',
  'purpose',
  'objective',
  'success_criteria',
  'technologies',
  'environment',
  'capabilities',
  'agent_targets',
];

import type { CreatorAnswers, CreatorAnswerValue } from '@huascar/types';

/**
 * Applied only for keys the user hasn't already answered. Chosen to be the
 * safest possible values: advisory autonomy, development-only unless the
 * user explicitly picked production/both (in which case the required
 * production-only fields below also get a safe minimal default), no PR
 * review, no skills/MCPs unless the user picks them in Review.
 */
export function buildShortFlowDefaults(answers: CreatorAnswers): Record<string, CreatorAnswerValue> {
  const defaults: Record<string, CreatorAnswerValue> = {
    project_stage: 'existing',
    architecture: 'modular-monolith',
    repository_provider: 'github',
    ci_cd: ['github-actions'],
    security_controls: ['least-privilege'],
    autonomy: 'advisory',
    knowledge_enabled: false,
    pr_review_enabled: false,
    hooks_enabled: true,
    skills_enabled: false,
    mcps_enabled: false,
  };

  const environment = answers.environment;
  if (environment === 'development' || environment === 'both') {
    defaults.development_setup = 'docker-compose';
  }
  if (environment === 'production' || environment === 'both') {
    defaults.deployment_target = 'vps';
    defaults.observability = ['opentelemetry'];
    defaults.human_approval = true;
  }

  return defaults;
}
