import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
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
import { EmployeeRelationsModule } from './modules/employee-relations/employee-relations.module';
import { EngagementSurveyModule } from './modules/engagement-survey/engagement-survey.module';
import { ManpowerPlanningModule } from './modules/manpower-planning/manpower-planning.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { Feedback360Module } from './modules/feedback360/feedback360.module';
import { IDPModule } from './modules/idp/idp.module';
import { LmsModule } from './modules/lms/lms.module';
import { ProvincialWageModule } from './modules/provincial-wage/provincial-wage.module';
import { DocumentManagementModule } from './modules/document-management/document-management.module';
import { CommunicationsModule } from './modules/communications/communications.module';
import { SuccessionPlanningModule } from './modules/succession-planning/succession-planning.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
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
    EmployeeRelationsModule,
    EngagementSurveyModule,
    Feedback360Module,
    IDPModule,
    LmsModule,
    ManpowerPlanningModule,
    ProvincialWageModule,
    DocumentManagementModule,
    CommunicationsModule,
    SuccessionPlanningModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
