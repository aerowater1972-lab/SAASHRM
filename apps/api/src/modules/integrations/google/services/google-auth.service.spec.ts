import { ServiceUnavailableException } from '@nestjs/common';
import { generateKeyPairSync } from 'crypto';
import { GoogleAuthService } from './google-auth.service';

describe('GoogleAuthService', () => {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });

  let config: { get: jest.Mock };
  let fetchMock: jest.Mock;
  let auth: GoogleAuthService;

  const tokenRes = (ok: boolean, status: number, body: any) => ({
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });

  const configured = () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'GOOGLE_SERVICE_ACCOUNT_EMAIL') return 'sa@proj.iam.gserviceaccount.com';
      if (key === 'GOOGLE_SERVICE_ACCOUNT_KEY') return privateKey;
      if (key === 'GOOGLE_ADMIN_SUBJECT') return 'admin@example.com';
      return undefined;
    });
  };

  beforeEach(() => {
    config = { get: jest.fn().mockReturnValue(undefined) };
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
    auth = new GoogleAuthService(config as any);
  });

  afterEach(() => {
    delete (global as any).fetch;
  });

  it('reports not-configured until all three env vars are present', () => {
    expect(auth.isConfigured()).toBe(false);
    configured();
    expect(auth.isConfigured()).toBe(true);
  });

  it('throws 503 when the service account is not configured', async () => {
    await expect(auth.getAccessToken()).rejects.toThrow(ServiceUnavailableException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('exchanges a signed JWT for an access token and caches it', async () => {
    configured();
    fetchMock.mockResolvedValue(
      tokenRes(true, 200, { access_token: 'tok-1', expires_in: 3600 }),
    );

    const first = await auth.getAccessToken();
    const second = await auth.getAccessToken();

    expect(first).toBe('tok-1');
    expect(second).toBe('tok-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://oauth2.googleapis.com/token');
    expect(init.method).toBe('POST');
    const params = new URLSearchParams(init.body);
    expect(params.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');
    const assertion = params.get('assertion') || '';
    const claims = JSON.parse(
      Buffer.from(assertion.split('.')[1], 'base64url').toString('utf8'),
    );
    expect(claims.iss).toBe('sa@proj.iam.gserviceaccount.com');
    expect(claims.sub).toBe('admin@example.com');
    expect(claims.scope).toContain('admin.directory.user');
  });

  it('decodes a base64-encoded PEM key for .env files', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'GOOGLE_SERVICE_ACCOUNT_EMAIL') return 'sa@proj.iam.gserviceaccount.com';
      if (key === 'GOOGLE_SERVICE_ACCOUNT_KEY')
        return Buffer.from(privateKey, 'utf8').toString('base64');
      if (key === 'GOOGLE_ADMIN_SUBJECT') return 'admin@example.com';
      return undefined;
    });
    fetchMock.mockResolvedValue(tokenRes(true, 200, { access_token: 'tok-b64' }));

    await expect(auth.getAccessToken()).resolves.toBe('tok-b64');
  });

  it('surfaces token-exchange failures as 503', async () => {
    configured();
    fetchMock.mockResolvedValue(tokenRes(false, 400, { error: 'invalid_grant' }));

    await expect(auth.getAccessToken()).rejects.toThrow(
      'Google token exchange failed (400)',
    );
  });

  it('clearToken forces a fresh exchange', async () => {
    configured();
    fetchMock.mockResolvedValue(
      tokenRes(true, 200, { access_token: 'tok-a', expires_in: 3600 }),
    );

    await auth.getAccessToken();
    auth.clearToken();
    fetchMock.mockResolvedValue(
      tokenRes(true, 200, { access_token: 'tok-b', expires_in: 3600 }),
    );
    await expect(auth.getAccessToken()).resolves.toBe('tok-b');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
