import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { getTenant } from '@common/tenant/tenant.context';
import { encrypt, decrypt } from '@common/util/encryption.util';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.get<string>('DATABASE_URL'),
        },
      },
      log: configService.get<string>('NODE_ENV') === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
    });

    // Defense-in-depth multi-tenant RLS enforcement (F-02). Opt-in via env flag;
    // safe to leave off until validated on a non-prod DB. When enabled, each
    // operation runs inside a transaction that sets the session tenant GUC so
    // the policies in scripts/rls.sql filter by tenant at the database level.
    // Any failure (e.g. nested transaction) falls back to the normal pipeline,
    // so it can never break existing queries.
    if (process.env.DB_RLS_ENABLED === 'true') {
      this.$use(async (params, next) => {
        const tenant = getTenant();
        if (!tenant) return next(params);
        return this.$transaction(
          async (tx) => {
            await (tx as any).$executeRaw`SELECT set_config('app.current_tenant', ${tenant}, true)`;
            return next(params);
          },
          { timeout: 5000 },
        );
      });
    }

    // F-05: encrypt Employment.salary at rest. Opt-in via env flag so it can be
    // enabled only after the salary_enc column migration is applied. On write we
    // move plaintext salary into the encrypted salaryEnc column; on read we
    // decrypt salaryEnc back into salary and strip the ciphertext so it never
    // reaches API responses. Transparent to services (they keep using `salary`).
    if (process.env.SALARY_ENCRYPTION_ENABLED === 'true') {
      this.$use(async (params, next) => {
        if (params.model === 'Employment') {
          const isWrite =
            params.action === 'create' ||
            params.action === 'update' ||
            params.action === 'upsert' ||
            params.action === 'createMany' ||
            params.action === 'updateMany';
          if (isWrite && params.args?.data) {
            const encryptSalaryIn = (d: any) => {
              if (d && typeof d.salary !== 'undefined' && d.salary !== null) {
                d.salaryEnc = encrypt(String(d.salary));
                d.salary = null;
              }
            };
            if (Array.isArray(params.args.data)) {
              params.args.data.forEach(encryptSalaryIn);
            } else {
              encryptSalaryIn(params.args.data);
            }
          }
          if (params.action === 'upsert' && params.args) {
            const encryptSalaryIn = (d: any) => {
              if (d && typeof d.salary !== 'undefined' && d.salary !== null) {
                d.salaryEnc = encrypt(String(d.salary));
                d.salary = null;
              }
            };
            encryptSalaryIn(params.args.create);
            encryptSalaryIn(params.args.update);
          }
          const result = await next(params);
          const transform = (emp: any) => {
            if (!emp) return emp;
            const { salaryEnc, ...rest } = emp;
            const out: any = { ...rest };
            if (salaryEnc) {
              const dec = decrypt(salaryEnc);
              out.salary = dec ? Number(dec) : null;
            }
            return out;
          };
          return Array.isArray(result) ? result.map(transform) : transform(result);
        }
        return next(params);
      });
    }
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected successfully');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }
}
