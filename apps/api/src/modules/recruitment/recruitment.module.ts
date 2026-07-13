import { Module } from '@nestjs/common';
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
export class RecruitmentModule {}
