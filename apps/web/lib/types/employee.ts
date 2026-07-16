export interface Employee {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone?: string;
  alternativePhone?: string;
  birthDate?: string;
  birthPlace?: string;
  gender?: 'MALE' | 'FEMALE';
  religion?: string;
  maritalStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
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
  startDate?: string;
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING_ACTIVATION';
  tenantId: string;
  createdAt: string;
  updatedAt: string;
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
  type: string;
  startDate: string;
  endDate?: string;
  salary?: number;
  salaryCurrency?: string;
  isActive: boolean;
  position?: Position;
  department?: Department;
  grade?: Grade;
}

export interface Department {
  id: string;
  organizationId: string;
  entityId?: string;
  name: string;
  code: string;
  headEmployeeId?: string;
  parentId?: string;
  level?: number;
  effectiveDate?: string;
  children?: Department[];
}

export interface Position {
  id: string;
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
  name: string;
  code: string;
  level: number;
  description?: string;
}

export interface OrganizationEntity {
  id: string;
  name: string;
  code: string;
  children?: OrganizationEntity[];
}

export interface OrgChartNode {
  id: string;
  label: string;
  type: 'department' | 'position' | 'employee';
  children?: OrgChartNode[];
  employeeId?: string;
  headName?: string;
  vacant?: boolean;
  positionTitle?: string;
  email?: string;
}

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  type: string;
  fileName: string;
  fileUrl: string;
  notes?: string;
  uploadedAt: string;
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
