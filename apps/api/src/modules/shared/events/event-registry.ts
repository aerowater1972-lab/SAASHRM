export enum DomainEventType {
  // Contract events (Bagian 15 — Consolidated API & Event Contract)
  ATTENDANCE_PERIOD_CLOSED    = 'attendance.period.closed',
  EXPENSE_CLAIM_APPROVED      = 'expense.claim.approved',
  LOAN_INSTALLMENT_DUE        = 'loan.installment.due',
  EMPLOYEE_BENEFIT_CHANGED    = 'employee.benefit.changed',
  APPLICATION_OFFER_ACCEPTED  = 'application.offer.accepted',
  EMPLOYEE_GRADE_CHANGED      = 'employee.grade.changed',
  PERFORMANCE_SCORE_FINALIZED = 'performance.score.finalized',
  RESIGNATION_EFFECTIVE       = 'resignation.effective',
  DATA_CHANGED                = '*.data.changed',

  // Internal / additional events (not in contract but used in-process)
  MOVEMENT_APPROVED           = 'movement.approved',
  OFFBOARDING_COMPLETED       = 'offboarding.completed',
  PAYSLIP_GENERATED           = 'payslip.generated',
  PAYROLL_RUN_APPROVED        = 'payroll.run.approved',
  PAYROLL_RUN_LOCKED          = 'payroll.run.locked',
  LOAN_DISBURSED              = 'loan.disbursed',
  EXPENSE_APPROVED            = 'expense.approved',
  ONBOARDING_DOCUMENT_UPLOADED = 'onboarding.document.uploaded',
  ONBOARDING_TASK_CREATED      = 'onboarding.task.created',
  ONBOARDING_TASK_COMPLETED    = 'onboarding.task.completed',
  CANDIDATE_CONVERTED          = 'candidate.converted',
  BENEFIT_ENROLLED            = 'benefit.enrolled',
  REVIEW_CYCLE_FINALIZED      = 'review_cycle.finalized',
  TRAINING_ENROLLMENT_CREATED  = 'training.enrollment.created',
  TRAINING_COMPLETED           = 'training.completed',
  CERTIFICATION_ISSUED         = 'certification.issued',
  CERTIFICATION_EXPIRING       = 'certification.expiring',
  CLEARANCE_CERTIFICATE_ISSUED = 'clearance.certificate.issued',
  ALUMNI_CREATED = 'alumni.created',
}

export interface EventDefinition {
  type: DomainEventType;
  description: string;
  aggregateType: string;
  expectedPayload: Record<string, string>;
}

export const EVENT_REGISTRY: Record<DomainEventType, EventDefinition> = {
  [DomainEventType.ATTENDANCE_PERIOD_CLOSED]: {
    type: DomainEventType.ATTENDANCE_PERIOD_CLOSED,
    description: 'Attendance period closed → Payroll: employee_id, period, worked_days, late_count, overtime_minutes, leave_days',
    aggregateType: 'attendance',
    expectedPayload: { employeeId: 'string', period: 'string', workedDays: 'number', lateCount: 'number', overtimeMinutes: 'number', leaveDays: 'number', tenantId: 'string' },
  },
  [DomainEventType.EXPENSE_CLAIM_APPROVED]: {
    type: DomainEventType.EXPENSE_CLAIM_APPROVED,
    description: 'Expense claim approved → Payroll: employee_id, claim_id, amount, category',
    aggregateType: 'expense',
    expectedPayload: { employeeId: 'string', claimId: 'string', amount: 'number', category: 'string', tenantId: 'string' },
  },
  [DomainEventType.LOAN_INSTALLMENT_DUE]: {
    type: DomainEventType.LOAN_INSTALLMENT_DUE,
    description: 'Loan installment due → Payroll: employee_id, loan_id, period, installment_amount, remaining_balance',
    aggregateType: 'expense',
    expectedPayload: { employeeId: 'string', loanId: 'string', period: 'string', installmentAmount: 'number', remainingBalance: 'number', tenantId: 'string' },
  },
  [DomainEventType.EMPLOYEE_BENEFIT_CHANGED]: {
    type: DomainEventType.EMPLOYEE_BENEFIT_CHANGED,
    description: 'Employee benefit changed → Payroll: employee_id, benefit_type_id, monetary_value, effective_date',
    aggregateType: 'benefit',
    expectedPayload: { employeeId: 'string', benefitTypeId: 'string', monetaryValue: 'number', effectiveDate: 'string', tenantId: 'string' },
  },
  [DomainEventType.APPLICATION_OFFER_ACCEPTED]: {
    type: DomainEventType.APPLICATION_OFFER_ACCEPTED,
    description: 'Application offer accepted → Employee & Org Mgmt: candidate data lengkap → employee status Pending Activation',
    aggregateType: 'recruitment',
    expectedPayload: { applicationId: 'string', candidateId: 'string', fullName: 'string', email: 'string', position: 'string', grade: 'string', startDate: 'string', tenantId: 'string' },
  },
  [DomainEventType.EMPLOYEE_GRADE_CHANGED]: {
    type: DomainEventType.EMPLOYEE_GRADE_CHANGED,
    description: 'Employee grade changed → Benefit Mgmt, Payroll: employee_id, old_grade_id, new_grade_id, effective_date',
    aggregateType: 'employee',
    expectedPayload: { employeeId: 'string', oldGradeId: 'string', newGradeId: 'string', effectiveDate: 'string', tenantId: 'string' },
  },
  [DomainEventType.PERFORMANCE_SCORE_FINALIZED]: {
    type: DomainEventType.PERFORMANCE_SCORE_FINALIZED,
    description: 'Performance score finalized → Payroll (bonus), Employee Movement: employee_id, review_cycle_id, final_rating',
    aggregateType: 'performance',
    expectedPayload: { employeeId: 'string', reviewCycleId: 'string', finalRating: 'number', tenantId: 'string' },
  },
  [DomainEventType.DATA_CHANGED]: {
    type: DomainEventType.DATA_CHANGED,
    description: 'Generic data audit — ALL modules → System Administration (Audit Log): module, entity, entity_id, action, changed_by, diff',
    aggregateType: 'audit',
    expectedPayload: { module: 'string', entity: 'string', entityId: 'string', action: 'string', changedBy: 'string', diff: 'object', tenantId: 'string' },
  },
  [DomainEventType.RESIGNATION_EFFECTIVE]: {
    type: DomainEventType.RESIGNATION_EFFECTIVE,
    description: 'Resignation request has taken effect; employee deactivated',
    aggregateType: 'resignation',
    expectedPayload: { resignationId: 'string', employeeId: 'string', effectiveDate: 'string' },
  },
  [DomainEventType.MOVEMENT_APPROVED]: {
    type: DomainEventType.MOVEMENT_APPROVED,
    description: 'Employee movement (promotion/transfer) has been approved',
    aggregateType: 'movement',
    expectedPayload: { movementId: 'string', employeeId: 'string', type: 'string', newPositionId: 'string' },
  },
  [DomainEventType.OFFBOARDING_COMPLETED]: {
    type: DomainEventType.OFFBOARDING_COMPLETED,
    description: 'Offboarding tasks completed, accounts disabled, assets returned',
    aggregateType: 'resignation',
    expectedPayload: { resignationId: 'string', employeeId: 'string', tenantId: 'string' },
  },
  [DomainEventType.PAYSLIP_GENERATED]: {
    type: DomainEventType.PAYSLIP_GENERATED,
    description: 'Payroll run completed and payslips generated',
    aggregateType: 'payroll',
    expectedPayload: { payrollRunId: 'string', period: 'string', employeeCount: 'number', tenantId: 'string' },
  },
  [DomainEventType.PAYROLL_RUN_APPROVED]: {
    type: DomainEventType.PAYROLL_RUN_APPROVED,
    description: 'Payroll run approved → Notification: payslips published to ESS',
    aggregateType: 'payroll',
    expectedPayload: { payrollRunId: 'string', period: 'string', employeeCount: 'number', tenantId: 'string' },
  },
  [DomainEventType.PAYROLL_RUN_LOCKED]: {
    type: DomainEventType.PAYROLL_RUN_LOCKED,
    description: 'Payroll run locked → final state, no further changes allowed',
    aggregateType: 'payroll',
    expectedPayload: { payrollRunId: 'string', period: 'string', employeeCount: 'number', lockedBy: 'string', tenantId: 'string' },
  },
  [DomainEventType.LOAN_DISBURSED]: {
    type: DomainEventType.LOAN_DISBURSED,
    description: 'Loan has been approved and disbursed',
    aggregateType: 'expense',
    expectedPayload: { loanId: 'string', employeeId: 'string', amount: 'number', tenantId: 'string' },
  },
  [DomainEventType.EXPENSE_APPROVED]: {
    type: DomainEventType.EXPENSE_APPROVED,
    description: 'Expense report has been approved',
    aggregateType: 'expense',
    expectedPayload: { expenseId: 'string', employeeId: 'string', amount: 'number', tenantId: 'string' },
  },
  [DomainEventType.ONBOARDING_DOCUMENT_UPLOADED]: {
    type: DomainEventType.ONBOARDING_DOCUMENT_UPLOADED,
    description: 'An onboarding document has been uploaded for a candidate',
    aggregateType: 'recruitment',
    expectedPayload: { applicationId: 'string', docType: 'string', fileUrl: 'string', tenantId: 'string' },
  },
  [DomainEventType.ONBOARDING_TASK_CREATED]: {
    type: DomainEventType.ONBOARDING_TASK_CREATED,
    description: 'An onboarding task has been assigned',
    aggregateType: 'recruitment',
    expectedPayload: { taskId: 'string', applicationId: 'string', taskName: 'string', ownerTeam: 'string', dueDate: 'string', tenantId: 'string' },
  },
  [DomainEventType.ONBOARDING_TASK_COMPLETED]: {
    type: DomainEventType.ONBOARDING_TASK_COMPLETED,
    description: 'An onboarding task has been completed',
    aggregateType: 'recruitment',
    expectedPayload: { taskId: 'string', applicationId: 'string', completedBy: 'string', tenantId: 'string' },
  },
  [DomainEventType.CANDIDATE_CONVERTED]: {
    type: DomainEventType.CANDIDATE_CONVERTED,
    description: 'Candidate has been converted to an employee record',
    aggregateType: 'recruitment',
    expectedPayload: { applicationId: 'string', candidateId: 'string', employeeId: 'string', employeeCode: 'string', joinDate: 'string', tenantId: 'string' },
  },
  [DomainEventType.BENEFIT_ENROLLED]: {
    type: DomainEventType.BENEFIT_ENROLLED,
    description: 'Employee has been enrolled in a benefit plan',
    aggregateType: 'benefit',
    expectedPayload: { benefitId: 'string', employeeId: 'string', planId: 'string', tenantId: 'string' },
  },
  [DomainEventType.REVIEW_CYCLE_FINALIZED]: {
    type: DomainEventType.REVIEW_CYCLE_FINALIZED,
    description: 'Performance review cycle has been finalized',
    aggregateType: 'performance',
    expectedPayload: { cycleId: 'string', finalScoresCount: 'number', tenantId: 'string' },
  },
  [DomainEventType.TRAINING_ENROLLMENT_CREATED]: {
    type: DomainEventType.TRAINING_ENROLLMENT_CREATED,
    description: 'Employee enrolled/assigned to a training program',
    aggregateType: 'learning',
    expectedPayload: { trainingId: 'string', employeeId: 'string', title: 'string', tenantId: 'string' },
  },
  [DomainEventType.TRAINING_COMPLETED]: {
    type: DomainEventType.TRAINING_COMPLETED,
    description: 'Employee completed a training program',
    aggregateType: 'learning',
    expectedPayload: { trainingId: 'string', employeeId: 'string', title: 'string', score: 'number', tenantId: 'string' },
  },
  [DomainEventType.CERTIFICATION_ISSUED]: {
    type: DomainEventType.CERTIFICATION_ISSUED,
    description: 'A certification record has been issued to an employee',
    aggregateType: 'learning',
    expectedPayload: { certificationId: 'string', employeeId: 'string', name: 'string', expiryDate: 'string', tenantId: 'string' },
  },
  [DomainEventType.CERTIFICATION_EXPIRING]: {
    type: DomainEventType.CERTIFICATION_EXPIRING,
    description: 'A certification is approaching its expiry date',
    aggregateType: 'learning',
    expectedPayload: { certificationId: 'string', employeeId: 'string', name: 'string', expiryDate: 'string', tenantId: 'string' },
  },
  [DomainEventType.CLEARANCE_CERTIFICATE_ISSUED]: {
    type: DomainEventType.CLEARANCE_CERTIFICATE_ISSUED,
    description: 'Clearance certificate (paklaring) issued for offboarded employee',
    aggregateType: 'resignation',
    expectedPayload: { certificateId: 'string', employeeId: 'string', issuedBy: 'string', tenantId: 'string' },
  },
  [DomainEventType.ALUMNI_CREATED]: {
    type: DomainEventType.ALUMNI_CREATED,
    description: 'Alumni record created for offboarded employee',
    aggregateType: 'resignation',
    expectedPayload: { alumniId: 'string', employeeId: 'string', tenantId: 'string' },
  },
};
