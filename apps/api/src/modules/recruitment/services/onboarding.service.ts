import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { EventBusService } from '@modules/shared/events/event-bus.service';
import { DomainEventType } from '@modules/shared/events/event-registry';
import { EmployeeService } from '@modules/employee/services/employee.service';
import { WorkflowEngineService } from '@modules/shared/workflow/workflow-engine.service';
import { OnboardingTaskService } from './onboarding-task.service';
import { ReferralService } from './referral.service';
import { ConvertEmployeeDto } from '../dto/convert-employee.dto';
import { ApplicationStatus, OfferStatus, EmployeeStatus } from '@prisma/client';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly employeeService: EmployeeService,
    private readonly workflow: WorkflowEngineService,
    private readonly onboardingTasks: OnboardingTaskService,
    private readonly referrals: ReferralService,
  ) {}

  async convertToEmployee(
    tenantId: string,
    applicationId: string,
    dto: ConvertEmployeeDto,
  ) {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, tenantId },
      include: {
        candidate: true,
        offers: {
          where: { status: OfferStatus.ACCEPTED },
          orderBy: { acceptedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.employeeId) {
      throw new BadRequestException('Candidate has already been converted to an employee');
    }

    if (application.status !== ApplicationStatus.ACCEPTED) {
      throw new BadRequestException(
        'Application must be in ACCEPTED status before converting to employee',
      );
    }

    const acceptedOffer = application.offers[0];
    if (!acceptedOffer) {
      throw new BadRequestException('No accepted offer found for this application');
    }

    const candidate = application.candidate;
    const fullName = `${candidate.firstName} ${candidate.lastName}`;

    const employee = await this.employeeService.create(tenantId, {
      employeeId: dto.employeeId,
      fullName,
      email: candidate.email,
      phone: dto.phone || candidate.phone,
      birthDate: dto.birthDate,
      birthPlace: dto.birthPlace,
      gender: dto.gender,
      religion: dto.religion,
      maritalStatus: (dto.maritalStatus as any) ?? 'SINGLE',
      idCardNumber: dto.idCardNumber,
      taxIdNumber: dto.taxIdNumber,
      socialSecurityNumber: dto.socialSecurityNumber,
      address: dto.address,
      city: dto.city,
      province: dto.province,
      postalCode: dto.postalCode,
      emergencyContact: dto.emergencyContact,
      emergencyPhone: dto.emergencyPhone,
      startDate: acceptedOffer.joinDate,
      notes: dto.notes,
      status: EmployeeStatus.PENDING_ACTIVATION,
    } as any);

    const empId = (employee as any).id;

    await this.prisma.$transaction([
      this.prisma.application.update({
        where: { id: applicationId },
        data: { employeeId: empId },
      }),
      this.prisma.candidate.update({
        where: { id: candidate.id },
        data: { status: 'HIRED' as any },
      }),
    ]);

    // QW-02: automatically award any pending employee referral bonus now that
    // the referred candidate has been hired.
    await this.referrals
      .awardForHired(tenantId, candidate.id)
      .catch((err) => console.error('[QW-02] referral award on hire failed', err));

    // FR-12: auto-generate the default cross-team onboarding checklist for the
    // newly converted employee (completed per-team per BR-06).
    await this.onboardingTasks.bulkCreateForEmployee(tenantId, empId, applicationId);

    await this.eventBus.publishTyped(DomainEventType.CANDIDATE_CONVERTED, {
      applicationId,
      candidateId: candidate.id,
      employeeId: employee.id,
      employeeCode: dto.employeeId,
      joinDate: acceptedOffer.joinDate.toISOString(),
      tenantId,
    }, { aggregateId: employee.id, tenantId });

    return employee;
  }
}
