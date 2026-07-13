import { Controller, Get, Post, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { EssOnboardingService } from '../services/onboarding.service';

@ApiTags('ESS - Onboarding')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('ess/onboarding')
export class EssOnboardingController {
  constructor(private readonly onboardingService: EssOnboardingService) {}

  @Get()
  @ApiOperation({ summary: 'Get my ESS onboarding progress (US-07)' })
  getStatus(@CurrentUser('employeeId') employeeId: string) {
    return this.onboardingService.getStatus(employeeId);
  }

  @Post('complete-tour')
  @ApiOperation({ summary: 'Mark guided tour as completed (US-07)' })
  completeTour(@TenantId() _tenantId: string, @CurrentUser('employeeId') employeeId: string) {
    return this.onboardingService.completeTour(employeeId);
  }

  @Patch('confirm-profile')
  @ApiOperation({ summary: 'Confirm profile data on first ESS session (US-07)' })
  confirmProfile(@TenantId() _tenantId: string, @CurrentUser('employeeId') employeeId: string) {
    return this.onboardingService.confirmProfile(employeeId);
  }
}
