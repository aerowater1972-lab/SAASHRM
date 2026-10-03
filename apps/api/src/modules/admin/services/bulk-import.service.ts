import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { BulkImportDto, BulkImportResultDto } from '../dto/bulk-import.dto';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { UserStatus } from '@prisma/client';

const SALT_ROUNDS = 12;

@Injectable()
export class BulkImportService {
  constructor(private readonly prisma: PrismaService) {}

  async bulkImportEmployees(tenantId: string, dto: BulkImportDto): Promise<BulkImportResultDto> {
    const result: BulkImportResultDto = {
      total: dto.rows.length,
      success: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < dto.rows.length; i++) {
      const row = dto.rows[i];
      const email = row.email?.trim();
      const fullName = row.fullName?.trim() || row.name?.trim();

      if (!email || !fullName) {
        result.failed++;
        result.errors?.push({ row: i + 2, field: 'email/fullName', message: 'email and fullName are required' });
        continue;
      }

      const existing = await this.prisma.user.findUnique({
        where: { tenantId_email: { tenantId, email } },
      });
      if (existing) {
        result.failed++;
        result.errors?.push({ row: i + 2, field: 'email', message: `User with email ${email} already exists` });
        continue;
      }

      const password = randomBytes(8).toString('hex');
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      try {
        await this.prisma.user.create({
          data: {
            tenantId,
            email,
            fullName,
            phone: row.phone?.trim() || undefined,
            status: (row.status as UserStatus) || UserStatus.ACTIVE,
            passwordHash,
            employeeId: row.employeeId?.trim() || undefined,
          },
        });
        result.success++;
      } catch (err: any) {
        result.failed++;
        result.errors?.push({ row: i + 2, field: 'database', message: err?.message || 'Unknown error' });
      }
    }

    return result;
  }
}