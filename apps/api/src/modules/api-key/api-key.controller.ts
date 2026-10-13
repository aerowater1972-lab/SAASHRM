import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';

import { ApiKeyService } from './services/api-key.service';
import {
  CreateApiKeyDto,
  UpdateApiKeyDto,
  ApiKeyResponse,
  ApiKeyListResponse,
  RevokeApiKeyDto,
} from './dto';

@ApiTags('API Keys')
@Controller('api-keys')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
  @UseGuards(AuthGuard, TenantGuard)
  @ApiOperation({ summary: 'Generate a new API key' })
  @ApiResponse({ status: 201, type: ApiKeyResponse })
  async create(@TenantId() tenantId: string, @Body() dto: CreateApiKeyDto) {
    return this.apiKeyService.create(dto, tenantId);
  }

  @Get()
  @UseGuards(AuthGuard, TenantGuard)
  @ApiOperation({ summary: 'List all API keys for the tenant' })
  @ApiResponse({ status: 200, type: ApiKeyListResponse })
  async findAll(@TenantId() tenantId: string) {
    return this.apiKeyService.findAll(tenantId);
  }

  @Get('active')
  @UseGuards(AuthGuard, TenantGuard)
  @ApiOperation({ summary: 'List only active API keys' })
  @ApiResponse({ status: 200, type: ApiKeyListResponse })
  async findActive(@TenantId() tenantId: string) {
    return this.apiKeyService.findActive(tenantId);
  }

  @Get(':id')
  @UseGuards(AuthGuard, TenantGuard)
  @ApiOperation({ summary: 'Get a specific API key' })
  @ApiResponse({ status: 200, type: ApiKeyResponse })
  async findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.apiKeyService.findOne(id, tenantId);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, TenantGuard)
  @ApiOperation({ summary: 'Update API key (e.g., name, expiry)' })
  @ApiResponse({ status: 200, type: ApiKeyResponse })
  async update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApiKeyDto,
  ) {
    return this.apiKeyService.update(id, dto, tenantId);
  }

  @Patch(':id/revoke')
  @UseGuards(AuthGuard, TenantGuard)
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({ status: 200 })
  async revoke(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RevokeApiKeyDto,
  ) {
    return this.apiKeyService.revoke(id, tenantId, dto.reason);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, TenantGuard)
  @ApiOperation({ summary: 'Permanently delete an API key' })
  @ApiResponse({ status: 204 })
  async remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.apiKeyService.remove(id, tenantId);
  }
}
