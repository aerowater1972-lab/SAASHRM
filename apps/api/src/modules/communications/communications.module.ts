import { Module } from '@nestjs/common';
import { AnnouncementController } from './controllers/announcement.controller';
import { ForumController } from './controllers/forum.controller';
import { AnnouncementService } from './services/announcement.service';
import { ForumService } from './services/forum.service';

@Module({
  controllers: [AnnouncementController, ForumController],
  providers: [AnnouncementService, ForumService],
  exports: [AnnouncementService, ForumService],
})
export class CommunicationsModule {}