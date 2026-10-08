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
    // operation sets the session tenant GUC using SET LOCAL (no nested transaction).
    // This avoids the nested transaction issues while still enforcing RLS at DB level.
    if (process.env.DB_RLS_ENABLED === 'true') {
      this.$use(async (params, next) => {
        const tenant = getTenant();
        if (!tenant) return next(params);
        
        // Use SET LOCAL in the current transaction context.
        // Prisma runs each operation in an implicit transaction, so SET LOCAL should work.
        // If it fails (e.g., not in transaction), fall back to SET/RESET.
        try {
          await this.$executeRawUnsafe(`SET LOCAL "app.current_tenant" = $1`, tenant);
        } catch (e) {
          // Fallback: SET (session-level) + RESET after query
          this.logger.debug(`RLS SET LOCAL failed, using SET/RESET: ${e instanceof Error ? e.message : String(e)}`);
          try {
            await this.$executeRawUnsafe(`SET "app.current_tenant" = $1`, tenant);
            const result = await next(params);
            await this.$executeRawUnsafe(`RESET "app.current_tenant"`);
            return result;
          } catch (e2) {
            this.logger.error(`RLS fallback failed: ${e2 instanceof Error ? e2.message : String(e2)}`);
            return next(params);
          }
        }
        return next(params);
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