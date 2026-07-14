import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Flexy HRMS database...');

  // 1. Create Default Tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      name: 'Default Company',
      domain: 'default.flexy-hrms.local',
      package: 'STANDARD',
      status: 'ACTIVE',
      settings: {
        timezone: 'Asia/Jakarta',
        currency: 'IDR',
        dateFormat: 'DD/MM/YYYY',
        language: 'id',
      },
    },
  });
  console.log(`Tenant created: ${tenant.name}`);

  // 2. Create Default Entity
  const entity = await prisma.tenantEntity.upsert({
    where: { id: 'entity-1' },
    update: {},
    create: {
      id: 'entity-1',
      tenantId: 'default',
      name: 'Head Office',
      code: 'HQ',
      address: 'Jl. Sudirman No. 1',
      city: 'Jakarta',
      province: 'DKI Jakarta',
      timezone: 'Asia/Jakarta',
    },
  });
  console.log(`Entity created: ${entity.name}`);

  // 3. Create Organizations
  const orgs = [
    { id: 'org-board', name: 'Board of Directors', code: 'BOD', level: 0 },
    { id: 'org-hr', name: 'Human Resources Division', code: 'HRD', level: 1, parentId: 'org-board' },
    { id: 'org-finance', name: 'Finance Division', code: 'FIN', level: 1, parentId: 'org-board' },
    { id: 'org-it', name: 'IT Division', code: 'IT', level: 1, parentId: 'org-board' },
    { id: 'org-operations', name: 'Operations Division', code: 'OPS', level: 1, parentId: 'org-board' },
  ];

  for (const org of orgs) {
    await prisma.organization.upsert({
      where: { id: org.id },
      update: {},
      create: { ...org, tenantId: 'default' },
    });
  }
  console.log(`${orgs.length} organizations created`);

  // 4. Create Departments
  const depts = [
    { id: 'dept-hr', name: 'HR Department', code: 'HR', organizationId: 'org-hr', level: 0 },
    { id: 'dept-recruitment', name: 'Recruitment', code: 'REC', organizationId: 'org-hr', parentId: 'dept-hr', level: 1 },
    { id: 'dept-payroll', name: 'Payroll', code: 'PYR', organizationId: 'org-hr', parentId: 'dept-hr', level: 1 },
    { id: 'dept-finance', name: 'Finance', code: 'FIN', organizationId: 'org-finance', level: 0 },
    { id: 'dept-accounting', name: 'Accounting', code: 'ACC', organizationId: 'org-finance', level: 0 },
    { id: 'dept-engineering', name: 'Engineering', code: 'ENG', organizationId: 'org-it', level: 0 },
    { id: 'dept-product', name: 'Product', code: 'PROD', organizationId: 'org-it', level: 0 },
  ];

  for (const dept of depts) {
    await prisma.department.upsert({
      where: { id: dept.id },
      update: {},
      create: { ...dept, tenantId: 'default' },
    });
  }
  console.log(`${depts.length} departments created`);

  // 5. Create Grades
  const grades = [
    { id: 'grade-1', name: 'Staff', code: 'STF', level: 1 },
    { id: 'grade-2', name: 'Senior Staff', code: 'SST', level: 2 },
    { id: 'grade-3', name: 'Supervisor', code: 'SPV', level: 3 },
    { id: 'grade-4', name: 'Manager', code: 'MGR', level: 4 },
    { id: 'grade-5', name: 'Senior Manager', code: 'SMG', level: 5 },
    { id: 'grade-6', name: 'Director', code: 'DIR', level: 6 },
  ];

  for (const g of grades) {
    await prisma.grade.upsert({
      where: { id: g.id },
      update: {},
      create: { ...g, tenantId: 'default' },
    });
  }
  console.log(`${grades.length} grades created`);

  // 6. Create Positions
  const positions = [
    { id: 'pos-ceo', name: 'Chief Executive Officer', code: 'CEO', departmentId: 'dept-hr', gradeId: 'grade-6', isHead: true },
    { id: 'pos-hr-manager', name: 'HR Manager', code: 'HRM', departmentId: 'dept-hr', gradeId: 'grade-4', isHead: true },
    { id: 'pos-recruiter', name: 'Recruiter', code: 'REC', departmentId: 'dept-recruitment', gradeId: 'grade-2' },
    { id: 'pos-payroll-spec', name: 'Payroll Specialist', code: 'PYR', departmentId: 'dept-payroll', gradeId: 'grade-2' },
    { id: 'pos-engineer', name: 'Software Engineer', code: 'ENG', departmentId: 'dept-engineering', gradeId: 'grade-2' },
    { id: 'pos-senior-eng', name: 'Senior Software Engineer', code: 'SSE', departmentId: 'dept-engineering', gradeId: 'grade-3' },
    { id: 'pos-fa', name: 'Finance Analyst', code: 'FAN', departmentId: 'dept-finance', gradeId: 'grade-2' },
  ];

  for (const p of positions) {
    await prisma.position.upsert({
      where: { id: p.id },
      update: {},
      create: { ...p, tenantId: 'default' },
    });
  }
  console.log(`${positions.length} positions created`);

  // 7. Create System Permissions
  // These strings MUST match the @Permissions(...) decorators used in controllers,
  // because the PermissionGuard reconstructs `${module}:${action}` and compares it
  // against the permission strings embedded in the JWT.
  const permissionStrings = [
    'admin:audit:export',
    'admin:audit:read',
    'admin:entity:create',
    'admin:entity:read',
    'admin:role:assign',
    'admin:role:create',
    'admin:role:delete',
    'admin:role:read',
    'admin:role:update',
    'admin:tenant:create',
    'admin:tenant:read',
    'admin:tenant:update',
    'admin:workflow:create',
    'admin:workflow:read',
    'admin:workflow:update',
    'analytics:read',
    'assets:create',
    'assets:read',
    'assets:update',
    'assets:delete',
    'assets:assign',
    'benefits:create',
    'benefits:read',
    'benefits:update',
    'benefits:delete',
    'benefits:enroll',
    'attendance:create',
    'expense-claims:create',
    'expense-claims:read',
    'expense-claims:update',
    'expense-claims:approve',
    'expense-claims:pay',
    'holidays:create',
    'learning:create',
    'learning:read',
    'learning:update',
    'leave-requests:approve',
    'leave-types:create',
    'leave-types:update',
    'loans:create',
    'loans:read',
    'loans:approve',
    'overtime:approve',
    'resignations:create',
    'resignations:read',
    'resignations:approve',
    'resignations:offboard',
    'rosters:create',
    'rosters:update',
    'shifts:create',
    'shifts:delete',
    'shifts:update',
    'admin:feature-flag:create',
    'admin:feature-flag:read',
    'admin:feature-flag:update',
    'admin:integration:create',
    'admin:integration:read',
    'admin:integration:update',
    'admin:integration:delete',
    'employee:movement:create',
    'employee:movement:read',
    'employee:movement:approve',
    // Performance Management (Epic 7)
    'performance:cycle:create',
    'performance:cycle:read',
    'performance:cycle:update',
    'performance:cycle:start',
    'performance:cycle:complete',
    'performance:goal:create',
    'performance:goal:read',
    'performance:goal:update',
    'performance:goal:progress',
    'performance:goal:approve',
    'performance:review:create',
    'performance:review:read',
    'performance:review:update',
    'performance:review:submit',
    'performance:calibration:create',
    'performance:calibration:read',
    'performance:calibration:finalize',
    'performance:read',
  ];

  for (const perm of permissionStrings) {
    const lastColon = perm.lastIndexOf(':');
    const module = perm.slice(0, lastColon);
    const action = perm.slice(lastColon + 1);
    await prisma.permission.upsert({
      where: { module_action: { module, action } },
      update: {},
      create: { module, action, description: perm },
    });
  }
  console.log(`${permissionStrings.length} permissions created`);

  // 8. Create Roles
  const roles = [
    { id: 'role-sysadmin', name: 'System Administrator', description: 'Full system access', isSystem: true },
    { id: 'role-hr', name: 'HR Admin', description: 'HR module management', isSystem: true },
    { id: 'role-manager', name: 'Manager', description: 'Team management', isSystem: true },
    { id: 'role-employee', name: 'Employee', description: 'Self service only', isSystem: true },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { id: role.id },
      update: {},
      create: { ...role, tenantId: 'default' },
    });
  }
  console.log(`${roles.length} roles created`);

  // 9. Assign all permissions to System Admin
  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: 'role-sysadmin', permissionId: perm.id } },
      update: {},
      create: { roleId: 'role-sysadmin', permissionId: perm.id, scope: 'ALL' },
    });
  }
  console.log(`${allPermissions.length} permissions assigned to System Admin`);

  // 9b. Assign Performance Management permissions to HR / Manager / Employee per PRD matrix
  const rolePermissions: Record<string, string[]> = {
    'role-hr': [
      'analytics:read',
      'resignations:create',
      'resignations:read',
      'resignations:approve',
      'resignations:offboard',
      'learning:create',
      'learning:read',
      'learning:update',
      'benefits:create',
      'benefits:read',
      'benefits:update',
      'benefits:delete',
      'benefits:enroll',
      'assets:create',
      'assets:read',
      'assets:update',
      'assets:delete',
      'assets:assign',
      'expense-claims:create',
      'expense-claims:read',
      'expense-claims:update',
      'expense-claims:approve',
      'expense-claims:pay',
      'loans:create',
      'loans:read',
      'loans:approve',
      'performance:cycle:create',
      'performance:cycle:read',
      'performance:cycle:update',
      'performance:cycle:start',
      'performance:cycle:complete',
      'performance:goal:create',
      'performance:goal:read',
      'performance:goal:update',
      'performance:goal:progress',
      'performance:goal:approve',
      'performance:review:create',
      'performance:review:read',
      'performance:review:update',
      'performance:review:submit',
      'performance:calibration:create',
      'performance:calibration:read',
      'performance:calibration:finalize',
      'performance:read',
    ],
    'role-manager': [
      'analytics:read',
      'resignations:read',
      'resignations:approve',
      'learning:read',
      'assets:read',
      'expense-claims:read',
      'expense-claims:approve',
      'loans:read',
      'loans:approve',
      'performance:goal:read',
      'performance:review:read',
      'performance:review:update',
      'performance:review:submit',
      'performance:calibration:read',
      'performance:calibration:finalize',
      'performance:read',
    ],
    'role-employee': [
      'analytics:read',
      'resignations:create',
      'learning:read',
      'benefits:read',
      'benefits:enroll',
      'assets:read',
      'expense-claims:create',
      'expense-claims:read',
      'loans:create',
      'loans:read',
      'performance:goal:create',
      'performance:goal:read',
      'performance:goal:update',
      'performance:goal:progress',
      'performance:review:create',
      'performance:review:read',
      'performance:review:update',
      'performance:review:submit',
      'performance:read',
    ],
  };

  for (const [roleId, perms] of Object.entries(rolePermissions)) {
    for (const perm of perms) {
      const lastColon = perm.lastIndexOf(':');
      const module = perm.slice(0, lastColon);
      const action = perm.slice(lastColon + 1);
      const permission = await prisma.permission.findUnique({
        where: { module_action: { module, action } },
      });
      if (permission) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId, permissionId: permission.id } },
          update: {},
          create: { roleId, permissionId: permission.id, scope: 'ALL' },
        });
      }
    }
  }
  console.log('Performance permissions assigned to HR / Manager / Employee');

  // 10. Create Admin User
  const adminUser = await prisma.user.upsert({
    where: { id: 'user-admin' },
    update: {},
    create: {
      id: 'user-admin',
      tenantId: 'default',
      email: 'admin@flexy-hrms.com',
      fullName: 'System Administrator',
      status: 'ACTIVE',
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: 'user-admin', roleId: 'role-sysadmin' } },
    update: {},
    create: { userId: 'user-admin', roleId: 'role-sysadmin' },
  });
  console.log(`Admin user created: ${adminUser.email}`);

  // 11. Create Sample Employees
  const employees = [
    { id: 'emp-001', employeeId: 'EMP001', fullName: 'Budi Santoso', email: 'budi@flexy-hrms.com', gender: 'MALE', status: 'ACTIVE' },
    { id: 'emp-002', employeeId: 'EMP002', fullName: 'Siti Rahayu', email: 'siti@flexy-hrms.com', gender: 'FEMALE', status: 'ACTIVE' },
    { id: 'emp-003', employeeId: 'EMP003', fullName: 'Ahmad Hidayat', email: 'ahmad@flexy-hrms.com', gender: 'MALE', status: 'ACTIVE' },
    { id: 'emp-004', employeeId: 'EMP004', fullName: 'Dewi Lestari', email: 'dewi@flexy-hrms.com', gender: 'FEMALE', status: 'ACTIVE' },
    { id: 'emp-005', employeeId: 'EMP005', fullName: 'Rudi Hermawan', email: 'rudi@flexy-hrms.com', gender: 'MALE', status: 'PENDING_ACTIVATION' },
  ];

  for (const emp of employees) {
    await prisma.employee.upsert({
      where: { id: emp.id },
      update: {},
      create: { ...emp, tenantId: 'default' },
    });
  }
  console.log(`${employees.length} employees created`);

  // 12. Create Employment Records
  const employments = [
    { employeeId: 'emp-001', positionId: 'pos-hr-manager', departmentId: 'dept-hr', gradeId: 'grade-4', type: 'PERMANENT', startDate: new Date('2020-01-01'), salary: 15000000 },
    { employeeId: 'emp-002', positionId: 'pos-recruiter', departmentId: 'dept-recruitment', gradeId: 'grade-2', type: 'PERMANENT', startDate: new Date('2021-03-15'), salary: 8000000 },
    { employeeId: 'emp-003', positionId: 'pos-engineer', departmentId: 'dept-engineering', gradeId: 'grade-2', type: 'PERMANENT', startDate: new Date('2022-06-01'), salary: 10000000 },
    { employeeId: 'emp-004', positionId: 'pos-fa', departmentId: 'dept-finance', gradeId: 'grade-2', type: 'CONTRACT', startDate: new Date('2023-01-01'), salary: 9000000 },
    { employeeId: 'emp-005', positionId: 'pos-senior-eng', departmentId: 'dept-engineering', gradeId: 'grade-3', type: 'PROBATION', startDate: new Date('2026-07-01'), salary: 12000000 },
  ];

  for (const emp of employments) {
    const id = `empl-${emp.employeeId}`;
    await prisma.employment.upsert({
      where: { id },
      update: {},
      create: { id, ...emp, tenantId: 'default' },
    });
  }
  console.log(`${employments.length} employment records created`);

  // 13. Create Leave Types
  const leaveTypes = [
    { id: 'leave-annual', name: 'Annual Leave', code: 'AL', isPaid: true, carryForwardLimit: 5, carryForwardExpiry: 'Q1_NEXT_YEAR' },
    { id: 'leave-sick', name: 'Sick Leave', code: 'SL', isPaid: true },
    { id: 'leave-marriage', name: 'Marriage Leave', code: 'ML', isPaid: true, maxConsecutiveDays: 3 },
    { id: 'leave-maternity', name: 'Maternity Leave', code: 'MATL', isPaid: true, maxConsecutiveDays: 90, genderRestriction: 'FEMALE' },
    { id: 'leave-unpaid', name: 'Unpaid Leave', code: 'UL', isPaid: false, allowNegativeBalance: true },
  ];

  for (const lt of leaveTypes) {
    await prisma.leaveType.upsert({
      where: { id: lt.id },
      update: {},
      create: { ...lt, tenantId: 'default' },
    });
  }
  console.log(`${leaveTypes.length} leave types created`);

  // 14. Create Leave Balances for 2026
  for (const emp of employees) {
    if (emp.status === 'ACTIVE') {
      for (const lt of leaveTypes) {
        if (lt.isPaid) {
          const balanceId = `bal-${emp.id}-${lt.id}-2026`;
          await prisma.leaveBalance.upsert({
            where: { id: balanceId },
            update: {},
            create: {
              id: balanceId,
              tenantId: 'default',
              employeeId: emp.id,
              leaveTypeId: lt.id,
              year: 2026,
              totalEntitled: lt.code === 'MATL' ? 90 : 12,
            },
          });
        }
      }
    }
  }
  console.log('Leave balances created');

  // 15. Create Payroll Components
  const components = [
    { id: 'comp-basic', name: 'Basic Salary', code: 'BASIC', type: 'ALLOWANCE', category: 'FIXED', isTaxable: true },
    { id: 'comp-transport', name: 'Transport Allowance', code: 'TRANSPORT', type: 'ALLOWANCE', category: 'FIXED', isTaxable: true, value: 500000 },
    { id: 'comp-meal', name: 'Meal Allowance', code: 'MEAL', type: 'ALLOWANCE', category: 'FIXED', isTaxable: false, value: 300000 },
    { id: 'comp-thr', name: 'THR', code: 'THR', type: 'THR', category: 'VARIABLE', isTaxable: true },
    { id: 'comp-bpjs-kes', name: 'BPJS Kesehatan', code: 'BPJS-KES', type: 'BPJS_KES', category: 'FIXED' },
    { id: 'comp-bpjs-jht', name: 'BPJS JHT', code: 'BPJS-JHT', type: 'BPJS_KET', category: 'FIXED' },
    { id: 'comp-pph21', name: 'PPh 21', code: 'PPH21', type: 'PPH21', category: 'FIXED' },
    { id: 'comp-loan', name: 'Loan Deduction', code: 'LOAN', type: 'LOAN', category: 'VARIABLE' },
  ];

  for (const comp of components) {
    await prisma.payrollComponent.upsert({
      where: { id: comp.id },
      update: {},
      create: { ...comp, tenantId: 'default' },
    });
  }
  console.log(`${components.length} payroll components created`);

  // 16. Create Shifts
  const shifts = [
    { id: 'shift-office', name: 'Office Hours', code: 'OFFICE', startTime: '08:00', endTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
    { id: 'shift-night', name: 'Night Shift', code: 'NIGHT', startTime: '20:00', endTime: '05:00', isNightShift: true },
  ];

  for (const shift of shifts) {
    await prisma.shift.upsert({
      where: { id: shift.id },
      update: {},
      create: { ...shift, tenantId: 'default' },
    });
  }
  console.log(`${shifts.length} shifts created`);

  // 17. Create BPJS Config
  const bpjsKes = await prisma.bpjsConfig.upsert({
    where: { id: 'bpjs-kes-2026' },
    update: {},
    create: {
      id: 'bpjs-kes-2026',
      tenantId: 'default',
      type: 'KES',
      jkmRate: 0.003,
      jkkRate: 0.0024,
      jhtEmployerRate: 0.037,
      jhtEmployeeRate: 0.02,
      pensionEmployerRate: 0.02,
      pensionEmployeeRate: 0.01,
      maxWageLimit: 12000000,
      effectiveDate: new Date('2026-01-01'),
    },
  });
  console.log(`BPJS config created: ${bpjsKes.type}`);

  // 18. Create Tax Config
  const taxConfig = await prisma.taxConfig.upsert({
    where: { id: 'tax-2026' },
    update: {},
    create: {
      id: 'tax-2026',
      tenantId: 'default',
      taxMethod: 'TER',
      ptkp: 54000000,
      effectiveDate: new Date('2026-01-01'),
    },
  });
  console.log(`Tax config created: ${taxConfig.taxMethod}`);

  console.log('\n✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
