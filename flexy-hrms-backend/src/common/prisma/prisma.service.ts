import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService — shared database client, di-inject ke seluruh modul.
 *
 * Catatan arsitektur (lihat Technical Architecture Document, Bagian 8):
 * - Setiap modul HANYA boleh mengakses tabel miliknya sendiri melalui
 *   service ini. JOIN lintas modul di level query DILARANG — akses
 *   lintas modul harus melalui service method modul lain (dalam
 *   monolith ini) atau HTTP API (setelah diekstrak jadi microservice).
 * - Isolasi tenant idealnya ditegakkan via Row-Level Security (RLS) di
 *   level database (lihat prisma/README-rls.md), dengan
 *   `app.current_tenant_id` di-set per request melalui middleware
 *   `withTenantContext` (lihat common/prisma/tenant-context.ts).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Menjalankan query dalam konteks tenant tertentu, sehingga RLS policy
   * (SET app.current_tenant_id) berlaku untuk transaksi tersebut.
   * Gunakan ini untuk SELURUH operasi yang berasal dari request pengguna.
   */
  async withTenant<T>(tenantId: string, fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
      return fn(tx as unknown as PrismaClient);
    });
  }
}
