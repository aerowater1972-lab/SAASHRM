/**
 * DEMO SEED — PT Nusantara Sejahtera Makmur
 * ---------------------------------------------------------------------------
 * Skrip ini membuat data demo realistis untuk SATU perusahaan fiktif Indonesia
 * (PT Nusantara Sejahtera Makmur) di tenant terpisah `nusantara` agar TIDAK
 * menimpa data seed default (`default` tenant) atau permission catalog.
 *
 * Idempotensi: skrip melakukan `deleteMany` untuk SELURUH baris milik tenant
 * demo (`nusantara` / entity `entity-nusantara`) di awal, lalu meng-insert
 * ulang. Ini memudahkan re-run berulang tanpa duplikasi. Pilihan ini
 * didokumentasikan di README backend (bagian "Demo Data").
 *
 * CATATAN PENTING — Model Shift/Roster:
 * Model `Shift` dan `Roster`/`RosterEntry` SUDAH ada di schema Prisma utama
 * (packages/database/schema.prisma) sebagai preview minimal untuk kebutuhan
 * demo data. Implementasi penuh Epic 2 (Attendance & Leave: clock-in/out,
 * leave requests, overtime) tetap mengikuti proses Epic Kickoff Prompt
 * terpisah — skrip ini HANYA mengisi master shift & roster untuk demo, tidak
 * membuat AttendanceRecord/LeaveRequest.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const TENANT_ID = 'nusantara';
// Employee.tenantId adalah FK ke TenantEntity.id, tapi API memfilter employee
// berdasarkan string tenant id (dari JWT). Agar data demo TERLIHAT via API,
// kita buat entity id == tenant id (satu entity per tenant, id == tenant id).
// Ini menyelaraskan FK dengan filter query API.
const ENTITY_ID = TENANT_ID;

async function main() {
  console.log('=== Seeding demo: PT Nusantara Sejahtera Makmur ===');

  // -------------------------------------------------------------------------
  // 0. Reset data demo tenant (idempotency via deleteMany)
  // Urutan dijaga agar tidak melanggar FK.
  // -------------------------------------------------------------------------
  await prisma.rosterEntry.deleteMany({ where: { roster: { tenantId: TENANT_ID } } });
  await prisma.roster.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.shift.deleteMany({ where: { tenantId: TENANT_ID } });
  // child tables referencing Employee must be cleared before Employee itself
  await prisma.attendanceRecord.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.overtimeRecord.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.overtimeRequest.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.resignationRequest.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.leaveRequest.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.leaveBalance.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.leaveType.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.salaryComponent.deleteMany({ where: { employee: { tenantId: ENTITY_ID } } });
  await prisma.featureFlag.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.performanceReview.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.payslip.deleteMany({ where: { employee: { tenantId: ENTITY_ID } } });
  await prisma.goal.deleteMany({ where: { employee: { tenantId: ENTITY_ID } } });
  await prisma.expenseClaim.deleteMany({ where: { employee: { tenantId: ENTITY_ID } } });
  await prisma.loan.deleteMany({ where: { employee: { tenantId: ENTITY_ID } } });
  await prisma.assetAssignment.deleteMany({ where: { employee: { tenantId: ENTITY_ID } } });
  await prisma.certification.deleteMany({ where: { employee: { tenantId: ENTITY_ID } } });
  await prisma.trainingParticipant.deleteMany({ where: { employee: { tenantId: ENTITY_ID } } });
  await prisma.movementRequest.deleteMany({ where: { employee: { tenantId: ENTITY_ID } } });
  await prisma.payrollAdjustment.deleteMany({ where: { employee: { tenantId: ENTITY_ID } } });
  await prisma.essNotification.deleteMany({ where: { employee: { tenantId: ENTITY_ID } } });
  await prisma.essOnboardingProgress.deleteMany({ where: { employee: { tenantId: ENTITY_ID } } });
  await prisma.essPreference.deleteMany({ where: { employee: { tenantId: ENTITY_ID } } });
  await prisma.essProfileChangeRequest.deleteMany({ where: { employee: { tenantId: ENTITY_ID } } });
  await prisma.onboardingTask.deleteMany({ where: { employee: { tenantId: ENTITY_ID } } });
  await prisma.employeeBenefit.deleteMany({ where: { employee: { tenantId: ENTITY_ID } } });
  await prisma.employeeDocument.deleteMany({ where: { employee: { tenantId: ENTITY_ID } } });
  await prisma.employeeMedical.deleteMany({ where: { employee: { tenantId: ENTITY_ID } } });
  await prisma.employeeContact.deleteMany({ where: { employee: { tenantId: ENTITY_ID } } });
  await prisma.biometricCredential.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.employment.deleteMany({ where: { employee: { tenantId: ENTITY_ID } } });
  await prisma.employee.deleteMany({ where: { tenantId: ENTITY_ID } });
  await prisma.position.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.department.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.organization.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.grade.deleteMany({ where: { tenantId: TENANT_ID } });
  // demo users + role assignments (dibuat di bawah)
  await prisma.userRole.deleteMany({ where: { user: { tenantId: TENANT_ID } } });
  await prisma.user.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.role.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.tenantEntity.deleteMany({ where: { id: ENTITY_ID } });
  await prisma.tenant.deleteMany({ where: { id: TENANT_ID } });
  console.log('→ cleared previous demo tenant data');

  // -------------------------------------------------------------------------
  // 1. Tenant + Entity
  // -------------------------------------------------------------------------
  const tenant = await prisma.tenant.upsert({
    where: { id: TENANT_ID },
    update: {},
    create: {
      id: TENANT_ID,
      name: 'PT Nusantara Sejahtera Makmur',
      domain: 'nusantara-sejahtera.flexyhrms.demo',
      package: 'ENTERPRISE',
      status: 'ACTIVE',
      settings: {
        timezone: 'Asia/Jakarta',
        currency: 'IDR',
        dateFormat: 'DD/MM/YYYY',
        language: 'id',
      },
    },
  });

  await prisma.tenantEntity.upsert({
    where: { id: ENTITY_ID },
    update: {},
    create: {
      id: ENTITY_ID,
      tenantId: TENANT_ID,
      name: 'Head Office & Pabrik Bekasi',
      code: 'NSM',
      address: 'Jl. Jenderal Sudirman Kav. 45 (Jakarta) / Kawasan Industri MM2100 (Bekasi)',
      city: 'Jakarta',
      province: 'DKI Jakarta',
      timezone: 'Asia/Jakarta',
    },
  });
  console.log(`Tenant '${tenant.name}' + entity created`);

  // -------------------------------------------------------------------------
  // 2. Organization tree
  // -------------------------------------------------------------------------
  const orgs = [
    { id: 'nsm-org-nsm', name: 'PT Nusantara Sejahtera Makmur', code: 'NSM-ROOT', level: 0 },
    { id: 'nsm-org-direktorat', name: 'Direktorat Utama', code: 'NSM-DIRUT', level: 1, parentId: 'nsm-org-nsm' },
    { id: 'nsm-org-hc', name: 'Divisi Human Capital', code: 'NSM-HC', level: 1, parentId: 'nsm-org-nsm' },
    { id: 'nsm-org-keu', name: 'Divisi Keuangan', code: 'NSM-FIN', level: 1, parentId: 'nsm-org-nsm' },
    { id: 'nsm-org-it', name: 'Divisi Teknologi Informasi', code: 'NSM-IT', level: 1, parentId: 'nsm-org-nsm' },
    { id: 'nsm-org-kom', name: 'Divisi Komersial', code: 'NSM-KOM', level: 1, parentId: 'nsm-org-nsm' },
    { id: 'nsm-org-ops', name: 'Divisi Operasional (Pabrik Bekasi)', code: 'NSM-OPS', level: 1, parentId: 'nsm-org-nsm' },
  ];
  for (const o of orgs) {
    await prisma.organization.upsert({ where: { id: o.id }, update: {}, create: { ...o, tenantId: TENANT_ID } });
  }
  console.log(`${orgs.length} organizations created`);

  // -------------------------------------------------------------------------
  // 3. Departments
  // -------------------------------------------------------------------------
  const depts = [
    { id: 'nsm-dept-ga', name: 'General Affairs & Legal', code: 'GA', organizationId: 'nsm-org-direktorat', level: 2 },
    { id: 'nsm-dept-hr', name: 'Human Resources', code: 'HR', organizationId: 'nsm-org-hc', level: 2 },
    { id: 'nsm-dept-fin', name: 'Finance & Accounting', code: 'FINACC', organizationId: 'nsm-org-keu', level: 2 },
    { id: 'nsm-dept-it', name: 'Information Technology', code: 'ITD', organizationId: 'nsm-org-it', level: 2 },
    { id: 'nsm-dept-sales', name: 'Sales & Marketing', code: 'SME', organizationId: 'nsm-org-kom', level: 2 },
    { id: 'nsm-dept-cs', name: 'Customer Service', code: 'CS', organizationId: 'nsm-org-kom', level: 2 },
    { id: 'nsm-dept-prod', name: 'Produksi', code: 'PRD', organizationId: 'nsm-org-ops', level: 2 },
    { id: 'nsm-dept-qc', name: 'Quality Control', code: 'QC', organizationId: 'nsm-org-ops', level: 2 },
    { id: 'nsm-dept-wh', name: 'Gudang & Logistik', code: 'WHL', organizationId: 'nsm-org-ops', level: 2 },
    { id: 'nsm-dept-sec', name: 'Keamanan (Satpam)', code: 'SEC', organizationId: 'nsm-org-ops', level: 2 },
  ];
  for (const d of depts) {
    await prisma.department.upsert({ where: { id: d.id }, update: {}, create: { ...d, tenantId: TENANT_ID } });
  }
  console.log(`${depts.length} departments created`);

  // -------------------------------------------------------------------------
  // 4. Grades (8 level sesuai struktur Indonesia)
  // -------------------------------------------------------------------------
  const grades = [
    { id: 'nsm-grade-staff', name: 'Staff', code: 'STF', level: 1 },
    { id: 'nsm-grade-senior', name: 'Senior Staff', code: 'SST', level: 2 },
    { id: 'nsm-grade-spv', name: 'Supervisor', code: 'SPV', level: 3 },
    { id: 'nsm-grade-asstmgr', name: 'Assistant Manager', code: 'AMG', level: 4 },
    { id: 'nsm-grade-mgr', name: 'Manager', code: 'MGR', level: 5 },
    { id: 'nsm-grade-srnmgr', name: 'Senior Manager', code: 'SMG', level: 6 },
    { id: 'nsm-grade-gm', name: 'General Manager', code: 'GM', level: 7 },
    { id: 'nsm-grade-dir', name: 'Direktur', code: 'DIR', level: 8 },
  ];
  for (const g of grades) {
    await prisma.grade.upsert({ where: { id: g.id }, update: {}, create: { ...g, tenantId: TENANT_ID } });
  }
  console.log(`${grades.length} grades created`);

  // -------------------------------------------------------------------------
  // 5. Positions (per department)
  // -------------------------------------------------------------------------
  const positions = [
    // Direktorat
    { id: 'nsm-pos-dirut', name: 'Direktur Utama', code: 'DIRUT', departmentId: 'nsm-dept-ga', gradeId: 'nsm-grade-dir', isHead: true },
    { id: 'nsm-pos-dirops', name: 'Direktur Operasional', code: 'DIROPS', departmentId: 'nsm-dept-ga', gradeId: 'nsm-grade-dir', isHead: true },
    { id: 'nsm-pos-dirkeu', name: 'Direktur Keuangan', code: 'DIRKEU', departmentId: 'nsm-dept-ga', gradeId: 'nsm-grade-dir', isHead: true },
    { id: 'nsm-pos-mga', name: 'Manager GA & Legal', code: 'MGAL', departmentId: 'nsm-dept-ga', gradeId: 'nsm-grade-mgr', isHead: true },
    { id: 'nsm-pos-staffga', name: 'Staff GA', code: 'STGA', departmentId: 'nsm-dept-ga', gradeId: 'nsm-grade-staff' },
    { id: 'nsm-pos-stafflegal', name: 'Staff Legal', code: 'STLG', departmentId: 'nsm-dept-ga', gradeId: 'nsm-grade-staff' },
    // HR
    { id: 'nsm-pos-hrmgr', name: 'HR Manager', code: 'HRM', departmentId: 'nsm-dept-hr', gradeId: 'nsm-grade-mgr', isHead: true },
    { id: 'nsm-pos-hrspv', name: 'HR Supervisor', code: 'HRSPV', departmentId: 'nsm-dept-hr', gradeId: 'nsm-grade-spv' },
    { id: 'nsm-pos-hrrec', name: 'HR Staff (Recruitment)', code: 'HRREC', departmentId: 'nsm-dept-hr', gradeId: 'nsm-grade-staff' },
    { id: 'nsm-pos-hrpay', name: 'HR Staff (Payroll)', code: 'HRPAY', departmentId: 'nsm-dept-hr', gradeId: 'nsm-grade-staff' },
    // Finance
    { id: 'nsm-pos-finmgr', name: 'Finance Manager', code: 'FINM', departmentId: 'nsm-dept-fin', gradeId: 'nsm-grade-mgr', isHead: true },
    { id: 'nsm-pos-finspv', name: 'Supervisor Finance', code: 'FINSPV', departmentId: 'nsm-dept-fin', gradeId: 'nsm-grade-spv' },
    { id: 'nsm-pos-staffacc', name: 'Staff Accounting', code: 'STACC', departmentId: 'nsm-dept-fin', gradeId: 'nsm-grade-staff' },
    { id: 'nsm-pos-staffin', name: 'Staff Finance', code: 'STFIN', departmentId: 'nsm-dept-fin', gradeId: 'nsm-grade-staff' },
    // IT
    { id: 'nsm-pos-itmgr', name: 'IT Manager', code: 'ITM', departmentId: 'nsm-dept-it', gradeId: 'nsm-grade-mgr', isHead: true },
    { id: 'nsm-pos-itsup', name: 'IT Support', code: 'ITSUP', departmentId: 'nsm-dept-it', gradeId: 'nsm-grade-staff' },
    { id: 'nsm-pos-itdev', name: 'IT Staff (Developer)', code: 'ITDEV', departmentId: 'nsm-dept-it', gradeId: 'nsm-grade-senior' },
    // Sales & Marketing
    { id: 'nsm-pos-salesmgr', name: 'Sales Manager', code: 'SLSM', departmentId: 'nsm-dept-sales', gradeId: 'nsm-grade-mgr', isHead: true },
    { id: 'nsm-pos-salesspv', name: 'Sales Supervisor', code: 'SLSSPV', departmentId: 'nsm-dept-sales', gradeId: 'nsm-grade-spv' },
    { id: 'nsm-pos-salesexec', name: 'Sales Executive', code: 'SLSEX', departmentId: 'nsm-dept-sales', gradeId: 'nsm-grade-staff' },
    { id: 'nsm-pos-mktstaff', name: 'Marketing Staff', code: 'MKTST', departmentId: 'nsm-dept-sales', gradeId: 'nsm-grade-staff' },
    // Customer Service
    { id: 'nsm-pos-csspv', name: 'CS Supervisor', code: 'CSSPV', departmentId: 'nsm-dept-cs', gradeId: 'nsm-grade-spv' },
    { id: 'nsm-pos-csstaff', name: 'CS Staff', code: 'CSST', departmentId: 'nsm-dept-cs', gradeId: 'nsm-grade-staff' },
    // Produksi
    { id: 'nsm-pos-prodmgr', name: 'Production Manager', code: 'PRDM', departmentId: 'nsm-dept-prod', gradeId: 'nsm-grade-mgr', isHead: true },
    { id: 'nsm-pos-prodspv', name: 'Supervisor Produksi', code: 'PRDSPV', departmentId: 'nsm-dept-prod', gradeId: 'nsm-grade-spv' },
    { id: 'nsm-pos-prodtl', name: 'Team Leader Produksi', code: 'PRDTL', departmentId: 'nsm-dept-prod', gradeId: 'nsm-grade-senior' },
    { id: 'nsm-pos-prodop', name: 'Operator Produksi', code: 'PRDOP', departmentId: 'nsm-dept-prod', gradeId: 'nsm-grade-staff' },
    // QC
    { id: 'nsm-pos-qcspv', name: 'QC Supervisor', code: 'QCSPV', departmentId: 'nsm-dept-qc', gradeId: 'nsm-grade-spv' },
    { id: 'nsm-pos-qcinsp', name: 'QC Inspector', code: 'QCINS', departmentId: 'nsm-dept-qc', gradeId: 'nsm-grade-staff' },
    // Gudang
    { id: 'nsm-pos-whspv', name: 'Supervisor Gudang', code: 'WHSPV', departmentId: 'nsm-dept-wh', gradeId: 'nsm-grade-spv' },
    { id: 'nsm-pos-whstaff', name: 'Staff Gudang', code: 'WHST', departmentId: 'nsm-dept-wh', gradeId: 'nsm-grade-staff' },
    { id: 'nsm-pos-driver', name: 'Staff Driver/Ekspedisi', code: 'DRV', departmentId: 'nsm-dept-wh', gradeId: 'nsm-grade-staff' },
    // Security
    { id: 'nsm-pos-secdan', name: 'Komandan Regu Satpam', code: 'SECDN', departmentId: 'nsm-dept-sec', gradeId: 'nsm-grade-senior' },
    { id: 'nsm-pos-satpam', name: 'Anggota Satpam', code: 'SATPM', departmentId: 'nsm-dept-sec', gradeId: 'nsm-grade-staff' },
  ];
  for (const p of positions) {
    await prisma.position.upsert({ where: { id: p.id }, update: {}, create: { ...p, tenantId: TENANT_ID } });
  }
  console.log(`${positions.length} positions created`);

  // -------------------------------------------------------------------------
  // 6. Shifts (pola jam kerja Indonesia)
  // -------------------------------------------------------------------------
  const shifts = [
    { id: 'nsm-shift-kantor', name: 'Kantor Reguler', code: 'KANTOR', startTime: '08:00', endTime: '17:00', breakStart: '12:00', breakEnd: '13:00', gracePeriodMinutes: 15, lateThresholdMinutes: 30 },
    { id: 'nsm-shift-prod1', name: 'Produksi Shift 1 (Pagi)', code: 'PRD1', startTime: '06:00', endTime: '14:00', breakStart: '10:00', breakEnd: '10:30', isNightShift: false },
    { id: 'nsm-shift-prod2', name: 'Produksi Shift 2 (Siang)', code: 'PRD2', startTime: '14:00', endTime: '22:00', breakStart: '18:00', breakEnd: '18:30', isNightShift: false },
    { id: 'nsm-shift-prod3', name: 'Produksi Shift 3 (Malam)', code: 'PRD3', startTime: '22:00', endTime: '06:00', breakStart: '02:00', breakEnd: '02:30', isNightShift: true },
    { id: 'nsm-shift-gudang', name: 'Gudang Reguler', code: 'GDG', startTime: '07:00', endTime: '16:00', breakStart: '12:00', breakEnd: '13:00' },
    { id: 'nsm-shift-satpamsiang', name: 'Satpam Siang', code: 'SATS', startTime: '07:00', endTime: '19:00', breakStart: '12:00', breakEnd: '13:00', isNightShift: false },
    { id: 'nsm-shift-satpammalam', name: 'Satpam Malam', code: 'SATM', startTime: '19:00', endTime: '07:00', breakStart: '01:00', breakEnd: '01:30', isNightShift: true },
  ];
  for (const s of shifts) {
    await prisma.shift.upsert({ where: { id: s.id }, update: {}, create: { ...s, tenantId: TENANT_ID, status: 'ACTIVE' } });
  }
  console.log(`${shifts.length} shifts created`);

  // -------------------------------------------------------------------------
  // 7. Employees + Employment + Contact + Medical
  //    Data fiktif; nama beragam (Jawa/Sunda/Batak/Minang/dll).
  //    startDate disebar 1-10 tahun lalu; 4 orang PENDING_ACTIVATION (masa depan).
  // -------------------------------------------------------------------------
  type Emp = {
    no: string;
    fullName: string;
    gender: 'MALE' | 'FEMALE';
    positionId: string;
    departmentId: string;
    gradeId: string;
    type: 'PERMANENT' | 'CONTRACT' | 'PROBATION';
    startDate: string;
    salary: number;
    status?: 'ACTIVE' | 'PENDING_ACTIVATION';
    marital: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
    birthDate: string;
    city: string;
    phone: string;
    blood: string;
    emergencyName: string;
    emergencyPhone: string;
    union?: 'NONE' | 'MEMBER' | 'OFFICER';
  };

  const employees: Emp[] = [
    // Direktorat (3 direktur + manajer GA/legal + 2 staff)
    { no: 'NSM-2024-001', fullName: 'Budi Santoso', gender: 'MALE', positionId: 'nsm-pos-dirut', departmentId: 'nsm-dept-ga', gradeId: 'nsm-grade-dir', type: 'PERMANENT', startDate: '2016-02-01', salary: 85000000, marital: 'MARRIED', birthDate: '1972-05-12', city: 'Jakarta', phone: '+6281212340001', blood: 'O', emergencyName: 'Sri Wahyuni', emergencyPhone: '+6281312340001' },
    { no: 'NSM-2024-002', fullName: 'Rina Maharani', gender: 'FEMALE', positionId: 'nsm-pos-dirops', departmentId: 'nsm-dept-ga', gradeId: 'nsm-grade-dir', type: 'PERMANENT', startDate: '2017-01-15', salary: 78000000, marital: 'MARRIED', birthDate: '1975-09-23', city: 'Jakarta', phone: '+6281312340002', blood: 'A', emergencyName: 'Agus Pranoto', emergencyPhone: '+6282112340002' },
    { no: 'NSM-2024-003', fullName: 'Hendra Wijaya', gender: 'MALE', positionId: 'nsm-pos-dirkeu', departmentId: 'nsm-dept-ga', gradeId: 'nsm-grade-dir', type: 'PERMANENT', startDate: '2018-03-01', salary: 76000000, marital: 'MARRIED', birthDate: '1974-11-02', city: 'Tangerang', phone: '+6282112340003', blood: 'B', emergencyName: 'Dewi Anggraini', emergencyPhone: '+6281212340003' },
    { no: 'NSM-2024-004', fullName: 'Siti Rahayu', gender: 'FEMALE', positionId: 'nsm-pos-mga', departmentId: 'nsm-dept-ga', gradeId: 'nsm-grade-mgr', type: 'PERMANENT', startDate: '2019-06-10', salary: 28000000, marital: 'MARRIED', birthDate: '1983-04-18', city: 'Depok', phone: '+6281212340004', blood: 'AB', emergencyName: 'Joko Susilo', emergencyPhone: '+6281312340004' },
    { no: 'NSM-2024-005', fullName: 'Ahmad Fauzi', gender: 'MALE', positionId: 'nsm-pos-staffga', departmentId: 'nsm-dept-ga', gradeId: 'nsm-grade-staff', type: 'PERMANENT', startDate: '2021-02-01', salary: 7000000, marital: 'SINGLE', birthDate: '1995-07-08', city: 'Bogor', phone: '+6282112340005', blood: 'O', emergencyName: 'Yusuf Fauzi', emergencyPhone: '+6282112340505' },
    { no: 'NSM-2024-006', fullName: 'Dewi Lestari', gender: 'FEMALE', positionId: 'nsm-pos-stafflegal', departmentId: 'nsm-dept-ga', gradeId: 'nsm-grade-staff', type: 'CONTRACT', startDate: '2022-09-01', salary: 7500000, marital: 'SINGLE', birthDate: '1996-12-15', city: 'Jakarta', phone: '+6281312340006', blood: 'B', emergencyName: 'Bambang Lestari', emergencyPhone: '+6281212340006' },
    // HR
    { no: 'NSM-2024-007', fullName: 'Maya Sari', gender: 'FEMALE', positionId: 'nsm-pos-hrmgr', departmentId: 'nsm-dept-hr', gradeId: 'nsm-grade-mgr', type: 'PERMANENT', startDate: '2019-04-01', salary: 26000000, marital: 'MARRIED', birthDate: '1984-03-22', city: 'Jakarta', phone: '+6281212340007', blood: 'A', emergencyName: 'Rudi Hartono', emergencyPhone: '+6282112340007' },
    { no: 'NSM-2024-008', fullName: 'Eko Prasetyo', gender: 'MALE', positionId: 'nsm-pos-hrspv', departmentId: 'nsm-dept-hr', gradeId: 'nsm-grade-spv', type: 'PERMANENT', startDate: '2020-08-15', salary: 14000000, marital: 'MARRIED', birthDate: '1988-10-30', city: 'Bekasi', phone: '+6282112340008', blood: 'O', emergencyName: 'Sri Prasetyo', emergencyPhone: '+6281312340008' },
    { no: 'NSM-2024-009', fullName: 'Nurul Hidayah', gender: 'FEMALE', positionId: 'nsm-pos-hrrec', departmentId: 'nsm-dept-hr', gradeId: 'nsm-grade-staff', type: 'PERMANENT', startDate: '2022-01-10', salary: 8000000, marital: 'SINGLE', birthDate: '1997-06-11', city: 'Depok', phone: '+6281312340009', blood: 'B', emergencyName: 'H. Hidayat', emergencyPhone: '+6281212340009' },
    { no: 'NSM-2024-010', fullName: 'Tono Wibowo', gender: 'MALE', positionId: 'nsm-pos-hrpay', departmentId: 'nsm-dept-hr', gradeId: 'nsm-grade-staff', type: 'PERMANENT', startDate: '2021-11-01', salary: 8200000, marital: 'MARRIED', birthDate: '1992-02-19', city: 'Tangerang', phone: '+6282112340010', blood: 'AB', emergencyName: 'Yati Wibowo', emergencyPhone: '+6281312340010' },
    // Finance
    { no: 'NSM-2024-011', fullName: 'Lilis Sugiarti', gender: 'FEMALE', positionId: 'nsm-pos-finmgr', departmentId: 'nsm-dept-fin', gradeId: 'nsm-grade-mgr', type: 'PERMANENT', startDate: '2018-07-01', salary: 27000000, marital: 'MARRIED', birthDate: '1982-08-05', city: 'Jakarta', phone: '+6281212340011', blood: 'O', emergencyName: 'Slamet Sugiarto', emergencyPhone: '+6282112340011' },
    { no: 'NSM-2024-012', fullName: 'Agus Pranoto', gender: 'MALE', positionId: 'nsm-pos-finspv', departmentId: 'nsm-dept-fin', gradeId: 'nsm-grade-spv', type: 'PERMANENT', startDate: '2020-03-15', salary: 14500000, marital: 'MARRIED', birthDate: '1987-01-27', city: 'Bekasi', phone: '+6282112340012', blood: 'A', emergencyName: 'Siti Pranoto', emergencyPhone: '+6281312340012' },
    { no: 'NSM-2024-013', fullName: 'Fitriani Lubis', gender: 'FEMALE', positionId: 'nsm-pos-staffacc', departmentId: 'nsm-dept-fin', gradeId: 'nsm-grade-staff', type: 'PERMANENT', startDate: '2022-05-02', salary: 7800000, marital: 'SINGLE', birthDate: '1996-09-09', city: 'Jakarta', phone: '+6281312340013', blood: 'B', emergencyName: 'Raja Lubis', emergencyPhone: '+6281212340013' },
    { no: 'NSM-2024-014', fullName: 'Joko Susilo', gender: 'MALE', positionId: 'nsm-pos-staffin', departmentId: 'nsm-dept-fin', gradeId: 'nsm-grade-staff', type: 'CONTRACT', startDate: '2023-02-01', salary: 7600000, marital: 'MARRIED', birthDate: '1993-12-01', city: 'Depok', phone: '+6282112340014', blood: 'O', emergencyName: 'Sumiati Susilo', emergencyPhone: '+6281312340014' },
    // IT
    { no: 'NSM-2024-015', fullName: 'Rendi Kusuma', gender: 'MALE', positionId: 'nsm-pos-itmgr', departmentId: 'nsm-dept-it', gradeId: 'nsm-grade-mgr', type: 'PERMANENT', startDate: '2019-09-01', salary: 25000000, marital: 'MARRIED', birthDate: '1985-05-14', city: 'Jakarta', phone: '+6281212340015', blood: 'A', emergencyName: 'Wati Kusuma', emergencyPhone: '+6282112340015' },
    { no: 'NSM-2024-016', fullName: 'Bima Saputra', gender: 'MALE', positionId: 'nsm-pos-itsup', departmentId: 'nsm-dept-it', gradeId: 'nsm-grade-staff', type: 'PERMANENT', startDate: '2021-06-15', salary: 7500000, marital: 'SINGLE', birthDate: '1994-03-03', city: 'Tangerang', phone: '+6282112340016', blood: 'B', emergencyName: 'Saputra Senior', emergencyPhone: '+6281312340016' },
    { no: 'NSM-2024-017', fullName: 'Putri Anjani', gender: 'FEMALE', positionId: 'nsm-pos-itdev', departmentId: 'nsm-dept-it', gradeId: 'nsm-grade-senior', type: 'PERMANENT', startDate: '2022-08-01', salary: 12000000, marital: 'SINGLE', birthDate: '1995-11-21', city: 'Jakarta', phone: '+6281312340017', blood: 'AB', emergencyName: 'Anjani Ortu', emergencyPhone: '+6281212340017' },
    // Sales & Marketing
    { no: 'NSM-2024-018', fullName: 'Anton Gunawan', gender: 'MALE', positionId: 'nsm-pos-salesmgr', departmentId: 'nsm-dept-sales', gradeId: 'nsm-grade-mgr', type: 'PERMANENT', startDate: '2018-10-01', salary: 29000000, marital: 'MARRIED', birthDate: '1981-07-19', city: 'Jakarta', phone: '+6281212340018', blood: 'O', emergencyName: 'Rini Gunawan', emergencyPhone: '+6282112340018' },
    { no: 'NSM-2024-019', fullName: 'Sri Wahyuni', gender: 'FEMALE', positionId: 'nsm-pos-salesspv', departmentId: 'nsm-dept-sales', gradeId: 'nsm-grade-spv', type: 'PERMANENT', startDate: '2020-04-01', salary: 15000000, marital: 'MARRIED', birthDate: '1989-02-14', city: 'Bekasi', phone: '+6281312340019', blood: 'A', emergencyName: 'Wahyuni Suami', emergencyPhone: '+6281212340019' },
    { no: 'NSM-2024-020', fullName: 'Reza Maulana', gender: 'MALE', positionId: 'nsm-pos-salesexec', departmentId: 'nsm-dept-sales', gradeId: 'nsm-grade-staff', type: 'PERMANENT', startDate: '2022-03-01', salary: 8000000, marital: 'SINGLE', birthDate: '1996-08-08', city: 'Depok', phone: '+6282112340020', blood: 'B', emergencyName: 'Maulana Ayah', emergencyPhone: '+6281312340020' },
    { no: 'NSM-2024-021', fullName: 'Karina Tanjung', gender: 'FEMALE', positionId: 'nsm-pos-salesexec', departmentId: 'nsm-dept-sales', gradeId: 'nsm-grade-staff', type: 'CONTRACT', startDate: '2023-01-15', salary: 7800000, marital: 'SINGLE', birthDate: '1997-04-27', city: 'Jakarta', phone: '+6281312340021', blood: 'O', emergencyName: 'Tanjung Bapak', emergencyPhone: '+6281212340021' },
    { no: 'NSM-2024-022', fullName: 'Dedi Ramadhan', gender: 'MALE', positionId: 'nsm-pos-mktstaff', departmentId: 'nsm-dept-sales', gradeId: 'nsm-grade-staff', type: 'PERMANENT', startDate: '2021-12-01', salary: 7600000, marital: 'MARRIED', birthDate: '1993-06-06', city: 'Tangerang', phone: '+6282112340022', blood: 'AB', emergencyName: 'Ramadhan Isteri', emergencyPhone: '+6281312340022' },
    // Customer Service
    { no: 'NSM-2024-023', fullName: 'Indah Permata', gender: 'FEMALE', positionId: 'nsm-pos-csspv', departmentId: 'nsm-dept-cs', gradeId: 'nsm-grade-spv', type: 'PERMANENT', startDate: '2020-11-01', salary: 13500000, marital: 'MARRIED', birthDate: '1988-09-30', city: 'Jakarta', phone: '+6281212340023', blood: 'B', emergencyName: 'Permata Suami', emergencyPhone: '+6282112340023' },
    { no: 'NSM-2024-024', fullName: 'Yulia Safitri', gender: 'FEMALE', positionId: 'nsm-pos-csstaff', departmentId: 'nsm-dept-cs', gradeId: 'nsm-grade-staff', type: 'PERMANENT', startDate: '2022-07-01', salary: 7200000, marital: 'SINGLE', birthDate: '1997-01-17', city: 'Depok', phone: '+6281312340024', blood: 'O', emergencyName: 'Safitri Ayah', emergencyPhone: '+6281212340024' },
    { no: 'NSM-2024-025', fullName: 'Bayu Setiawan', gender: 'MALE', positionId: 'nsm-pos-csstaff', departmentId: 'nsm-dept-cs', gradeId: 'nsm-grade-staff', type: 'CONTRACT', startDate: '2023-03-15', salary: 7000000, marital: 'SINGLE', birthDate: '1995-10-10', city: 'Bogor', phone: '+6282112340025', blood: 'A', emergencyName: 'Setiawan Bapak', emergencyPhone: '+6281312340025' },
    // Produksi (pabrik Bekasi) — banyak operator
    { no: 'NSM-2024-026', fullName: 'Suparno', gender: 'MALE', positionId: 'nsm-pos-prodmgr', departmentId: 'nsm-dept-prod', gradeId: 'nsm-grade-mgr', type: 'PERMANENT', startDate: '2017-05-01', salary: 24000000, marital: 'MARRIED', birthDate: '1980-12-12', city: 'Bekasi', phone: '+6281212340026', blood: 'O', emergencyName: 'Suparni', emergencyPhone: '+6282112340026' },
    { no: 'NSM-2024-027', fullName: 'Slamet Riyadi', gender: 'MALE', positionId: 'nsm-pos-prodspv', departmentId: 'nsm-dept-prod', gradeId: 'nsm-grade-spv', type: 'PERMANENT', startDate: '2019-02-01', salary: 14000000, marital: 'MARRIED', birthDate: '1986-07-07', city: 'Bekasi', phone: '+6282112340027', blood: 'B', emergencyName: 'Riyadi Istri', emergencyPhone: '+6281312340027', union: 'OFFICER' },
    { no: 'NSM-2024-028', fullName: 'Warsono', gender: 'MALE', positionId: 'nsm-pos-prodspv', departmentId: 'nsm-dept-prod', gradeId: 'nsm-grade-spv', type: 'PERMANENT', startDate: '2020-02-15', salary: 14000000, marital: 'MARRIED', birthDate: '1985-03-03', city: 'Bekasi', phone: '+6282112340028', blood: 'A', emergencyName: 'Warsoni Istri', emergencyPhone: '+6281212340028' },
    { no: 'NSM-2024-029', fullName: 'Juniarto', gender: 'MALE', positionId: 'nsm-pos-prodtl', departmentId: 'nsm-dept-prod', gradeId: 'nsm-grade-senior', type: 'PERMANENT', startDate: '2021-01-01', salary: 11000000, marital: 'MARRIED', birthDate: '1990-05-05', city: 'Bekasi', phone: '+6281212340029', blood: 'O', emergencyName: 'Juniarto Istri', emergencyPhone: '+6282112340029' },
    { no: 'NSM-2024-030', fullName: 'Parman', gender: 'MALE', positionId: 'nsm-pos-prodtl', departmentId: 'nsm-dept-prod', gradeId: 'nsm-grade-senior', type: 'PERMANENT', startDate: '2021-08-01', salary: 11000000, marital: 'MARRIED', birthDate: '1991-11-11', city: 'Bekasi', phone: '+6282112340030', blood: 'B', emergencyName: 'Parman Istri', emergencyPhone: '+6281312340030' },
    { no: 'NSM-2024-031', fullName: 'Sugeng', gender: 'MALE', positionId: 'nsm-pos-prodop', departmentId: 'nsm-dept-prod', gradeId: 'nsm-grade-staff', type: 'PERMANENT', startDate: '2022-02-01', salary: 6000000, marital: 'MARRIED', birthDate: '1994-02-20', city: 'Bekasi', phone: '+6282112340031', blood: 'O', emergencyName: 'Sugeng Istri', emergencyPhone: '+6281212340031', union: 'MEMBER' },
    { no: 'NSM-2024-032', fullName: 'Kardi', gender: 'MALE', positionId: 'nsm-pos-prodop', departmentId: 'nsm-dept-prod', gradeId: 'nsm-grade-staff', type: 'PERMANENT', startDate: '2022-04-01', salary: 6000000, marital: 'SINGLE', birthDate: '1995-06-06', city: 'Bekasi', phone: '+6282112340032', blood: 'A', emergencyName: 'Kardi Ayah', emergencyPhone: '+6281312340032', union: 'MEMBER' },
    { no: 'NSM-2024-033', fullName: 'Tarmudi', gender: 'MALE', positionId: 'nsm-pos-prodop', departmentId: 'nsm-dept-prod', gradeId: 'nsm-grade-staff', type: 'PERMANENT', startDate: '2023-01-01', salary: 6000000, marital: 'SINGLE', birthDate: '1996-09-09', city: 'Bekasi', phone: '+6282112340033', blood: 'B', emergencyName: 'Tarmudi Ibu', emergencyPhone: '+6281212340033' },
    { no: 'NSM-2024-034', fullName: 'Misnan', gender: 'MALE', positionId: 'nsm-pos-prodop', departmentId: 'nsm-dept-prod', gradeId: 'nsm-grade-staff', type: 'CONTRACT', startDate: '2023-06-01', salary: 5800000, marital: 'MARRIED', birthDate: '1993-12-12', city: 'Bekasi', phone: '+6282112340034', blood: 'O', emergencyName: 'Misnan Istri', emergencyPhone: '+6281312340034' },
    { no: 'NSM-2024-035', fullName: 'Rohman', gender: 'MALE', positionId: 'nsm-pos-prodop', departmentId: 'nsm-dept-prod', gradeId: 'nsm-grade-staff', type: 'PERMANENT', startDate: '2024-02-01', salary: 6000000, marital: 'SINGLE', birthDate: '1997-03-03', city: 'Bekasi', phone: '+6281212340035', blood: 'AB', emergencyName: 'Rohman Bapak', emergencyPhone: '+6281212340035' },
    // QC
    { no: 'NSM-2024-036', fullName: 'Ani Wijayanti', gender: 'FEMALE', positionId: 'nsm-pos-qcspv', departmentId: 'nsm-dept-qc', gradeId: 'nsm-grade-spv', type: 'PERMANENT', startDate: '2020-05-01', salary: 13500000, marital: 'MARRIED', birthDate: '1989-08-08', city: 'Bekasi', phone: '+6281312340036', blood: 'A', emergencyName: 'Wijayanti Suami', emergencyPhone: '+6282112340036' },
    { no: 'NSM-2024-037', fullName: 'Sri Mulyani', gender: 'FEMALE', positionId: 'nsm-pos-qcinsp', departmentId: 'nsm-dept-qc', gradeId: 'nsm-grade-staff', type: 'PERMANENT', startDate: '2022-09-01', salary: 7000000, marital: 'MARRIED', birthDate: '1995-04-04', city: 'Bekasi', phone: '+6281312340037', blood: 'O', emergencyName: 'Mulyani Suami', emergencyPhone: '+6281212340037' },
    { no: 'NSM-2024-038', fullName: 'Hartini', gender: 'FEMALE', positionId: 'nsm-pos-qcinsp', departmentId: 'nsm-dept-qc', gradeId: 'nsm-grade-staff', type: 'CONTRACT', startDate: '2023-04-01', salary: 6800000, marital: 'SINGLE', birthDate: '1996-10-10', city: 'Bekasi', phone: '+6281312340038', blood: 'B', emergencyName: 'Hartini Ayah', emergencyPhone: '+6282112340038' },
    // Gudang
    { no: 'NSM-2024-039', fullName: 'Sarjono', gender: 'MALE', positionId: 'nsm-pos-whspv', departmentId: 'nsm-dept-wh', gradeId: 'nsm-grade-spv', type: 'PERMANENT', startDate: '2019-11-01', salary: 13000000, marital: 'MARRIED', birthDate: '1987-01-15', city: 'Bekasi', phone: '+6282112340039', blood: 'O', emergencyName: 'Sarjono Istri', emergencyPhone: '+6281212340039' },
    { no: 'NSM-2024-040', fullName: 'Supriyadi', gender: 'MALE', positionId: 'nsm-pos-whstaff', departmentId: 'nsm-dept-wh', gradeId: 'nsm-grade-staff', type: 'PERMANENT', startDate: '2022-03-01', salary: 6500000, marital: 'MARRIED', birthDate: '1994-07-07', city: 'Bekasi', phone: '+6282112340040', blood: 'A', emergencyName: 'Supriyadi Istri', emergencyPhone: '+6281312340040' },
    { no: 'NSM-2024-041', fullName: 'Tukimin', gender: 'MALE', positionId: 'nsm-pos-driver', departmentId: 'nsm-dept-wh', gradeId: 'nsm-grade-staff', type: 'PERMANENT', startDate: '2021-09-01', salary: 6200000, marital: 'MARRIED', birthDate: '1992-02-02', city: 'Bekasi', phone: '+6282112340041', blood: 'B', emergencyName: 'Tukimin Istri', emergencyPhone: '+6281212340041' },
    // Security (satpam) — rotasi 2 hari kerja 2 hari libur
    { no: 'NSM-2024-042', fullName: 'Komarudin', gender: 'MALE', positionId: 'nsm-pos-secdan', departmentId: 'nsm-dept-sec', gradeId: 'nsm-grade-senior', type: 'PERMANENT', startDate: '2018-08-01', salary: 10000000, marital: 'MARRIED', birthDate: '1983-05-05', city: 'Bekasi', phone: '+6281212340042', blood: 'O', emergencyName: 'Komarudin Istri', emergencyPhone: '+6282112340042' },
    { no: 'NSM-2024-043', fullName: 'Asep Saepudin', gender: 'MALE', positionId: 'nsm-pos-satpam', departmentId: 'nsm-dept-sec', gradeId: 'nsm-grade-staff', type: 'PERMANENT', startDate: '2020-06-01', salary: 5500000, marital: 'MARRIED', birthDate: '1990-09-09', city: 'Bekasi', phone: '+6282112340043', blood: 'A', emergencyName: 'Saepudin Istri', emergencyPhone: '+6281212340043' },
    { no: 'NSM-2024-044', fullName: 'Ujang', gender: 'MALE', positionId: 'nsm-pos-satpam', departmentId: 'nsm-dept-sec', gradeId: 'nsm-grade-staff', type: 'CONTRACT', startDate: '2023-02-01', salary: 5200000, marital: 'SINGLE', birthDate: '1995-11-11', city: 'Bekasi', phone: '+6282112340044', blood: 'B', emergencyName: 'Ujang Bapak', emergencyPhone: '+6281212340044' },
    // 4 karyawan PENDING_ACTIVATION (hasil recruitment, startDate masa depan)
    { no: 'NSM-2024-045', fullName: 'Galih Pratama', gender: 'MALE', positionId: 'nsm-pos-itdev', departmentId: 'nsm-dept-it', gradeId: 'nsm-grade-senior', type: 'PROBATION', startDate: '2026-08-01', salary: 11500000, status: 'PENDING_ACTIVATION', marital: 'SINGLE', birthDate: '1997-03-03', city: 'Jakarta', phone: '+6281212340045', blood: 'O', emergencyName: 'Pratama Ayah', emergencyPhone: '+6281312340045' },
    { no: 'NSM-2024-046', fullName: 'Salsabila Zahra', gender: 'FEMALE', positionId: 'nsm-pos-hrrec', departmentId: 'nsm-dept-hr', gradeId: 'nsm-grade-staff', type: 'PROBATION', startDate: '2026-08-15', salary: 7800000, status: 'PENDING_ACTIVATION', marital: 'SINGLE', birthDate: '1998-07-07', city: 'Depok', phone: '+6281312340046', blood: 'A', emergencyName: 'Zahra Ibu', emergencyPhone: '+6281212340046' },
    { no: 'NSM-2024-047', fullName: 'Fajar Nugroho', gender: 'MALE', positionId: 'nsm-pos-prodop', departmentId: 'nsm-dept-prod', gradeId: 'nsm-grade-staff', type: 'PROBATION', startDate: '2026-09-01', salary: 6000000, status: 'PENDING_ACTIVATION', marital: 'SINGLE', birthDate: '1999-01-01', city: 'Bekasi', phone: '+6282112340047', blood: 'B', emergencyName: 'Nugroho Bapak', emergencyPhone: '+6281212340047' },
    { no: 'NSM-2024-048', fullName: 'Mega Putri', gender: 'FEMALE', positionId: 'nsm-pos-csstaff', departmentId: 'nsm-dept-cs', gradeId: 'nsm-grade-staff', type: 'PROBATION', startDate: '2026-09-10', salary: 7200000, status: 'PENDING_ACTIVATION', marital: 'SINGLE', birthDate: '1998-05-05', city: 'Jakarta', phone: '+6281312340048', blood: 'O', emergencyName: 'Putri Ibu', emergencyPhone: '+6281212340048' },
  ];

  let empCount = 0;
  for (const e of employees) {
    const id = `emp-${e.no}`;
    const email = e.fullName.toLowerCase().replace(/[^a-z]/g, '.').replace(/\.+/g, '.') + '@nusantarasejahtera.co.id';
    const employee = await prisma.employee.upsert({
      where: { id },
      update: {},
      create: {
        id,
        tenantId: ENTITY_ID,
        employeeId: e.no,
        fullName: e.fullName,
        email,
        phone: e.phone,
        gender: e.gender,
        maritalStatus: e.marital,
        unionStatus: e.union ?? 'NONE',
        birthDate: new Date(e.birthDate),
        birthPlace: e.city,
        bloodType: e.blood,
        allergies: null,
        medicalNotes: 'Tidak ada riwayat khusus',
        city: e.city,
        province: e.city === 'Jakarta' ? 'DKI Jakarta' : 'Jawa Barat',
        status: e.status ?? 'ACTIVE',
        startDate: new Date(e.startDate),
      },
    });

    await prisma.employment.upsert({
      where: { id: `empl-${id}` },
      update: {},
      create: {
        id: `empl-${id}`,
        employeeId: id,
        positionId: e.positionId,
        departmentId: e.departmentId,
        gradeId: e.gradeId,
        entityId: ENTITY_ID,
        type: e.type,
        startDate: new Date(e.startDate),
        isActive: e.status ? false : true,
        salary: e.salary,
        salaryCurrency: 'IDR',
      },
    });

    await prisma.employeeContact.upsert({
      where: { employeeId: id },
      update: {},
      create: {
        employeeId: id,
        phone: e.phone,
        address: `Jl. Fiktif No. ${empCount + 1}, ${e.city}`,
        emergencyContactName: e.emergencyName,
        emergencyContactPhone: e.emergencyPhone,
      },
    });

    await prisma.employeeMedical.upsert({
      where: { employeeId: id },
      update: {},
      create: { employeeId: id, bloodType: e.blood, allergies: null, notes: 'Tidak ada riwayat khusus' },
    });

    empCount++;
  }
  console.log(`${empCount} employees (+ employment, contact, medical) created`);

  // -------------------------------------------------------------------------
  // 8. Roster — assign tiap employee ke shift departemennya untuk 1 bulan ke depan
  // -------------------------------------------------------------------------
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const roster = await prisma.roster.create({
    data: {
      tenantId: TENANT_ID,
      name: `Roster Bulanan ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      description: 'Demo roster PT Nusantara Sejahtera Makmur',
      startDate: monthStart,
      endDate: monthEnd,
      status: 'ACTIVE',
    },
  });

  // mapping department -> shift id
  const deptShift: Record<string, string> = {
    'nsm-dept-ga': 'nsm-shift-kantor',
    'nsm-dept-hr': 'nsm-shift-kantor',
    'nsm-dept-fin': 'nsm-shift-kantor',
    'nsm-dept-it': 'nsm-shift-kantor',
    'nsm-dept-sales': 'nsm-shift-kantor',
    'nsm-dept-cs': 'nsm-shift-kantor',
    'nsm-dept-prod': 'nsm-shift-prod1', // akan dirotasi per karyawan di bawah
    'nsm-dept-qc': 'nsm-shift-kantor',
    'nsm-dept-wh': 'nsm-shift-gudang',
    'nsm-dept-sec': 'nsm-shift-satpamsiang', // akan dirotasi
  };

  const prodShifts = ['nsm-shift-prod1', 'nsm-shift-prod2', 'nsm-shift-prod3'];
  const secShifts = ['nsm-shift-satpamsiang', 'nsm-shift-satpammalam'];

  let entryCount = 0;
  for (const e of employees) {
    let shiftId = deptShift[e.departmentId];
    if (e.departmentId === 'nsm-dept-prod') {
      // rotasi 3 shift merata berdasarkan index
      const idx = employees.filter((x) => x.departmentId === 'nsm-dept-prod').indexOf(e);
      shiftId = prodShifts[idx % 3];
    } else if (e.departmentId === 'nsm-dept-sec') {
      const idx = employees.filter((x) => x.departmentId === 'nsm-dept-sec').indexOf(e);
      shiftId = secShifts[idx % 2];
    }

    // hanya buat roster untuk karyawan yang sudah aktif (bukan pending)
    if (e.status === 'PENDING_ACTIVATION') continue;

    // 1 entry per minggu (4 entri dalam bulan berjalan) sebagai sample rotasi
    for (let w = 0; w < 4; w++) {
      const d = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1 + w * 7);
      if (d > monthEnd) break;
      await prisma.rosterEntry.create({
        data: {
          rosterId: roster.id,
          employeeId: `emp-${e.no}`,
          shiftId,
          date: d,
          status: 'SCHEDULED',
        },
      });
      entryCount++;
    }
  }
  console.log(`Roster '${roster.name}' created with ${entryCount} entries`);

  // -------------------------------------------------------------------------
  // 9. Demo login users + roles (agar tenant nusantara bisa di-login & dilihat)
  //    Password demo sama untuk semua akun demo: 'Demo123!'
  // -------------------------------------------------------------------------
  const DEMO_PASSWORD = 'Demo123!';
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const roleDefs = [
    { id: 'nsm-role-sysadmin', name: 'System Administrator', isSystem: true },
    { id: 'nsm-role-hr', name: 'HR Admin', isSystem: true },
    { id: 'nsm-role-manager', name: 'Manager', isSystem: true },
    { id: 'nsm-role-employee', name: 'Employee', isSystem: true },
  ];
  for (const r of roleDefs) {
    await prisma.role.upsert({ where: { id: r.id }, update: {}, create: { ...r, tenantId: TENANT_ID } });
  }

  // assign ALL catalog permissions to sysadmin; HR dapat semua (demo); manager & employee subset
  const allPerms = await prisma.permission.findMany();
  for (const perm of allPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: 'nsm-role-sysadmin', permissionId: perm.id } },
      update: {},
      create: { roleId: 'nsm-role-sysadmin', permissionId: perm.id, scope: 'ALL' },
    });
  }
  // HR demo: berikan semua permission agar bisa kelola modul HR/demo
  for (const perm of allPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: 'nsm-role-hr', permissionId: perm.id } },
      update: {},
      create: { roleId: 'nsm-role-hr', permissionId: perm.id, scope: 'ALL' },
    });
  }
  // Employee: ESS self-service subset
  const empPerms = [
    'employee:read',
    'ess:attendance:clock', 'ess:attendance:read', 'ess:dashboard:read',
    'attendance:biometric:enroll', 'attendance:biometric:read',
    'ess:leave:approve', 'ess:leave:create', 'ess:leave:read',
    'ess:notification:read', 'ess:notification:update',
    'ess:onboarding:complete', 'ess:onboarding:read',
    'ess:payslip:acknowledge', 'ess:payslip:read',
    'ess:profile:read', 'ess:profile:update',
    'benefits:enroll', 'benefits:read',
    'leave-balances:read', 'leave-requests:create', 'leave-requests:read',
    'learning:read', 'performance:goal:create', 'performance:goal:progress',
    'performance:goal:read', 'performance:goal:update', 'performance:read',
    'performance:review:create', 'performance:review:read', 'performance:review:submit',
    'performance:review:update', 'resignations:create',
    'expense-claims:create', 'expense-claims:read', 'loans:create', 'loans:read',
    'assets:read', 'analytics:read',
  ];
  for (const p of empPerms) {
    const lastColon = p.lastIndexOf(':');
    const module = p.slice(0, lastColon);
    const action = p.slice(lastColon + 1);
    const perm = await prisma.permission.findUnique({ where: { module_action: { module, action } } });
    if (perm) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: 'nsm-role-employee', permissionId: perm.id } },
        update: {},
        create: { roleId: 'nsm-role-employee', permissionId: perm.id, scope: 'ALL' },
      });
    }
  }
  console.log('Demo roles + permissions created');

  // Leave types (Addendum v1.2 FR-18 + BR-11): katalog jenis cuti/izin Indonesia
  const nsmLeaveTypes: any[] = [
    { id: 'nsm-lt-annual', name: 'Cuti Tahunan', code: 'CT', isPaid: true, isBalanceDeducting: true, carryForwardLimit: 5, carryForwardExpiry: 'Q1_NEXT_YEAR' },
    { id: 'nsm-lt-sick', name: 'Cuti Sakit', code: 'CS', isPaid: true, isBalanceDeducting: true },
    { id: 'nsm-lt-maternity', name: 'Cuti Melahirkan', code: 'CM', isPaid: true, isBalanceDeducting: true, maxConsecutiveDays: 90, genderRestriction: 'FEMALE' },
    { id: 'nsm-lt-menstrual', name: 'Cuti Haid', code: 'CH', isPaid: true, isBalanceDeducting: false, sameDayApproval: true, carryForwardLimit: 0 },
    { id: 'nsm-lt-bereavement', name: 'Cuti Duka (Keluarga Inti)', code: 'CD', isPaid: true, isBalanceDeducting: false, maxConsecutiveDays: 2 },
    { id: 'nsm-lt-marry-child', name: 'Cuti Menikahkan/Mengkhitankan Anak', code: 'CC', isPaid: true, isBalanceDeducting: false, maxConsecutiveDays: 2 },
    { id: 'nsm-lt-spouse-birth', name: 'Cuti Istri Melahirkan/Keguguran', code: 'CI', isPaid: true, isBalanceDeducting: false, maxConsecutiveDays: 2 },
    { id: 'nsm-lt-personal', name: 'Izin Pribadi', code: 'IP', isPaid: false, isBalanceDeducting: false, allowNegativeBalance: true },
    // Addendum Serikat Pekerja: izin kegiatan serikat (non-deducting, hanya untuk union officer via BR-01)
    { id: 'nsm-lt-union', name: 'Izin Kegiatan Serikat', code: 'IKS', isPaid: true, isBalanceDeducting: false, isUnionActivity: true },
  ];
  for (const lt of nsmLeaveTypes) {
    await prisma.leaveType.upsert({ where: { id: lt.id }, update: {}, create: { ...lt, tenantId: TENANT_ID } });
  }
  console.log(`${nsmLeaveTypes.length} leave types created`);

  // Leave balances 2026 untuk karyawan aktif (hanya jenis yang memotong saldo)
  for (const e of employees) {
    if (e.status !== 'PENDING_ACTIVATION') {
      for (const lt of nsmLeaveTypes) {
        if (lt.isBalanceDeducting) {
          const balId = `nsm-bal-${e.no}-${lt.id}-2026`;
          await prisma.leaveBalance.upsert({
            where: { id: balId },
            update: {},
            create: {
              id: balId,
              tenantId: TENANT_ID,
              employeeId: `emp-${e.no}`,
              leaveTypeId: lt.id,
              year: 2026,
              totalEntitled: lt.code === 'CM' ? 90 : 12,
              totalUsed: 0,
              totalPending: 0,
              carryForward: 0,
            },
          });
        }
      }
    }
  }
  console.log('Leave balances (2026) created for active employees');

  // -------------------------------------------------------------------------
  // Addendum Serikat Pekerja (fitur opsional): aktifkan feature flag labor_union,
  // lalu potongan iuran (union_dues) untuk anggota & pengurus serikat.
  // -------------------------------------------------------------------------
  await prisma.featureFlag.create({
    data: { tenantId: TENANT_ID, module: 'attendance', feature: 'labor_union', enabled: true },
  });
  console.log('Feature flag labor_union enabled for demo tenant');

  const unionMembers = employees.filter((e) => e.union === 'MEMBER' || e.union === 'OFFICER');
  for (const e of unionMembers) {
    await prisma.salaryComponent.create({
      data: {
        employeeId: `emp-${e.no}`,
        componentType: 'union_dues',
        amount: 50000,
        effectiveDate: new Date('2026-01-01'),
      },
    });
  }
  console.log(`${unionMembers.length} union_dues salary components created (Rp50.000/bln)`);

  const demoUsers = [
    { id: 'nsm-user-admin', email: 'admin@nusantarasejahtera.co.id', fullName: 'Admin Nusantara (Demo)', roleId: 'nsm-role-sysadmin', employeeId: null },
    { id: 'nsm-user-hr', email: 'maya.sari@nusantarasejahtera.co.id', fullName: 'Maya Sari', roleId: 'nsm-role-hr', employeeId: 'emp-NSM-2024-007' },
    { id: 'nsm-user-emp', email: 'budi.santoso@nusantarasejahtera.co.id', fullName: 'Budi Santoso', roleId: 'nsm-role-employee', employeeId: 'emp-NSM-2024-001' },
  ];
  for (const u of demoUsers) {
    const user = await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: { id: u.id, tenantId: TENANT_ID, email: u.email, passwordHash, fullName: u.fullName, status: 'ACTIVE', employeeId: u.employeeId },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: u.roleId } },
      update: {},
      create: { userId: user.id, roleId: u.roleId },
    });
  }
  console.log(`Demo users created (password: ${DEMO_PASSWORD}):`);
  demoUsers.forEach((u) => console.log(`   - ${u.email} [${u.roleId.replace('nsm-role-', '')}]`));

  // -------------------------------------------------------------------------
  // 11. Demo biometric enrollment (FACE) for the HR demo user (Maya Sari).
  //     Reference stores a face embedding vector (JSON). In production this is
  //     produced by an on-prem face model; here we seed a deterministic vector
  //     so the demo "Presensi Wajah" flow has an enrollment to verify against.
  // -------------------------------------------------------------------------
  const demoFaceEmbedding = JSON.stringify(
    Array.from({ length: 128 }, (_, i) => Number(Math.sin(i + 1).toFixed(4))),
  );
  await prisma.biometricCredential.upsert({
    where: { tenantId_employeeId_type: { tenantId: TENANT_ID, employeeId: 'emp-NSM-2024-007', type: 'FACE' } },
    update: { reference: demoFaceEmbedding, isActive: true },
    create: {
      tenantId: TENANT_ID,
      employeeId: 'emp-NSM-2024-007',
      type: 'FACE',
      reference: demoFaceEmbedding,
      isActive: true,
    },
  });
  console.log('Demo FACE biometric enrollment created for emp-NSM-2024-007 (Maya Sari)');

  console.log('\n✅ Demo seed PT Nusantara Sejahtera Makmur selesai.');
  console.log(`   Tenant: ${TENANT_ID} (${tenant.domain})`);
  console.log(`   Employees: ${empCount} (${employees.filter((e) => e.status === 'PENDING_ACTIVATION').length} pending activation)`);
}

main()
  .catch((e) => {
    console.error('❌ Demo seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
