import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { CreateVendorDto, CreateVendorInvoiceDto, UpdateVendorInvoiceDto } from '../dto/vendor-tax.dto';

/**
 * Vendor PPh 23/26 withholding (UU PPh 36/2008, PMK-141/PMK-212/2015).
 * Rate table:
 * - PPh 23 jasa & sewa (non tanah/bangunan): 2%
 * - PPh 23 dividen/bunga/royalti/hadiah: 15%
 * - PPh 26: 20%, atau tarif P3B (treaty) bila vendor LN punya SKD.
 * grossUp=true: PPh ditanggung perusahaan — DPP = bruto/(1-tarif).
 */
const RATE_TABLE: Record<string, number> = {
  NONE: 0,
  PPH23_JASA: 2,
  PPH23_SEWA: 2,
  PPH23_DIVIDEN: 15,
  PPH23_BUNGA_ROYALTI: 15,
  PPH23_HADIAH: 15,
  PPH26: 20,
};

@Injectable()
export class VendorTaxService {
  private readonly logger = new Logger(VendorTaxService.name);

  constructor(private readonly prisma: PrismaService) {}

  getRateTable() {
    return Object.entries(RATE_TABLE).map(([code, rate]) => ({ code, rate }));
  }

  // ---------- Vendors ----------

  async createVendor(tenantId: string, dto: CreateVendorDto) {
    return (this.prisma as any).vendor.create({
      data: {
        tenantId,
        name: dto.name,
        npwp: dto.npwp ?? null,
        address: dto.address ?? null,
        country: dto.country ?? 'ID',
        isForeign: dto.isForeign ?? false,
        treatyRate: dto.treatyRate ?? null,
        bankName: dto.bankName ?? null,
        bankAccount: dto.bankAccount ?? null,
      },
    });
  }

  async listVendors(tenantId: string, search?: string) {
    return (this.prisma as any).vendor.findMany({
      where: { tenantId, ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}) },
      orderBy: { name: 'asc' },
      include: { _count: { select: { invoices: true } } },
    });
  }

  async getVendor(tenantId: string, id: string) {
    const v = await (this.prisma as any).vendor.findFirst({
      where: { id, tenantId },
      include: { invoices: { orderBy: { invoiceDate: 'desc' }, take: 20 } },
    });
    if (!v) throw new NotFoundException('Vendor not found');
    return v;
  }

  // ---------- Invoices ----------

  private resolveRate(taxType: string, vendor: any): number {
    if (taxType === 'PPH26' && vendor?.isForeign && vendor?.treatyRate != null) {
      const t = Number(vendor.treatyRate);
      if (t < 0 || t > 20) throw new BadRequestException('Treaty rate harus 0–20%');
      return t;
    }
    const r = RATE_TABLE[taxType];
    if (r === undefined) throw new BadRequestException(`Unknown tax type: ${taxType}`);
    return r;
  }

  calculate(gross: number, ratePct: number, grossUp: boolean) {
    const rate = ratePct / 100;
    if (grossUp && rate >= 1) throw new BadRequestException('Rate tidak valid untuk gross-up');
    if (grossUp) {
      const dpp = Math.round(gross / (1 - rate));
      const tax = dpp - gross;
      return { dpp, taxAmount: tax, netAmount: gross, taxRate: ratePct };
    }
    const tax = Math.round(gross * rate);
    return { dpp: gross, taxAmount: tax, netAmount: gross - tax, taxRate: ratePct };
  }

  async createInvoice(tenantId: string, dto: CreateVendorInvoiceDto) {
    const vendor = await (this.prisma as any).vendor.findFirst({ where: { id: dto.vendorId, tenantId } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    const taxType = dto.taxType ?? 'NONE';
    const rate = this.resolveRate(taxType, vendor);
    const calc = this.calculate(Number(dto.grossAmount), rate, dto.grossUp ?? false);
    const grossStored = dto.grossUp ? calc.dpp : Number(dto.grossAmount);
    return (this.prisma as any).vendorInvoice.create({
      data: {
        tenantId,
        vendorId: vendor.id,
        invoiceNo: dto.invoiceNo,
        invoiceDate: new Date(dto.invoiceDate),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        description: dto.description ?? null,
        grossAmount: grossStored,
        taxType: taxType as any,
        taxRate: calc.taxRate,
        taxAmount: calc.taxAmount,
        netAmount: calc.netAmount,
        grossUp: dto.grossUp ?? false,
      },
      include: { vendor: true },
    });
  }

  async listInvoices(tenantId: string, params?: { status?: string; vendorId?: string; from?: string; to?: string; page?: number; limit?: number }) {
    const { status, vendorId, from, to, page = 1, limit = 20 } = params ?? {};
    const where: any = { tenantId };
    if (status) where.status = status;
    if (vendorId) where.vendorId = vendorId;
    if (from || to) where.invoiceDate = { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) };
    const [data, total] = await Promise.all([
      (this.prisma as any).vendorInvoice.findMany({
        where, orderBy: { invoiceDate: 'desc' },
        skip: (page - 1) * limit, take: limit,
        include: { vendor: { select: { id: true, name: true, npwp: true, isForeign: true } } },
      }),
      (this.prisma as any).vendorInvoice.count({ where }),
    ]);
    const totals = data.reduce((s: any, r: any) => ({
      gross: s.gross + Number(r.grossAmount), tax: s.tax + Number(r.taxAmount), net: s.net + Number(r.netAmount),
    }), { gross: 0, tax: 0, net: 0 });
    return { data, totals, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async approveInvoice(tenantId: string, id: string) {
    const inv = await (this.prisma as any).vendorInvoice.findFirst({ where: { id, tenantId } });
    if (!inv) throw new NotFoundException('Invoice not found');
    if (inv.status !== 'DRAFT') throw new BadRequestException('Hanya invoice DRAFT yang bisa disetujui');
    return (this.prisma as any).vendorInvoice.update({ where: { id }, data: { status: 'APPROVED' } });
  }

  async markPaid(tenantId: string, id: string, ebupotRef?: string) {
    const inv = await (this.prisma as any).vendorInvoice.findFirst({ where: { id, tenantId } });
    if (!inv) throw new NotFoundException('Invoice not found');
    if (inv.status !== 'APPROVED') throw new BadRequestException('Hanya invoice APPROVED yang bisa dibayar');
    return (this.prisma as any).vendorInvoice.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date(), ebupotRef: ebupotRef ?? inv.ebupotRef },
    });
  }

  async cancelInvoice(tenantId: string, id: string) {
    const inv = await (this.prisma as any).vendorInvoice.findFirst({ where: { id, tenantId } });
    if (!inv) throw new NotFoundException('Invoice not found');
    if (inv.status === 'PAID') throw new BadRequestException('Invoice PAID tidak bisa dibatalkan');
    return (this.prisma as any).vendorInvoice.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  /** eBupot-ready CSV: bukti potong PPh 23/26 per invoice. */
  async exportEbupotCsv(tenantId: string, from: string, to: string): Promise<{ fileName: string; content: string }> {
    const invoices = await (this.prisma as any).vendorInvoice.findMany({
      where: {
        tenantId,
        status: { in: ['APPROVED', 'PAID'] },
        taxType: { not: 'NONE' },
        invoiceDate: { gte: new Date(from), lte: new Date(to) },
      },
      include: { vendor: true },
      orderBy: { invoiceDate: 'asc' },
    });
    const headers = ['invoiceNo', 'invoiceDate', 'vendorName', 'npwp', 'isForeign', 'taxType', 'taxRate', 'grossAmount', 'taxAmount', 'netAmount', 'grossUp', 'ebupotRef'];
    const esc = (v: any) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const lines = [headers.join(',')];
    for (const i of invoices) {
      lines.push([
        i.invoiceNo, new Date(i.invoiceDate).toISOString().slice(0, 10),
        i.vendor?.name ?? '', i.vendor?.npwp ?? '', i.vendor?.isForeign ? 'Y' : 'N',
        i.taxType, String(i.taxRate), String(i.grossAmount), String(i.taxAmount),
        String(i.netAmount), i.grossUp ? 'Y' : 'N', i.ebupotRef ?? '',
      ].map(esc).join(','));
    }
    return { fileName: `EBUPOT-PPH2326-${from.slice(0, 7)}.csv`, content: lines.join('\n') };
  }
}
