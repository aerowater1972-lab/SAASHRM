export const queryKeys = {
  employees: {
    all: ['employees'] as const,
    list: (params?: Record<string, string>) => ['employees', 'list', params] as const,
    detail: (id: string) => ['employees', 'detail', id] as const,
  },
  departments: {
    all: ['departments'] as const,
  },
  positions: {
    all: ['positions'] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    unread: ['notifications', 'unread'] as const,
  },
  leaveRequests: {
    all: ['leave-requests'] as const,
  },
  attendance: {
    all: ['attendance'] as const,
  },
  payroll: {
    components: ['payroll', 'components'] as const,
    runs: ['payroll', 'runs'] as const,
    payslips: ['payroll', 'payslips'] as const,
  },
  assets: {
    all: ['assets'] as const,
  },
  expenses: {
    all: ['expenses'] as const,
  },
  loans: {
    all: ['loans'] as const,
  },
  benefits: {
    all: ['benefits'] as const,
  },
  candidates: {
    all: ['candidates'] as const,
  },
  jobs: {
    all: ['jobs'] as const,
  },
  applications: {
    all: ['applications'] as const,
  },
  performance: {
    cycles: ['performance', 'cycles'] as const,
    reviews: ['performance', 'reviews'] as const,
    goals: ['performance', 'goals'] as const,
  },
  resignations: {
    all: ['resignations'] as const,
  },
  movements: {
    all: ['movements'] as const,
  },
  calibrations: {
    all: ['calibrations'] as const,
  },
  requisitions: {
    all: ['requisitions'] as const,
  },
  scorecards: {
    all: ['scorecards'] as const,
  },
  training: {
    all: ['training'] as const,
  },
  profile: {
    all: ['profile'] as const,
  },
  certifications: {
    all: ['certifications'] as const,
  },
  admin: {
    roles: ['admin', 'roles'] as const,
    tenants: ['admin', 'tenants'] as const,
    auditLogs: ['admin', 'audit-logs'] as const,
    workflows: ['admin', 'workflows'] as const,
    featureFlags: ['admin', 'feature-flags'] as const,
    integrations: ['admin', 'integrations'] as const,
  },
};
