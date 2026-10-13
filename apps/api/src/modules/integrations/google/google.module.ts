import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../common/prisma/prisma.module';
import { ApiKeyModule } from '../../api-key/api-key.module';
import { GoogleController } from './controllers/google.controller';
import { GoogleWorkspaceService } from './services/google-workspace.service';
import { GoogleAuthService } from './services/google-auth.service';

@Module({
  imports: [PrismaModule, ApiKeyModule],
  controllers: [GoogleController],
  providers: [GoogleWorkspaceService, GoogleAuthService],
  exports: [GoogleWorkspaceService, GoogleAuthService],
})
export class GoogleModule {}
