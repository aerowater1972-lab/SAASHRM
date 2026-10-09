// Shared API types - mirrors backend Prisma models and DTOs
export interface Tenant {
  id: string;
  name: string;
  domain: string;
  package: 'STANDARD' | 'PROFESSIONAL' | 'ENTERPRISE';
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL';
  settings: {
    timezone: string;
    currency: string;
    dateFormat: string;
    language: string;
  };
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  phone?: string;
  avatar?: string;
  locale: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  lastLoginAt?: string;
  mfaEnabled: boolean;
  employeeId?: string;
  employee?: Employee;
  userRoles: UserRole[];
}

export interface Employee {
  id: string;
  tenantId: string;
  userId?: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  birthDate?: string;
  birthPlace?: string;
  gender?: 'MALE' | 'FEMALE';
  maritalStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
  religion?: string;
  bloodType?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  ktpNumber?: string;
  ktpExpiry?: string;
  npwpNumber?: string;
  bpjsKesehatanNumber?: string;
  bpjsKetenagakerjaanNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  hireDate: string;
  terminationDate?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'TERMINATED' | 'PROBATION';
  organizationId?: string;
  organization?: Organization;
  departmentId?: string;
  department?: Department;
  positionId?: string;
  position?: Position;
  gradeId?: string;
  grade?: Grade;
  employment?: Employment[];
  avatar?: string;
}

export interface Organization {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  level: number;
  parentId?: string;
  parent?: Organization;
  children?: Organization[];
}

export interface Department {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  organizationId: string;
  organization?: Organization;
  parentId?: string;
  parent?: Department;
  children?: Department[];
}

export interface Position {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  level: number;
  minSalary?: number;
  maxSalary?: number;
}

export interface Grade {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  level: number;
  baseSalary: number;
}

export interface Employment {
  id: string;
  employeeId: string;
  employee?: Employee;
  contractType: 'PKWT' | 'PKWTT' | 'DAILY' | 'OUTSOURCE' | 'INTERN' | 'PROBATION';
  startDate: string;
  endDate?: string;
  salary: number;
  salaryFrequency: 'MONTHLY' | 'WEEKLY' | 'DAILY' | 'HOURLY';
  allowance?: number;
  status: 'ACTIVE' | 'ENDED' | 'TERMINATED';
  organizationId?: string;
  departmentId?: string;
  positionId?: string;
  gradeId?: string;
}

export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  role: Role;
}

export interface Role {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isSystem: boolean;
  rolePermissions: RolePermission[];
}

export interface RolePermission {
  roleId: string;
  permissionId: string;
  permission: Permission;
  scope: 'ALL' | 'OWN' | 'TEAM' | 'DEPARTMENT' | 'ORGANIZATION';
}

export interface Permission {
  id: string;
  module: string;
  action: string;
  description?: string;
}

// Attendance types
export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employee?: Employee;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  checkInLocation?: LocationPoint;
  checkOutLocation?: LocationPoint;
  checkInPhoto?: string;
  checkOutPhoto?: string;
  checkInMethod?: 'FACE' | 'GPS' | 'MANUAL' | 'BIOMETRIC_DEVICE';
  checkOutMethod?: 'FACE' | 'GPS' | 'MANUAL' | 'BIOMETRIC_DEVICE';
  status: 'PRESENT' | 'LATE' | 'EARLY_LEAVE' | 'ABSENT' | 'ON_LEAVE' | 'WFH';
  workHours?: number;
  overtimeHours?: number;
  lateMinutes?: number;
  earlyLeaveMinutes?: number;
  notes?: string;
  shiftId?: string;
  shift?: Shift;
  rosterEntryId?: string;
}

export interface LocationPoint {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
  timestamp: string;
}

export interface Shift {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  breakStartTime?: string;
  breakEndTime?: string;
  gracePeriodMinutes: number;
  maxOvertimeHours: number;
  isNightShift: boolean;
  color: string;
}

export interface Roster {
  id: string;
  tenantId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  rosterEntries: RosterEntry[];
}

export interface RosterEntry {
  id: string;
  rosterId: string;
  employeeId: string;
  employee?: Employee;
  shiftId: string;
  shift?: Shift;
  date: string;
  isDayOff: boolean;
  notes?: string;
}

// Leave types
export interface LeaveType {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description?: string;
  color: string;
  requiresApproval: boolean;
  requiresAttachment: boolean;
  maxDaysPerYear?: number;
  carryForward: boolean;
  maxCarryForwardDays?: number;
  isPaid: boolean;
  genderRestriction?: 'MALE' | 'FEMALE' | 'ALL';
  minTenureMonths?: number;
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  leaveType?: LeaveType;
  year: number;
  totalDays: number;
  usedDays: number;
  carriedForwardDays: number;
  availableDays: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employee?: Employee;
  leaveTypeId: string;
  leaveType?: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  attachment?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  approverId?: string;
  approver?: Employee;
  approvedAt?: string;
  rejectionReason?: string;
}

// Overtime types
export interface OvertimeRequest {
  id: string;
  employeeId: string;
  employee?: Employee;
  date: string;
  startTime: string;
  endTime: string;
  totalHours: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  approverId?: string;
  approver?: Employee;
  approvedAt?: string;
}

export interface OvertimeRecord {
  id: string;
  employeeId: string;
  overtimeRequestId?: string;
  overtimeRequest?: OvertimeRequest;
  date: string;
  hours: number;
  rate: number;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'PAID';
}

// Payroll types
export interface PayrollComponent {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  type: 'EARNING' | 'DEDUCTION' | 'TAX' | 'BPJS' | 'THR' | 'ALLOWANCE' | 'LOAN' | 'OTHER';
  category: 'BASIC' | 'ALLOWANCE' | 'OVERTIME' | 'BONUS' | 'THR' | 'BPJS_EMPLOYER' | 'BPJS_EMPLOYEE' | 'TAX' | 'LOAN' | 'OTHER';
  calculationType: 'FIXED' | 'PERCENTAGE' | 'FORMULA' | 'HOURLY' | 'DAILY' | 'ATTENDANCE_BASED';
  formula?: string;
  isTaxable: boolean;
  isBpjsKesehatan: boolean;
  isBpjsKetenagakerjaan: boolean;
  isThr: boolean;
  displayOrder: number;
  isActive: boolean;
}

export interface PayrollPeriod {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  payDate: string;
  status: 'DRAFT' | 'PROCESSING' | 'COMPLETED' | 'LOCKED' | 'CANCELLED';
  payrollRuns: PayrollRun[];
}

export interface PayrollRun {
  id: string;
  payrollPeriodId: string;
  employeeId: string;
  employee?: Employee;
  status: 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'PAID' | 'CANCELLED';
  grossSalary: number;
  totalEarnings: number;
  totalDeductions: number;
  netSalary: number;
  taxAmount: number;
  bpjsKesehatanEmployee: number;
  bpjsKesehatanEmployer: number;
  bpjsKetenagakerjaanEmployee: number;
  bpjsKetenagakerjaanEmployer: number;
  thrAmount: number;
  items: PayrollItem[];
  payslip?: Payslip;
}

export interface PayrollItem {
  id: string;
  payrollRunId: string;
  componentId: string;
  component?: PayrollComponent;
  amount: number;
  quantity: number;
  rate: number;
  notes?: string;
}

export interface Payslip {
  id: string;
  payrollRunId: string;
  payrollRun?: PayrollRun;
  employeeId: string;
  employee?: Employee;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  grossSalary: number;
  totalEarnings: number;
  totalDeductions: number;
  netSalary: number;
  status: 'DRAFT' | 'GENERATED' | 'SENT' | 'ACKNOWLEDGED';
  generatedAt?: string;
  sentAt?: string;
  acknowledgedAt?: string;
  pdfUrl?: string;
}

// BPJS types
export interface BpjsConfig {
  id: string;
  tenantId: string;
  type: 'KESEHATAN' | 'KETENAGAKERJAAN';
  employerRate: number;
  employeeRate: number;
  maxSalary: number;
  minSalary: number;
  isActive: boolean;
  effectiveDate: string;
}

export interface BpjsClaim {
  id: string;
  employeeId: string;
  employee?: Employee;
  type: 'KESEHATAN' | 'KETENAGAKERJAAN';
  claimType: 'OUTPATIENT' | 'INPATIENT' | 'MATERNITY' | 'DENTAL' | 'OPTICAL' | 'JHT' | 'JKK' | 'JKM' | 'JP' | 'KP';
  claimNumber: string;
  claimDate: string;
  providerName: string;
  providerCode?: string;
  diagnosis?: string;
  totalCost: number;
  coveredAmount: number;
  employeeShare: number;
  employerShare: number;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID';
  attachment?: string;
  submittedAt?: string;
  approvedAt?: string;
  paidAt?: string;
}

// Tax types
export interface TaxConfig {
  id: string;
  tenantId: string;
  year: number;
  terCategory: 'A' | 'B' | 'C';
  ptkpStatus: 'TK0' | 'TK1' | 'TK2' | 'TK3' | 'K0' | 'K1' | 'K2' | 'K3';
  ptkpAmount: number;
  isActive: boolean;
}

export interface AnnualTaxRecord {
  id: string;
  employeeId: string;
  employee?: Employee;
  year: number;
  grossIncome: number;
  nonTaxableIncome: number;
  taxableIncome: number;
  taxPayable: number;
  taxPaid: number;
  taxRefund: number;
  status: 'DRAFT' | 'CALCULATED' | 'FILED' | 'PAID';
  sptNumber?: string;
  filedAt?: string;
}

// THR types
export interface ThrRun {
  id: string;
  tenantId: string;
  year: number;
  status: 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'PAID' | 'CANCELLED';
  totalAmount: number;
  totalEmployees: number;
  thrRecords: ThrRecord[];
}

export interface ThrRecord {
  id: string;
  thrRunId: string;
  employeeId: string;
  employee?: Employee;
  serviceMonths: number;
  baseSalary: number;
  thrAmount: number;
  isProportional: boolean;
  status: 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'PAID';
}

// Auth types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
  tenantId?: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
  permissions: string[];
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
  details?: Record<string, string[]>;
}

// Notification types
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'LEAVE_REQUEST' | 'LEAVE_APPROVED' | 'LEAVE_REJECTED' | 'OVERTIME_REQUEST' | 'OVERTIME_APPROVED' | 'OVERTIME_REJECTED' | 'PAYSLIP_READY' | 'ATTENDANCE_REMINDER' | 'ANNOUNCEMENT' | 'SYSTEM';
  isRead: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

// Document types
export interface Document {
  id: string;
  tenantId: string;
  categoryId: string;
  category?: DocumentCategory;
  title: string;
  description?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileUrl: string;
  version: number;
  isPublic: boolean;
  createdById: string;
  createdBy?: Employee;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentCategory {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description?: string;
  parentId?: string;
  parent?: DocumentCategory;
  children?: DocumentCategory[];
}

// Announcement types
export interface Announcement {
  id: string;
  tenantId: string;
  title: string;
  content: string;
  type: 'INFO' | 'WARNING' | 'URGENT' | 'EVENT' | 'POLICY';
  targetAudience: 'ALL' | 'DEPARTMENT' | 'ORGANIZATION' | 'EMPLOYEE' | 'ROLE';
  targetIds?: string[];
  attachment?: string;
  publishAt: string;
  expireAt?: string;
  isPinned: boolean;
  authorId: string;
  author?: Employee;
  createdAt: string;
  updatedAt: string;
}

// Face recognition types
export interface FaceEmbedding {
  embedding: number[];
  quality: number;
  landmarks: FaceLandmark[];
}

export interface FaceLandmark {
  x: number;
  y: number;
  type: string;
}

export interface BiometricEnrollment {
  employeeId: string;
  faceEmbedding: number[];
  qualityScore: number;
  enrolledAt: string;
  deviceInfo?: string;
}

// Sync types for offline support
export interface SyncQueueItem {
  id: string;
  type: 'ATTENDANCE_CHECKIN' | 'ATTENDANCE_CHECKOUT' | 'LEAVE_REQUEST' | 'OVERTIME_REQUEST' | 'EXPENSE_CLAIM' | 'PROFILE_UPDATE';
  payload: any;
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  retryCount: number;
  createdAt: string;
  syncedAt?: string;
  error?: string;
}