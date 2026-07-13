import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { CreateComponentDto } from '../dto/create-component.dto';

@Injectable()
export class ComponentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateComponentDto) {
    const existing = await this.prisma.payrollComponent.findFirst({
      where: { tenantId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Payroll component with code ${dto.code} already exists`);
    }
    return this.prisma.payrollComponent.create({
      data: { tenantId, ...dto } as any,
    });
  }

  async findAll(tenantId: string, type?: string, category?: string) {
    const where: any = { tenantId };
    if (type) where.type = type;
    if (category) where.category = category;
    return this.prisma.payrollComponent.findMany({
      where,
      orderBy: { createdAt: 'asc' } as any,
    });
  }

  async findOne(tenantId: string, id: string) {
    const component = await this.prisma.payrollComponent.findFirst({
      where: { id, tenantId },
    });
    if (!component) {
      throw new NotFoundException(`Payroll component ${id} not found`);
    }
    return component;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateComponentDto>) {
    await this.findOne(tenantId, id);
    if (dto.code) {
      const existing = await this.prisma.payrollComponent.findFirst({
        where: { tenantId, code: dto.code, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(`Code ${dto.code} already in use`);
      }
    }
    return this.prisma.payrollComponent.update({
      where: { id },
      data: dto as any,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.payrollComponent.delete({ where: { id } });
  }
}
