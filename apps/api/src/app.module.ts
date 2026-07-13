import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { SharedModule } from './modules/shared/shared.module';
import { WorkflowModule } from './modules/shared/workflow/workflow.module';
import { HealthModule } from './modules/shared/health/health.module';
import { AdminModule } from './modules/admin/admin.module';
import { EmployeeModule } from './modules/employee/employee.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { RecruitmentModule } from './modules/recruitment/recruitment.module';
import { EssModule } from './modules/ess/ess.module';
import { PerformanceModule } from './modules/performance/performance.module';
import { ExpenseModule } from './modules/expense/expense.module';
import { AssetModule } from './modules/asset/asset.module';
import { BenefitModule } from './modules/benefit/benefit.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ResignationModule } from './modules/resignation/resignation.module';
import { LearningModule } from './modules/learning/learning.module';
import { PrismaModule } from './common/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('THROTTLE_TTL', 60000),
            limit: config.get<number>('THROTTLE_LIMIT', 100),
          },
        ],
      }),
    }),
    PrismaModule,
    SharedModule,
    WorkflowModule,
    HealthModule,
    AdminModule,
    EmployeeModule,
    AttendanceModule,
    PayrollModule,
    RecruitmentModule,
    EssModule,
    PerformanceModule,
    ExpenseModule,
    AssetModule,
    BenefitModule,
    AnalyticsModule,
    ResignationModule,
    LearningModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
