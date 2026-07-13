import { Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EmployeeModule } from '@modules/employee/employee.module';
import { JobPostingController } from './controllers/job-posting.controller';
import { CandidateController } from './controllers/candidate.controller';
import { ApplicationController } from './controllers/application.controller';
import { RequisitionController } from './controllers/requisition.controller';
import { InterviewScorecardController } from './controllers/interview-scorecard.controller';
import { JobPostingService } from './services/job-posting.service';
import { CandidateService } from './services/candidate.service';
import { ApplicationService } from './services/application.service';
import { OnboardingDocumentController } from './controllers/onboarding-document.controller';
import { OnboardingTaskController } from './controllers/onboarding-task.controller';
import { OnboardingService } from './services/onboarding.service';
import { OnboardingTaskService } from './services/onboarding-task.service';

const PURGE_INTERVAL_MS = 60 * 60 * 1000; // BR-05 retention sweep every hour

@Module({
  imports: [EmployeeModule],
  controllers: [
    JobPostingController,
    CandidateController,
    ApplicationController,
    RequisitionController,
    InterviewScorecardController,
    OnboardingDocumentController,
    OnboardingTaskController,
  ],
  providers: [
    JobPostingService,
    CandidateService,
    ApplicationService,
    OnboardingService,
    OnboardingTaskService,
  ],
  exports: [
    JobPostingService,
    CandidateService,
    ApplicationService,
    OnboardingService,
    OnboardingTaskService,
  ],
})
export class RecruitmentModule implements OnModuleInit, OnModuleDestroy {
  private purgeTimer?: ReturnType<typeof setInterval>;

  constructor(private readonly candidateService: CandidateService) {}

  onModuleInit() {
    // BR-05: automatically purge expired candidate PII on a schedule.
    this.purgeTimer = setInterval(() => {
      this.candidateService
        .purgeExpiredCandidates()
        .catch((err) => console.error('[BR-05] candidate purge sweep failed', err));
    }, PURGE_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.purgeTimer) {
      clearInterval(this.purgeTimer);
    }
  }
}
