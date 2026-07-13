import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { CreateDepartmentDto } from '../dto/create-department.dto';
import { CreatePositionDto } from '../dto/create-position.dto';
import { CreateGradeDto } from '../dto/create-grade.dto';

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrganization(tenantId: string, dto: { name: string; code: string; description?: string; parentId?: string; headUserId?: string; effectiveDate?: string }) {
    const existing = await this.prisma.organization.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException('Organization code already exists');
    }

    let level = 0;
    if (dto.parentId) {
      const parent = await this.prisma.organization.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Parent organization not found');
      level = parent.level + 1;
    }

    return this.prisma.organization.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        parentId: dto.parentId,
        level,
        headUserId: dto.headUserId,
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : new Date(),
      },
      include: { children: true, departments: true },
    });
  }

  async getOrganizationTree(tenantId: string) {
    const orgs = await this.prisma.organization.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        children: { where: { deletedAt: null } },
        departments: {
          where: { deletedAt: null },
          include: {
            children: { where: { deletedAt: null } },
            positions: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: { level: 'asc' },
    });

    return this.buildOrgTree(orgs, null);
  }

  private buildOrgTree(orgs: any[], parentId: string | null): any[] {
    return orgs
      .filter((o) => o.parentId === parentId)
      .map((o) => ({
        ...o,
        children: this.buildOrgTree(orgs, o.id),
      }));
  }

  async getOrganization(tenantId: string, id: string) {
    const org = await this.prisma.organization.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        parent: true,
        children: { where: { deletedAt: null } },
        departments: {
          where: { deletedAt: null },
          include: {
            children: { where: { deletedAt: null } },
            positions: { where: { deletedAt: null } },
          },
        },
      },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async updateOrganization(tenantId: string, id: string, dto: { name?: string; description?: string; parentId?: string; headUserId?: string; status?: string }) {
    await this.getOrganization(tenantId, id);

    let level: number | undefined;
    if (dto.parentId) {
      const parent = await this.prisma.organization.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Parent organization not found');
      level = parent.level + 1;
    }

    return this.prisma.organization.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        parentId: dto.parentId,
        headUserId: dto.headUserId,
        level,
        status: dto.status as any,
      },
      include: { children: true, departments: true },
    });
  }

  async createDepartment(tenantId: string, dto: CreateDepartmentDto) {
    const existing = await this.prisma.department.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code } },
    });
    if (existing) throw new ConflictException('Department code already exists');

    await this.getOrganization(tenantId, dto.organizationId);

    let level = 0;
    if (dto.parentId) {
      const parent = await this.prisma.department.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Parent department not found');
      level = parent.level + 1;
    }

    return this.prisma.department.create({
      data: {
        tenantId,
        organizationId: dto.organizationId,
        entityId: dto.entityId,
        name: dto.name,
        code: dto.code,
        headEmployeeId: dto.headEmployeeId,
        parentId: dto.parentId,
        level,
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : new Date(),
      },
      include: { parent: true, positions: true },
    });
  }

  async getDepartments(tenantId: string) {
    return this.prisma.department.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        organization: true,
        parent: true,
        children: { where: { deletedAt: null } },
        positions: { where: { deletedAt: null } },
      },
      orderBy: { level: 'asc' },
    });
  }

  async getDepartment(tenantId: string, id: string) {
    const dept = await this.prisma.department.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        organization: true,
        parent: true,
        children: { where: { deletedAt: null } },
        positions: { where: { deletedAt: null } },
      },
    });
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  async updateDepartment(tenantId: string, id: string, dto: Partial<CreateDepartmentDto> & { status?: string }) {
    await this.getDepartment(tenantId, id);

    if (dto.parentId) {
      const parent = await this.prisma.department.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Parent department not found');
    }

    return this.prisma.department.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        headEmployeeId: dto.headEmployeeId,
        parentId: dto.parentId,
        status: dto.status as any,
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : undefined,
      },
      include: { parent: true, children: true, positions: true },
    });
  }

  async createPosition(tenantId: string, dto: CreatePositionDto) {
    await this.getDepartment(tenantId, dto.departmentId);

    const existing = await this.prisma.position.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code } },
    });
    if (existing) throw new ConflictException('Position code already exists');

    return this.prisma.position.create({
      data: {
        tenantId,
        departmentId: dto.departmentId,
        name: dto.name,
        code: dto.code,
        gradeId: dto.gradeId,
        description: dto.description,
        isHead: dto.isHead ?? false,
        maxHeadCount: dto.maxHeadCount,
      },
      include: { department: true, grade: true },
    });
  }

  async getPositions(tenantId: string) {
    return this.prisma.position.findMany({
      where: { tenantId, deletedAt: null },
      include: { department: true, grade: true },
      orderBy: { name: 'asc' },
    });
  }

  async updatePosition(tenantId: string, id: string, dto: Partial<CreatePositionDto>) {
    const pos = await this.prisma.position.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!pos) throw new NotFoundException('Position not found');

    return this.prisma.position.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        gradeId: dto.gradeId,
        description: dto.description,
        isHead: dto.isHead,
        maxHeadCount: dto.maxHeadCount,
      },
      include: { department: true, grade: true },
    });
  }

  async createGrade(tenantId: string, dto: CreateGradeDto) {
    const existing = await this.prisma.grade.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code } },
    });
    if (existing) throw new ConflictException('Grade code already exists');

    return this.prisma.grade.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        level: dto.level,
        description: dto.description,
      },
    });
  }

  async getGrades(tenantId: string) {
    return this.prisma.grade.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { level: 'asc' },
    });
  }

  async getOrgChart(tenantId: string, effectiveDate?: string) {
    const dateFilter = effectiveDate ? new Date(effectiveDate) : new Date();

    const departments = await this.prisma.department.findMany({
      where: {
        tenantId,
        deletedAt: null,
        effectiveDate: { lte: dateFilter },
      },
      include: {
        children: { where: { deletedAt: null } },
        positions: {
          where: { deletedAt: null },
          include: {
            employments: {
              where: { isActive: true, startDate: { lte: dateFilter } },
              include: {
                employee: {
                  select: {
                    id: true,
                    fullName: true,
                    employeeId: true,
                    profilePicture: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { level: 'asc' },
    });

    return this.buildDeptTree(departments, null);
  }

  private buildDeptTree(depts: any[], parentId: string | null): any[] {
    return depts
      .filter((d) => d.parentId === parentId)
      .map((d) => ({
        ...d,
        children: this.buildDeptTree(depts, d.id),
      }));
  }
}
