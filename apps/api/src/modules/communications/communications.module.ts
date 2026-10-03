import { Module } from '@nestjs/common';
import { AnnouncementController } from './controllers/announcement.controller';
import { AnnouncementService } from './services/announcement.service';

@Module({
  controllers: [AnnouncementController],
  providers: [AnnouncementService],
  exports: [AnnouncementService],
})
export class CommunicationsModule {}