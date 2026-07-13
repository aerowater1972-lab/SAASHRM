import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from '@modules/employee/services/employee.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';

// BR-02: these personal-data fields are sensitive and must go through HR
// Admin approval before they take effect (NPWP, BPJS/social security number).
const SENSITIVE_FIELDS = ['taxIdNumber', 'socialSecurityNumber', 'npwp'] as const;

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly employeeService: EmployeeService,
  ) {}

  async getProfile(tenantId: string, employeeId: string) {
    const employee = await this.employeeService.findById(tenantId, employeeId);
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async updateProfile(tenantId: string, employeeId: string, dto: UpdateProfileDto) {
    const employee = await this.employeeService.findById(tenantId, employeeId);
    if (!employee) throw new NotFoundException('Employee not found');

    const basic: Record<string, any> = {};
    const sensitive: Record<string, any> = {};

    for (const [key, value] of Object.entries(dto)) {
      if (value === undefined) continue;
      if ((SENSITIVE_FIELDS as readonly string[]).includes(key)) {
        sensitive[key] = value;
      } else {
        basic[key] = value;
      }
    }

    // Normalize npwp alias to the canonical taxIdNumber field.
    if (sensitive.npwp) {
      sensitive.taxIdNumber = sensitive.taxIdNumber ?? sensitive.npwp;
      delete sensitive.npwp;
    }

    let applied: any = null;
    if (Object.keys(basic).length) {
      if (basic.email && basic.email !== employee.email) {
        const exists = await this.employeeService.emailExists(tenantId, basic.email, employeeId);
        if (exists) throw new ConflictException('Email already in use');
      }
      applied = await this.employeeService.update(tenantId, employeeId, basic as any);
    }

    // BR-02: sensitive changes are NOT applied directly — they wait for HR approval.
    let pendingSensitiveChanges: any = null;
    if (Object.keys(sensitive).length) {
      pendingSensitiveChanges = await this.prisma.essProfileChangeRequest.create({
        data: { tenantId, employeeId, fields: sensitive as any, status: 'PENDING' },
      });
    }

    return {
      profile: applied,
      pendingSensitiveChanges,
      message: pendingSensitiveChanges
        ? 'Basic data updated. Sensitive fields (NPWP/BPJS) require HR Admin approval and are pending.'
        : undefined,
    };
  }

  // ----- HR Admin review of sensitive change requests (BR-02) -----

  async listChangeRequests(tenantId: string, status?: string) {
    return this.prisma.essProfileChangeRequest.findMany({
      where: { tenantId, ...(status ? { status } : {}) },
      include: {
        employee: { select: { id: true, fullName: true, employeeId: true } },
      },
      orderBy: { requestedAt: 'desc' },
    });
  }

  async reviewChangeRequest(
    tenantId: string,
    id: string,
    reviewedBy: string,
    approve: boolean,
    note?: string,
  ) {
    const req = await this.prisma.essProfileChangeRequest.findUnique({ where: { id } });
    if (!req || req.tenantId !== tenantId) {
      throw new NotFoundException('Change request not found');
    }
    if (req.status !== 'PENDING') {
      throw new BadRequestException('Change request has already been reviewed');
    }

    // BR-02: only apply the sensitive fields once HR Admin approves.
    if (approve) {
      await this.employeeService.update(tenantId, req.employeeId, req.fields as any);
    }

    return this.prisma.essProfileChangeRequest.update({
      where: { id },
      data: {
        status: approve ? 'APPROVED' : 'REJECTED',
        reviewedBy,
        reviewedAt: new Date(),
        note,
      },
    });
  }

  async getDocuments(tenantId: string, employeeId: string) {
    const employee = await this.employeeService.findById(tenantId, employeeId);
    if (!employee) throw new NotFoundException('Employee not found');

    return this.employeeService.getDocuments(tenantId, employeeId);
  }

  async getEmployment(tenantId: string, employeeId: string) {
    const employee = await this.employeeService.findById(tenantId, employeeId);
    if (!employee) throw new NotFoundException('Employee not found');

    return this.employeeService.getEmploymentHistory(tenantId, employeeId);
  }

  async uploadPhoto(tenantId: string, employeeId: string, file: Express.Multer.File) {
    const employee = await this.employeeService.findById(tenantId, employeeId);
    if (!employee) throw new NotFoundException('Employee not found');

    return this.employeeService.setProfilePicture(tenantId, employeeId, file.path || file.filename);
  }
}
