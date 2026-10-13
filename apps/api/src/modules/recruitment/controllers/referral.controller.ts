import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { CurrentUser, JwtUser } from '@common/decorators/current-user.decorator';
import { ReferralService } from '../services/referral.service';
import {
  CreateReferralDto,
  UpdateReferralStatusDto,
  ReferralListQueryDto,
} from '../dto/referral.dto';

@ApiTags('Recruitment - Referrals')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('recruitment/referrals')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Post()
  @Permissions('recruitment:referral:create')
  @ApiOperation({ summary: 'Submit an employee referral' })
  create(
    @TenantId() tenantId: string,
    @CurrentUser('employeeId') referrerEmployeeId: string,
    @Body() dto: CreateReferralDto,
  ) {
    return this.referralService.create(tenantId, referrerEmployeeId, dto);
  }

  @Get()
  @Permissions('recruitment:referral:read')
  @ApiOperation({
    summary: 'List referrals (employees see their own; reviewers see all)',
  })
  findAll(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtUser,
    @Query() filters: ReferralListQueryDto,
  ) {
    const canReview = (user?.permissions ?? []).includes(
      'recruitment:referral:review',
    );
    return this.referralService.findAll(
      tenantId,
      user?.employeeId,
      canReview,
      filters,
    );
  }

  @Get(':id')
  @Permissions('recruitment:referral:read')
  @ApiOperation({ summary: 'Get a single referral' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.referralService.findOne(tenantId, id);
  }

  @Patch(':id/status')
  @Permissions('recruitment:referral:review')
  @ApiOperation({ summary: 'Update referral status (HR review)' })
  updateStatus(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateReferralStatusDto,
  ) {
    return this.referralService.updateStatus(tenantId, id, dto);
  }
}
