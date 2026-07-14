import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { PrismaService } from '@common/prisma/prisma.service';

@ApiTags('ESS - Preferences')
@UseGuards(AuthGuard, PermissionGuard)
@Controller('ess/preferences')
export class PreferenceEssController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Permissions('ess:profile:read')
  @ApiOperation({ summary: 'Get my preferences' })
  async findOne(@CurrentUser('employeeId') employeeId: string) {
    const pref = await this.prisma.essPreference.findUnique({ where: { employeeId } });
    return pref || {};
  }

  @Put()
  @Permissions('ess:profile:update')
  @ApiOperation({ summary: 'Upsert my preferences' })
  async upsert(@CurrentUser('employeeId') employeeId: string, @Body() dto: any) {
    return this.prisma.essPreference.upsert({
      where: { employeeId },
      create: { employeeId, ...dto },
      update: dto,
    });
  }
}
