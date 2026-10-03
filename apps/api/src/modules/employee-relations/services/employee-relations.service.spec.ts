import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { EmployeeRelationsService } from './employee-relations.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { SpLevel, DisciplinaryStatus, PpeStatus } from '@prisma/client';

describe('EmployeeRelationsService', () => {
  let svc: EmployeeRelationsService;

  const mockPrisma = {
    violationCategory: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    disciplinaryCase: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), count: jest.fn() },
    incidentReport: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    ppeAssignment: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    employee: { findFirst: jest.fn() },
    user: { findFirst: jest.fn() },
    tenantBranding: { findUnique: jest.fn(), upsert: jest.fn(), create: jest.fn(), update: jest.fn() },
  };

  const mockEmployee = { id: 'emp-1', tenantId: 'ns', fullName: 'Test', employeeId: 'NSM-001' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeRelationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    svc = module.get<EmployeeRelationsService>(EmployeeRelationsService);
  });

  afterEach(() => jest.clearAllMocks());

  // -----------------------------------------------------------------------
  // ViolationCategory
  // -----------------------------------------------------------------------
  describe('ViolationCategory', () => {
    it('creates violation category', async () => {
      mockPrisma.violationCategory.findUnique.mockResolvedValue(null);
      mockPrisma.violationCategory.create.mockResolvedValue({ id: 'vc-1', name: 'Late', code: 'LATE', severity: 1 });
      const r = await svc.createViolationCategory('ns', { name: 'Late', code: 'LATE', severity: 1 });
      expect(r.code).toBe('LATE');
      expect(mockPrisma.violationCategory.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ tenantId: 'ns', code: 'LATE' }),
      }));
    });

    it('rejects duplicate code', async () => {
      mockPrisma.violationCategory.findUnique.mockResolvedValue({ id: 'vc-exist', code: 'LATE' });
      await expect(svc.createViolationCategory('ns', { name: 'Late', code: 'LATE', severity: 1 }))
        .rejects.toThrow(ConflictException);
    });
  });

  // -----------------------------------------------------------------------
  // DisciplinaryCase — BR-01 escalation
  // -----------------------------------------------------------------------
  describe('DisciplinaryCase — BR-01', () => {
    it('creates SP1 for first offense', async () => {
      mockPrisma.employee.findFirst.mockResolvedValue(mockEmployee);
      mockPrisma.violationCategory.findFirst.mockResolvedValue({ id: 'vc-1', canSkipSP1: false });
      mockPrisma.disciplinaryCase.findFirst.mockResolvedValue(null); // no active SP
      mockPrisma.disciplinaryCase.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'dc-1', ...data }),
      );

      const r = await svc.createDisciplinaryCase('ns', { employeeId: 'emp-1', violationCategoryId: 'vc-1', description: 'Late 30min' });
      expect(r.spLevel).toBe('SP1');
      expect(r.status).toBe('DRAFT');
    });

    it('escalates to SP2 when employee has active SP1', async () => {
      mockPrisma.employee.findFirst.mockResolvedValue(mockEmployee);
      mockPrisma.violationCategory.findFirst.mockResolvedValue({ id: 'vc-1', canSkipSP1: false });
      mockPrisma.disciplinaryCase.findFirst.mockResolvedValue({
        id: 'dc-active', spLevel: 'SP1', status: 'APPROVED', validUntil: new Date(Date.now() + 30 * 86400000),
      });
      mockPrisma.disciplinaryCase.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'dc-2', ...data }),
      );

      const r = await svc.createDisciplinaryCase('ns', { employeeId: 'emp-1', violationCategoryId: 'vc-1', description: 'Second offense' });
      expect(r.spLevel).toBe('SP2');
    });

    it('escalates to SP3 when employee has active SP2', async () => {
      mockPrisma.employee.findFirst.mockResolvedValue(mockEmployee);
      mockPrisma.violationCategory.findFirst.mockResolvedValue({ id: 'vc-1', canSkipSP1: false });
      mockPrisma.disciplinaryCase.findFirst.mockResolvedValue({
        id: 'dc-active', spLevel: 'SP2', status: 'ACKNOWLEDGED', validUntil: new Date(Date.now() + 30 * 86400000),
      });
      mockPrisma.disciplinaryCase.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'dc-3', ...data }),
      );

      const r = await svc.createDisciplinaryCase('ns', { employeeId: 'emp-1', violationCategoryId: 'vc-1', description: 'Third offense' });
      expect(r.spLevel).toBe('SP3');
    });

    it('skips to SP2 for canSkipSP1 violations', async () => {
      mockPrisma.employee.findFirst.mockResolvedValue(mockEmployee);
      mockPrisma.violationCategory.findFirst.mockResolvedValue({ id: 'vc-fraud', canSkipSP1: true });
      mockPrisma.disciplinaryCase.findFirst.mockResolvedValue(null);
      mockPrisma.disciplinaryCase.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'dc-4', ...data }),
      );

      const r = await svc.createDisciplinaryCase('ns', { employeeId: 'emp-1', violationCategoryId: 'vc-fraud', description: 'Fraud' });
      expect(r.spLevel).toBe('SP2');
    });

    it('rejects unknown employee', async () => {
      mockPrisma.employee.findFirst.mockResolvedValue(null);
      await expect(
        svc.createDisciplinaryCase('ns', { employeeId: 'emp-x', violationCategoryId: 'vc-1', description: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // Approval & Acknowledgment (BR-02)
  // -----------------------------------------------------------------------
  describe('Approval & Acknowledgment', () => {
    it('approves a DRAFT case', async () => {
      mockPrisma.disciplinaryCase.findFirst.mockResolvedValue({
        id: 'dc-1', tenantId: 'ns', status: 'DRAFT', spLevel: 'SP1', employeeId: 'emp-1', employee: {}, violationCategory: {},
      });
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-1', userRoles: [{ role: { name: 'Manager' } }], employee: null,
      });
      mockPrisma.disciplinaryCase.update.mockResolvedValue({ id: 'dc-1', status: 'APPROVED' });
      const r = await svc.approveDisciplinaryCase('ns', 'dc-1', 'user-1');
      expect(r.status).toBe('APPROVED');
    });

    it('menolak SP3 tanpa peran Legal/Direksi', async () => {
      mockPrisma.disciplinaryCase.findFirst.mockResolvedValue({
        id: 'dc-3', tenantId: 'ns', status: 'DRAFT', spLevel: 'SP3', employeeId: 'emp-1', employee: {}, violationCategory: {},
      });
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-2', userRoles: [{ role: { name: 'Manager' } }], employee: null,
      });
      await expect(svc.approveDisciplinaryCase('ns', 'dc-3', 'user-2')).rejects.toThrow(/Legal\/Direksi/);
      expect(mockPrisma.disciplinaryCase.update).not.toHaveBeenCalled();
    });

    it('mengizinkan SP3 oleh HR Admin dan menolak self-approval', async () => {
      mockPrisma.disciplinaryCase.findFirst.mockResolvedValue({
        id: 'dc-3', tenantId: 'ns', status: 'DRAFT', spLevel: 'SP3', employeeId: 'emp-1', employee: {}, violationCategory: {},
      });
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-hr', userRoles: [{ role: { name: 'HR Admin' } }], employee: null,
      });
      mockPrisma.disciplinaryCase.update.mockResolvedValue({ id: 'dc-3', status: 'APPROVED' });
      const r = await svc.approveDisciplinaryCase('ns', 'dc-3', 'user-hr');
      expect(r.status).toBe('APPROVED');

      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-self', userRoles: [{ role: { name: 'System Administrator' } }], employee: { id: 'emp-1' },
      });
      await expect(svc.approveDisciplinaryCase('ns', 'dc-3', 'user-self')).rejects.toThrow(/Self-approval/);
    });

    it('menandai terminationEligible saat pelanggaran baru di atas SP3 aktif', async () => {
      mockPrisma.employee.findFirst.mockResolvedValue(mockEmployee);
      mockPrisma.violationCategory.findFirst.mockResolvedValue({ id: 'vc-1', canSkipSP1: false });
      mockPrisma.disciplinaryCase.findFirst.mockResolvedValue({
        id: 'dc-sp3', spLevel: 'SP3', status: 'ACKNOWLEDGED', validUntil: new Date(Date.now() + 30 * 86400000),
      });
      mockPrisma.disciplinaryCase.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'dc-5', ...data }),
      );
      const r: any = await svc.createDisciplinaryCase('ns', { employeeId: 'emp-1', violationCategoryId: 'vc-1', description: 'Repeat' });
      expect(r.spLevel).toBe('SP3');
      expect(r.terminationEligible).toBe(true);
    });

    it('mengedarkan SP kedaluwarsa menjadi EXPIRED', async () => {
      mockPrisma.disciplinaryCase.updateMany.mockResolvedValue({ count: 2 });
      const n = await svc.expireSpCases('ns', new Date());
      expect(n).toBe(2);
      expect(mockPrisma.disciplinaryCase.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId: 'ns' }) }),
      );
    });

    it('rejects approving non-DRAFT case', async () => {
      mockPrisma.disciplinaryCase.findFirst.mockResolvedValue({
        id: 'dc-1', tenantId: 'ns', status: 'APPROVED', employee: {}, violationCategory: {},
      });
      await expect(svc.approveDisciplinaryCase('ns', 'dc-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('acknowledges an APPROVED case', async () => {
      mockPrisma.disciplinaryCase.findFirst.mockResolvedValue({
        id: 'dc-1', tenantId: 'ns', status: 'APPROVED', employee: {}, violationCategory: {},
      });
      mockPrisma.disciplinaryCase.update.mockResolvedValue({ id: 'dc-1', status: 'ACKNOWLEDGED', acknowledgedAt: new Date() });
      const r = await svc.acknowledgeDisciplinaryCase('ns', 'dc-1', {});
      expect(r.status).toBe('ACKNOWLEDGED');
    });
  });

  // -----------------------------------------------------------------------
  // IncidentReport
  // -----------------------------------------------------------------------
  describe('IncidentReport', () => {
    it('creates incident report', async () => {
      mockPrisma.employee.findFirst.mockResolvedValue(mockEmployee);
      mockPrisma.incidentReport.create.mockResolvedValue({ id: 'inc-1', category: 'NEAR_MISS' });
      const r = await svc.createIncidentReport('ns', {
        employeeId: 'emp-1', location: 'Warehouse', incidentDate: '2026-07-20',
        severity: 'MILD', category: 'NEAR_MISS', description: 'Almost fell',
      });
      expect(r.category).toBe('NEAR_MISS');
    });

    it('sets default deadline for CRITICAL incidents', async () => {
      mockPrisma.employee.findFirst.mockResolvedValue(mockEmployee);
      let savedData: any;
      mockPrisma.incidentReport.create.mockImplementation(({ data }: any) => { savedData = data; return Promise.resolve({ id: 'inc-2', ...data }); });
      await svc.createIncidentReport('ns', {
        employeeId: 'emp-1', location: 'Site', incidentDate: '2026-07-20',
        severity: 'CRITICAL', category: 'ACCIDENT', description: 'Major accident',
      });
      expect(savedData.authorityReportDeadline).toBeDefined();
      const diff = savedData.authorityReportDeadline.getTime() - Date.now();
      expect(diff).toBeGreaterThan(0);
      expect(diff).toBeLessThan(50 * 60 * 60 * 1000); // within ~48h
    });
  });

  // -----------------------------------------------------------------------
  // PpeAssignment
  // -----------------------------------------------------------------------
  describe('PpeAssignment', () => {
    it('creates PPE assignment', async () => {
      mockPrisma.employee.findFirst.mockResolvedValue(mockEmployee);
      mockPrisma.ppeAssignment.create.mockResolvedValue({ id: 'ppe-1', ppeType: 'Helmet', status: 'ACTIVE' });
      const r = await svc.createPpeAssignment('ns', { employeeId: 'emp-1', ppeType: 'Helmet' });
      expect(r.ppeType).toBe('Helmet');
    });

    it('expires active PPE', async () => {
      mockPrisma.ppeAssignment.findFirst.mockResolvedValue({ id: 'ppe-1', status: 'ACTIVE' });
      mockPrisma.ppeAssignment.update.mockResolvedValue({ id: 'ppe-1', status: 'EXPIRED' });
      const r = await svc.expirePpeAssignment('ns', 'ppe-1');
      expect(r.status).toBe('EXPIRED');
    });

    it('rejects expiring non-active PPE', async () => {
      mockPrisma.ppeAssignment.findFirst.mockResolvedValue({ id: 'ppe-1', status: 'EXPIRED' });
      await expect(svc.expirePpeAssignment('ns', 'ppe-1')).rejects.toThrow(BadRequestException);
    });
  });

  // -----------------------------------------------------------------------
  // K3 Dashboard
  // -----------------------------------------------------------------------
  describe('K3 Dashboard', () => {
    it('returns aggregated stats', async () => {
      mockPrisma.incidentReport.count.mockResolvedValueOnce(5); // total
      mockPrisma.incidentReport.count.mockResolvedValueOnce(2); // accidents
      mockPrisma.incidentReport.count.mockResolvedValueOnce(3); // nearMisses
      mockPrisma.incidentReport.count.mockResolvedValueOnce(1); // openInvestigations
      mockPrisma.incidentReport.count.mockResolvedValueOnce(0); // pendingAuthorityReport
      mockPrisma.ppeAssignment.count.mockResolvedValueOnce(2);  // ppeExpiringSoon

      const d = await svc.getK3Dashboard('ns');
      expect(d.totalIncidents).toBe(5);
      expect(d.accidents).toBe(2);
      expect(d.nearMisses).toBe(3);
      expect(d.nearMissToAccidentRatio).toBe('1.50');
      expect(d.openInvestigations).toBe(1);
      expect(d.ppeExpiringSoon).toBe(2);
    });
  });
});
