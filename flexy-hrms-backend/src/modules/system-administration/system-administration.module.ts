import { Module } from '@nestjs/common';
import { TenantsModule } from './tenants/tenants.module';
import { RolesModule } from './roles/roles.module';
import { AuthzModule } from './authz/authz.module';
import { AuditModule } from './audit/audit.module';
import { WorkflowModule } from './workflow/workflow.module';

/**
 * SystemAdministrationModule — Epic 0 (Platform Foundation) pada Release
 * Planning & Sprint Backlog. Modul ini WAJIB tersedia sebelum modul lain
 * (Employee & Organization, Attendance, dst.) dikembangkan, karena
 * menyediakan 4 shared service: Authorization, Audit Log, Notification
 * (menyusul), dan Workflow Engine (lihat Technical Architecture Document).
 */
@Module({
  imports: [TenantsModule, RolesModule, AuthzModule, AuditModule, WorkflowModule],
  exports: [TenantsModule, RolesModule, AuthzModule, AuditModule, WorkflowModule],
})
export class SystemAdministrationModule {}
