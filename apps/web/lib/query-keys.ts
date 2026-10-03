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
  engagementSurveys: {
    all: ['engagement-surveys'] as const,
    list: (params?: Record<string, string>) => ['engagement-surveys', 'list', params] as const,
    detail: (id: string) => ['engagement-surveys', 'detail', id] as const,
    results: (id: string) => ['engagement-surveys', 'results', id] as const,
    actionItems: (surveyId: string) => ['engagement-surveys', 'action-items', surveyId] as const,
    enpsTrend: ['engagement-surveys', 'enps-trend'] as const,
  },
  manpowerPlans: {
    all: ['manpower-plans'] as const,
    list: (params?: Record<string, string>) => ['manpower-plans', 'list', params] as const,
    detail: (id: string) => ['manpower-plans', 'detail', id] as const,
    planVsActual: (params?: Record<string, string>) => ['manpower-plans', 'plan-vs-actual', params] as const,
    compilation: (period?: string) => ['manpower-plans', 'compilation', period] as const,
  },
  lms: {
    all: ['lms'] as const,
    list: (params?: Record<string, string | number>) => ['lms', 'list', params] as const,
    detail: (id: string) => ['lms', 'detail', id] as const,
    trainees: (courseId: string) => ['lms', 'trainees', courseId] as const,
  },
  feedback360: {
    all: ['feedback360'] as const,
    list: (params?: Record<string, string>) => ['feedback360', 'list', params] as const,
    detail: (id: string) => ['feedback360', 'detail', id] as const,
    results: (id: string) => ['feedback360', 'results', id] as const,
    employeeSummary: (employeeId: string) => ['feedback360', 'employee-summary', employeeId] as const,
  },
  idp: {
    all: ['idp'] as const,
    list: (params?: Record<string, string | number>) => ['idp', 'list', params] as const,
    detail: (id: string) => ['idp', 'detail', id] as const,
    employeeSummary: (employeeId: string) => ['idp', 'employee-summary', employeeId] as const,
    trainingRecommendations: (employeeId: string) => ['idp', 'training-recommendations', employeeId] as const,
  },
  wage: {
    all: ['wage'] as const,
    list: (params?: Record<string, string | number>) => ['wage', 'list', params] as const,
    detail: (id: string) => ['wage', 'detail', id] as const,
    calculation: (employeeId: string, periodYear?: number) => ['wage', 'calculation', employeeId, periodYear] as const,
    stats: (year?: number) => ['wage', 'stats', year] as const,
  },
  admin: {
    roles: ['admin', 'roles'] as const,
    tenants: ['admin', 'tenants'] as const,
    auditLogs: ['admin', 'audit-logs'] as const,
    workflows: ['admin', 'workflows'] as const,
    featureFlags: ['admin', 'feature-flags'] as const,
    integrations: ['admin', 'integrations'] as const,
  },
  documents: {
    all: ['documents'] as const,
    categories: ['documents', 'categories'] as const,
    detail: (id: string) => ['documents', 'detail', id] as const,
    activities: (id: string) => ['documents', 'activities', id] as const,
  },
  announcements: {
    all: ['announcements'] as const,
    stats: ['announcements', 'stats'] as const,
    detail: (id: string) => ['announcements', 'detail', id] as const,
  },
  succession: {
    summary: ['succession', 'summary'] as const,
    pools: ['succession', 'pools'] as const,
    poolDetail: (id: string) => ['succession', 'pools', id] as const,
    plans: ['succession', 'plans'] as const,
    planDetail: (id: string) => ['succession', 'plans', id] as const,
    nineBox: (poolId?: string) => ['succession', 'nine-box', poolId ?? 'all'] as const,
  },
};
