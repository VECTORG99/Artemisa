/**
 * Circuit Breaker for LLM provider calls (#270).
 *
 * States:
 * - CLOSED: normal operation, requests pass through
 * - OPEN: provider is assumed down, requests fail immediately (skip to next provider)
 * - HALF_OPEN: after cooldown, allow a single probe request
 *
 * Opens after `failureThreshold` consecutive failures within `windowMs`.
 * Resets to CLOSED on any successful call.
 */
import { logger } from '../logger.js';

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerOptions {
  /** Number of consecutive failures to open the circuit (default: 5) */
  failureThreshold?: number;
  /** Cooldown in ms before entering half-open state (default: 30000) */
  cooldownMs?: number;
  /** Time window in ms for counting failures (default: 60000) */
  windowMs?: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures: number[] = [];
  private lastFailureTime = 0;
  private openedAt = 0;

  private readonly failureThreshold: number;
  private readonly cooldownMs: number;
  private readonly windowMs: number;
  readonly name: string;

  constructor(name: string, options: CircuitBreakerOptions = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.cooldownMs = options.cooldownMs ?? 30_000;
    this.windowMs = options.windowMs ?? 60_000;
  }

  /** Check if a request can proceed. Returns false if circuit is OPEN. */
  canExecute(): boolean {
    if (this.state === 'closed') return true;

    if (this.state === 'open') {
      // Check if cooldown has elapsed → transition to half_open
      if (Date.now() - this.openedAt >= this.cooldownMs) {
        this.state = 'half_open';
        logger.info({ provider: this.name }, '[CircuitBreaker] Entering half-open state (probe allowed)');
        return true;
      }
      return false;
    }

    // half_open: allow one probe
    return true;
  }

  /** Record a successful call — resets the circuit to CLOSED. */
  recordSuccess(): void {
    if (this.state !== 'closed') {
      logger.info({ provider: this.name, previousState: this.state }, '[CircuitBreaker] Circuit closed (success)');
    }
    this.state = 'closed';
    this.failures = [];
    this.lastFailureTime = 0;
  }

  /** Record a failed call — may open the circuit. */
  recordFailure(): void {
    const now = Date.now();
    this.lastFailureTime = now;

    // In half-open, any failure reopens the circuit
    if (this.state === 'half_open') {
      this.open(now);
      return;
    }

    // Prune old failures outside the window
    this.failures = this.failures.filter((t) => now - t < this.windowMs);
    this.failures.push(now);

    if (this.failures.length >= this.failureThreshold) {
      this.open(now);
    }
  }

  private open(now: number): void {
    this.state = 'open';
    this.openedAt = now;
    logger.warn(
      { provider: this.name, failures: this.failures.length, cooldownMs: this.cooldownMs },
      '[CircuitBreaker] Circuit opened — provider will be skipped',
    );
  }

  /** Get current state for observability. */
  getState(): CircuitState {
    return this.state;
  }

  /** Get metrics for health/status endpoints. */
  getMetrics(): { state: CircuitState; failures: number; lastFailure: number } {
    return {
      state: this.state,
      failures: this.failures.length,
      lastFailure: this.lastFailureTime,
    };
  }
}

/** Registry of circuit breakers per provider. */
const breakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
  let breaker = breakers.get(name);
  if (!breaker) {
    breaker = new CircuitBreaker(name, options);
    breakers.set(name, breaker);
  }
  return breaker;
}

/** Get all circuit breaker states (for health/status). */
export function getAllCircuitStates(): Record<string, { state: CircuitState; failures: number; lastFailure: number }> {
  const result: Record<string, { state: CircuitState; failures: number; lastFailure: number }> = {};
  for (const [name, breaker] of breakers) {
    result[name] = breaker.getMetrics();
  }
  return result;
}
