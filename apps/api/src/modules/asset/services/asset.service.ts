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

    const method = dto.depreciationMethod ?? 'STRAIGHT_LINE';
    if (!['STRAIGHT_LINE', 'DECLINING_BALANCE'].includes(method)) {
      throw new BadRequestException('depreciationMethod harus STRAIGHT_LINE atau DECLINING_BALANCE');
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
        qrToken: await this.generateUniqueQrToken(),
        usefulLifeMonths: dto.usefulLifeMonths,
        residualValue: dto.residualValue ?? 0,
        depreciationMethod: method,
        depreciationStartDate: dto.depreciationStartDate
          ? new Date(dto.depreciationStartDate)
          : dto.purchaseDate
            ? new Date(dto.purchaseDate)
            : undefined,
      },
      include: { assignments: true },
    });
  }

  private async generateUniqueQrToken(): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const crypto = require('crypto');
    for (let i = 0; i < 5; i++) {
      const token = crypto.randomBytes(9).toString('base64url');
      const clash = await this.prisma.asset.findFirst({ where: { qrToken: token }, select: { id: true } });
      if (!clash) return token;
    }
    throw new BadRequestException('Gagal membuat token QR unik, coba lagi');
  }

  /** QR inventaris: PNG dari URL verifikasi publik. */
  async getQrPng(tenantId: string, id: string, verifyBaseUrl: string) {
    const asset: any = await this.findOne(tenantId, id);
    let token = asset.qrToken as string | null;
    if (!token) {
      token = await this.generateUniqueQrToken();
      await this.prisma.asset.update({ where: { id }, data: { qrToken: token } });
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const QRCode = require('qrcode');
    const url = `${verifyBaseUrl.replace(/\/$/, '')}/asset/verify/${token}`;
    const png: Buffer = await QRCode.toBuffer(url, { type: 'png', width: 320, margin: 2 });
    return {
      filename: `qr-${asset.code}.png`,
      contentType: 'image/png',
      data: png.toString('base64'),
      verifyUrl: url,
    };
  }

  /** Verifikasi publik via QR: info minimal tanpa PII. */
  async verifyByToken(token: string) {
    const asset: any = await this.prisma.asset.findFirst({
      where: { qrToken: token, deletedAt: null },
      select: {
        code: true, name: true, category: true, brand: true, model: true,
        serialNumber: true, status: true, condition: true,
        assignments: {
          where: { returnedAt: null },
          take: 1,
          select: { employee: { select: { fullName: true } }, assignedAt: true },
        },
      },
    });
    if (!asset) throw new NotFoundException('Aset tidak ditemukan');
    const holder = asset.assignments?.[0];
    return {
      code: asset.code,
      name: asset.name,
      category: asset.category,
      brand: asset.brand,
      model: asset.model,
      serialNumber: asset.serialNumber,
      status: asset.status,
      condition: asset.condition,
      holder: holder?.employee?.fullName ?? null,
      assignedAt: holder?.assignedAt ?? null,
    };
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

  /**
   * Depresiasi bulanan (PSAK 16): garis lurus default, saldo menurun ganda
   * opsional. Idempoten per (aset, tahun, bulan) via upsert. Nilai buku
   * tidak pernah di bawah residu; aset tanpa harga/masa manfaat dilewati.
   */
  async runDepreciation(tenantId: string, year: number, month: number) {
    if (month < 1 || month > 12) {
      throw new BadRequestException('Bulan harus 1-12');
    }
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    const assets = await this.prisma.asset.findMany({
      where: { tenantId, deletedAt: null, purchasePrice: { gt: 0 }, usefulLifeMonths: { gt: 0 } },
    });
    const results: Array<{ assetId: string; code: string; amount: number; bookValueAfter: number; skipped?: string }> = [];
    for (const a of assets as any[]) {
      const price = Number(a.purchasePrice);
      const life = Number(a.usefulLifeMonths);
      const residual = Number(a.residualValue ?? 0);
      const start: Date = a.depreciationStartDate ? new Date(a.depreciationStartDate) : a.purchaseDate ? new Date(a.purchaseDate) : null as any;
      if (!start || start > monthEnd) {
        results.push({ assetId: a.id, code: a.code, amount: 0, bookValueAfter: price, skipped: 'belum mulai' });
        continue;
      }
      const elapsed = (year - start.getFullYear()) * 12 + (month - 1 - start.getMonth());
      if (elapsed < 0) {
        results.push({ assetId: a.id, code: a.code, amount: 0, bookValueAfter: price, skipped: 'belum mulai' });
        continue;
      }
      const prior = await this.prisma.assetDepreciation.findMany({
        where: { assetId: a.id, OR: [{ year: { lt: year } }, { year, month: { lt: month } }] },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: 1,
      });
      const prevBook = prior.length > 0 ? Number((prior[0] as any).bookValueAfter) : price;
      if (prevBook <= residual) {
        results.push({ assetId: a.id, code: a.code, amount: 0, bookValueAfter: prevBook, skipped: 'sudah habis' });
        continue;
      }
      let amount: number;
      if ((a.depreciationMethod ?? 'STRAIGHT_LINE') === 'DECLINING_BALANCE') {
        amount = Math.min(prevBook * (2 / life), prevBook - residual);
      } else {
        amount = Math.min((price - residual) / life, prevBook - residual);
      }
      amount = Math.max(0, Math.round(amount));
      const bookAfter = prevBook - amount;
      await (this.prisma as any).assetDepreciation.upsert({
        where: { assetId_year_month: { assetId: a.id, year, month } },
        create: { assetId: a.id, year, month, amount, bookValueAfter: bookAfter },
        update: { amount, bookValueAfter: bookAfter },
      });
      results.push({ assetId: a.id, code: a.code, amount, bookValueAfter: bookAfter });
    }
    return { year, month, processed: results.length, results };
  }

  async getDepreciationSchedule(tenantId: string, assetId: string) {
    const asset: any = await this.findOne(tenantId, assetId);
    const entries = await (this.prisma as any).assetDepreciation.findMany({
      where: { assetId },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    });
    const price = Number(asset.purchasePrice ?? 0);
    const posted = entries.reduce((s: number, e: any) => s + Number(e.amount), 0);
    return {
      asset: { id: asset.id, code: asset.code, name: asset.name, purchasePrice: price, residualValue: Number(asset.residualValue ?? 0), usefulLifeMonths: asset.usefulLifeMonths, method: asset.depreciationMethod },
      accumulated: posted,
      bookValue: entries.length > 0 ? Number(entries[entries.length - 1].bookValueAfter) : price,
      entries,
    };
  }
}
