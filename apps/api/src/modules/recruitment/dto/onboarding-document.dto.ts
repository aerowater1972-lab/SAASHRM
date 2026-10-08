import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, MinLength } from 'class-validator';

export class CreateOnboardingDocumentDto {
  @ApiProperty({ description: 'Application ID' })
  @IsUUID()
  applicationId!: string;

  @ApiProperty({ description: 'Document type (e.g., KTP, NPWP, Ijazah)' })
  @IsString()
  @MinLength(1)
  docType!: string;

  @ApiProperty({ description: 'File URL' })
  @IsString()
  @MinLength(1)
  fileUrl!: string;
}