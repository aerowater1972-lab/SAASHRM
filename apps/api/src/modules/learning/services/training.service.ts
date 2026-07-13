import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { WorkflowEngineService } from '@modules/shared/workflow/workflow-engine.service';
import { paginate, Paginated } from '@common/prisma/pagination.util';
import { Prisma, TrainingStatus, ParticipantStatus, Training } from '@prisma/client';
import {
  CreateTrainingDto,
  UpdateTrainingDto,
  TrainingFilterDto,
  RegisterParticipantDto,
  BulkRegisterParticipantDto,
  UpdateParticipantDto,
} from '../dto/create-training.dto';

@Injectable()
export class TrainingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflow: WorkflowEngineService,
  ) {}

  async create(tenantId: string, dto: CreateTrainingDto) {
    return this.prisma.training.create({
      data: {
        tenantId,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        provider: dto.provider,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        cost: dto.cost,
        capacity: dto.capacity,
      },
      include: {
        participants: {
          include: { employee: { select: { id: true, employeeId: true, fullName: true } } },
        },
      },
    });
  }

  async findAll(tenantId: string, filters: TrainingFilterDto): Promise<Training[] | Paginated<Training>> {
    const where: Prisma.TrainingWhereInput = { tenantId };

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      where.startDate = {};
      if (filters.startDate) where.startDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.startDate.lte = new Date(filters.endDate);
    }

    const term = filters.q ?? filters.search;
    if (term) {
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { provider: { contains: term, mode: 'insensitive' } },
      ];
    }

    return paginate(
      this.prisma.training,
      {
        where,
        include: {
          _count: { select: { participants: true } },
        },
        orderBy: { startDate: 'desc' },
      },
      filters.page,
      filters.limit,
    );
  }

  async findOne(tenantId: string, id: string) {
    const training = await this.prisma.training.findFirst({
      where: { id, tenantId },
      include: {
        participants: {
          include: { employee: { select: { id: true, employeeId: true, fullName: true } } },
        },
      },
    });

    if (!training) {
      throw new NotFoundException('Training not found');
    }

    return training;
  }

  async update(tenantId: string, id: string, dto: UpdateTrainingDto) {
    await this.findOne(tenantId, id);

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.provider !== undefined) data.provider = dto.provider;
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = new Date(dto.endDate);
    if (dto.cost !== undefined) data.cost = dto.cost;
    if (dto.capacity !== undefined) data.capacity = dto.capacity;
    if (dto.status !== undefined) data.status = dto.status;

    return this.prisma.training.update({
      where: { id },
      data,
      include: {
        participants: {
          include: { employee: { select: { id: true, employeeId: true, fullName: true } } },
        },
      },
    });
  }

  async register(tenantId: string, trainingId: string, dto: RegisterParticipantDto) {
    const training = await this.findOne(tenantId, trainingId);

    if (training.status === TrainingStatus.CANCELLED) {
      throw new BadRequestException('Cannot register for a cancelled training');
    }

    if (training.status === TrainingStatus.COMPLETED) {
      throw new BadRequestException('Cannot register for a completed training');
    }

    const currentCount = await this.prisma.trainingParticipant.count({
      where: { trainingId },
    });

    if (training.capacity && currentCount >= training.capacity) {
      throw new BadRequestException('Training capacity is full');
    }

    const existing = await this.prisma.trainingParticipant.findUnique({
      where: { trainingId_employeeId: { trainingId, employeeId: dto.employeeId } },
    });

    if (existing) {
      throw new BadRequestException('Employee is already registered for this training');
    }

    return this.prisma.trainingParticipant.create({
      data: {
        trainingId,
        employeeId: dto.employeeId,
      },
      include: {
        employee: { select: { id: true, employeeId: true, fullName: true } },
      },
    });
  }

  async bulkRegister(tenantId: string, trainingId: string, dto: BulkRegisterParticipantDto) {
    const training = await this.findOne(tenantId, trainingId);

    if (training.status === TrainingStatus.CANCELLED) {
      throw new BadRequestException('Cannot register for a cancelled training');
    }

    if (training.status === TrainingStatus.COMPLETED) {
      throw new BadRequestException('Cannot register for a completed training');
    }

    const currentCount = await this.prisma.trainingParticipant.count({
      where: { trainingId },
    });

    if (training.capacity && currentCount + dto.employeeIds.length > training.capacity) {
      throw new BadRequestException('Not enough capacity for all employees');
    }

    const existing = await this.prisma.trainingParticipant.findMany({
      where: { trainingId, employeeId: { in: dto.employeeIds } },
      select: { employeeId: true },
    });

    const registeredIds = new Set(existing.map((p) => p.employeeId));
    const newIds = dto.employeeIds.filter((id) => !registeredIds.has(id));

    if (newIds.length === 0) {
      throw new BadRequestException('All employees are already registered');
    }

    await this.prisma.trainingParticipant.createMany({
      data: newIds.map((employeeId) => ({ trainingId, employeeId })),
      skipDuplicates: true,
    });

    return this.prisma.trainingParticipant.findMany({
      where: { trainingId, employeeId: { in: newIds } },
      include: {
        employee: { select: { id: true, employeeId: true, fullName: true } },
      },
    });
  }

  async getParticipants(tenantId: string, trainingId: string) {
    await this.findOne(tenantId, trainingId);

    return this.prisma.trainingParticipant.findMany({
      where: { trainingId },
      include: {
        employee: { select: { id: true, employeeId: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateParticipant(id: string, dto: UpdateParticipantDto) {
    const participant = await this.prisma.trainingParticipant.findUnique({
      where: { id },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    const data: any = {};
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.score !== undefined) data.score = dto.score;
    if (dto.feedback !== undefined) data.feedback = dto.feedback;

    if (dto.status === ParticipantStatus.COMPLETED) {
      data.completedAt = new Date();
    }

    return this.prisma.trainingParticipant.update({
      where: { id },
      data,
      include: {
        training: { select: { id: true, title: true } },
        employee: { select: { id: true, employeeId: true, fullName: true } },
      },
    });
  }

  async cancel(tenantId: string, id: string) {
    const training = await this.findOne(tenantId, id);

    const transition = this.workflow.transition('training', training.status, 'CANCEL');

    return this.prisma.training.update({
      where: { id },
      data: { status: transition.to as TrainingStatus },
      include: {
        participants: {
          include: { employee: { select: { id: true, employeeId: true, fullName: true } } },
        },
      },
    });
  }
}
