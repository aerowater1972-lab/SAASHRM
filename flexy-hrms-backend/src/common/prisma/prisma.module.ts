import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Global module — PrismaService tersedia di seluruh modul tanpa perlu
 * import berulang, konsisten dengan pola "shared infrastructure" pada
 * Technical Architecture Document.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
