import { Module } from '@nestjs/common';
import { CourseController } from './controllers/course.controller';
import { LmsService } from './services/course.service';

@Module({
  controllers: [CourseController],
  providers: [LmsService],
  exports: [LmsService],
})
export class LmsModule {}