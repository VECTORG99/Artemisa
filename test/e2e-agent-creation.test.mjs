import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateAgentBundle } from '../src/creator/generator.js';
import { evaluateDecisionTree } from '../src/creator/decisionTree.js';
import { getCreatorCatalog } from '../src/creator/catalog.js';

describe('E2E: Full Agent Creation — TypeScript Security Reviewer (Development)', () => {
  const answers = {};
  let evaluation;
  const slug = 'security-code-reviewer';

  it('Step 1: Load catalog — verify technologies available', () => {
    const catalog = getCreatorCatalog();
    assert.ok(catalog.items.length > 200, `Catalog has ${catalog.items.length} items`);
    assert.ok(catalog.categories.length >= 20, `${catalog.categories.length} categories`);
    const ids = catalog.items.map((i) => i.id);
    for (const tech of ['typescript', 'python', 'react', 'fastapi', 'postgresql', 'kubernetes', 'terraform']) {
      assert.ok(ids.includes(tech), `${tech} should be in catalog`);
    }
    console.log(`    ✓ Catalog: ${catalog.items.length} items, ${catalog.categories.length} categories`);
  });

  it('Step 2: Start evaluation — first question is agent_name', () => {
    evaluation = evaluateDecisionTree(answers);
    assert.equal(evaluation.nextQuestion.id, 'agent_name');
    assert.equal(evaluation.progress.complete, false);
    assert.equal(evaluation.progress.percent, 0);
    console.log(`    ✓ First question: "${evaluation.nextQuestion.prompt}"`);
  });

  it('Step 3: Answer name + purpose → tree branches to objective', () => {
    answers.agent_name = 'Security Code Reviewer';
    answers.purpose = 'security';
    evaluation = evaluateDecisionTree(answers);
    assert.equal(evaluation.nextQuestion.id, 'objective');
    console.log(
      `    ✓ Progress: ${evaluation.progress.percent}% (${evaluation.progress.answered}/${evaluation.progress.total})`,
    );
  });

  it('Step 4: Complete identity section → moves to project', () => {
    answers.objective = 'Detectar vulnerabilidades en código TypeScript antes de merge, priorizando OWASP Top 10.';
    answers.success_criteria =
      'Cada PR recibe un reporte con hallazgos clasificados por severidad y evidencia reproducible.';
    evaluation = evaluateDecisionTree(answers);
    assert.equal(evaluation.nextQuestion.id, 'project_stage');
    assert.equal(evaluation.nextQuestion.section, 'Proyecto');
    console.log(`    ✓ Section: ${evaluation.nextQuestion.section} — "${evaluation.nextQuestion.prompt}"`);
  });

  it('Step 5: Project + technologies → architecture question', () => {
    answers.project_stage = 'existing';
    answers.technologies = ['typescript', 'react', 'nextjs', 'postgresql'];
    evaluation = evaluateDecisionTree(answers);
    assert.equal(evaluation.nextQuestion.id, 'architecture');
    console.log(`    ✓ Technologies accepted: ${answers.technologies.join(', ')}`);
  });

  it('Step 6: Architecture + repository → environment question', () => {
    answers.architecture = 'modular-monolith';
    answers.repository_provider = 'github';
    evaluation = evaluateDecisionTree(answers);
    assert.equal(evaluation.nextQuestion.id, 'environment');
    console.log(`    ✓ Architecture: modular-monolith, Repo: github`);
  });

  it('Step 7: Choose development → unlocks dev-specific questions', () => {
    answers.environment = 'development';
    evaluation = evaluateDecisionTree(answers);
    assert.ok(
      ['development_setup', 'testing_tools', 'ci_cd'].includes(evaluation.nextQuestion.id),
      `Got: ${evaluation.nextQuestion.id}`,
    );
    console.log(`    ✓ Dev branch unlocked → next: ${evaluation.nextQuestion.id}`);
  });

  it('Step 8: Complete DevOps section', () => {
    answers.development_setup = 'docker-compose';
    answers.ci_cd = ['github-actions'];
    answers.security_controls = ['least-privilege', 'sbom', 'container-scan'];
    evaluation = evaluateDecisionTree(answers);
    console.log(`    ✓ DevOps configured → next: ${evaluation.nextQuestion.id} (${evaluation.progress.percent}%)`);
  });

  it('Step 9: Configure agent capabilities and autonomy', () => {
    answers.capabilities = ['read-repository', 'review-pr', 'scan-vulnerabilities'];
    answers.autonomy = 'assisted';
    answers.human_approval = true;
    evaluation = evaluateDecisionTree(answers);
    console.log(`    ✓ Capabilities: ${answers.capabilities.join(', ')}`);
  });

  it('Step 10: Enable knowledge/RAG', () => {
    answers.knowledge_enabled = true;
    answers.knowledge_sources = ['source-code', 'repository-docs'];
    evaluation = evaluateDecisionTree(answers);
    console.log(`    ✓ RAG enabled: ${answers.knowledge_sources.join(', ')}`);
  });

  it('Step 11: Enable PR review', () => {
    answers.pr_review_enabled = true;
    answers.pr_review_focus = ['security', 'correctness', 'architecture'];
    evaluation = evaluateDecisionTree(answers);
    console.log(`    ✓ PR review focus: ${answers.pr_review_focus.join(', ')}`);
  });

  it('Step 12: Select targets and features → tree complete', () => {
    answers.agent_targets = ['agents-md', 'cursor', 'devin-desktop', 'coderabbit', 'kilo-code', 'kiro', 'portable'];
    answers.hooks_enabled = true;
    answers.skills_enabled = true;
    answers.skills_focus = 'security';
    answers.mcps_enabled = false;
    evaluation = evaluateDecisionTree(answers);
    assert.equal(evaluation.progress.complete, true, `Not complete — next: ${evaluation.nextQuestion?.id}`);
    console.log(`    ✓ TREE COMPLETE — ${evaluation.progress.answered} questions answered`);
  });

  it('Step 13: Generate bundle — verify all expected artifacts', () => {
    const bundle = generateAgentBundle(answers);
    const paths = bundle.artifacts.map((a) => a.path);

    console.log(`    ✓ Bundle: ${bundle.artifacts.length} artifacts generated`);
    console.log(`    ✓ Targets: ${bundle.blueprint.agent.targets.join(', ')}`);

    for (const expected of [
      'blueprint.json',
      'manifest.json',
      'docs/INSTALL.md',
      'docs/WHY.md',
      'AGENTS.md',
      `.cursor/rules/${slug}.mdc`,
      '.cursorrules',
      `.windsurf/rules/${slug}.md`,
      '.windsurfrules',
      '.coderabbit.yaml',
      `.kilocode/rules/${slug}.md`,
      '.kilocodemodes',
      `.kiro/steering/${slug}.md`,
      `.kiro/hooks/${slug}-quality.json`,
      `.kiro/skills/${slug}/SKILL.md`,
      `skills/${slug}/SKILL.md`,
    ])
      assert.ok(paths.includes(expected), `missing ${expected}`);

    console.log('    ✓ All expected artifact paths present');
  });

  it('Step 14: Verify steering is personalized to security + TypeScript', () => {
    const bundle = generateAgentBundle(answers);
    const steering = bundle.artifacts.find((a) => a.path === `.windsurf/rules/${slug}.md`);
    const content = steering.content;

    assert.match(content, /vulnerabilidad|seguridad|OWASP/i);
    assert.match(content, /TypeScript|typescript/);
    assert.match(content, /scan vulnerabilities|review pr|scan-vulnerabilities|review-pr/i);
    console.log(`    ✓ Steering mentions security focus and TypeScript stack`);
  });

  it('Step 15: Verify AGENTS.md includes structured sections', () => {
    const bundle = generateAgentBundle(answers);
    const agents = bundle.artifacts.find((a) => a.path === 'AGENTS.md');
    assert.match(agents.content, /## Mission/);
    assert.match(agents.content, /## Stack/);
    assert.match(agents.content, /## Knowledge Sources/);
    console.log(`    ✓ AGENTS.md has Mission, Stack, Knowledge Sources`);
  });

  it('Step 16: Verify CodeRabbit YAML is well-formed', () => {
    const bundle = generateAgentBundle(answers);
    const yaml = bundle.artifacts.find((a) => a.path === '.coderabbit.yaml');
    assert.ok(yaml.content.includes('language: es'));
    assert.ok(yaml.content.includes('reviews:'));
    assert.ok(yaml.content.includes('path_instructions:'));
    console.log(`    ✓ CodeRabbit config has required YAML sections`);
  });

  it('Step 17: Verify WHY.md explains decisions with evidence', () => {
    const bundle = generateAgentBundle(answers);
    const why = bundle.artifacts.find((a) => a.path === 'docs/WHY.md');

    assert.match(why.content, /Problema y éxito|Objetivo/);
    assert.match(why.content, /Contexto técnico|Stack/);
    assert.match(why.content, /Recomendaciones explicables/);
    assert.match(why.content, /Beneficios/);
    assert.match(why.content, /Trade-offs/);
    console.log('    ✓ WHY.md has problem, context, recommendations with evidence');
  });

  it('Step 18: Verify determinism — same input = same output', () => {
    const first = generateAgentBundle(structuredClone(answers));
    const second = generateAgentBundle(structuredClone(answers));

    assert.deepEqual(
      first.artifacts.map((a) => a.sha256),
      second.artifacts.map((a) => a.sha256),
    );
    console.log('    ✓ Deterministic: identical SHA-256 hashes on regeneration');
  });

  it('Step 19: Verify recommendations fired', () => {
    const bundle = generateAgentBundle(answers);
    assert.ok(bundle.blueprint.recommendations.length > 0);
    console.log(`    ✓ ${bundle.blueprint.recommendations.length} recommendations:`);
    for (const rec of bundle.blueprint.recommendations) {
      console.log(`      - [${rec.severity}] ${rec.title}`);
    }
  });

  it('Step 20: Verify manifest lists all selected targets and kinds', () => {
    const bundle = generateAgentBundle(answers);
    const manifest = JSON.parse(bundle.artifacts.find((a) => a.path === 'manifest.json').content);
    assert.deepEqual(manifest.targets.sort(), bundle.blueprint.agent.targets.sort());
    const kinds = new Set(manifest.files.map((f) => f.kind));
    for (const kind of [
      'cursor-rules',
      'devin-rules',
      'coderabbit-config',
      'kilocode-rules',
      'agents-md',
      'configuration',
    ]) {
      assert.ok(kinds.has(kind), `manifest should include kind ${kind}`);
    }
    console.log('    ✓ Manifest lists all targets and artifact kinds');
  });
});

describe('E2E: Full Agent Creation — Python ML Ops (Production)', () => {
  it('Complete production ML agent generation', () => {
    const answers = {
      agent_name: 'ML Pipeline Guardian',
      purpose: 'machine-learning',
      objective: 'Monitorear drift de modelos, re-entrenar automáticamente y servir versiones validadas.',
      success_criteria: 'Modelos en producción mantienen accuracy >95% con re-entrenamiento <4h de detección de drift.',
      project_stage: 'existing',
      technologies: ['python', 'pytorch', 'fastapi', 'postgresql', 'redis'],
      architecture: 'microservices',
      repository_provider: 'github',
      environment: 'production',
      deployment_target: 'aws-eks',
      container_platforms: ['kubernetes', 'helm'],
      infrastructure: ['terraform'],
      observability: ['prometheus-grafana', 'datadog'],
      ci_cd: ['github-actions', 'argocd'],
      security_controls: ['least-privilege', 'secrets-manager', 'sbom'],
      capabilities: ['read-repository', 'train-models', 'deploy', 'analyze-data'],
      autonomy: 'autonomous',
      human_approval: true,
      knowledge_enabled: true,
      knowledge_sources: ['repository-docs', 'runbooks', 'source-code'],
      pr_review_enabled: false,
      agent_targets: ['agents-md', 'devin-desktop'],
      hooks_enabled: false,
      skills_enabled: true,
      skills_focus: 'data-ai',
      mcps_enabled: false,
    };

    const evaluation = evaluateDecisionTree(answers);
    assert.equal(evaluation.progress.complete, true, `Not complete — next: ${evaluation.nextQuestion?.id}`);

    const bundle = generateAgentBundle(answers);
    console.log(`    ✓ ML Production agent: ${bundle.artifacts.length} artifacts`);
    const paths = bundle.artifacts.map((a) => a.path);
    const slug = bundle.blueprint.identity.slug;

    assert.ok(bundle.blueprint.agent.requireHumanApproval);
    assert.equal(bundle.blueprint.environments.target, 'production');
    assert.equal(bundle.blueprint.environments.deploymentTarget, 'aws-eks');

    assert.ok(paths.includes('AGENTS.md'));
    assert.ok(paths.includes(`.windsurf/rules/${slug}.md`));
    assert.ok(!paths.some((p) => p.startsWith('.kiro/')));
    assert.ok(!paths.some((p) => p.startsWith('.cursor/')));

    const agents = bundle.artifacts.find((a) => a.path === 'AGENTS.md');
    assert.match(agents.content, /pytest/);
    assert.match(agents.content, /ruff/);
    console.log(`    ✓ AGENTS.md includes Python test and lint commands`);

    assert.ok(bundle.warnings.some((w) => w.includes('producción')));
    console.log('    ✓ Production warnings present');

    assert.ok(bundle.blueprint.recommendations.length >= 2);
    console.log(`    ✓ ${bundle.blueprint.recommendations.length} recommendations fired`);
    for (const rec of bundle.blueprint.recommendations) {
      console.log(`      - [${rec.severity}] ${rec.title}`);
    }
  });
});
