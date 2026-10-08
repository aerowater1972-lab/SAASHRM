import { Injectable, Logger } from '@nestjs/common';
import { CircuitBreaker, CircuitOpenError } from './circuit-breaker';

/**
 * Outbound HTTP with per-host circuit breakers + timeout.
 *
 * Use for all third-party provider calls (email/SMS/WhatsApp/bank APIs):
 * a slow or dead provider fails fast instead of exhausting the event loop,
 * and recovers automatically via half-open trials.
 */
@Injectable()
export class OutboundHttpService {
  private readonly logger = new Logger(OutboundHttpService.name);
  private readonly breakers = new Map<string, CircuitBreaker>();
  private readonly timeoutMs: number;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;

  constructor() {
    this.timeoutMs = Number(process.env.OUTBOUND_HTTP_TIMEOUT_MS || 10_000);
    this.failureThreshold = Number(process.env.OUTBOUND_HTTP_FAILURE_THRESHOLD || 5);
    this.resetTimeoutMs = Number(process.env.OUTBOUND_HTTP_RESET_TIMEOUT_MS || 30_000);
  }

  private breakerFor(url: string): CircuitBreaker {
    const host = (() => {
      try {
        return new URL(url).host;
      } catch {
        return 'unknown-host';
      }
    })();
    let breaker = this.breakers.get(host);
    if (!breaker) {
      breaker = new CircuitBreaker({
        name: `outbound:${host}`,
        failureThreshold: this.failureThreshold,
        resetTimeoutMs: this.resetTimeoutMs,
      });
      this.breakers.set(host, breaker);
    }
    return breaker;
  }

  async request<T = unknown>(
    url: string,
    init: RequestInit & { timeoutMs?: number } = {},
  ): Promise<T> {
    const breaker = this.breakerFor(url);
    const timeoutMs = init.timeoutMs ?? this.timeoutMs;
    try {
      return await breaker.execute(async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const res = await fetch(url, { ...init, signal: controller.signal });
          if (!res.ok) {
            throw new Error(`Outbound HTTP ${res.status} ${res.statusText} (${url})`);
          }
          const text = await res.text();
          try {
            return (text ? JSON.parse(text) : {}) as T;
          } catch {
            return text as unknown as T;
          }
        } finally {
          clearTimeout(timer);
        }
      });
    } catch (err) {
      if (err instanceof CircuitOpenError) {
        this.logger.warn(`Outbound call to ${url} skipped: ${err.message}`);
      }
      throw err;
    }
  }

  getBreakerState(url: string): string {
    return this.breakerFor(url).getState();
  }
}
