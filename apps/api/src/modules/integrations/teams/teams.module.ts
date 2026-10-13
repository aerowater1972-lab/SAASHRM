import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../common/prisma/prisma.module';
import { ApiKeyModule } from '../../api-key/api-key.module';
import { WebhooksModule } from '../../webhooks/webhooks.module';
import { TeamsController } from './controllers/teams.controller';
import { TeamsService } from './services/teams.service';
import { TeamsEndpointService } from './services/teams-endpoint.service';

@Module({
  imports: [PrismaModule, ApiKeyModule, WebhooksModule],
  controllers: [TeamsController],
  providers: [TeamsService, TeamsEndpointService],
  exports: [TeamsService, TeamsEndpointService],
})
export class TeamsModule {}
