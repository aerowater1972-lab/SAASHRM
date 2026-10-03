-- Flexy HRMS multi-tenant Row-Level Security (defense-in-depth)
-- Apply AFTER scripts/init-db.sql. Policies are NULL-permissive: when the session
-- GUC app.current_tenant is NOT set, the USING/WITH CHECK pass (all rows visible),
-- so enabling RLS here never breaks existing application-layer filtering.
-- Real cross-tenant enforcement requires the app to SET app.current_tenant per
-- request (DB_RLS_ENABLED=true in apps/api). Validate on a non-prod DB first.
-- FORCE ROW LEVEL SECURITY ensures policies apply even to table owners.

ALTER TABLE "Application" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Application" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_Application ON "Application";
CREATE POLICY tenant_isolation_Application ON "Application" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "Asset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Asset" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_Asset ON "Asset";
CREATE POLICY tenant_isolation_Asset ON "Asset" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "AttendanceRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AttendanceRecord" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_AttendanceRecord ON "AttendanceRecord";
CREATE POLICY tenant_isolation_AttendanceRecord ON "AttendanceRecord" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_AuditLog ON "AuditLog";
CREATE POLICY tenant_isolation_AuditLog ON "AuditLog" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "Benefit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Benefit" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_Benefit ON "Benefit";
CREATE POLICY tenant_isolation_Benefit ON "Benefit" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "BpjsConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BpjsConfig" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_BpjsConfig ON "BpjsConfig";
CREATE POLICY tenant_isolation_BpjsConfig ON "BpjsConfig" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "Candidate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Candidate" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_Candidate ON "Candidate";
CREATE POLICY tenant_isolation_Candidate ON "Candidate" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "Certification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Certification" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_Certification ON "Certification";
CREATE POLICY tenant_isolation_Certification ON "Certification" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "Department" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Department" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_Department ON "Department";
CREATE POLICY tenant_isolation_Department ON "Department" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "Employee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Employee" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_Employee ON "Employee";
CREATE POLICY tenant_isolation_Employee ON "Employee" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "EmployeeBenefit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmployeeBenefit" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_EmployeeBenefit ON "EmployeeBenefit";
CREATE POLICY tenant_isolation_EmployeeBenefit ON "EmployeeBenefit" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "EssProfileChangeRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EssProfileChangeRequest" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_EssProfileChangeRequest ON "EssProfileChangeRequest";
CREATE POLICY tenant_isolation_EssProfileChangeRequest ON "EssProfileChangeRequest" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "EventOutbox" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EventOutbox" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_EventOutbox ON "EventOutbox";
CREATE POLICY tenant_isolation_EventOutbox ON "EventOutbox" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "ExpenseClaim" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExpenseClaim" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_ExpenseClaim ON "ExpenseClaim";
CREATE POLICY tenant_isolation_ExpenseClaim ON "ExpenseClaim" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "FeatureFlag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FeatureFlag" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_FeatureFlag ON "FeatureFlag";
CREATE POLICY tenant_isolation_FeatureFlag ON "FeatureFlag" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "Goal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Goal" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_Goal ON "Goal";
CREATE POLICY tenant_isolation_Goal ON "Goal" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "Grade" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Grade" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_Grade ON "Grade";
CREATE POLICY tenant_isolation_Grade ON "Grade" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "HolidayCalendar" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HolidayCalendar" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_HolidayCalendar ON "HolidayCalendar";
CREATE POLICY tenant_isolation_HolidayCalendar ON "HolidayCalendar" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "Integration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Integration" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_Integration ON "Integration";
CREATE POLICY tenant_isolation_Integration ON "Integration" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "JobPosting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JobPosting" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_JobPosting ON "JobPosting";
CREATE POLICY tenant_isolation_JobPosting ON "JobPosting" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "JobRequisition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JobRequisition" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_JobRequisition ON "JobRequisition";
CREATE POLICY tenant_isolation_JobRequisition ON "JobRequisition" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "LeaveBalance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LeaveBalance" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_LeaveBalance ON "LeaveBalance";
CREATE POLICY tenant_isolation_LeaveBalance ON "LeaveBalance" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "LeaveRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LeaveRequest" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_LeaveRequest ON "LeaveRequest";
CREATE POLICY tenant_isolation_LeaveRequest ON "LeaveRequest" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "LeaveType" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LeaveType" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_LeaveType ON "LeaveType";
CREATE POLICY tenant_isolation_LeaveType ON "LeaveType" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "Loan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Loan" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_Loan ON "Loan";
CREATE POLICY tenant_isolation_Loan ON "Loan" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_Notification ON "Notification";
CREATE POLICY tenant_isolation_Notification ON "Notification" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "OnboardingTask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OnboardingTask" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_OnboardingTask ON "OnboardingTask";
CREATE POLICY tenant_isolation_OnboardingTask ON "OnboardingTask" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Organization" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_Organization ON "Organization";
CREATE POLICY tenant_isolation_Organization ON "Organization" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "OvertimeRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OvertimeRequest" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_OvertimeRequest ON "OvertimeRequest";
CREATE POLICY tenant_isolation_OvertimeRequest ON "OvertimeRequest" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "PayrollAdjustment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PayrollAdjustment" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_PayrollAdjustment ON "PayrollAdjustment";
CREATE POLICY tenant_isolation_PayrollAdjustment ON "PayrollAdjustment" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "PayrollComponent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PayrollComponent" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_PayrollComponent ON "PayrollComponent";
CREATE POLICY tenant_isolation_PayrollComponent ON "PayrollComponent" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "PayrollPeriod" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PayrollPeriod" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_PayrollPeriod ON "PayrollPeriod";
CREATE POLICY tenant_isolation_PayrollPeriod ON "PayrollPeriod" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "PayrollRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PayrollRun" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_PayrollRun ON "PayrollRun";
CREATE POLICY tenant_isolation_PayrollRun ON "PayrollRun" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "Payslip" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payslip" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_Payslip ON "Payslip";
CREATE POLICY tenant_isolation_Payslip ON "Payslip" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "PerformanceReview" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PerformanceReview" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_PerformanceReview ON "PerformanceReview";
CREATE POLICY tenant_isolation_PerformanceReview ON "PerformanceReview" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "Position" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Position" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_Position ON "Position";
CREATE POLICY tenant_isolation_Position ON "Position" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "ResignationRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ResignationRequest" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_ResignationRequest ON "ResignationRequest";
CREATE POLICY tenant_isolation_ResignationRequest ON "ResignationRequest" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "ReviewCycle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReviewCycle" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_ReviewCycle ON "ReviewCycle";
CREATE POLICY tenant_isolation_ReviewCycle ON "ReviewCycle" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "Role" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Role" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_Role ON "Role";
CREATE POLICY tenant_isolation_Role ON "Role" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "Roster" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Roster" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_Roster ON "Roster";
CREATE POLICY tenant_isolation_Roster ON "Roster" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "Shift" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Shift" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_Shift ON "Shift";
CREATE POLICY tenant_isolation_Shift ON "Shift" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "TaxConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TaxConfig" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_TaxConfig ON "TaxConfig";
CREATE POLICY tenant_isolation_TaxConfig ON "TaxConfig" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "TenantEntity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TenantEntity" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_TenantEntity ON "TenantEntity";
CREATE POLICY tenant_isolation_TenantEntity ON "TenantEntity" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "Training" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Training" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_Training ON "Training";
CREATE POLICY tenant_isolation_Training ON "Training" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_User ON "User";
CREATE POLICY tenant_isolation_User ON "User" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "WorkflowDefinition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowDefinition" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_WorkflowDefinition ON "WorkflowDefinition";
CREATE POLICY tenant_isolation_WorkflowDefinition ON "WorkflowDefinition" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "WorkflowInstance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowInstance" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_WorkflowInstance ON "WorkflowInstance";
CREATE POLICY tenant_isolation_WorkflowInstance ON "WorkflowInstance" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

ALTER TABLE "WorkLocation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkLocation" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_WorkLocation ON "WorkLocation";
CREATE POLICY tenant_isolation_WorkLocation ON "WorkLocation" FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL)
  WITH CHECK ("tenantId" = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL);

