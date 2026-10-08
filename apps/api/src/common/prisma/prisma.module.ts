import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PermissionsResolver } from '../auth/permissions.resolver';

@Global()
@Module({
  providers: [PrismaService, PermissionsResolver],
  exports: [PrismaService, PermissionsResolver],
})
export class PrismaModule {}
