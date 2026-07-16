const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function main() {
  console.log('Seeding Flexy HRMS...\n');

  const tenantId = 'default';
  const adminPassword = await bcrypt.hash('admin123', 12);

  // ── 1. TENANT ──
  console.log('1/9  Tenant...');
  await prisma.tenant.upsert({
    where: { id: tenantId },
    update: {},
    create: {
      id: tenantId,
      name: 'PT Flexy Indonesia',
      domain: 'flexy.local',
      package: 'ENTERPRISE',
      status: 'ACTIVE',
      settings: { timezone: 'Asia/Jakarta', currency: 'IDR', dateFormat: 'DD/MM/YYYY' },
    },
  });

  // ── 1.b. TENANT ENTITY ──
  // Align TenantEntity.id with the Tenant id so that Employee.tenantId (FK → TenantEntity)
  // matches the tenant id carried by users/auth. For single-entity tenants this keeps
  // User and Employee in the same tenant scope.
  const entity = await prisma.tenantEntity.upsert({
    where: { tenantId_code: { tenantId, code: 'HQ' } },
    update: {},
    create: { id: tenantId, tenantId, name: 'Head Office', code: 'HQ', timezone: 'Asia/Jakarta' },
  });
  const entityId = entity.id;

  // ── 2. ROLES & PERMISSIONS ──
  console.log('2/9  Roles & Permissions...');
  // Permission strings MUST match the @Permissions(...) decorators used in controllers,
  // because PermissionGuard reconstructs `${module}:${action}` and compares it against the
  // permission strings embedded in the JWT. We split on the LAST colon so strings like
  // 'admin:audit:read' become module='admin:audit', action='read'.
  const permissionStrings = [
    'admin:audit:export', 'admin:audit:read',
    'admin:entity:create', 'admin:entity:read',
    'admin:feature-flag:read', 'admin:feature-flag:create', 'admin:feature-flag:update',
    'admin:integration:read', 'admin:integration:create', 'admin:integration:update', 'admin:integration:delete',
    'admin:role:assign', 'admin:role:create', 'admin:role:delete', 'admin:role:read', 'admin:role:update',
    'admin:tenant:create', 'admin:tenant:read', 'admin:tenant:update',
    'admin:user:assign', 'admin:user:create', 'admin:user:read', 'admin:user:update', 'admin:user:reset-password',
    'admin:workflow:create', 'admin:workflow:read', 'admin:workflow:update',
    'attendance:create', 'attendance:period:close', 'attendance:correction:approve',
    'employee:movement:create', 'employee:movement:read', 'employee:movement:approve',
    'employee:medical:read', 'employee:medical:update',
    'expense-claims:approve', 'expense-claims:pay',
    'holidays:create',
    'learning:create', 'learning:update',
    'leave-requests:approve', 'leave-types:create', 'leave-types:update', 'leave-balances:update',
    'loans:approve',
    'overtime:approve',
    'rosters:create', 'rosters:update',
    'shifts:create', 'shifts:delete', 'shifts:update',
  ];

  for (const perm of permissionStrings) {
    const idx = perm.lastIndexOf(':');
    const m = perm.slice(0, idx);
    const a = perm.slice(idx + 1);
    await prisma.permission.upsert({
      where: { module_action: { module: m, action: a } },
      update: {},
      create: { module: m, action: a, description: perm },
    });
  }

  const roles = [
    { id: 'role-superadmin', name: 'Super Admin', description: 'Full system access', isSystem: true },
    { id: 'role-hr-manager',  name: 'HR Manager',  description: 'HR module management', isSystem: false },
    { id: 'role-hr-staff',    name: 'HR Staff',    description: 'HR operational tasks', isSystem: false },
    { id: 'role-employee',    name: 'Employee',    description: 'Self-service access only', isSystem: false },
    { id: 'role-finance',     name: 'Finance',     description: 'Payroll & expense access', isSystem: false },
  ];

  for (const r of roles) {
    await prisma.role.upsert({
      where: { id: r.id },
      update: {},
      create: { ...r, tenantId },
    });
  }

  const allPerms = await prisma.permission.findMany();
  for (const role of roles) {
    for (const p of allPerms) {
      const skip = role.id === 'role-employee' && !['ess', 'employee'].includes(p.module);
      if (skip) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } },
        update: {},
        create: { roleId: role.id, permissionId: p.id },
      });
    }
  }

  // ── 3. ADMIN USER ──
  console.log('3/9  Admin User...');
  await prisma.user.upsert({
    where: { id: 'user-1' },
    update: { passwordHash: adminPassword },
    create: {
      id: 'user-1',
      tenantId,
      email: 'admin@flexy.local',
      passwordHash: adminPassword,
      fullName: 'Administrator',
      status: 'ACTIVE',
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: 'user-1', roleId: 'role-superadmin' } },
    update: {},
    create: { userId: 'user-1', roleId: 'role-superadmin' },
  });

  // ── 4. ORGANIZATION / DEPARTMENTS / GRADES / POSITIONS ──
  console.log('4/9  Organization Structure...');
  const org = await prisma.organization.upsert({
    where: { code: 'FLEXY-HQ' },
    update: {},
    create: { tenantId, name: 'PT Flexy Indonesia HQ', code: 'FLEXY-HQ', level: 0, status: 'ACTIVE' },
  });

  const deptData = [
    { code: 'DEPT-HR',     name: 'Human Resources',  level: 1 },
    { code: 'DEPT-FIN',    name: 'Finance',          level: 1 },
    { code: 'DEPT-IT',     name: 'Information Technology', level: 1 },
    { code: 'DEPT-MKT',    name: 'Marketing',        level: 1 },
    { code: 'DEPT-OPS',    name: 'Operations',       level: 1 },
    { code: 'DEPT-SALES',  name: 'Sales',            level: 1 },
  ];

  const deptIds = {};
  for (const d of deptData) {
    const dept = await prisma.department.upsert({
      where: { tenantId_code: { tenantId, code: d.code } },
      update: {},
      create: { tenantId, organizationId: org.id, ...d },
    });
    deptIds[d.code] = dept.id;
  }

  const gradeData = [
    { code: 'GRD-1', name: 'Staff',       level: 1 },
    { code: 'GRD-2', name: 'Senior Staff', level: 2 },
    { code: 'GRD-3', name: 'Supervisor',  level: 3 },
    { code: 'GRD-4', name: 'Manager',     level: 4 },
    { code: 'GRD-5', name: 'Director',    level: 5 },
  ];

  for (const g of gradeData) {
    await prisma.grade.upsert({
      where: { tenantId_code: { tenantId, code: g.code } },
      update: {},
      create: { tenantId, ...g },
    });
  }

  const positionData = [
    { code: 'POS-HR-MGR',  name: 'HR Manager',        dept: 'DEPT-HR',  grade: 'GRD-4' },
    { code: 'POS-HR-STF',  name: 'HR Staff',          dept: 'DEPT-HR',  grade: 'GRD-1' },
    { code: 'POS-FIN-MGR', name: 'Finance Manager',   dept: 'DEPT-FIN', grade: 'GRD-4' },
    { code: 'POS-IT-DEV',  name: 'Software Developer', dept: 'DEPT-IT',  grade: 'GRD-2' },
    { code: 'POS-MKT-SPV', name: 'Marketing Supervisor', dept: 'DEPT-MKT', grade: 'GRD-3' },
    { code: 'POS-OPS-STF', name: 'Operations Staff',  dept: 'DEPT-OPS', grade: 'GRD-1' },
  ];

  for (const p of positionData) {
    await prisma.position.upsert({
      where: { tenantId_code: { tenantId, code: p.code } },
      update: {},
      create: { tenantId, departmentId: deptIds[p.dept], name: p.name, code: p.code },
    });
  }

  // ── 5. EMPLOYEES ──
  console.log('5/9  Employees...');

  // Default HQ work location for geofence (BR-01)
  const workLocation = await prisma.workLocation.upsert({
    where: { id: 'wl-hq' },
    update: {},
    create: {
      id: 'wl-hq',
      tenantId: entityId,
      name: 'Flexy HQ (Jakarta)',
      latitude: -6.2088,
      longitude: 106.8456,
      radiusMeters: 200,
      isFlexible: false,
    },
  });
  const workLocationId = workLocation.id;

  const empData = [
    { empId: 'EMP-001', fullName: 'Budi Santoso',    email: 'budi@flexy.local',   dept: 'DEPT-HR',  pos: 'POS-HR-MGR',  grade: 'GRD-4', type: 'PERMANENT' },
    { empId: 'EMP-002', fullName: 'Siti Rahmawati',  email: 'siti@flexy.local',   dept: 'DEPT-HR',  pos: 'POS-HR-STF',  grade: 'GRD-1', type: 'PERMANENT' },
    { empId: 'EMP-003', fullName: 'Ahmad Hidayat',   email: 'ahmad@flexy.local',  dept: 'DEPT-FIN', pos: 'POS-FIN-MGR', grade: 'GRD-4', type: 'PERMANENT' },
    { empId: 'EMP-004', fullName: 'Dewi Lestari',    email: 'dewi@flexy.local',  dept: 'DEPT-IT',  pos: 'POS-IT-DEV',  grade: 'GRD-2', type: 'CONTRACT' },
    { empId: 'EMP-005', fullName: 'Rudi Hermawan',   email: 'rudi@flexy.local',  dept: 'DEPT-MKT', pos: 'POS-MKT-SPV', grade: 'GRD-3', type: 'PERMANENT' },
  ];

  for (const e of empData) {
    const emp = await prisma.employee.upsert({
      where: { tenantId_employeeId: { tenantId: entityId, employeeId: e.empId } },
      update: {},
      create: {
        tenantId: entityId,
        employeeId: e.empId,
        fullName: e.fullName,
        email: e.email,
        status: 'ACTIVE',
        startDate: new Date('2024-01-01'),
        workLocationId,
      },
    });

    const pos = await prisma.position.findUnique({ where: { tenantId_code: { tenantId, code: e.pos } } });
    const grade = await prisma.grade.findUnique({ where: { tenantId_code: { tenantId, code: e.grade } } });

    const salaryMap = { 'GRD-4': 15000000, 'GRD-1': 5000000, 'GRD-3': 10000000, 'GRD-2': 7000000 };
    const existing = await prisma.employment.findFirst({ where: { employeeId: emp.id, isActive: true } });
    if (!existing) {
      await prisma.employment.create({
        data: {
          employeeId: emp.id,
          positionId: pos.id,
          departmentId: deptIds[e.dept],
          gradeId: grade.id,
          type: e.type,
          startDate: new Date('2024-01-01'),
          isActive: true,
          salary: salaryMap[e.grade] || 5000000,
          salaryCurrency: 'IDR',
        },
      });
    }

    // Link employee to user
    const user = await prisma.user.findFirst({ where: { email: e.email } });
    if (user && !user.employeeId) {
      await prisma.user.update({ where: { id: user.id }, data: { employeeId: emp.id } });
    }

    // Create user for each employee
    const empPassword = await bcrypt.hash('password123', 12);
    await prisma.user.upsert({
      where: { tenantId_email: { tenantId, email: e.email } },
      update: { employeeId: emp.id },
      create: {
        tenantId,
        email: e.email,
        passwordHash: empPassword,
        fullName: e.fullName,
        employeeId: emp.id,
        status: 'ACTIVE',
      },
    });
  }

  // Link admin to an employee record so admin can submit expense claims etc.
  const adminEmp = await prisma.employee.upsert({
    where: { tenantId_employeeId: { tenantId: entityId, employeeId: 'EMP-ADMIN' } },
    update: {},
    create: {
      tenantId: entityId,
      employeeId: 'EMP-ADMIN',
      fullName: 'Administrator',
      email: 'admin@flexy.local',
      status: 'ACTIVE',
      startDate: new Date('2024-01-01'),
      workLocationId,
    },
  });
  const adminUser = await prisma.user.findUnique({ where: { id: 'user-1' } });
  if (adminUser && !adminUser.employeeId) {
    await prisma.user.update({ where: { id: 'user-1' }, data: { employeeId: adminEmp.id } });
  }

  // ── 6. SHIFTS ──
  console.log('6/9  Shifts...');
  const shifts = [
    { code: 'SHIFT-MORNING', name: 'Morning Shift',  start: '08:00', end: '17:00', breakStart: '12:00', breakEnd: '13:00' },
    { code: 'SHIFT-NIGHT',   name: 'Night Shift',     start: '20:00', end: '05:00', breakStart: '00:00', breakEnd: '01:00', night: true },
    { code: 'SHIFT-FLEX',    name: 'Flexible',        start: '07:00', end: '16:00', breakStart: '12:00', breakEnd: '13:00' },
  ];

  for (const s of shifts) {
    const existing = await prisma.shift.findFirst({ where: { tenantId, code: s.code } });
    if (!existing) {
      await prisma.shift.create({
        data: {
          tenantId,
          name: s.name,
          code: s.code,
          startTime: s.start,
          endTime: s.end,
          breakStart: s.breakStart,
          breakEnd: s.breakEnd,
          isNightShift: s.night || false,
          gracePeriodMinutes: 15,
          lateThresholdMinutes: 30,
        },
      });
    }
  }

  // ── 7. LEAVE TYPES ──
  console.log('7/9  Leave Types...');
  const leaveTypes = [
    { code: 'LV-ANNUAL',  name: 'Annual Leave',  isPaid: true,  maxConsecutive: 14, carryForward: 5 },
    { code: 'LV-SICK',    name: 'Sick Leave',     isPaid: true,  maxConsecutive: 30, carryForward: 0 },
    { code: 'LV-MATERNITY', name: 'Maternity Leave', isPaid: true, maxConsecutive: 90, carryForward: 0, gender: 'FEMALE' },
    { code: 'LV-PERMIT',  name: 'Permission',     isPaid: false, maxConsecutive: 3,  carryForward: 0 },
    { code: 'LV-MARRIAGE', name: 'Marriage Leave', isPaid: true, maxConsecutive: 3,  carryForward: 0 },
  ];

  for (const l of leaveTypes) {
    const existing = await prisma.leaveType.findFirst({ where: { tenantId, code: l.code } });
    if (!existing) {
      await prisma.leaveType.create({
        data: {
          tenantId,
          name: l.name,
          code: l.code,
          isPaid: l.isPaid,
          maxConsecutiveDays: l.maxConsecutive,
          carryForwardLimit: l.carryForward,
          genderRestriction: l.gender || null,
          isActive: true,
        },
      });
    }
  }

  // ── 8. PAYROLL COMPONENTS & BPJS / TAX ──
  console.log('8/9  Payroll Components & BPJS/Tax...');
  const components = [
    { code: 'BASIC',     name: 'Basic Salary',         type: 'ALLOWANCE', cat: 'FIXED',   taxable: true,  prorated: true },
    { code: 'TUNJ-MAKAN', name: 'Meal Allowance',       type: 'ALLOWANCE', cat: 'FIXED',   taxable: false, prorated: true },
    { code: 'TUNJ-TRANS', name: 'Transport Allowance',  type: 'ALLOWANCE', cat: 'FIXED',   taxable: false, prorated: true },
    { code: 'TUNJ-JABATAN', name: 'Position Allowance', type: 'ALLOWANCE', cat: 'FIXED',   taxable: true,  prorated: true },
    { code: 'LEMBUR',    name: 'Overtime Pay',          type: 'OVERTIME',  cat: 'VARIABLE', taxable: true,  prorated: false },
    { code: 'BPJS-KES',  name: 'BPJS Kesehatan',       type: 'BPJS_KES',  cat: 'FIXED',   taxable: false, prorated: true },
    { code: 'BPJS-KET',  name: 'BPJS Ketenagakerjaan',  type: 'BPJS_KET',  cat: 'FIXED',   taxable: false, prorated: true },
    { code: 'PPH21',     name: 'PPh 21 Income Tax',     type: 'PPH21',     cat: 'FIXED',   taxable: false, prorated: true },
    { code: 'PINJAMAN',  name: 'Loan Deduction',        type: 'LOAN',      cat: 'FIXED',   taxable: false, prorated: false },
    { code: 'THR',       name: 'THR (Holiday Bonus)',   type: 'THR',       cat: 'ONE_TIME', taxable: true, prorated: false },
    { code: 'BONUS',     name: 'Performance Bonus',     type: 'BONUS',     cat: 'ONE_TIME', taxable: true, prorated: false },
  ];

  for (const c of components) {
    const existing = await prisma.payrollComponent.findFirst({ where: { tenantId, code: c.code } });
    if (!existing) {
      await prisma.payrollComponent.create({
        data: {
          tenantId,
          name: c.name,
          code: c.code,
          type: c.type,
          category: c.cat,
          isTaxable: c.taxable,
          isProrated: c.prorated,
          isActive: true,
        },
      });
    }
  }

  await prisma.bpjsConfig.upsert({
    where: { tenantId_type_effectiveDate: { tenantId, type: 'KES', effectiveDate: new Date('2024-01-01') } },
    update: {},
    create: {
      tenantId, type: 'KES',
      jkmRate: 0.003, jkkRate: 0.0024, jhtEmployerRate: 0.04, jhtEmployeeRate: 0.02,
      pensionEmployerRate: 0.02, pensionEmployeeRate: 0.01,
      maxWageLimit: 12000000, effectiveDate: new Date('2024-01-01'),
    },
  });

  await prisma.bpjsConfig.upsert({
    where: { tenantId_type_effectiveDate: { tenantId, type: 'KET', effectiveDate: new Date('2024-01-01') } },
    update: {},
    create: {
      tenantId, type: 'KET',
      jkmRate: 0.003, jkkRate: 0.0054, jhtEmployerRate: 0.037, jhtEmployeeRate: 0.02,
      pensionEmployerRate: 0.02, pensionEmployeeRate: 0.01,
      maxWageLimit: 15000000, effectiveDate: new Date('2024-01-01'),
    },
  });

  await prisma.taxConfig.upsert({
    where: { tenantId_taxMethod_effectiveDate: { tenantId, taxMethod: 'TER', effectiveDate: new Date('2024-01-01') } },
    update: {},
    create: {
      tenantId, taxMethod: 'TER', ptkp: 54000000, terCategory: 'A', effectiveDate: new Date('2024-01-01'),
    },
  });

  // ── 9. LEAVE BALANCES ──
  console.log('9/9  Leave Balances...');
  const employees = await prisma.employee.findMany({ where: { tenantId } });
  const leaveTypeList = await prisma.leaveType.findMany();
  for (const emp of employees) {
    for (const lt of leaveTypeList) {
      const entitled = lt.code === 'LV-ANNUAL' ? 12 : lt.code === 'LV-SICK' ? 14 : lt.code === 'LV-PERMIT' ? 5 : 0;
      if (entitled > 0) {
        await prisma.leaveBalance.upsert({
          where: { employeeId_leaveTypeId_year: { employeeId: emp.id, leaveTypeId: lt.id, year: 2026 } },
          update: {},
          create: {
            tenantId, employeeId: emp.id, leaveTypeId: lt.id, year: 2026,
            totalEntitled: entitled, totalUsed: 0, totalPending: 0, carryForward: 0,
          },
        });
      }
    }
  }

  // Also create leave balances for the admin employee (tenantId = entityId, not 'default')
  const adminEmployee = await prisma.employee.findFirst({ where: { email: 'admin@flexy.local' } });
  if (adminEmployee) {
    for (const lt of leaveTypeList) {
      const entitled = lt.code === 'LV-ANNUAL' ? 12 : lt.code === 'LV-SICK' ? 14 : lt.code === 'LV-PERMIT' ? 5 : 0;
      if (entitled > 0) {
        await prisma.leaveBalance.upsert({
          where: { employeeId_leaveTypeId_year: { employeeId: adminEmployee.id, leaveTypeId: lt.id, year: 2026 } },
          update: {},
          create: {
            tenantId: adminEmployee.tenantId, employeeId: adminEmployee.id, leaveTypeId: lt.id, year: 2026,
            totalEntitled: entitled, totalUsed: 0, totalPending: 0, carryForward: 0,
          },
        });
      }
    }
  }

  // ── 10. FEATURE FLAGS ──
  console.log('10/10  Feature Flags...');
  await prisma.featureFlag.upsert({
    where: { tenantId_feature: { tenantId, feature: 'OVERTIME_RETROACTIVE' } },
    update: {},
    create: {
      tenantId,
      module: 'attendance',
      feature: 'OVERTIME_RETROACTIVE',
      enabled: false, // FR-20: retroactive overtime OFF by default (BR-10)
    },
  });

  console.log('\n✓ Seed completed successfully!');
  console.log('  Admin login: admin@flexy.local / admin123');
  console.log('  Employee login: budi@flexy.local / password123');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
