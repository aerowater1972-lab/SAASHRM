import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { EmployeeService } from '@modules/employee/services/employee.service';
import { paginate, Paginated } from '@common/prisma/pagination.util';
import { Prisma, AssetStatus, Asset } from '@prisma/client';
import { CreateAssetDto, UpdateAssetDto } from '../dto/create-asset.dto';
import { AssignAssetDto, ReturnAssetDto } from '../dto/assign-asset.dto';
import { AssetListQueryDto } from '../dto/asset-list-query.dto';

@Injectable()
export class AssetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly employeeService: EmployeeService,
  ) {}

  async create(tenantId: string, dto: CreateAssetDto) {
    const existing = await this.prisma.asset.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code } },
    });
    if (existing) {
      throw new ConflictException('Asset code already exists');
    }

    return this.prisma.asset.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        category: dto.category,
        brand: dto.brand,
        model: dto.model,
        serialNumber: dto.serialNumber,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        purchasePrice: dto.purchasePrice,
        condition: dto.condition ?? 'NEW' as any,
        notes: dto.notes,
      },
      include: { assignments: true },
    });
  }

  async findAll(
    tenantId: string,
    filters: AssetListQueryDto,
  ): Promise<Asset[] | Paginated<Asset>> {
    const where: Prisma.AssetWhereInput = { tenantId, deletedAt: null };

    if (filters.category) {
      where.category = filters.category as any;
    }

    if (filters.status) {
      where.status = filters.status as any;
    }

    const term = filters.q ?? filters.search;
    if (term) {
      const s = term;
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { code: { contains: s, mode: 'insensitive' } },
        { serialNumber: { contains: s, mode: 'insensitive' } },
        { brand: { contains: s, mode: 'insensitive' } },
        { model: { contains: s, mode: 'insensitive' } },
      ];
    }

    return paginate(
      this.prisma.asset,
      {
        where,
        include: {
          assignments: {
            where: { returnedAt: null },
            include: { employee: { select: { id: true, fullName: true, employeeId: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      filters.page,
      filters.limit,
    );
  }

  async findOne(tenantId: string, id: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        assignments: {
          include: { employee: { select: { id: true, fullName: true, employeeId: true } } },
          orderBy: { assignedAt: 'desc' },
        },
      },
    });
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }
    return asset;
  }

  async update(tenantId: string, id: string, dto: UpdateAssetDto) {
    await this.findOne(tenantId, id);

    if (dto.code) {
      const existing = await this.prisma.asset.findFirst({
        where: { tenantId, code: dto.code, id: { not: id }, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException('Asset code already in use');
      }
    }

    return this.prisma.asset.update({
      where: { id },
      data: {
        ...dto,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        purchasePrice: dto.purchasePrice,
      },
      include: { assignments: true },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.asset.update({
      where: { id },
      data: { deletedAt: new Date(), status: AssetStatus.RETIRED },
    });
  }

  async assign(tenantId: string, assetId: string, dto: AssignAssetDto) {
    const asset = await this.findOne(tenantId, assetId);

    if (asset.status !== AssetStatus.AVAILABLE) {
      throw new BadRequestException(
        `Asset cannot be assigned because it is currently ${asset.status.toLowerCase()}`,
      );
    }

    const employee = await this.employeeService.findById(tenantId, dto.employeeId);
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    await this.prisma.asset.update({
      where: { id: assetId },
      data: { status: AssetStatus.ASSIGNED },
    });

    return this.prisma.assetAssignment.create({
      data: {
        assetId,
        employeeId: dto.employeeId,
        notes: dto.notes,
      },
      include: {
        asset: true,
        employee: { select: { id: true, fullName: true, employeeId: true } },
      },
    });
  }

  async returnAsset(tenantId: string, assetId: string, dto: ReturnAssetDto) {
    const asset = await this.findOne(tenantId, assetId);

    if (asset.status !== AssetStatus.ASSIGNED) {
      throw new BadRequestException(
        `Asset cannot be returned because it is currently ${asset.status.toLowerCase()}`,
      );
    }

    const activeAssignment = await this.prisma.assetAssignment.findFirst({
      where: { assetId, returnedAt: null },
    });
    if (!activeAssignment) {
      throw new BadRequestException('No active assignment found for this asset');
    }

    await this.prisma.asset.update({
      where: { id: assetId },
      data: { status: AssetStatus.AVAILABLE },
    });

    return this.prisma.assetAssignment.update({
      where: { id: activeAssignment.id },
      data: {
        returnedAt: new Date(),
        conditionOnReturn: dto.conditionOnReturn,
        notes: dto.notes,
      },
      include: {
        asset: true,
        employee: { select: { id: true, fullName: true, employeeId: true } },
      },
    });
  }

  async getHistory(tenantId: string, assetId: string) {
    await this.findOne(tenantId, assetId);

    return this.prisma.assetAssignment.findMany({
      where: { assetId },
      include: {
        employee: { select: { id: true, fullName: true, employeeId: true } },
      },
      orderBy: { assignedAt: 'desc' },
    });
  }

  async findByEmployee(tenantId: string, employeeId: string) {
    const employee = await this.employeeService.findById(tenantId, employeeId);
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return this.prisma.asset.findMany({
      where: {
        tenantId,
        deletedAt: null,
        assignments: {
          some: { employeeId, returnedAt: null },
        },
      },
      include: {
        assignments: {
          where: { returnedAt: null },
          include: { employee: { select: { id: true, fullName: true, employeeId: true } } },
        },
      },
    });
  }

  async summary(tenantId: string) {
    const assets = await this.prisma.asset.findMany({
      where: { tenantId, deletedAt: null },
      select: {
        category: true,
        status: true,
        condition: true,
        id: true,
      },
    });

    const byCategory = assets.reduce<Record<string, number>>((acc, a) => {
      acc[a.category] = (acc[a.category] || 0) + 1;
      return acc;
    }, {});

    const byStatus = assets.reduce<Record<string, number>>((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {});

    const byCondition = assets.reduce<Record<string, number>>((acc, a) => {
      acc[a.condition] = (acc[a.condition] || 0) + 1;
      return acc;
    }, {});

    return {
      total: assets.length,
      byCategory,
      byStatus,
      byCondition,
    };
  }
}
