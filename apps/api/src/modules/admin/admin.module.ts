import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@common/prisma/prisma.module';

import { TenantController } from './controllers/tenant.controller';
import { RoleController, UserRoleController } from './controllers/role.controller';
import { WorkflowController, WorkflowInstanceController } from './controllers/workflow.controller';
import { AuditController } from './controllers/audit.controller';
import { AuthController } from './controllers/auth.controller';
import { AuthzController } from './controllers/authz.controller';
import { FeatureFlagController } from './controllers/feature-flag.controller';
import { IntegrationController } from './controllers/integration.controller';
import { UserManagementController } from './controllers/user-management.controller';

import { TenantService } from './services/tenant.service';
import { RoleService } from './services/role.service';
import { WorkflowService } from './services/workflow.service';
import { AuditService } from './services/audit.service';
import { AuthService } from './services/auth.service';
import { AuthzService } from './services/authz.service';
import { FeatureFlagService } from './services/feature-flag.service';
import { IntegrationService } from './services/integration.service';
import { UserManagementService } from './services/user-management.service';

@Module({
  imports: [ConfigModule],
  controllers: [
    TenantController,
    RoleController,
    UserRoleController,
    WorkflowController,
    WorkflowInstanceController,
    AuditController,
    AuthController,
    AuthzController,
    FeatureFlagController,
    IntegrationController,
    UserManagementController,
  ],
  providers: [
    TenantService,
    RoleService,
    WorkflowService,
    AuditService,
    AuthService,
    AuthzService,
    FeatureFlagService,
    IntegrationService,
    UserManagementService,
  ],
  exports: [
    TenantService,
    RoleService,
    WorkflowService,
    AuditService,
    AuthzService,
    AuthService,
    FeatureFlagService,
    IntegrationService,
  ],
})
export class AdminModule {}
