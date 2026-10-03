import { Module } from '@nestjs/common';
import { Feedback360Controller } from './controllers/feedback360.controller';
import { Feedback360Service } from './services/feedback360.service';

@Module({
  controllers: [Feedback360Controller],
  providers: [Feedback360Service],
  exports: [Feedback360Service],
})
export class Feedback360Module {}