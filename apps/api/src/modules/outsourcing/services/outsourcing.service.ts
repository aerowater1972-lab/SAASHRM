import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { Prisma, VendorStatus, ContractStatus, WorkerStatus, CostLogStatus } from '@prisma/client';

@Injectable()
export class OutsourcingService {
  constructor(private readonly prisma: PrismaService) {}

  // ========== VENDOR ==========

  async createVendor(tenantId: string, dto: any) {
    const existing = await this.prisma.outsourcingVendor.findFirst({
      where: { tenantId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Vendor dengan kode "${dto.code}" sudah ada`);
    }
    return this.prisma.outsourcingVendor.create({
      data: { ...dto, tenantId },
    });
  }

  async getVendors(tenantId: string, status?: VendorStatus) {
    return this.prisma.outsourcingVendor.findMany({
      where: { tenantId, deletedAt: null, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { contracts: true, workers: true } } },
    });
  }

  async getVendor(tenantId: string, id: string) {
    const vendor = await this.prisma.outsourcingVendor.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        contracts: { where: { deletedAt: null }, orderBy: { startDate: 'desc' } },
        workers: { where: { deletedAt: null }, orderBy: { startDate: 'desc' } },
        _count: { select: { contracts: true, workers: true } },
      },
    });
    if (!vendor) throw new NotFoundException('Vendor tidak ditemukan');
    return vendor;
  }

  async updateVendor(tenantId: string, id: string, dto: any) {
    await this.getVendor(tenantId, id);
    if (dto.code) {
      const existing = await this.prisma.outsourcingVendor.findFirst({
        where: { tenantId, code: dto.code, id: { not: id }, deletedAt: null },
      });
      if (existing) throw new ConflictException(`Kode "${dto.code}" sudah digunakan`);
    }
    return this.prisma.outsourcingVendor.update({ where: { id }, data: dto });
  }

  async deleteVendor(tenantId: string, id: string) {
    await this.getVendor(tenantId, id);
    const workers = await this.prisma.outsourcedWorker.count({ where: { vendorId: id, deletedAt: null } });
    if (workers > 0) throw new BadRequestException('Vendor masih memiliki pekerja aktif');
    return this.prisma.outsourcingVendor.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // ========== CONTRACT ==========

  async createContract(tenantId: string, dto: any) {
    const vendor = await this.prisma.outsourcingVendor.findFirst({ where: { id: dto.vendorId, tenantId, deletedAt: null } });
    if (!vendor) throw new NotFoundException('Vendor tidak ditemukan');

    const existing = await this.prisma.outsourcingContract.findFirst({
      where: { tenantId, contractNumber: dto.contractNumber, deletedAt: null },
    });
    if (existing) throw new ConflictException(`Nomor kontrak "${dto.contractNumber}" sudah ada`);

    return this.prisma.outsourcingContract.create({
      data: { ...dto, tenantId, startDate: new Date(dto.startDate), endDate: dto.endDate ? new Date(dto.endDate) : null },
    });
  }

  async getContracts(tenantId: string, vendorId?: string, status?: ContractStatus) {
    return this.prisma.outsourcingContract.findMany({
      where: { tenantId, deletedAt: null, ...(vendorId ? { vendorId } : {}), ...(status ? { status } : {}) },
      orderBy: { startDate: 'desc' },
      include: { vendor: { select: { id: true, name: true, code: true } }, _count: { select: { workers: true } } },
    });
  }

  async getContract(tenantId: string, id: string) {
    const contract = await this.prisma.outsourcingContract.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { vendor: true, workers: { where: { deletedAt: null } } },
    });
    if (!contract) throw new NotFoundException('Kontrak tidak ditemukan');
    return contract;
  }

  async updateContract(tenantId: string, id: string, dto: any) {
    await this.getContract(tenantId, id);
    const data: any = { ...dto };
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);
    return this.prisma.outsourcingContract.update({ where: { id }, data });
  }

  async deleteContract(tenantId: string, id: string) {
    await this.getContract(tenantId, id);
    const workers = await this.prisma.outsourcedWorker.count({ where: { contractId: id, deletedAt: null } });
    if (workers > 0) throw new BadRequestException('Kontrak masih memiliki pekerja terikat');
    return this.prisma.outsourcingContract.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // ========== WORKER ==========

  async createWorker(tenantId: string, dto: any) {
    const vendor = await this.prisma.outsourcingVendor.findFirst({ where: { id: dto.vendorId, tenantId, deletedAt: null } });
    if (!vendor) throw new NotFoundException('Vendor tidak ditemukan');

    if (dto.contractId) {
      const contract = await this.prisma.outsourcingContract.findFirst({ where: { id: dto.contractId, tenantId, deletedAt: null } });
      if (!contract) throw new NotFoundException('Kontrak tidak ditemukan');
      if (contract.vendorId !== dto.vendorId) throw new BadRequestException('Kontrak tidak milik vendor ini');
    }

    const existing = await this.prisma.outsourcedWorker.findFirst({
      where: { tenantId, vendorId: dto.vendorId, employeeId: dto.employeeId, deletedAt: null },
    });
    if (existing) throw new ConflictException('Pekerja dengan ID ini sudah terdaftar di vendor ini');

    return this.prisma.outsourcedWorker.create({
      data: {
        ...dto,
        tenantId,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
    });
  }

  async getWorkers(tenantId: string, vendorId?: string, contractId?: string, status?: WorkerStatus) {
    return this.prisma.outsourcedWorker.findMany({
      where: { tenantId, deletedAt: null, ...(vendorId ? { vendorId } : {}), ...(contractId ? { contractId } : {}), ...(status ? { status } : {}) },
      orderBy: { startDate: 'desc' },
      include: {
        vendor: { select: { id: true, name: true, code: true } },
        contract: { select: { id: true, contractNumber: true } },
      },
    });
  }

  async getWorker(tenantId: string, id: string) {
    const worker = await this.prisma.outsourcedWorker.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { vendor: true, contract: true, attendances: { orderBy: { date: 'desc' }, take: 30 } },
    });
    if (!worker) throw new NotFoundException('Pekerja tidak ditemukan');
    return worker;
  }

  async updateWorker(tenantId: string, id: string, dto: any) {
    await this.getWorker(tenantId, id);
    const data: any = { ...dto };
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);
    return this.prisma.outsourcedWorker.update({ where: { id }, data });
  }

  async deleteWorker(tenantId: string, id: string) {
    await this.getWorker(tenantId, id);
    return this.prisma.outsourcedWorker.update({ where: { id }, data: { deletedAt: new Date(), status: WorkerStatus.TERMINATED } });
  }

  // ========== ATTENDANCE ==========

  async createAttendance(tenantId: string, dto: any) {
    const worker = await this.prisma.outsourcedWorker.findFirst({ where: { id: dto.workerId, tenantId, deletedAt: null } });
    if (!worker) throw new NotFoundException('Pekerja tidak ditemukan');

    const date = new Date(dto.date);
    date.setHours(0, 0, 0, 0);

    const existing = await this.prisma.outsourcedAttendance.findUnique({ where: { workerId_date: { workerId: dto.workerId, date } } });
    if (existing) throw new ConflictException('Absensi untuk tanggal ini sudah ada');

    return this.prisma.outsourcedAttendance.create({
      data: {
        tenantId,
        workerId: dto.workerId,
        date,
        clockIn: dto.clockIn ? new Date(dto.clockIn) : null,
        clockOut: dto.clockOut ? new Date(dto.clockOut) : null,
        hoursWorked: dto.hoursWorked,
        status: dto.status || 'PRESENT',
        notes: dto.notes,
      },
    });
  }

  async getAttendances(tenantId: string, workerId?: string, from?: string, to?: string) {
    return this.prisma.outsourcedAttendance.findMany({
      where: {
        tenantId,
        ...(workerId ? { workerId } : {}),
        ...(from || to ? { date: { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined } } : {}),
      },
      orderBy: { date: 'desc' },
      include: { worker: { select: { id: true, fullName: true, employeeId: true } } },
    });
  }

  // ========== COST LOG ==========

  async createCostLog(tenantId: string, dto: any) {
    const worker = await this.prisma.outsourcedWorker.findFirst({ where: { id: dto.workerId, tenantId, deletedAt: null } });
    if (!worker) throw new NotFoundException('Pekerja tidak ditemukan');

    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);
    if (periodStart > periodEnd) throw new BadRequestException('Periode mulai harus sebelum periode selesai');

    const existing = await this.prisma.outsourcedCostLog.findFirst({
      where: { tenantId, workerId: dto.workerId, periodStart: new Date(dto.periodStart), periodEnd: new Date(dto.periodEnd), deletedAt: null },
    });
    if (existing) throw new ConflictException('Log biaya untuk periode ini sudah ada');

    return this.prisma.outsourcedCostLog.create({
      data: {
        tenantId,
        workerId: dto.workerId,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        hoursWorked: dto.hoursWorked,
        rate: dto.rate,
        totalCost: dto.totalCost,
        currency: dto.currency || 'IDR',
        invoiceRef: dto.invoiceRef,
      },
    });
  }

  async getCostLogs(tenantId: string, workerId?: string, status?: any, from?: string, to?: string) {
    return this.prisma.outsourcedCostLog.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(workerId ? { workerId } : {}),
        ...(status ? { status } : {}),
        ...(from || to ? { periodStart: { gte: from ? new Date(from) : undefined }, periodEnd: { lte: to ? new Date(to) : undefined } } : {}),
      },
      orderBy: { periodStart: 'desc' },
      include: { worker: { select: { id: true, fullName: true, employeeId: true } } },
    });
  }

  async updateCostLog(tenantId: string, id: string, dto: any) {
    const log = await this.prisma.outsourcedCostLog.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!log) throw new NotFoundException('Log biaya tidak ditemukan');

    return this.prisma.outsourcedCostLog.update({ where: { id }, data: dto });
  }

  async approveCostLog(tenantId: string, id: string) {
    const log = await this.prisma.outsourcedCostLog.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!log) throw new NotFoundException('Log biaya tidak ditemukan');
    if (log.status !== 'PENDING') throw new BadRequestException('Hanya log dengan status PENDING yang bisa di-approve');
    return this.prisma.outsourcedCostLog.update({ where: { id }, data: { status: 'APPROVED' } });
  }

  async payCostLog(tenantId: string, id: string, invoiceRef?: string) {
    const log = await this.prisma.outsourcedCostLog.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!log) throw new NotFoundException('Log biaya tidak ditemukan');
    if (log.status !== 'APPROVED') throw new BadRequestException('Hanya log dengan status APPROVED yang bisa dibayar');
    return this.prisma.outsourcedCostLog.update({ where: { id }, data: { status: 'PAID', paidAt: new Date(), invoiceRef: invoiceRef || log.invoiceRef } });
  }

  // ========== SUMMARY ==========

  async getVendorSummary(tenantId: string) {
    const [vendors, activeWorkers, totalCost] = await Promise.all([
      this.prisma.outsourcingVendor.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.outsourcedWorker.count({ where: { tenantId, status: 'ACTIVE', deletedAt: null } }),
      this.prisma.outsourcedCostLog.aggregate({ where: { tenantId, status: 'PAID', deletedAt: null }, _sum: { totalCost: true } }),
    ]);
    return {
      totalVendors: vendors,
      activeWorkers,
      totalPaidCost: Number(totalCost._sum.totalCost ?? 0),
    };
  }
}