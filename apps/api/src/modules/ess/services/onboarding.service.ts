import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class EssOnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(employeeId: string) {
    const progress = await this.prisma.essOnboardingProgress.findUnique({
      where: { employeeId },
    });
    return progress ?? { employeeId, tourCompleted: false, profileConfirmedAt: null };
  }

  async completeTour(employeeId: string) {
    return this.prisma.essOnboardingProgress.upsert({
      where: { employeeId },
      create: { employeeId, tourCompleted: true },
      update: { tourCompleted: true },
    });
  }

  async confirmProfile(employeeId: string) {
    return this.prisma.essOnboardingProgress.upsert({
      where: { employeeId },
      create: { employeeId, profileConfirmedAt: new Date() },
      update: { profileConfirmedAt: new Date() },
    });
  }
}
