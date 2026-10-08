/**
 * Minimal circuit breaker (closed → open → half-open).
 *
 * States:
 * - CLOSED: requests flow; consecutive failures >= threshold trips to OPEN.
 * - OPEN: requests fail fast with CircuitOpenError until resetTimeoutMs elapses.
 * - HALF-OPEN: one trial request allowed; success closes, failure re-opens.
 */
export class CircuitOpenError extends Error {
  constructor(public readonly breakerName: string) {
    super(`Circuit breaker '${breakerName}' is OPEN`);
    this.name = 'CircuitOpenError';
  }
}

export interface CircuitBreakerOptions {
  name: string;
  failureThreshold?: number;
  resetTimeoutMs?: number;
  now?: () => number;
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  readonly name: string;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly now: () => number;

  private state: CircuitState = 'CLOSED';
  private consecutiveFailures = 0;
  private openedAt = 0;

  constructor(opts: CircuitBreakerOptions) {
    this.name = opts.name;
    this.failureThreshold = opts.failureThreshold ?? 5;
    this.resetTimeoutMs = opts.resetTimeoutMs ?? 30_000;
    this.now = opts.now ?? (() => Date.now());
  }

  getState(): CircuitState {
    if (this.state === 'OPEN' && this.now() - this.openedAt >= this.resetTimeoutMs) {
      this.state = 'HALF_OPEN';
    }
    return this.state;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const state = this.getState();
    if (state === 'OPEN') {
      throw new CircuitOpenError(this.name);
    }
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess(): void {
    this.consecutiveFailures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.consecutiveFailures += 1;
    if (this.state === 'HALF_OPEN' || this.consecutiveFailures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.openedAt = this.now();
    }
  }
}
