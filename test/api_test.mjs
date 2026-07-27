import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { developmentAnswers } from './creatorFixture.mjs';

const BASE = 'http://localhost:3002';
let passed = 0;
let failed = 0;

async function assertJson(method, path, body, expectedStatus, expectedKey) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json();
  // Support both legacy { error } and RFC 7807 { title, issues } formats
  const keyPresent = data[expectedKey] !== undefined
    || (expectedKey === 'error' && (data.title !== undefined || data.issues !== undefined));
  const ok = res.status === expectedStatus && keyPresent;
  const label = `${method} ${path} -> ${res.status} ${ok ? 'PASS' : 'FAIL'}`;
  console.log(label);
  if (ok) passed++; else { failed++; console.log('  expected:', expectedStatus, 'got:', res.status, JSON.stringify(data).slice(0, 200)); }
  if (!ok) throw new Error(`Test failed: ${method} ${path}`);
  return data;
}

console.log('=== Huascar API Integration Tests ===\n');

const proc = spawn('npx', ['tsx', 'src/server.ts'], {
  env: {
    ...process.env,
    PORT: '3002',
    AUTH_REQUIRED: 'false',
    RATE_LIMIT_AGENT: '120',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
proc.stdout.on('data', d => process.stdout.write(`[server] ${d}`));
proc.stderr.on('data', d => process.stderr.write(`[server:err] ${d}`));

for (let i = 0; i < 30; i++) {
  try {
    const r = await fetch(`${BASE}/api/health`);
    if (r.ok) break;
  } catch {}
  await sleep(500);
}

try {
  await assertJson('GET', '/api/health', null, 200, 'status');

  // Creator API v1: discovery, stateless evaluation and deterministic generation
  await assertJson('GET', '/api/v1/creator/catalog', null, 200, 'items');
  await assertJson('GET', '/api/v1/creator/workflow', null, 200, 'questions');
  await assertJson('GET', '/api/v1/creator/tutorial', null, 200, 'skippable');
  await assertJson('GET', '/api/v1/creator/skills', null, 200, 'items');
  await assertJson('GET', '/api/v1/creator/mcps', null, 200, 'items');
  const partial = await assertJson('POST', '/api/v1/creator/evaluate', { answers: {} }, 200, 'nextQuestion');
  if (partial.nextQuestion?.id !== 'agent_name') throw new Error('Creator did not start with agent_name');
  await assertJson('POST', '/api/v1/creator/preview', { answers: { agent_name: 'Incomplete' } }, 422, 'error');
  await assertJson('POST', '/api/v1/creator/evaluate', { answers: {}, workflowVersion: '0.0.0' }, 409, 'error');
  const preview = await assertJson('POST', '/api/v1/creator/preview', { answers: developmentAnswers, workflowVersion: '1.0.0', catalogVersion: '1.0.0' }, 200, 'artifacts');
  if (!preview.artifacts.some(file => file.path === 'docs/WHY.md')) throw new Error('Preview missing WHY documentation');

  // The runtime was removed (#584): its routes must no longer exist.
  for (const removed of ['/api/agent/execute', '/api/history', '/api/roles', '/api/rag/sources']) {
    const removedRes = await fetch(`${BASE}${removed}`, { method: 'GET' });
    const removedOk = removedRes.status === 404;
    console.log(`GET ${removed} -> ${removedRes.status} ${removedOk ? 'PASS' : 'FAIL'}`);
    if (removedOk) passed++; else { failed++; throw new Error(`${removed} should be 404`); }
  }

  // --- Agent Protocol endpoints ---
  const protocol = await assertJson('GET', '/api/v1/creator/agent', null, 200, 'protocol');
  if (protocol.protocol !== 'huascar-agent-onboarding') throw new Error('Agent protocol mismatch');

  const start = await assertJson('GET', '/api/v1/creator/agent/start', null, 200, 'first_question');
  if (start.first_question.id !== 'agent_name') throw new Error('Agent start did not begin with agent_name');

  await assertJson('POST', '/api/v1/creator/agent/answer', {}, 200, 'next_question');
  await assertJson(
    'POST',
    '/api/v1/creator/agent/answer',
    { answers: { agent_name: 'Test Agent' } },
    200,
    'next_question',
  );
  const complete = await assertJson(
    'POST',
    '/api/v1/creator/agent/answer',
    { answers: developmentAnswers },
    200,
    'progress',
  );
  if (!complete.progress.complete) throw new Error('Agent answer flow did not complete');

  await assertJson('POST', '/api/v1/creator/agent/generate', {}, 422, 'error');
  const bundle = await assertJson(
    'POST',
    '/api/v1/creator/agent/generate',
    { answers: developmentAnswers },
    200,
    'application_instructions',
  );
  if (bundle.artifacts.length === 0) throw new Error('Agent generate returned no artifacts');

  const startupRes = await fetch(`${BASE}/api/v1/creator/startup`);
  const startupText = await startupRes.text();
  const startupOk =
    startupRes.status === 200 &&
    startupRes.headers.get('Content-Type')?.includes('text/markdown') &&
    startupText.includes('Paso 1');
  console.log(`GET /api/v1/creator/startup -> ${startupRes.status} ${startupOk ? 'PASS' : 'FAIL'}`);
  if (startupOk) passed++; else { failed++; throw new Error('Startup markdown invalid'); }

  const startupJsonRes = await fetch(`${BASE}/api/v1/creator/startup`, {
    headers: { Accept: 'application/json' },
  });
  const startupJson = await startupJsonRes.json();
  const startupJsonOk = startupJsonRes.status === 200 && typeof startupJson.content === 'string';
  console.log(
    `GET /api/v1/creator/startup (Accept: application/json) -> ${startupJsonRes.status} ${startupJsonOk ? 'PASS' : 'FAIL'}`,
  );
  if (startupJsonOk) passed++; else { failed++; throw new Error('Startup JSON invalid'); }

  // End-to-end agent flow: start -> incremental answers -> generate
  let answers = {};
  let flowComplete = false;
  for (const [key, value] of Object.entries(developmentAnswers)) {
    answers[key] = value;
    const resp = await fetch(`${BASE}/api/v1/creator/agent/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    });
    const data = await resp.json();
    if (data.progress?.complete) {
      flowComplete = true;
      break;
    }
  }
  const genRes = await fetch(`${BASE}/api/v1/creator/agent/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers }),
  });
  const genData = await genRes.json();
  const fullFlowOk = flowComplete && genRes.status === 200 && genData.artifacts.length > 0 && genData.application_instructions;
  console.log(`Agent full flow -> ${fullFlowOk ? 'PASS' : 'FAIL'}`);
  if (fullFlowOk) passed++; else { failed++; throw new Error('Full agent flow failed'); }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
} catch (e) {
  console.error('\nTest error:', e.message);
  failed++;
} finally {
  proc.kill();
  process.exit(failed > 0 ? 1 : 0);
}
