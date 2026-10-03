import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { CourseEnrollmentStatus } from '@prisma/client';

@Injectable()
export class LmsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, filters: { search?: string; category?: string; status?: string }) {
    const where: any = { tenantId };
    if (filters.search) {
      where.OR = [{ title: { contains: filters.search, mode: 'insensitive' } }, { description: { contains: filters.search, mode: 'insensitive' } }];
    }
    if (filters.category) {
      where.category = filters.category;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    return this.prisma.course.findMany({
      where,
      include: { _count: { select: { trainees: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(tenantId: string, id: string) {
    const course = await this.prisma.course.findFirst({
      where: { id, tenantId },
      include: { modules: { include: { lessons: { include: { quizzes: { include: { questions: true } } } } } }, trainees: { include: { employee: true } } },
    });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  async create(tenantId: string, userId: string, dto: any) {
    const { title, description, category, imageUrl, duration } = dto;
    return this.prisma.course.create({
      data: { title, description, category: category ?? 'GENERAL', imageUrl, duration, tenantId },
      include: { modules: { include: { lessons: true } } },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    const existing = await this.prisma.course.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Course not found');
    return this.prisma.course.update({ where: { id }, data: dto, include: { modules: { include: { lessons: true } } } });
  }

  async delete(tenantId: string, id: string) {
    const existing = await this.prisma.course.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Course not found');
    await this.prisma.course.delete({ where: { id } });
    return { deleted: true };
  }

  async enrollTrainee(tenantId: string, courseId: string, dto: any) {
    const course = await this.prisma.course.findFirst({ where: { id: courseId, tenantId } });
    if (!course) throw new NotFoundException('Course not found');
    return this.prisma.courseTrainee.create({
      data: {
        courseId,
        employeeId: dto.employeeId,
        status: dto.status ?? CourseEnrollmentStatus.ENROLLED,
      },
    });
  }

  async batchEnroll(tenantId: string, courseId: string, dto: any) {
    const course = await this.prisma.course.findFirst({ where: { id: courseId, tenantId } });
    if (!course) throw new NotFoundException('Course not found');
    const created = [];
    for (const empId of dto.employeeIds) {
      const existing = await this.prisma.courseTrainee.findFirst({ where: { courseId, employeeId: empId } });
      if (!existing) {
        const c = await this.prisma.courseTrainee.create({
          data: { courseId, employeeId: empId, status: dto.status ?? CourseEnrollmentStatus.ENROLLED },
        });
        created.push(c);
      }
    }
    return { enrolled: created.length, skipped: dto.employeeIds.length - created.length };
  }

  async getTrainees(tenantId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({ where: { id: courseId, tenantId } });
    if (!course) throw new NotFoundException('Course not found');
    return this.prisma.courseTrainee.findMany({
      where: { courseId },
      include: { employee: true },
    });
  }
}