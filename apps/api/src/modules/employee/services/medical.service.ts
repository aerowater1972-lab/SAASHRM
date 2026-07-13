import { Injectable, NotFoundException } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { PrismaService } from '@common/prisma/prisma.service';
import { encrypt, decrypt } from '@common/util/encryption.util';

export class UpdateMedicalDto {
  @IsOptional()
  @IsString()
  bloodType?: string;

  @IsOptional()
  @IsString()
  allergies?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

@Injectable()
export class MedicalService {
  constructor(private readonly prisma: PrismaService) {}

  async get(tenantId: string, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId, deletedAt: null },
      select: { id: true, bloodType: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const rec = await this.prisma.employeeMedical.findUnique({ where: { employeeId } });
    return {
      bloodType: employee.bloodType,
      allergies: rec?.allergies ? decrypt(rec.allergies) : null,
      notes: rec?.notes ? decrypt(rec.notes) : null,
    };
  }

  async upsert(tenantId: string, employeeId: string, dto: UpdateMedicalDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const data: { bloodType?: string; allergies?: string | null; notes?: string | null } = {};
    if (dto.bloodType !== undefined) data.bloodType = dto.bloodType;
    if (dto.allergies !== undefined) data.allergies = encrypt(dto.allergies);
    if (dto.notes !== undefined) data.notes = encrypt(dto.notes);

    const rec = await this.prisma.employeeMedical.upsert({
      where: { employeeId },
      update: data,
      create: { employeeId, ...data },
    });

    return {
      bloodType: rec.bloodType,
      allergies: rec.allergies ? decrypt(rec.allergies) : null,
      notes: rec.notes ? decrypt(rec.notes) : null,
    };
  }
}
