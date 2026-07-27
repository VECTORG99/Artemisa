import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateAgentBundle,
  getAgentProtocol,
  getAgentStart,
  getStartupDocument,
  processAgentAnswer,
} from '../src/creator/agentProtocol.js';
import { developmentAnswers } from './creatorFixture.mjs';

const baseUrl = 'https://huascar.vercel.app/api/v1/creator';

describe('getAgentProtocol', () => {
  it('devuelve protocolo con version 1.0.0', () => {
    const protocol = getAgentProtocol(baseUrl);
    assert.equal(protocol.version, '1.0.0');
    assert.equal(protocol.protocol, 'huascar-agent-onboarding');
  });

  it('available_targets refleja el catálogo actual', () => {
    const protocol = getAgentProtocol(baseUrl);
    assert.ok(Array.isArray(protocol.available_targets));
    assert.ok(protocol.available_targets.includes('kiro'));
    assert.ok(protocol.available_targets.includes('portable'));
  });

  it('steps tiene exactamente 3 pasos en orden correcto', () => {
    const protocol = getAgentProtocol(baseUrl);
    assert.equal(protocol.instructions.steps.length, 3);
    assert.equal(protocol.instructions.steps[0].step, 1);
    assert.equal(protocol.instructions.steps[1].step, 2);
    assert.equal(protocol.instructions.steps[2].step, 3);
  });

  it('baseUrl se interpola correctamente', () => {
    const protocol = getAgentProtocol(baseUrl);
    assert.equal(protocol.baseUrl, baseUrl);
    assert.ok(protocol.instructions.steps[0].action.includes(baseUrl), 'step action should include baseUrl');
    assert.ok(protocol.documentation_url.includes(baseUrl), 'documentation_url should include baseUrl');
  });
});

describe('getAgentStart', () => {
  it('devuelve first_question con id agent_name', () => {
    const start = getAgentStart();
    assert.equal(start.first_question.id, 'agent_name');
  });

  it('catalog_summary tiene al menos languages, frameworks, targets', () => {
    const start = getAgentStart();
    assert.ok(start.catalog_summary.languages.length > 0);
    assert.ok(start.catalog_summary.frameworks.length > 0);
    assert.ok(start.catalog_summary.targets.length > 0);
  });

  it('total_questions_estimate es un rango con formato "N-M"', () => {
    const start = getAgentStart();
    assert.match(start.total_questions_estimate, /^\d+-\d+$/);
  });
});

describe('processAgentAnswer', () => {
  it('con answers vacías devuelve primera pregunta', () => {
    const answer = processAgentAnswer({});
    assert.equal(answer.next_question?.id, 'agent_name');
    assert.equal(answer.progress.answered, 0);
  });

  it('con answers parciales devuelve siguiente pregunta visible', () => {
    const answer = processAgentAnswer({ answers: { agent_name: 'Test' } });
    assert.ok(answer.next_question);
    assert.ok(answer.progress.answered >= 1);
  });

  it('con answers inválidas devuelve issues sin next_question', () => {
    const answer = processAgentAnswer({ answers: 'not-an-object' });
    assert.ok(answer.issues.length > 0);
    assert.equal(answer.next_question, undefined);
  });

  it('con árbol completo devuelve progress.complete=true y next_question=null', () => {
    const answer = processAgentAnswer({ answers: developmentAnswers });
    assert.equal(answer.progress.complete, true);
    assert.equal(answer.next_question, null);
  });

  it('hints son strings no vacíos cuando aplican', () => {
    const start = getAgentStart();
    assert.ok(start.first_question.hint === undefined || typeof start.first_question.hint === 'string');
    const answer = processAgentAnswer({ answers: { agent_name: 'Test', purpose: 'operations' } });
    if (answer.next_question?.hint) {
      assert.ok(answer.next_question.hint.length > 0);
    }
  });

  it('recommendations_so_far crece conforme se responden preguntas relevantes', () => {
    const empty = processAgentAnswer({});
    const partial = processAgentAnswer({ answers: { agent_name: 'Test', purpose: 'operations' } });
    assert.ok(partial.recommendations_so_far.length >= empty.recommendations_so_far.length);
  });
});

describe('generateAgentBundle - wrapper', () => {
  it('con developmentAnswers devuelve bundle + application_instructions', () => {
    const bundle = generateAgentBundle({ answers: developmentAnswers });
    assert.ok(bundle.artifacts.length > 0);
    assert.ok(bundle.application_instructions);
    assert.ok(bundle.manifest.targets.every((target) => typeof bundle.application_instructions[target] === 'string'));
  });

  it('application_instructions contiene solo targets seleccionados', () => {
    const bundle = generateAgentBundle({ answers: developmentAnswers });
    const instructionTargets = Object.keys(bundle.application_instructions);
    assert.deepEqual(instructionTargets.sort(), [...bundle.manifest.targets].sort());
  });

  it('con árbol incompleto devuelve 422-equivalent error', () => {
    assert.throws(() => generateAgentBundle({ answers: {} }), { message: /incompleto/i });
  });

  it('resultado es determinista (mismo input → mismo output)', () => {
    const a = generateAgentBundle({ answers: developmentAnswers });
    const b = generateAgentBundle({ answers: developmentAnswers });
    assert.deepEqual(a, b);
  });
});

describe('getStartupDocument', () => {
  it('devuelve string Markdown no vacío', () => {
    const doc = getStartupDocument(baseUrl);
    assert.ok(doc.length > 0);
    assert.ok(doc.startsWith('# Huascar Startup'));
  });

  it('contiene las URLs con baseUrl interpolada', () => {
    const doc = getStartupDocument(baseUrl);
    assert.ok(doc.includes(`${baseUrl}/agent/start`));
    assert.ok(doc.includes(`${baseUrl}/agent/answer`));
    assert.ok(doc.includes(`${baseUrl}/agent/generate`));
  });

  it('contiene los 5 pasos del protocolo', () => {
    const doc = getStartupDocument(baseUrl);
    for (let i = 1; i <= 5; i++) {
      assert.ok(doc.includes(`## Paso ${i}`));
    }
  });

  it('contiene notas importantes sobre seguridad', () => {
    const doc = getStartupDocument(baseUrl);
    assert.ok(doc.includes('No inventes respuestas'));
    assert.ok(doc.includes('secretos reales'));
  });
});
