import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import {
  DocumentStatus,
  DocumentAccessLevel,
  DocumentPermissionLevel,
  DocumentPermissionType,
  DocumentAction,
  SignatureStatus,
} from '@prisma/client';

export class CreateDocumentCategoryDto {
  @ApiProperty({ description: 'Category name' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional({ description: 'Category description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Category icon' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'Category color hex' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Active flag' })
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

  @ApiPropertyOptional({ description: 'Category icon' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'Category color hex' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Active flag' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateDocumentDto {
  @ApiProperty({ description: 'Document title' })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiPropertyOptional({ description: 'Document description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Markdown/HTML content' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Department ID scope' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Access level' })
  @IsOptional()
  @IsEnum(DocumentAccessLevel)
  accessLevel?: DocumentAccessLevel;

  @ApiPropertyOptional({ description: 'Tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Is this a reusable template' })
  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @ApiPropertyOptional({ description: 'Initial status' })
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

  @ApiPropertyOptional({ description: 'Markdown/HTML content' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Department ID scope' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Access level' })
  @IsOptional()
  @IsEnum(DocumentAccessLevel)
  accessLevel?: DocumentAccessLevel;

  @ApiPropertyOptional({ description: 'Tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class CreateDocumentVersionDto {
  @ApiProperty({ description: 'Version content (Markdown/HTML)' })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ description: 'Version title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Change log description' })
  @IsOptional()
  @IsString()
  changeLog?: string;
}

export class UpdateDocumentStatusDto {
  @ApiProperty({ description: 'New document status' })
  @IsEnum(DocumentStatus)
  status!: DocumentStatus;
}

export class DocumentPermissionDto {
  @ApiProperty({ description: 'Permission type' })
  @IsEnum(DocumentPermissionType)
  permissionType!: DocumentPermissionType;

  @ApiProperty({ description: 'Target ID (role/user/department)' })
  @IsString()
  targetId!: string;

  @ApiPropertyOptional({ description: 'Permission level' })
  @IsOptional()
  @IsEnum(DocumentPermissionLevel)
  permission?: DocumentPermissionLevel;
}

export class UpdateDocumentPermissionDto {
  @ApiPropertyOptional({ description: 'Permission level' })
  @IsOptional()
  @IsEnum(DocumentPermissionLevel)
  permission?: DocumentPermissionLevel;
}

export class SignDocumentDto {
  @ApiProperty({ description: 'Signature status' })
  @IsEnum(SignatureStatus)
  status!: SignatureStatus;

  @ApiPropertyOptional({ description: 'Signature data (base64/hash)' })
  @IsOptional()
  @IsString()
  signatureData?: string;

  @ApiPropertyOptional({ description: 'Expiration date' })
  @IsOptional()
  @IsString()
  expiresAt?: string;
}

export class LogDocumentActivityDto {
  @ApiProperty({ description: 'Activity action' })
  @IsEnum(DocumentAction)
  action!: DocumentAction;

  @ApiPropertyOptional({ description: 'Activity details (JSON)' })
  @IsOptional()
  details?: Record<string, any>;

  @ApiPropertyOptional({ description: 'IP address' })
  @IsOptional()
  @IsString()
  ipAddress?: string;
}
