import { Module } from '@nestjs/common';
import { DocumentController } from './controllers/document.controller';
import { DocumentService } from './services/document.service';

@Module({
  controllers: [DocumentController],
  providers: [DocumentService],
  exports: [DocumentService],
})
export class DocumentManagementModule {}