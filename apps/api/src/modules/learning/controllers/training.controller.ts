import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards} from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TrainingService } from '../services/training.service';
import {
  CreateTrainingDto,
  UpdateTrainingDto,
  TrainingFilterDto,
  RegisterParticipantDto,
  BulkRegisterParticipantDto,
  UpdateParticipantDto,
} from '../dto/create-training.dto';

@ApiTags('Training Programs')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('learning')
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Post('trainings')
  @Permissions('learning:create')
  @ApiOperation({ summary: 'Create a training program' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateTrainingDto,
  ) {
    return this.trainingService.create(tenantId, dto);
  }

  @Get('trainings')
  @ApiOperation({ summary: 'Get training programs with filters' })
  findAll(
    @TenantId() tenantId: string,
    @Query() filters: TrainingFilterDto,
  ) {
    return this.trainingService.findAll(tenantId, filters);
  }

  @Get('trainings/:id')
  @ApiOperation({ summary: 'Get training program by ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.trainingService.findOne(tenantId, id);
  }

  @Put('trainings/:id')
  @Permissions('learning:update')
  @ApiOperation({ summary: 'Update training program' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTrainingDto,
  ) {
    return this.trainingService.update(tenantId, id, dto);
  }

  @Post('trainings/:id/register')
  @ApiOperation({ summary: 'Register an employee for training' })
  register(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: RegisterParticipantDto,
  ) {
    return this.trainingService.register(tenantId, id, dto);
  }

  @Post('trainings/:id/participants/bulk')
  @Permissions('learning:create')
  @ApiOperation({ summary: 'Bulk register employees for training' })
  bulkRegister(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: BulkRegisterParticipantDto,
  ) {
    return this.trainingService.bulkRegister(tenantId, id, dto);
  }

  @Get('trainings/:id/participants')
  @ApiOperation({ summary: 'Get participants of a training' })
  getParticipants(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.trainingService.getParticipants(tenantId, id);
  }

  @Put('participants/:id')
  @Permissions('learning:update')
  @ApiOperation({ summary: 'Update participant status and score' })
  updateParticipant(
    @Param('id') id: string,
    @Body() dto: UpdateParticipantDto,
  ) {
    return this.trainingService.updateParticipant(id, dto);
  }

  @Post('trainings/:id/cancel')
  @Permissions('learning:update')
  @ApiOperation({ summary: 'Cancel a training program' })
  cancel(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.trainingService.cancel(tenantId, id);
  }
}
