import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppModule } from '../src/app.module';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from '../src/modules/employee/services/employee.service';

/**
 * Validates ADR-0001 Decision 2: multi-tenancy is enforced at the application
 * layer by scoping every query with `tenantId`. This test proves that the
 * EmployeeService gateway (the single entry point to employee data for all
 * other modules) never returns a row owned by a different tenant.
 */
describe('Multi-tenant isolation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let employeeService: EmployeeService;

  const TENANT_A = 'iso-tenant-a';
  const TENANT_B = 'iso-tenant-b';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ envFilePath: '.env' }), AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    employeeService = app.get(EmployeeService);

    // Create two isolated tenant entities (both under the seeded "default" Tenant)
    // so we can scope employees under each and prove no cross-tenant leakage.
    await prisma.tenantEntity.upsert({
      where: { id: TENANT_A },
      update: {},
      create: { id: TENANT_A, tenantId: 'default', name: 'Isolation Tenant A', code: 'ISOA' },
    });
    await prisma.tenantEntity.upsert({
      where: { id: TENANT_B },
      update: {},
      create: { id: TENANT_B, tenantId: 'default', name: 'Isolation Tenant B', code: 'ISOB' },
    });
  });

  afterAll(async () => {
    await prisma.employee.deleteMany({ where: { employeeId: { startsWith: 'iso-emp-' } } });
    await prisma.tenantEntity.deleteMany({ where: { id: { in: [TENANT_A, TENANT_B] } } });
    await app.close();
  });

  it('keeps employees isolated between tenants via EmployeeService', async () => {
    const empA = await prisma.employee.create({
      data: {
        tenantId: TENANT_A,
        employeeId: `iso-emp-${Date.now()}-a`,
        fullName: 'Tenant A Employee',
        email: `iso-emp-${Date.now()}-a@flexy.local`,
        status: 'ACTIVE',
      },
    });
    const empB = await prisma.employee.create({
      data: {
        tenantId: TENANT_B,
        employeeId: `iso-emp-${Date.now()}-b`,
        fullName: 'Tenant B Employee',
        email: `iso-emp-${Date.now()}-b@flexy.local`,
        status: 'ACTIVE',
      },
    });

    // findById is correctly scoped per tenant.
    const foundA = await employeeService.findById(TENANT_A, empA.id);
    const foundB = await employeeService.findById(TENANT_B, empB.id);
    expect(foundA?.id).toBe(empA.id);
    expect(foundB?.id).toBe(empB.id);

    // Cross-tenant lookups must never resolve.
    expect(await employeeService.findById(TENANT_A, empB.id)).toBeNull();
    expect(await employeeService.findById(TENANT_B, empA.id)).toBeNull();

    // findActive returns only the calling tenant's employees.
    const activeA = await employeeService.findActive(TENANT_A);
    const activeB = await employeeService.findActive(TENANT_B);
    const idsA = activeA.map((e: any) => e.id);
    const idsB = activeB.map((e: any) => e.id);

    expect(idsA).toContain(empA.id);
    expect(idsA).not.toContain(empB.id);
    expect(idsB).toContain(empB.id);
    expect(idsB).not.toContain(empA.id);
  });
});
