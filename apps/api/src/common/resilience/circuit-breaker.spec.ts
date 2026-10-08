import { CircuitBreaker, CircuitOpenError } from './circuit-breaker';

describe('CircuitBreaker', () => {
  it('passes through while closed and resets on success', async () => {
    const cb = new CircuitBreaker({ name: 't', failureThreshold: 2 });
    await expect(cb.execute(async () => 'ok')).resolves.toBe('ok');
    expect(cb.getState()).toBe('CLOSED');
  });

  it('opens after threshold consecutive failures', async () => {
    const cb = new CircuitBreaker({ name: 't', failureThreshold: 2 });
    await expect(cb.execute(async () => { throw new Error('x'); })).rejects.toThrow('x');
    expect(cb.getState()).toBe('CLOSED');
    await expect(cb.execute(async () => { throw new Error('x'); })).rejects.toThrow('x');
    expect(cb.getState()).toBe('OPEN');
  });

  it('fails fast while open', async () => {
    const cb = new CircuitBreaker({ name: 't', failureThreshold: 1 });
    await expect(cb.execute(async () => { throw new Error('x'); })).rejects.toThrow('x');
    await expect(cb.execute(async () => 'never')).rejects.toThrow(CircuitOpenError);
  });

  it('half-opens after reset timeout and closes on trial success', async () => {
    let now = 0;
    const cb = new CircuitBreaker({
      name: 't',
      failureThreshold: 1,
      resetTimeoutMs: 1000,
      now: () => now,
    });
    await expect(cb.execute(async () => { throw new Error('x'); })).rejects.toThrow('x');
    expect(cb.getState()).toBe('OPEN');
    now = 1001;
    expect(cb.getState()).toBe('HALF_OPEN');
    await expect(cb.execute(async () => 'recovered')).resolves.toBe('recovered');
    expect(cb.getState()).toBe('CLOSED');
  });

  it('re-opens when half-open trial fails', async () => {
    let now = 0;
    const cb = new CircuitBreaker({
      name: 't',
      failureThreshold: 1,
      resetTimeoutMs: 1000,
      now: () => now,
    });
    await expect(cb.execute(async () => { throw new Error('x'); })).rejects.toThrow('x');
    now = 1001;
    await expect(cb.execute(async () => { throw new Error('y'); })).rejects.toThrow('y');
    expect(cb.getState()).toBe('OPEN');
  });
});
