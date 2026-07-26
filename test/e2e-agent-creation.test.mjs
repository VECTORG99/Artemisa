/**
 * E2E Agent Creation Demo Test
 *
 * This test demonstrates the COMPLETE flow of creating an agent through the API,
 * exactly as a real user would. It shows:
 *
 * 1. Loading the catalog and workflow
 * 2. Progressive evaluation (adding answers one by one)
 * 3. Tree branching (dev vs prod questions)
 * 4. Generating a full bundle with all artifacts
 * 5. Verifying content quality and personalization
 *
 * Run: AUTH_REQUIRED=false npm run start & sleep 3 && node test/e2e-agent-creation.test.mjs
 * Or:  node --import tsx/esm --test test/e2e-agent-creation.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateAgentBundle } from '../src/creator/generator.js';
import { evaluateDecisionTree } from '../src/creator/decisionTree.js';
import { getCreatorCatalog } from '../src/creator/catalog.js';

describe('E2E: Full Agent Creation — TypeScript Security Reviewer (Development)', () => {
  const answers = {};
  let evaluation;

  it('Step 1: Load catalog — verify technologies available', () => {
    const catalog = getCreatorCatalog();
    assert.ok(catalog.items.length > 200, `Catalog has ${catalog.items.length} items`);
    assert.ok(catalog.categories.length >= 20, `${catalog.categories.length} categories`);

    // Verify key technologies exist
    const ids = catalog.items.map(i => i.id);
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
    console.log(`    ✓ Progress: ${evaluation.progress.percent}% (${evaluation.progress.answered}/${evaluation.progress.total})`);
  });

  it('Step 4: Complete identity section → moves to project', () => {
    answers.objective = 'Detectar vulnerabilidades en código TypeScript antes de merge, priorizando OWASP Top 10.';
    answers.success_criteria = 'Cada PR recibe un reporte con hallazgos clasificados por severidad y evidencia reproducible.';
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
    // Should get development_setup or ci_cd next (dev branch)
    assert.ok(
      ['development_setup', 'testing_tools', 'ci_cd'].includes(evaluation.nextQuestion.id),
      `Got: ${evaluation.nextQuestion.id}`
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
    console.log(`    ✓ Autonomy: supervised with human approval`);
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
    answers.agent_targets = ['huascar', 'kiro', 'portable'];
    answers.hooks_enabled = true;
    answers.skills_enabled = true;
    evaluation = evaluateDecisionTree(answers);
    assert.equal(evaluation.progress.complete, true, `Not complete — next: ${evaluation.nextQuestion?.id}`);
    console.log(`    ✓ TREE COMPLETE — ${evaluation.progress.answered} questions answered`);
  });

  it('Step 13: Generate bundle — verify all expected artifacts', () => {
    const bundle = generateAgentBundle(answers);
    const paths = bundle.artifacts.map(a => a.path);

    console.log(`    ✓ Bundle: ${bundle.artifacts.length} artifacts generated`);
    console.log(`    ✓ Targets: ${bundle.blueprint.agent.targets.join(', ')}`);

    // Core artifacts always present
    assert.ok(paths.includes('huascar.blueprint.json'));
    assert.ok(paths.includes('manifest.json'));
    assert.ok(paths.includes('docs/INSTALL.md'));
    assert.ok(paths.includes('docs/WHY.md'));

    // Huascar target artifacts
    assert.ok(paths.includes('huascar/steering.json'));
    assert.ok(paths.includes('huascar/security-policy.json'));
    assert.ok(paths.includes('huascar/governance.json'));
    assert.ok(paths.includes('huascar/mcps.json'));
    assert.ok(paths.includes('huascar/rag.json'));
    assert.ok(paths.includes('huascar/pr-review.json'));

    // Kiro target artifacts
    assert.ok(paths.includes('.kiro/steering/security-code-reviewer.md'));
    assert.ok(paths.includes('.kiro/hooks/security-code-reviewer-quality.json'));
    assert.ok(paths.includes('.kiro/skills/security-code-reviewer/SKILL.md'));

    // Portable artifacts
    assert.ok(paths.includes('AGENTS.md'));
    assert.ok(paths.includes('skills/security-code-reviewer/SKILL.md'));

    console.log('    ✓ All expected artifact paths present');
  });

  it('Step 14: Verify steering is personalized to security + TypeScript', () => {
    const bundle = generateAgentBundle(answers);
    const steering = bundle.artifacts.find(a => a.path === 'huascar/steering.json');
    const content = JSON.parse(steering.content);
    const prompt = Object.values(content.roles)[0].system_prompt;

    assert.match(prompt, /vulnerabilidad|seguridad|OWASP/i);
    assert.match(prompt, /TypeScript|typescript/);
    assert.match(prompt, /scan vulnerabilities|review pr|scan-vulnerabilities|review-pr/);
    console.log(`    ✓ Steering mentions security focus and TypeScript stack`);
  });

  it('Step 15: Verify RAG config uses TypeScript patterns', () => {
    const bundle = generateAgentBundle(answers);
    const rag = bundle.artifacts.find(a => a.path === 'huascar/rag.json');
    const content = JSON.parse(rag.content);
    const sourceCode = content.knowledge_bases.find(kb => kb.path === './src');

    assert.ok(sourceCode, 'RAG should include ./src directory');
    assert.match(sourceCode.pattern, /\*\.ts/);
    console.log(`    ✓ RAG source-code pattern: ${sourceCode.pattern}`);
  });

  it('Step 16: Verify security-policy is strict for security agent', () => {
    const bundle = generateAgentBundle(answers);
    const policy = bundle.artifacts.find(a => a.path === 'huascar/security-policy.json');
    const content = JSON.parse(policy.content);

    assert.ok(content.blocked_tool_patterns.length > 0);
    assert.ok(content.blocked_args_substrings);
    console.log(`    ✓ Security policy: ${content.blocked_tool_patterns.length} blocked patterns`);
  });

  it('Step 17: Verify WHY.md explains decisions with evidence', () => {
    const bundle = generateAgentBundle(answers);
    const why = bundle.artifacts.find(a => a.path === 'docs/WHY.md');

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
      first.artifacts.map(a => a.sha256),
      second.artifacts.map(a => a.sha256),
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

  it('Step 20: Verify GitHub MCP generated for review-pr + scan-vulnerabilities', () => {
    const bundle = generateAgentBundle(answers);
    const mcps = bundle.artifacts.find(a => a.path === 'huascar/mcps.json');
    const content = JSON.parse(mcps.content);

    assert.ok(content.mcpServers['github-integration'], 'GitHub MCP should be generated');
    assert.match(
      content.mcpServers['github-integration'].args.join(' '),
      /@modelcontextprotocol\/server-github@/,
    );
    console.log('    ✓ GitHub MCP with pinned version generated');
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
      agent_targets: ['huascar'],
      hooks_enabled: false,
      skills_enabled: true,
    };

    const evaluation = evaluateDecisionTree(answers);
    assert.equal(evaluation.progress.complete, true, `Not complete — next: ${evaluation.nextQuestion?.id}`);

    const bundle = generateAgentBundle(answers);
    console.log(`    ✓ ML Production agent: ${bundle.artifacts.length} artifacts`);

    // Verify production characteristics
    assert.ok(bundle.blueprint.agent.requireHumanApproval);
    assert.equal(bundle.blueprint.environments.target, 'production');
    assert.equal(bundle.blueprint.environments.deploymentTarget, 'aws-eks');

    // RAG uses Python patterns
    const rag = JSON.parse(bundle.artifacts.find(a => a.path === 'huascar/rag.json').content);
    const sourceCode = rag.knowledge_bases.find(kb => kb.path === './src');
    assert.match(sourceCode.pattern, /\*\.py/);
    console.log(`    ✓ RAG pattern: ${sourceCode.pattern} (Python)`);

    // Steering mentions ML + production
    const steering = JSON.parse(bundle.artifacts.find(a => a.path === 'huascar/steering.json').content);
    const prompt = Object.values(steering.roles)[0].system_prompt;
    assert.match(prompt, /producción|mínimo privilegio|rollback/);
    assert.match(prompt, /train-models|deploy|analyze-data/);
    console.log('    ✓ Steering: production-aware with ML capabilities');

    // Production warnings present
    assert.ok(bundle.warnings.some(w => w.includes('producción')));
    console.log('    ✓ Production warnings present');

    // Recommendations fired for microservices + production
    assert.ok(bundle.blueprint.recommendations.length >= 2);
    console.log(`    ✓ ${bundle.blueprint.recommendations.length} recommendations fired`);
    for (const rec of bundle.blueprint.recommendations) {
      console.log(`      - [${rec.severity}] ${rec.title}`);
    }

    // No local-fs or bash-terminal in production
    const mcps = JSON.parse(bundle.artifacts.find(a => a.path === 'huascar/mcps.json').content);
    assert.ok(!mcps.mcpServers['local-fs'], 'No local-fs in production');
    assert.ok(!mcps.mcpServers['bash-terminal'], 'No bash-terminal in production');
    console.log('    ✓ No unsafe dev MCPs in production bundle');
  });
});
