import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

describe('MailService', () => {
  const makeService = async (env: Record<string, string | undefined>) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MailService, { provide: ConfigService, useValue: { get: (k: string) => env[k] } }],
    }).compile();
    return module.get<MailService>(MailService);
  };

  it('uses LOG driver without SMTP_HOST and succeeds', async () => {
    const svc = await makeService({});
    expect(svc.provider).toBe('LOG');
    const r = await svc.sendMail({ to: 'a@b.id', subject: 'Hi', text: 'Hello' });
    expect(r.success).toBe(true);
    expect(r.provider).toBe('LOG');
  });

  it('rejects invalid addresses without sending', async () => {
    const svc = await makeService({});
    const r = await svc.sendMail({ to: 'bukan-email', subject: 'Hi', text: 'x' });
    expect(r.success).toBe(false);
    expect(r.error).toContain('tidak valid');
  });

  it('selects SMTP driver when SMTP_HOST set', async () => {
    const svc = await makeService({ SMTP_HOST: 'smtp.example.id', SMTP_FROM: 'HR <hr@example.id>' });
    expect(svc.provider).toBe('SMTP');
    expect(svc.fromAddress()).toBe('HR <hr@example.id>');
  });
});
