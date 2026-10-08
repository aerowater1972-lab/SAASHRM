import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsUUID, IsEnum, IsBoolean, IsDateString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentStatus, DocumentAction, SignatureStatus, DocumentAccessLevel, DocumentPermissionType } from '@prisma/client';

export class CreateDocumentCategoryDto {
  @ApiProperty({ description: 'Category name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Category description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Icon name' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'Color hex', default: '#6366F1' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Sort order', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateDocumentCategoryDto {
  @ApiPropertyOptional({ description: 'Category name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Category description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Icon name' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'Color hex' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateDocumentDto {
  @ApiProperty({ description: 'Document title' })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ description: 'Document description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Document content (markdown/html)' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Department ID' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Access level', enum: DocumentAccessLevel, default: 'TENANT' })
  @IsOptional()
  @IsEnum(DocumentAccessLevel)
  accessLevel?: DocumentAccessLevel;

  @ApiPropertyOptional({ description: 'Tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Is template', default: false })
  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @ApiPropertyOptional({ description: 'Initial status', enum: DocumentStatus, default: 'DRAFT' })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;
}

export class UpdateDocumentDto {
  @ApiPropertyOptional({ description: 'Document title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Document description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Document content (markdown/html)' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Department ID' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Access level', enum: DocumentAccessLevel })
  @IsOptional()
  @IsEnum(DocumentAccessLevel)
  accessLevel?: DocumentAccessLevel;

  @ApiPropertyOptional({ description: 'Tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Change log for versioning' })
  @IsOptional()
  @IsString()
  changeLog?: string;
}

export class UpdateDocumentStatusDto {
  @ApiProperty({ description: 'New status', enum: DocumentStatus })
  @IsEnum(DocumentStatus)
  status!: DocumentStatus;
}

export class CreateDocumentVersionDto {
  @ApiPropertyOptional({ description: 'New title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'New content' })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ description: 'Change log' })
  @IsOptional()
  @IsString()
  changeLog?: string;
}

export class AddDocumentPermissionDto {
  @ApiProperty({ description: 'Permission type (user, department, role)', enum: DocumentPermissionType })
  @IsEnum(DocumentPermissionType)
  permissionType!: DocumentPermissionType;

  @ApiProperty({ description: 'Target ID (userId, departmentId, roleId)' })
  @IsString()
  targetId!: string;

  @ApiPropertyOptional({ description: 'Permission level', enum: ['VIEW', 'EDIT', 'ADMIN'], default: 'VIEW' })
  @IsOptional()
  @IsEnum(['VIEW', 'EDIT', 'ADMIN'])
  permission?: 'VIEW' | 'EDIT' | 'ADMIN';
}

export class UpdateDocumentPermissionDto {
  @ApiPropertyOptional({ description: 'Permission level', enum: ['VIEW', 'EDIT', 'ADMIN'] })
  @IsOptional()
  @IsEnum(['VIEW', 'EDIT', 'ADMIN'])
  permission?: 'VIEW' | 'EDIT' | 'ADMIN';
}

export class SignDocumentDto {
  @ApiProperty({ description: 'Signature status', enum: SignatureStatus })
  @IsEnum(SignatureStatus)
  status!: SignatureStatus;

  @ApiPropertyOptional({ description: 'Signature data (base64 image)' })
  @IsOptional()
  @IsString()
  signatureData?: string;

  @ApiPropertyOptional({ description: 'Expiration date (ISO)' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class LogDocumentActivityDto {
  @ApiProperty({ description: 'Action', enum: DocumentAction })
  @IsEnum(DocumentAction)
  action!: DocumentAction;

  @ApiPropertyOptional({ description: 'Details (JSON)' })
  @IsOptional()
  @IsString()
  details?: string;

  @ApiPropertyOptional({ description: 'IP address' })
  @IsOptional()
  @IsString()
  ipAddress?: string;
}