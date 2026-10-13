import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';

import { SandboxService } from '../services/sandbox.service';
import {
  SandboxSetupDto,
  SandboxSetupResponse,
  SandboxListResponse,
  SandboxStatus,
} from '../dto';

@ApiTags('Sandbox')
@Controller('sandbox')
export class SandboxController {
  constructor(private readonly sandboxService: SandboxService) {}

  @Post('setup')
  @UseGuards(AuthGuard, TenantGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Provision a sandbox environment with mock data' })
  @ApiResponse({ status: 200, type: SandboxSetupResponse })
  async setup(@TenantId() tenantId: string, @Body() dto: SandboxSetupDto) {
    return this.sandboxService.setup(tenantId, dto.sampleType);
  }

  @Get()
  @UseGuards(AuthGuard, TenantGuard)
  @ApiOperation({ summary: 'List sandbox environments for the tenant' })
  @ApiResponse({ status: 200, type: SandboxListResponse })
  findAll(@TenantId() tenantId: string) {
    return this.sandboxService.findAll(tenantId);
  }

  @Get(':id/status')
  @UseGuards(AuthGuard, TenantGuard)
  @ApiOperation({ summary: 'Get sandbox status' })
  @ApiResponse({ status: 200, type: SandboxStatus })
  getStatus(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sandboxService.getStatus(id, tenantId);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, TenantGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clean up a sandbox environment' })
  @ApiResponse({ status: 200, description: 'Sandbox environment removed' })
  cleanup(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sandboxService.cleanup(id, tenantId);
  }
}
