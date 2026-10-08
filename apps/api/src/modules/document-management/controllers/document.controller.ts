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
import { DocumentService } from '../services/document.service';
import {
  CreateDocumentCategoryDto,
  UpdateDocumentCategoryDto,
  CreateDocumentDto,
  UpdateDocumentDto,
  CreateDocumentVersionDto,
  UpdateDocumentStatusDto,
  AddDocumentPermissionDto,
  UpdateDocumentPermissionDto,
  SignDocumentDto,
  LogDocumentActivityDto,
} from '../dto/document.dto';

@ApiTags('Document Management')
@UseGuards(AuthGuard, PermissionGuard)
@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  // ---------- Categories ----------
  @Get('categories')
  @ApiOperation({ summary: 'List document categories' })
  @Permissions('documents:view')
  listCategories(@TenantId() tenantId: string) {
    return this.documentService.listCategories(tenantId);
  }

  @Get('categories/:id')
  @ApiOperation({ summary: 'Get category detail' })
  @Permissions('documents:view')
  getCategory(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.documentService.getCategory(tenantId, id);
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create a document category' })
  @Permissions('documents:manage')
  createCategory(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: CreateDocumentCategoryDto) {
    return this.documentService.createCategory(tenantId, user.sub, dto);
  }

  @Put('categories/:id')
  @ApiOperation({ summary: 'Update a document category' })
  @Permissions('documents:manage')
  updateCategory(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateDocumentCategoryDto) {
    return this.documentService.updateCategory(tenantId, id, dto);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete a document category' })
  @Permissions('documents:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCategory(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.documentService.deleteCategory(tenantId, id);
  }

  // ---------- Documents ----------
  @Get()
  @ApiOperation({ summary: 'List documents' })
  @Permissions('documents:view')
  findAll(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('departmentId') departmentId?: string,
    @Query('isTemplate') isTemplate?: string,
  ) {
    return this.documentService.findAll(tenantId, user.sub, { categoryId, status, search, departmentId, isTemplate });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document detail' })
  @Permissions('documents:view')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.documentService.findById(tenantId, id);
  }

  @Get(':id/activities')
  @ApiOperation({ summary: 'List document activities' })
  @Permissions('documents:view')
  listActivities(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.documentService.listActivities(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a document' })
  @Permissions('documents:manage')
  create(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: CreateDocumentDto) {
    return this.documentService.create(tenantId, user.sub, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a document' })
  @Permissions('documents:manage')
  update(@TenantId() tenantId: string, @Param('id') id: string, @CurrentUser() user: any, @Body() dto: UpdateDocumentDto) {
    return this.documentService.update(tenantId, id, user.sub, dto);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update document status' })
  @Permissions('documents:manage')
  updateStatus(@TenantId() tenantId: string, @Param('id') id: string, @CurrentUser() user: any, @Body() dto: UpdateDocumentStatusDto) {
    return this.documentService.updateStatus(tenantId, id, user.sub, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a document' })
  @Permissions('documents:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@TenantId() tenantId: string, @Param('id') id: string, @CurrentUser() user: any) {
    return this.documentService.delete(tenantId, id, user.sub);
  }

  // ---------- Versions ----------
  @Post(':id/versions')
  @ApiOperation({ summary: 'Create a new document version' })
  @Permissions('documents:manage')
  createVersion(@TenantId() tenantId: string, @Param('id') id: string, @CurrentUser() user: any, @Body() dto: CreateDocumentVersionDto) {
    return this.documentService.createVersion(tenantId, id, user.sub, dto);
  }

  // ---------- Permissions ----------
  @Post(':id/permissions')
  @ApiOperation({ summary: 'Add permission grant' })
  @Permissions('documents:manage')
  addPermission(@TenantId() tenantId: string, @Param('id') id: string, @CurrentUser() user: any, @Body() dto: AddDocumentPermissionDto) {
    return this.documentService.addPermission(tenantId, id, user.sub, dto);
  }

  @Put(':id/permissions/:permissionId')
  @ApiOperation({ summary: 'Update document permission' })
  @Permissions('documents:manage')
  updatePermission(@TenantId() tenantId: string, @Param('id') id: string, @Param('permissionId') permissionId: string, @Body() dto: UpdateDocumentPermissionDto) {
    return this.documentService.updatePermission(tenantId, id, permissionId, dto);
  }

  @Delete(':id/permissions/:permissionId')
  @ApiOperation({ summary: 'Remove document permission' })
  @Permissions('documents:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  removePermission(@TenantId() tenantId: string, @Param('id') id: string, @Param('permissionId') permissionId: string) {
    return this.documentService.removePermission(tenantId, id, permissionId);
  }

  // ---------- Signatures ----------
  @Post(':id/signatures/request')
  @ApiOperation({ summary: 'Request signature for a document' })
  @Permissions('documents:manage')
  requestSignatures(@TenantId() tenantId: string, @Param('id') id: string, @Body('userIds') userIds: string[]) {
    return this.documentService.requestSignatures(tenantId, id, userIds);
  }

  @Post(':id/signature')
  @ApiOperation({ summary: 'Sign a document' })
  @Permissions('documents:sign')
  sign(@TenantId() tenantId: string, @Param('id') id: string, @CurrentUser() user: any, @Body() dto: SignDocumentDto) {
    return this.documentService.sign(tenantId, id, user.sub, dto);
  }

  // ---------- Activities ----------
  @Post(':id/activities')
  @ApiOperation({ summary: 'Log a document activity' })
  @Permissions('documents:manage')
  logActivity(@TenantId() tenantId: string, @Param('id') id: string, @CurrentUser() user: any, @Body() dto: LogDocumentActivityDto) {
    return this.documentService.logActivity(tenantId, id, user.sub, dto);
  }
}