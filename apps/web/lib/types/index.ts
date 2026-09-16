// =======================================================================
// Enums (mirrored from Prisma schema)
// =======================================================================

export type EmployeeStatus = 'PENDING_ACTIVATION' | 'ACTIVE' | 'INACTIVE';
export type Gender = 'MALE' | 'FEMALE';
export type MaritalStatus = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
export type EmploymentType = 'PERMANENT' | 'CONTRACT' | 'PROBATION' | 'INTERNSHIP' | 'FREELANCE';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type AttendanceStatus = 'PRESENT' | 'LATE' | 'EARLY_LEAVE' | 'ABSENT' | 'LEAVE' | 'BUSINESS_TRIP' | 'REMOTE' | 'HOLIDAY' | 'OVERTIME';
export type PayrollRunStatus = 'DRAFT' | 'PROCESSING' | 'COMPLETED' | 'APPROVED' | 'CANCELLED' | 'OPEN' | 'CLOSED' | 'LOCKED';
export type PayslipStatus = 'DRAFT' | 'PUBLISHED' | 'ACKNOWLEDGED' | 'DISPUTED' | 'PAID';
export type ApplicationStatus = 'NEW' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
export type CycleStatus = 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED';
export type ReviewStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
export type GoalStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'ACHIEVED' | 'CANCELLED';
export type AssetStatus = 'AVAILABLE' | 'ASSIGNED' | 'MAINTENANCE' | 'RETIRED' | 'LOST';
export type AssetCategory = 'LAPTOP' | 'PHONE' | 'VEHICLE' | 'CARD' | 'UNIFORM' | 'TOOL' | 'OTHER';
export type BenefitType = 'ALLOWANCE' | 'INSURANCE' | 'FACILITY' | 'OTHER';
export type PostingStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'CANCELLED';
export type CandidateStatus = 'ACTIVE' | 'HIRED' | 'REJECTED' | 'BLACKLISTED';

// =======================================================================
// Pagination
// =======================================================================

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// =======================================================================
// Admin
// =======================================================================

export interface Tenant {
  id: string;
  name: string;
  domain?: string;
  package: string;
  status: string;
  settings?: any;
  createdAt: string;
}

export interface TenantEntity {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  parentId?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  timezone: string;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  phone?: string;
  avatar?: string;
  locale: string;
  status: string;
  lastLoginAt?: string;
  employeeId?: string;
  userRoles?: { roleId: string; entityId?: string }[];
}

export interface Role {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isSystem: boolean;
  rolePermissions?: { permission: Permission }[];
  userRoles?: { user: { id: string; fullName: string; email: string } }[];
}

export interface Permission {
  id: string;
  module: string;
  action: string;
  description?: string;
}

export interface RolePermission {
  roleId: string;
  permissionId: string;
  scope?: string;
}

export interface UserRole {
  userId: string;
  roleId: string;
  entityId?: string;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  module: string;
  entity: string;
  entityId: string;
  action: string;
  changedBy: string;
  changedAt: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
}

export interface WorkflowDefinition {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  version: number;
  status: string;
  steps?: WorkflowStep[];
}

export interface WorkflowStep {
  id: string;
  workflowDefId: string;
  stepOrder: number;
  name: string;
  approverType: string;
  approverRoleId?: string;
  approverUserId?: string;
  timeoutHours?: number;
}

export interface FeatureFlag {
  id: string;
  tenantId: string;
  module: string;
  feature: string;
  enabled: boolean;
}

export interface Integration {
  id: string;
  tenantId: string;
  name: string;
  type: string;
  status: string;
  lastSyncAt?: string;
  errorMessage?: string;
}

// =======================================================================
// Employee
// =======================================================================

export interface Employee {
  id: string;
  tenantId: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone?: string;
  alternativePhone?: string;
  birthDate?: string;
  birthPlace?: string;
  gender?: Gender;
  religion?: string;
  maritalStatus?: MaritalStatus;
  unionStatus?: 'NONE' | 'MEMBER' | 'OFFICER';
  idCardNumber?: string;
  taxIdNumber?: string;
  socialSecurityNumber?: string;
  bloodType?: string;
  allergies?: string;
  medicalNotes?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  profilePicture?: string;
  status: EmployeeStatus;
  startDate?: string;
  endDate?: string;
  notes?: string;
  createdAt: string;
  employments?: Employment[];
  documents?: EmployeeDocument[];
}

export interface Employment {
  id: string;
  employeeId: string;
  positionId: string;
  departmentId: string;
  gradeId?: string;
  entityId?: string;
  type: EmploymentType;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  salary?: number;
  salaryCurrency: string;
  position?: Position;
  department?: Department;
  grade?: Grade;
}

export interface Department {
  id: string;
  tenantId: string;
  organizationId: string;
  entityId?: string;
  name: string;
  code: string;
  headEmployeeId?: string;
  parentId?: string;
  level: number;
  status: string;
  children?: Department[];
  positions?: Position[];
}

export interface Position {
  id: string;
  tenantId: string;
  departmentId: string;
  name: string;
  code: string;
  gradeId?: string;
  description?: string;
  isHead?: boolean;
  maxHeadCount?: number;
}

export interface Grade {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  level: number;
  description?: string;
}

export interface Organization {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description?: string;
  parentId?: string;
  level: number;
  children?: Organization[];
}

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  type: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  version: number;
  status: string;
  expiresAt?: string;
  notes?: string;
  uploadedAt: string;
}

export interface MovementRequest {
  id: string;
  employeeId: string;
  type: string;
  newPositionId?: string;
  newDepartmentId?: string;
  effectiveDate: string;
  status: string;
  createdAt: string;
  employee?: Employee;
  newPosition?: Position;
  newDepartment?: Department;
}

// =======================================================================
// Attendance & Leave
// =======================================================================

export interface Shift {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  gracePeriodMinutes?: number;
  color?: string;
  isNightShift: boolean;
}

export interface AttendanceRecord {
  id: string;
  tenantId: string;
  employeeId: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  clockInMethod?: string;
  clockOutMethod?: string;
  clockInLat?: number;
  clockInLng?: number;
  clockInAccuracy?: number;
  clockInClientTs?: string;
  clockOutAccuracy?: number;
  clockOutClientTs?: string;
  clockInFlags?: string[];
  clockOutFlags?: string[];
  isSuspicious?: boolean;
  spoofReviewedBy?: string | null;
  spoofReviewedAt?: string | null;
  spoofReviewNote?: string | null;
  status: AttendanceStatus;
  lateMinutes?: number;
  earlyLeaveMinutes?: number;
  overtimeMinutes?: number;
  notes?: string;
  isApproved: boolean;
  employee?: Employee;
}

export interface OvertimeRequest {
  id: string;
  tenantId: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  totalMinutes: number;
  reason: string;
  status: RequestStatus;
  approvedBy?: string;
  approvedAt?: string;
  employee?: Employee;
}

export interface LeaveType {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description?: string;
  isPaid: boolean;
  allowNegativeBalance?: boolean;
  maxConsecutiveDays?: number;
  requiresDocument: boolean;
  carryForwardLimit?: number;
  carryForwardExpiry?: string;
  genderRestriction?: 'MALE' | 'FEMALE';
  minServiceMonths?: number;
  isBalanceDeducting?: boolean;
  sameDayApproval?: boolean;
  isUnionActivity?: boolean;
  isActive: boolean;
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  totalEntitled: number;
  totalUsed: number;
  totalPending: number;
  carryForward: number;
  leaveType?: LeaveType;
}

export interface LeaveRequest {
  id: string;
  tenantId: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  documentUrl?: string;
  status: RequestStatus;
  approvedBy?: string;
  approvedAt?: string;
  isUrgent: boolean;
  escalated: boolean;
  employee?: Employee;
  leaveType?: LeaveType;
}

// =======================================================================
// Payroll
// =======================================================================

export interface PayrollPeriod {
  id: string;
  tenantId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

export interface PayrollRun {
  id: string;
  tenantId: string;
  periodId: string;
  name: string;
  status: PayrollRunStatus;
  totalEmployees: number;
  totalAmount: number;
  approvedBy?: string;
  approvedAt?: string;
  processedAt?: string;
  notes?: string;
  startDate?: string;
  endDate?: string;
  runs?: PayrollRun[];
  period?: PayrollPeriod;
  payslips?: Payslip[];
}

export interface Payslip {
  id: string;
  tenantId: string;
  runId: string;
  employeeId: string;
  baseSalary: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  status: PayslipStatus;
  employeeNotes?: string;
  bankTransferCode?: string;
  items?: PayrollItem[];
  run?: PayrollRun;
  employee?: Employee;
}

export interface PayrollItem {
  id: string;
  payslipId: string;
  componentId: string;
  amount: number;
  calculationBasis?: string;
  description?: string;
  component?: PayrollComponent;
}

export interface PayrollComponent {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  type: string;
  category: string;
  description?: string;
  formula?: string;
  isTaxable: boolean;
  isProrated: boolean;
  value?: number;
  isActive: boolean;
}

export interface PayrollAdjustment {
  id: string;
  tenantId: string;
  employeeId: string;
  sourceEvent: string;
  referenceId?: string;
  type: string;
  amount?: number;
  currency: string;
  description?: string;
  effectiveDate: string;
  status: string;
}

export interface BpjsConfig {
  id: string;
  tenantId: string;
  type: string;
  jkmRate: number;
  jkkRate: number;
  jhtEmployerRate: number;
  jhtEmployeeRate: number;
  pensionEmployerRate: number;
  pensionEmployeeRate: number;
  maxWageLimit?: number;
  effectiveDate: string;
  status: string;
}

export interface TaxConfig {
  id: string;
  tenantId: string;
  taxMethod: string;
  ptkp: number;
  terCategory?: string;
  effectiveDate: string;
  status: string;
}

// =======================================================================
// Expense & Loan
// =======================================================================

export interface ExpenseClaim {
  id: string;
  tenantId: string;
  employeeId: string;
  title: string;
  description?: string;
  totalAmount: number;
  currency: string;
  status: RequestStatus;
  createdAt: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
  notes?: string;
  employee?: Employee;
  items?: ExpenseItem[];
}

export interface ExpenseItem {
  id: string;
  claimId: string;
  category: string;
  description: string;
  amount: number;
  receiptUrl?: string;
  date?: string;
}

export interface Loan {
  id: string;
  tenantId: string;
  employeeId: string;
  amount: number;
  installmentCount: number;
  installmentAmount: number;
  purpose?: string;
  status: RequestStatus;
  approvedBy?: string;
  approvedAt?: string;
  remainingBalance: number;
  notes?: string;
  createdAt: string;
  startDeductionFrom?: string;
  employee?: Employee;
  installments?: LoanInstallment[];
}

export interface LoanInstallment {
  id: string;
  loanId: string;
  periodName: string;
  amount: number;
  status: string;
  paidAt?: string;
}

// =======================================================================
// Benefits & Assets
// =======================================================================

export interface Benefit {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  type: BenefitType;
  description?: string;
  isTaxable: boolean;
  value?: number;
  frequency?: string;
  isActive: boolean;
}

export interface EmployeeBenefit {
  id: string;
  employeeId: string;
  benefitId: string;
  value?: number;
  effectiveDate: string;
  expiryDate?: string;
  status: string;
  benefit?: Benefit;
}

export interface BenefitEligibilityRule {
  id: string;
  benefitId: string;
  gradeId?: string;
  departmentId?: string;
}

export interface Asset {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  category: AssetCategory;
  brand?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  condition: string;
  status: AssetStatus;
  notes?: string;
}

export interface AssetAssignment {
  id: string;
  assetId: string;
  employeeId: string;
  assignedAt: string;
  returnedAt?: string;
  conditionOnReturn?: string;
  employee?: Employee;
  asset?: Asset;
}

// =======================================================================
// Recruitment
// =======================================================================

export interface JobPosting {
  id: string;
  tenantId: string;
  positionId: string;
  requisitionId?: string;
  title: string;
  description: string;
  requirements?: string;
  responsibilities?: string;
  minSalary?: number;
  maxSalary?: number;
  employmentType?: string;
  location?: string;
  slots: number;
  filledSlots: number;
  status: PostingStatus;
  postedAt?: string;
  createdAt: string;
  applications?: Application[];
}

export interface Candidate {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  source?: string;
  currentCompany?: string;
  currentPosition?: string;
  notes?: string;
  status: CandidateStatus;
  createdAt: string;
}

export interface Application {
  id: string;
  tenantId: string;
  jobPostingId: string;
  candidateId: string;
  employeeId?: string;
  status: ApplicationStatus;
  expectedSalary?: number;
  notes?: string;
  appliedAt: string;
  candidate?: Candidate;
  jobPosting?: JobPosting;
  interviews?: Interview[];
  offers?: Offer[];
  onboardingDocuments?: OnboardingDocument[];
}

export interface OnboardingDocument {
  id: string;
  applicationId: string;
  name: string;
  fileUrl: string;
  status: string;
  uploadedAt: string;
}

export interface Interview {
  id: string;
  applicationId: string;
  stage: number;
  type: string;
  interviewerId: string;
  scheduledAt: string;
  durationMinutes: number;
  location?: string;
  meetingLink?: string;
  score?: number;
  feedback?: string;
  status: string;
  scorecards?: InterviewScorecard[];
}

export interface InterviewScorecard {
  id: string;
  interviewId: string;
  competency: string;
  score: number;
  notes?: string;
}

export interface Offer {
  id: string;
  applicationId: string;
  version: number;
  baseSalary: number;
  allowance?: number;
  benefitDescription?: string;
  joinDate: string;
  status: string;
  sentAt?: string;
  acceptedAt?: string;
}

export interface JobRequisition {
  id: string;
  tenantId: string;
  title: string;
  departmentId: string;
  status: string;
  approvedBy?: string;
  createdAt: string;
}

// =======================================================================
// Performance
// =======================================================================

export interface ReviewCycle {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  period: string;
  startDate: string;
  endDate: string;
  type: string;
  status: CycleStatus;
  reviews?: PerformanceReview[];
}

export interface PerformanceReview {
  id: string;
  tenantId: string;
  cycleId: string;
  employeeId: string;
  reviewerId: string;
  overallScore?: number;
  summary?: string;
  strengths?: string;
  improvements?: string;
  status: ReviewStatus;
  submittedAt?: string;
  ratings?: Rating[];
  goals?: Goal[];
  employee?: Employee;
  cycle?: ReviewCycle;
}

export interface Rating {
  id: string;
  reviewId: string;
  competency: string;
  score: number;
  description?: string;
}

export interface Goal {
  id: string;
  tenantId: string;
  employeeId: string;
  reviewId?: string;
  title: string;
  description?: string;
  metric?: string;
  targetValue?: number;
  actualValue?: number;
  startDate?: string;
  endDate?: string;
  status: GoalStatus;
}

export interface CalibrationSession {
  id: string;
  reviewCycleId: string;
  departmentId: string;
  facilitatorId: string;
  status: string;
}

// =======================================================================
// Learning
// =======================================================================

export interface Training {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  type: string;
  category?: string;
  provider?: string;
  startDate: string;
  endDate: string;
  cost?: number;
  capacity?: number;
  status: string;
  participants?: TrainingParticipant[];
  recommendedViolationCategory?: { id: string; name: string; code: string };
  recommendedViolationCategoryId?: string;
}

export interface TrainingParticipant {
  id: string;
  trainingId: string;
  employeeId: string;
  status: string;
  score?: number;
  completedAt?: string;
  feedback?: string;
  employee?: Employee;
}

export interface Certification {
  id: string;
  tenantId: string;
  employeeId: string;
  name: string;
  issuer?: string;
  issuedDate: string;
  expiryDate?: string;
  certificateUrl?: string;
}

// =======================================================================
// Resignation
// =======================================================================

export interface ResignationRequest {
  id: string;
  tenantId: string;
  employeeId: string;
  type: string;
  reason: string;
  resignationDate: string;
  effectiveDate: string;
  status: RequestStatus;
  approvedBy?: string;
  approvedAt?: string;
  employee?: Employee;
  exitInterview?: ExitInterview;
  offboardingTasks?: OffboardingTask[];
}

export interface ExitInterview {
  id: string;
  resignationId: string;
  reason: string;
  feedback?: string;
  wouldRecommend?: boolean;
  areasForImprovement?: string;
  conductedBy: string;
  conductedAt: string;
}

export interface OffboardingTask {
  id: string;
  resignationId: string;
  taskName: string;
  assignedTo: string;
  category: string;
  status: string;
  completedAt?: string;
  notes?: string;
}

export interface FinalSettlement {
  id: string;
  resignationId: string;
  unusedLeavePayout: number;
  severanceAmount: number;
  loanDeduction: number;
  netPayout: number;
  status: string;
}

// =======================================================================
// Employee Engagement Survey
// =======================================================================

export type SurveyType = 'ENPS' | 'PULSE' | 'CUSTOM';
export type SurveyStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
export type QuestionType = 'LIKERT_5' | 'LIKERT_7' | 'MULTIPLE_CHOICE' | 'SINGLE_CHOICE' | 'FREE_TEXT' | 'NPS';
export type ActionItemStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface EngagementSurvey {
  id: string;
  tenantId: string;
  title: string;
  type: SurveyType;
  isAnonymous: boolean;
  targetScope?: string;
  startDate: string;
  endDate: string;
  status: SurveyStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  questions?: SurveyQuestion[];
  actionItems?: SurveyActionItem[];
  _count?: { responses: number; actionItems: number };
}

export interface SurveyQuestion {
  id: string;
  surveyId: string;
  questionText: string;
  questionType: QuestionType;
  options?: string;
  isRequired: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  questionId: string;
  employeeId?: string;
  answerValue: string;
  submittedAt: string;
}

export interface SurveyActionItem {
  id: string;
  surveyId: string;
  title: string;
  description?: string;
  assigneeId: string;
  dueDate: string;
  status: ActionItemStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SurveyResults {
  survey: EngagementSurvey;
  totalResponses: number;
  totalRespondents: number;
  minThreshold: number;
  thresholdMet: boolean;
  questions: SurveyQuestionResult[];
  departmentBreakdown?: DepartmentSurveyResult[];
}

export interface SurveyQuestionResult {
  id: string;
  questionText: string;
  questionType: QuestionType;
  isRequired: boolean;
  order: number;
  stats: QuestionStats;
}

export interface QuestionStats {
  count: number;
  respondentCount: number;
  thresholdMet: boolean;
  average?: number;
  enps?: number;
  promoters?: number;
  passives?: number;
  detractors?: number;
  distribution?: { option?: string; value?: number; count: number }[];
  textAnswers?: string[];
}

export interface DepartmentSurveyResult {
  departmentId: string;
  departmentName: string;
  respondentCount: number;
  questions: SurveyQuestionResult[];
}

export interface EnpsTrend {
  period: string;
  enpsScore: number;
  totalResponses: number;
}

// =======================================================================
// Manpower Planning
// =======================================================================

export type ManpowerPlanStatus = 'DRAFT' | 'SUBMITTED' | 'HR_REVIEW' | 'FINANCE_REVIEW' | 'APPROVED' | 'REJECTED';
export type ManpowerType = 'NEW' | 'REPLACEMENT';

export interface ManpowerPlan {
  id: string;
  tenantId: string;
  departmentId: string;
  period: string;
  version: number;
  status: ManpowerPlanStatus;
  submittedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  items?: ManpowerPlanItem[];
  department?: Department;
  approvalHistory?: ManpowerPlanApproval[];
  _count?: { items: number };
}

export interface ManpowerPlanItem {
  id: string;
  manpowerPlanId: string;
  positionTitle: string;
  gradeId?: string;
  quantity: number;
  type: ManpowerType;
  estimatedCost?: number;
  createdAt: string;
  updatedAt: string;
  jobRequisitions?: { id: string; title: string; status: string }[];
  grade?: Grade;
}

export interface ManpowerPlanApproval {
  id: string;
  planId: string;
  action: 'APPROVE' | 'REJECT';
  reason?: string;
  actedBy: string;
  actedAt: string;
  actor?: { id: string; fullName: string };
}

export interface PlanVsActualItem {
  departmentId: string;
  departmentName: string;
  period: string;
  plannedHeadcount: number;
  actualHeadcount: number;
  plannedCost: number;
  actualCost: number;
  varianceHeadcount: number;
  varianceCost: number;
  fulfillmentRate: number;
}

export interface DepartmentCompilation {
  departmentId: string;
  departmentName: string;
  planned: number;
  cost: number;
}

export interface CompilationDashboardItem {
  period: string;
  totalPlanned: number;
  totalCost: number;
  approvedCost: number;
  departmentBreakdown: DepartmentCompilation[];
}

// =======================================================================
// LMS (Learning Management System)
// =======================================================================

export interface Course {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  category?: string;
  imageUrl?: string;
  duration?: number;
  status: CourseEnrollmentStatus;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  modules?: CourseModule[];
  courseTrainees?: CourseTrainee[];
  _count?: { courseTrainees: number };
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  order: number;
  createdAt: string;
  lessons?: Lesson[];
  quizzes?: Quiz[];
}

export interface Lesson {
  id: string;
  courseModuleId: string;
  title: string;
  content?: string;
  order: number;
  duration?: number;
  createdAt: string;
  createdBy?: string;
}

export interface Quiz {
  id: string;
  courseModuleId: string;
  title: string;
  description?: string;
  createdAt: string;
  quizQuestions?: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  question: string;
  options?: string[];
  correctAnswer?: string;
  order: number;
  createdAt: string;
}

export interface QuizAttempt {
  id: string;
  courseTraineeId: string;
  quizId: string;
  score?: number;
  maxScore?: number;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
}

export interface CourseTrainee {
  id: string;
  courseId: string;
  employeeId: string;
  status: CourseEnrollmentStatus;
  enrolledAt: string;
  completedAt?: string;
  createdAt: string;
  employee?: { id: string; fullName: string; employeeId: string };
}

export enum CourseEnrollmentStatus {
  ENROLLED = 'ENROLLED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  DROPPED = 'DROPPED',
}

// =======================================================================
// 360 Feedback
// =======================================================================

export interface Feedback360 {
  id: string;
  tenantId: string;
  revieweeId: string;
  reviewerId?: string;
  reviewerType: FeedbackReviewerType;
  status: FeedbackStatus;
  allowAnonymous: boolean;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  reviewee?: { id: string; fullName: string; employeeId: string };
  reviewer?: { id: string; fullName: string; employeeId: string };
  questions?: Feedback360Question[];
  responses?: Feedback360Response[];
}

export enum FeedbackReviewerType {
  SELF = 'SELF',
  MANAGER = 'MANAGER',
  PEER = 'PEER',
  DIRECT_REPORT = 'DIRECT_REPORT',
  CUSTOM = 'CUSTOM',
}

export enum FeedbackStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  REVIEWED = 'REVIEWED',
  ARCHIVED = 'ARCHIVED',
}

export interface Feedback360Question {
  id: string;
  feedback360Id: string;
  question: string;
  order: number;
  createdAt: string;
}

export interface Feedback360Response {
  id: string;
  feedback360Id: string;
  questionId: string;
  reviewerId: string;
  score: number;
  comment?: string;
  createdAt: string;
  reviewer?: { fullName: string };
}

export interface Feedback360Summary {
  employeeId: string;
  totalSessions: number;
  averageScore: number;
  topStrengths: Array<[string, number]>;
  topImprovements: Array<[string, number]>;
}

export interface FeedbackResults {
  feedbackId: string;
  averageScore: number;
  totalResponses: number;
  responses: Feedback360Response[];
}

// =======================================================================
// IDP (Individual Development Plan)
// =======================================================================

export interface IndividualDevelopmentPlan {
  id: string;
  tenantId: string;
  employeeId: string;
  title: string;
  description?: string;
  targetDate?: string;
  status: IDPStatus;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  employee?: { id: string; fullName: string; employeeId: string };
  activities?: IDPActivity[];
}

export enum IDPStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface IDPActivity {
  id: string;
  idpId: string;
  title: string;
  description?: string;
  activityType: IDPActivityType;
  dueDate?: string;
  estimatedHours?: number;
  status: IDPActivityStatus;
  completionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export enum IDPActivityType {
  TRAINING = 'TRAINING',
  CERTIFICATION = 'CERTIFICATION',
  MENTORING = 'MENTORING',
  PROJECT = 'PROJECT',
  SELF_STUDY = 'SELF_STUDY',
  OTHER = 'OTHER',
}

export enum IDPActivityStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// =======================================================================
// Provincial Wage (UMK/UMP)
// =======================================================================

export interface ProvincialMinimumWage {
  id: string;
  tenantId: string;
  province: string;
  year: number;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WageListParams {
  province?: string;
  year?: number;
}
