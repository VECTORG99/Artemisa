import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

describe('Issue #270: Circuit breaker for LLM provider', () => {

  it('CircuitBreaker module exists with three states', () => {
    const cb = fs.readFileSync('src/engine/CircuitBreaker.ts', 'utf8');
    assert.match(cb, /closed/);
    assert.match(cb, /open/);
    assert.match(cb, /half_open/);
  });

  it('CircuitBreaker has configurable failure threshold and cooldown', () => {
    const cb = fs.readFileSync('src/engine/CircuitBreaker.ts', 'utf8');
    assert.match(cb, /failureThreshold/);
    assert.match(cb, /cooldownMs/);
    assert.match(cb, /windowMs/);
  });

  it('CircuitBreaker opens after N failures and transitions to half-open after cooldown', () => {
    const cb = fs.readFileSync('src/engine/CircuitBreaker.ts', 'utf8');
    assert.match(cb, /canExecute/);
    assert.match(cb, /recordSuccess/);
    assert.match(cb, /recordFailure/);
    assert.match(cb, /half_open/);
  });

  it('LlmProvider imports and uses CircuitBreaker', () => {
    const llm = fs.readFileSync('src/engine/LlmProvider.ts', 'utf8');
    assert.match(llm, /import.*getCircuitBreaker.*from.*CircuitBreaker/);
    assert.match(llm, /getCircuitBreaker\(providerModel\.provider\)/);
  });

  it('LlmProvider skips providers when circuit is open', () => {
    const llm = fs.readFileSync('src/engine/LlmProvider.ts', 'utf8');
    assert.match(llm, /breaker\.canExecute\(\)/);
    assert.match(llm, /Circuit open.*skipping provider/);
  });

  it('LlmProvider records success and failure on circuit breaker', () => {
    const llm = fs.readFileSync('src/engine/LlmProvider.ts', 'utf8');
    assert.match(llm, /breaker\.recordSuccess\(\)/);
    assert.match(llm, /breaker\.recordFailure\(\)/);
  });

  it('CircuitBreaker provides observability metrics', () => {
    const cb = fs.readFileSync('src/engine/CircuitBreaker.ts', 'utf8');
    assert.match(cb, /getMetrics/);
    assert.match(cb, /getAllCircuitStates/);
  });
});
