import { OutboundHttpService } from './outbound-http.service';
import { CircuitOpenError } from './circuit-breaker';

describe('OutboundHttpService', () => {
  const realFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  it('returns parsed JSON on success', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '{"ok":true}',
    });
    const svc = new OutboundHttpService();
    await expect(svc.request('https://provider.example/hook', { method: 'POST' })).resolves.toEqual({
      ok: true,
    });
  });

  it('treats non-2xx as failure and trips the per-host breaker', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      text: async () => 'boom',
    });
    const svc = new OutboundHttpService();
    const url = 'https://flaky.example/send';
    for (let i = 0; i < 5; i += 1) {
      await expect(svc.request(url)).rejects.toThrow('Outbound HTTP 500');
    }
    expect(svc.getBreakerState(url)).toBe('OPEN');
    await expect(svc.request(url)).rejects.toThrow(CircuitOpenError);
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(5);
  });

  it('keeps breakers isolated per host', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      text: async () => 'boom',
    });
    const svc = new OutboundHttpService();
    for (let i = 0; i < 5; i += 1) {
      await expect(svc.request('https://down.example/a')).rejects.toThrow();
    }
    expect(svc.getBreakerState('https://down.example/b')).toBe('OPEN');
    expect(svc.getBreakerState('https://healthy.example/a')).toBe('CLOSED');
  });
});
