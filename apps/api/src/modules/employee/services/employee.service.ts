import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { paginate, Paginated } from '@common/prisma/pagination.util';
import { encrypt } from '@common/util/encryption.util';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { EmployeeFilterDto } from '../dto/employee-filter.dto';
import { Prisma, EmployeeStatus, Employee } from '@prisma/client';

@Injectable()
export class EmployeeService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateEmployeeDto) {
    const employeeId = dto.employeeId ?? (await this.generateEmployeeId(tenantId));

    const existing = await this.prisma.employee.findUnique({
      where: { tenantId_employeeId: { tenantId, employeeId } },
    });
    if (existing) {
      throw new ConflictException('Employee ID already exists');
    }

    const emailExists = await this.prisma.employee.findUnique({
      where: { tenantId_email: { tenantId, email: dto.email } },
    });
    if (emailExists) {
      throw new ConflictException('Email already exists');
    }

    const created = await this.prisma.employee.create({
      data: {
        tenantId,
        employeeId,
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        alternativePhone: dto.alternativePhone,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        birthPlace: dto.birthPlace,
        gender: dto.gender as any,
        religion: dto.religion,
        maritalStatus: (dto.maritalStatus as any) ?? 'SINGLE',
        idCardNumber: dto.idCardNumber,
        taxIdNumber: dto.taxIdNumber,
        socialSecurityNumber: dto.socialSecurityNumber,
        bloodType: dto.bloodType,
        address: dto.address,
        city: dto.city,
        province: dto.province,
        postalCode: dto.postalCode,
        emergencyContact: dto.emergencyContact,
        emergencyPhone: dto.emergencyPhone,
        profilePicture: dto.profilePicture,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        notes: dto.notes,
      },
      include: {
        employments: true,
        documents: true,
      },
    });

    await this.syncMedical(created.id, dto);
    return created;
  }

  async findAll(
    tenantId: string,
    filters: EmployeeFilterDto,
  ): Promise<Employee[] | Paginated<Employee>> {
    const where: Prisma.EmployeeWhereInput = { tenantId, deletedAt: null };

    if (filters.status) {
      where.status = filters.status;
    }

    const term = filters.q ?? filters.search;
    if (term) {
      const s = term;
      where.OR = [
        { fullName: { contains: s, mode: 'insensitive' } },
        { employeeId: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s, mode: 'insensitive' } },
      ];
    }

    if (filters.departmentId) {
      where.employments = {
        some: { departmentId: filters.departmentId, isActive: true },
      };
    }

    if (filters.gradeId) {
      where.employments = {
        ...((where.employments as any) || {}),
        some: {
          ...(((where.employments as any)?.some as object) || {}),
          gradeId: filters.gradeId,
          isActive: true,
        },
      };
    }

    return paginate(
      this.prisma.employee,
      {
        where,
        include: {
          employments: {
            where: { isActive: true },
            include: { department: true, position: true, grade: true },
          },
          documents: { where: { status: 'ACTIVE' as any } },
        },
        orderBy: { createdAt: 'desc' },
      },
      filters.page,
      filters.limit,
    );
  }

  async findOne(tenantId: string, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        employments: {
          include: { department: true, position: true, grade: true },
          orderBy: { startDate: 'desc' },
        },
        documents: true,
      },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    return employee;
  }

  async findById(tenantId: string, id: string): Promise<any> {
    return this.prisma.employee.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        employments: {
          where: { isActive: true },
          include: { department: true, position: true, grade: true },
        },
        documents: { where: { status: 'ACTIVE' as any } },
      },
    });
  }

  async emailExists(tenantId: string, email: string, excludeId?: string): Promise<boolean> {
    const existing = await this.prisma.employee.findFirst({
      where: { tenantId, email, id: { not: excludeId }, deletedAt: null },
      select: { id: true },
    });
    return !!existing;
  }

  async findActive(tenantId: string, include?: Prisma.EmployeeInclude): Promise<any[]> {
    return this.prisma.employee.findMany({
      where: { tenantId, deletedAt: null, status: EmployeeStatus.ACTIVE },
      include:
        include ??
        {
          employments: {
            where: { isActive: true },
            include: { department: true, position: true, grade: true },
          },
        },
    });
  }

  async findSubordinates(
    tenantId: string,
    departmentIds: string[],
    excludeId?: string,
  ): Promise<{ id: string }[]> {
    if (!departmentIds.length) return [];
    return this.prisma.employee.findMany({
      where: {
        tenantId,
        deletedAt: null,
        employments: { some: { departmentId: { in: departmentIds }, isActive: true } },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
  }

  async activate(tenantId: string, id: string): Promise<any> {
    return this.prisma.employee.update({
      where: { id },
      data: { status: EmployeeStatus.ACTIVE },
    });
  }

  async deactivate(tenantId: string, id: string, endDate?: Date): Promise<any> {
    return this.prisma.employee.update({
      where: { id },
      data: { status: EmployeeStatus.INACTIVE, endDate: endDate ?? new Date() },
    });
  }

  async setProfilePicture(tenantId: string, id: string, url: string): Promise<any> {
    return this.prisma.employee.update({
      where: { id },
      data: { profilePicture: url },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateEmployeeDto) {
    await this.findOne(tenantId, id);

    if (dto.email) {
      const existing = await this.prisma.employee.findFirst({
        where: { tenantId, email: dto.email, id: { not: id }, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException('Email already in use');
      }
    }

    const updated = await this.prisma.employee.update({
      where: { id },
      data: {
        ...dto,
        employeeId: undefined,
        allergies: undefined,
        medicalNotes: undefined,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        gender: dto.gender as any,
        maritalStatus: dto.maritalStatus as any,
      },
      include: {
        employments: {
          include: { department: true, position: true, grade: true },
        },
        documents: true,
      },
    });

    await this.syncMedical(id, dto);
    return updated;
  }

  /**
   * FR-05: persist sensitive medical data (allergies, notes) encrypted in EmployeeMedical.
   */
  private async syncMedical(
    employeeId: string,
    dto: { allergies?: string; medicalNotes?: string },
  ) {
    if (dto.allergies === undefined && dto.medicalNotes === undefined) return;
    await this.prisma.employeeMedical.upsert({
      where: { employeeId },
      update: {
        allergies: dto.allergies !== undefined ? encrypt(dto.allergies) : undefined,
        notes: dto.medicalNotes !== undefined ? encrypt(dto.medicalNotes) : undefined,
      },
      create: {
        employeeId,
        allergies: dto.allergies ? encrypt(dto.allergies) : null,
        notes: dto.medicalNotes ? encrypt(dto.medicalNotes) : null,
      },
    });
  }

  /**
   * FR-03 / BR-01: generate a tenant-unique, immutable Employee ID.
   * Format: EMP##### (zero-padded sequence within the tenant).
   */
  private async generateEmployeeId(tenantId: string): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const count = await this.prisma.employee.count({ where: { tenantId } });
      const candidate = `EMP${String(count + 1).padStart(5, '0')}`;
      const exists = await this.prisma.employee.findUnique({
        where: { tenantId_employeeId: { tenantId, employeeId: candidate } },
      });
      if (!exists) return candidate;
    }
    return `EMP${Date.now().toString().slice(-8)}`;
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.employee.update({
      where: { id },
      data: { deletedAt: new Date(), status: EmployeeStatus.INACTIVE },
    });
  }

  async uploadDocument(
    tenantId: string,
    employeeId: string,
    file: Express.Multer.File,
    type: string,
    notes?: string,
  ) {
    await this.findOne(tenantId, employeeId);

    return this.prisma.employeeDocument.create({
      data: {
        employeeId,
        type: type as any,
        fileName: file.originalname,
        fileUrl: file.path || file.filename,
        fileSize: file.size,
        mimeType: file.mimetype,
        notes,
      },
    });
  }

  async getDocuments(tenantId: string, employeeId: string) {
    await this.findOne(tenantId, employeeId);
    return this.prisma.employeeDocument.findMany({
      where: { employeeId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async getEmploymentHistory(tenantId: string, employeeId: string) {
    await this.findOne(tenantId, employeeId);
    return this.prisma.employment.findMany({
      where: { employeeId },
      include: { department: true, position: true, grade: true },
      orderBy: { startDate: 'desc' },
    });
  }

  async bulkImport(tenantId: string, employees: CreateEmployeeDto[]) {
    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (const dto of employees) {
      try {
        await this.create(tenantId, dto);
        results.created++;
      } catch (err) {
        if (err instanceof ConflictException) {
          results.skipped++;
        } else {
          results.errors.push(`[${dto.employeeId}] ${(err as Error).message}`);
        }
      }
    }

    return results;
  }

  async export(tenantId: string, filters: EmployeeFilterDto) {
    const result = await this.findAll(tenantId, { ...filters, page: undefined });
    const employees = (Array.isArray(result) ? result : result.data) as any[];
    return employees.map((emp) => ({
      employeeId: emp.employeeId,
      fullName: emp.fullName,
      email: emp.email,
      phone: emp.phone,
      gender: emp.gender,
      maritalStatus: emp.maritalStatus,
      status: emp.status,
      department: emp.employments[0]?.department?.name ?? null,
      position: emp.employments[0]?.position?.name ?? null,
      grade: emp.employments[0]?.grade?.name ?? null,
      startDate: emp.startDate,
      birthDate: emp.birthDate,
      city: emp.city,
      province: emp.province,
    }));
  }
}
