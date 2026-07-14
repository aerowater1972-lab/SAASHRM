import {
  Controller,
  Get,
  Put,
  Body,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ProfileService } from '../services/profile.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UploadPhotoDto } from '../dto/upload-photo.dto';

@ApiTags('ESS - Profile')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('ess/profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @Permissions('ess:profile:read')
  @ApiOperation({ summary: 'Get own employee profile' })
  getProfile(@TenantId() tenantId: string, @CurrentUser('employeeId') employeeId: string) {
    return this.profileService.getProfile(tenantId, employeeId);
  }

  @Put()
  @Permissions('ess:profile:update')
  @ApiOperation({ summary: 'Update personal data' })
  updateProfile(
    @TenantId() tenantId: string,
    @CurrentUser('employeeId') employeeId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(tenantId, employeeId, dto);
  }

  @Get('documents')
  @Permissions('ess:profile:read')
  @ApiOperation({ summary: 'View own documents' })
  getDocuments(@TenantId() tenantId: string, @CurrentUser('employeeId') employeeId: string) {
    return this.profileService.getDocuments(tenantId, employeeId);
  }

  @Get('employment')
  @Permissions('ess:profile:read')
  @ApiOperation({ summary: 'Current employment info' })
  getEmployment(@TenantId() tenantId: string, @CurrentUser('employeeId') employeeId: string) {
    return this.profileService.getEmployment(tenantId, employeeId);
  }

  @Put('photo')
  @Permissions('ess:profile:update')
  @ApiOperation({ summary: 'Upload profile picture' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  uploadPhoto(
    @TenantId() tenantId: string,
    @CurrentUser('employeeId') employeeId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.profileService.uploadPhoto(tenantId, employeeId, file);
  }
}
