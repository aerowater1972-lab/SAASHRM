import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { AnnouncementService } from '../services/announcement.service';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  UpdateAnnouncementStatusDto,
} from '../dto/announcement.dto';

@ApiTags('Announcements')
@UseGuards(AuthGuard, PermissionGuard)
@Controller('announcements')
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @Get()
  @ApiOperation({ summary: 'List announcements' })
  @Permissions('announcements:view')
  findAll(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('mine') mine?: string,
  ) {
    return this.announcementService.findAll(tenantId, user.sub, { status, type, search, mine });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get announcement stats' })
  @Permissions('announcements:view')
  stats(@TenantId() tenantId: string) {
    return this.announcementService.stats(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get announcement detail' })
  @Permissions('announcements:view')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.announcementService.findById(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create an announcement' })
  @Permissions('announcements:manage')
  create(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: CreateAnnouncementDto) {
    return this.announcementService.create(tenantId, user.sub, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an announcement' })
  @Permissions('announcements:manage')
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateAnnouncementDto) {
    return this.announcementService.update(tenantId, id, dto);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update announcement status' })
  @Permissions('announcements:manage')
  updateStatus(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateAnnouncementStatusDto) {
    return this.announcementService.updateStatus(tenantId, id, dto);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish an announcement now' })
  @Permissions('announcements:manage')
  publishNow(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.announcementService.publishNow(tenantId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an announcement' })
  @Permissions('announcements:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.announcementService.delete(tenantId, id);
  }
}