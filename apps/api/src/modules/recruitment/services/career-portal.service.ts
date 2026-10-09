import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

/**
 * Portal karier publik (read-only + lamaran). Tanpa auth; anti-spam via
 * throttle di controller. Hanya lowongan PUBLISHED yang terekspos, tanpa
 * data internal (gaji ditampilkan sebagai rentang bila diisi).
 */
@Injectable()
export class CareerPortalService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true },
    });
    if (!tenant) throw new NotFoundException('Perusahaan tidak ditemukan');
    return tenant;
  }

  private async assertPublishedJob(tenantId: string, jobId: string) {
    const job: any = await (this.prisma as any).jobPosting.findFirst({
      where: { id: jobId, tenantId, status: 'PUBLISHED' as any },
      select: {
        id: true, title: true, description: true, requirements: true,
        responsibilities: true, minSalary: true, maxSalary: true,
        employmentType: true, location: true, slots: true, filledSlots: true,
        postedAt: true, closedAt: true,
      },
    });
    if (!job) throw new NotFoundException('Lowongan tidak ditemukan / sudah ditutup');
    if (job.closedAt && new Date(job.closedAt) < new Date()) {
      throw new NotFoundException('Lowongan sudah ditutup');
    }
    return job;
  }

  async listJobs(tenantId: string) {
    const tenant = await this.assertTenant(tenantId);
    const jobs = await (this.prisma as any).jobPosting.findMany({
      where: {
        tenantId,
        status: 'PUBLISHED' as any,
        OR: [{ closedAt: null }, { closedAt: { gte: new Date() } }],
      },
      select: {
        id: true, title: true, employmentType: true, location: true,
        minSalary: true, maxSalary: true, postedAt: true,
      },
      orderBy: { postedAt: 'desc' },
    });
    return { tenant, jobs };
  }

  async getJob(tenantId: string, jobId: string) {
    await this.assertTenant(tenantId);
    const job = await this.assertPublishedJob(tenantId, jobId);
    return job;
  }

  async apply(
    tenantId: string,
    jobId: string,
    data: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      resumeUrl?: string;
      currentCompany?: string;
      currentPosition?: string;
      expectedSalary?: number;
      coverNote?: string;
    },
  ) {
    const job = await this.assertPublishedJob(tenantId, jobId);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      throw new BadRequestException('Email tidak valid');
    }
    if (!data.firstName?.trim() || !data.lastName?.trim()) {
      throw new BadRequestException('Nama depan dan belakang wajib diisi');
    }
    // Dedup: kandidat sama (email) + lowongan sama yang masih aktif.
    const existingCandidate = await (this.prisma as any).candidate.findFirst({
      where: { tenantId, email: data.email.toLowerCase() },
      select: { id: true },
    });
    if (existingCandidate) {
      const dup = await (this.prisma as any).application.findFirst({
        where: {
          tenantId, jobPostingId: job.id, candidateId: existingCandidate.id,
          status: { in: ['NEW', 'SCREENING', 'INTERVIEW', 'OFFERED'] as any },
        },
        select: { id: true },
      });
      if (dup) throw new BadRequestException('Anda sudah melamar lowongan ini dan masih diproses');
    }

    const candidate = existingCandidate ?? await (this.prisma as any).candidate.create({
      data: {
        tenantId,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.toLowerCase(),
        phone: data.phone ?? null,
        resumeUrl: data.resumeUrl ?? null,
        source: 'CAREER_PORTAL',
        currentCompany: data.currentCompany ?? null,
        currentPosition: data.currentPosition ?? null,
      },
    });
    const application = await (this.prisma as any).application.create({
      data: {
        tenantId,
        jobPostingId: job.id,
        candidateId: candidate.id,
        expectedSalary: data.expectedSalary ?? null,
        notes: data.coverNote ?? null,
      },
    });
    return { applicationId: application.id, jobTitle: job.title };
  }
}
