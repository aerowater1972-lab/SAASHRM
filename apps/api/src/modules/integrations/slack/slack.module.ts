import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../common/prisma/prisma.module';
import { ApiKeyModule } from '../../api-key/api-key.module';
import { SlackController } from './controllers/slack.controller';
import { SlackService } from './services/slack.service';
import { SlackEndpointService } from '../services/slack-endpoint.service';

@Module({
  imports: [PrismaModule, ApiKeyModule],
  controllers: [SlackController],
  providers: [SlackService, SlackEndpointService],
  exports: [SlackService, SlackEndpointService],
})
export class SlackModule {}