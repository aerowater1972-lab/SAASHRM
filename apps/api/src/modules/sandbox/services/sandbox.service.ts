import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { Department, Employee, Position } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { SampleType } from '../dto/sandbox-setup.dto';

interface SampleConfig {
  type: SampleType;
  records: {
    departments: number;
    positions: number;
    employees: number;
    attendanceRecords: number;
  };
}

@Injectable()
export class SandboxService {
  private readonly logger = new Logger(SandboxService.name);

  private readonly configs: Record<SampleType, SampleConfig> = {
    minimal: {
      type: 'minimal',
      records: { departments: 1, positions: 1, employees: 1, attendanceRecords: 5 },
    },
    demo: {
      type: 'demo',
      records: { departments: 2, positions: 3, employees: 5, attendanceRecords: 25 },
    },
    full: {
      type: 'full',
      records: { departments: 4, positions: 12, employees: 10, attendanceRecords: 200 },
    },
  };

  constructor(private readonly prisma: PrismaService) {}

  async setup(tenantId: string, sampleType: SampleType = 'demo') {
    const config = this.configs[sampleType];
    if (!config) {
      throw new BadRequestException(`Unknown sample type: ${sampleType}`);
    }
    this.logger.log(`Setting up sandbox ${sampleType} for tenant ${tenantId}`);
    const stamp = Date.now();

    const result = await this.prisma.$transaction(async (tx) => {
      // Reuse an existing organization when the tenant already has one
      let org = await tx.organization.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'asc' },
      });
      if (!org) {
        org = await tx.organization.create({
          data: {
            tenantId,
            name: 'Sandbox Organization',
            code: `SBX-ORG-${stamp}`,
          },
        });
      }

      // Departments
      const departments: Department[] = [];
      for (let i = 0; i < config.records.departments; i++) {
        const dept = await tx.department.create({
          data: {
            tenantId,
            organizationId: org.id,
            name: `Sandbox Department ${i + 1}`,
            code: `SBX-DEPT-${stamp}-${i}`,
            status: 'ACTIVE',
          },
        });
        departments.push(dept);
      }

      // Positions
      const positions: Position[] = [];
      for (let i = 0; i < config.records.positions; i++) {
        const pos = await tx.position.create({
          data: {
            tenantId,
            departmentId: departments[i % departments.length].id,
            name: `Sandbox Position ${i + 1}`,
            code: `SBX-POS-${stamp}-${i}`,
          },
        });
        positions.push(pos);
      }

      // Employees + employment
      const employees: Employee[] = [];
      for (let i = 0; i < config.records.employees; i++) {
        const emp = await tx.employee.create({
          data: {
            tenantId,
            employeeId: `SBX-${stamp}-${i}`,
            fullName: `Sandbox Employee ${i + 1}`,
            email: `sandbox-${stamp}-${i}@example.test`,
            gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
            birthDate: new Date(Date.now() - (30 - i) * 365 * 24 * 60 * 60 * 1000),
            status: 'ACTIVE',
          },
        });

        await tx.employment.create({
          data: {
            employeeId: emp.id,
            departmentId: departments[i % departments.length].id,
            positionId: positions[i % positions.length].id,
            startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
            salary: 5000000 + i * 1000000,
            isActive: true,
          },
        });

        employees.push(emp);
      }

      // Attendance records (unique employeeId + date per schema constraint)
      for (let i = 0; i < config.records.attendanceRecords; i++) {
        const emp = employees[i % employees.length];
        const dayOffset = 1 + Math.floor(i / employees.length);
        const day = new Date();
        day.setHours(0, 0, 0, 0);
        day.setDate(day.getDate() - dayOffset);
        await tx.attendanceRecord.create({
          data: {
            tenantId,
            employeeId: emp.id,
            date: day,
            clockIn: new Date(day.getTime() + 9 * 60 * 60 * 1000),
            clockOut: new Date(day.getTime() + 17 * 60 * 60 * 1000),
            status: 'PRESENT',
          },
        });
      }

      return {
        departments: departments.length,
        positions: positions.length,
        employees: employees.length,
        attendanceRecords: config.records.attendanceRecords,
      };
    });

    const recordsCreated =
      result.departments + result.positions + result.employees + result.attendanceRecords;

    const sandbox = await this.prisma.sandboxEnvironment.create({
      data: {
        tenantId,
        status: 'active',
        sampleType,
        recordsCreated,
      },
    });

    this.logger.log(`Sandbox ${sandbox.id} provisioned: ${JSON.stringify(result)}`);
    return {
      id: sandbox.id,
      message: 'Sandbox environment provisioned successfully',
      data: result,
      sampleType,
    };
  }

  async findAll(tenantId: string) {
    return this.prisma.sandboxEnvironment.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStatus(id: string, tenantId: string) {
    const sandbox = await this.prisma.sandboxEnvironment.findFirst({
      where: { id, tenantId },
    });
    if (!sandbox) {
      throw new BadRequestException('Sandbox environment not found');
    }
    return sandbox;
  }

  async cleanup(id: string, tenantId: string) {
    const sandbox = await this.prisma.sandboxEnvironment.findFirst({
      where: { id, tenantId },
    });
    if (!sandbox) {
      throw new BadRequestException('Sandbox environment not found');
    }
    await this.prisma.sandboxEnvironment.delete({ where: { id } });
    return { message: 'Sandbox environment cleaned up', id };
  }
}

