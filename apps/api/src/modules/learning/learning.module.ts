import { Module } from '@nestjs/common';
import { TrainingController } from './controllers/training.controller';
import { CertificationController } from './controllers/certification.controller';
import { TrainingService } from './services/training.service';
import { CertificationService } from './services/certification.service';

@Module({
  controllers: [TrainingController, CertificationController],
  providers: [TrainingService, CertificationService],
  exports: [TrainingService, CertificationService],
})
export class LearningModule {}
