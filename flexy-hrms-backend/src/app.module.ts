import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from '@common/prisma/prisma.module';
import { HealthController } from '@common/health/health.controller';
import { AuthzGuard } from '@common/guards/authz.guard';
import { AuthModule } from '@modules/system-administration/auth/auth.module';
import { JwtAuthGuard } from '@modules/system-administration/auth/jwt-auth.guard';
import { SystemAdministrationModule } from '@modules/system-administration/system-administration.module';

/**
 * Root module — Sprint 0/1 scope (Epic 0: Platform Foundation).
 *
 * Modul lain (Employee & Organization, Attendance & Leave, Payroll, dst.)
 * akan ditambahkan sebagai import di sini pada increment berikutnya,
 * mengikuti urutan Epic pada Release Planning & Sprint Backlog. Setiap
 * modul baru WAJIB hanya berkomunikasi dengan modul lain melalui service
 * method (dalam monolith ini) — TIDAK melalui query lintas tabel
 * (lihat Technical Architecture Document, Bagian 5).
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    SystemAdministrationModule,
    // EmployeeOrganizationModule,   // Epic 1 — increment berikutnya
    // AttendanceLeaveModule,        // Epic 2
    // PayrollModule,                // Epic 3
    // RecruitmentModule,            // Epic 4 (track paralel)
    // EssModule,                    // Epic 5
  ],
  controllers: [HealthController],
  providers: [
    // Urutan guard global: autentikasi (JWT) dulu, baru otorisasi (permission).
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: AuthzGuard },
  ],
})
export class AppModule {}
