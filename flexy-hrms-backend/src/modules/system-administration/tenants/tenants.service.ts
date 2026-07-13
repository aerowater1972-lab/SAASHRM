import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateTenantDto } from './dto/create-tenant.dto';

/** Role default yang diseed setiap kali tenant baru diprovisioning
 * (bagian dari "tenant onboarding wizard", FR-03 System Administration). */
const DEFAULT_ROLES = ['System Admin', 'HR Admin', 'HR Manager', 'Line Manager', 'Employee'];

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateTenantDto, actorUserId: string) {
    const existing = await this.prisma.tenant.findUnique({ where: { domain: dto.domain } });
    if (existing) {
      throw new ConflictException(`Domain "${dto.domain}" sudah digunakan tenant lain.`);
    }

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.name,
        domain: dto.domain,
        licensePackage: dto.licensePackage ?? 'standard',
      },
    });

    // Seed role default — bagian dari wizard onboarding (FR-03).
    await this.prisma.role.createMany({
      data: DEFAULT_ROLES.map((name) => ({
        tenantId: tenant.id,
        name,
        isCustom: false,
      })),
    });

    // BR-01: setiap tenant wajib memiliki minimal satu akun System Admin —
    // ditegakkan lebih lanjut di UsersService (di luar cakupan increment ini);
    // di sini kita hanya memastikan role System Admin tersedia.

    await this.auditService.ingest({
      tenantId: tenant.id,
      module: 'system_administration',
      entity: 'tenant',
      entityId: tenant.id,
      action: 'create',
      changedBy: actorUserId,
      diff: { after: { name: tenant.name, domain: tenant.domain } },
    });

    return tenant;
  }

  async findById(id: string) {
    return this.prisma.tenant.findUniqueOrThrow({ where: { id } });
  }

  async list() {
    return this.prisma.tenant.findMany({ orderBy: { createdAt: 'desc' } });
  }
}
