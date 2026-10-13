import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, IsUrl, MaxLength, MinLength, ArrayNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { WebhookDeliveryStatus } from '@prisma/client';

export class CreateWebhookEndpointDto {
  @ApiProperty({ description: 'Target URL that receives the webhook POST' })
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  url!: string;

  @ApiPropertyOptional({ description: 'Human-readable description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    type: [String],
    description: 'Subscribed event names (e.g. "leave.approved"). Use ["*"] to subscribe to all events.',
    example: ['leave.approved', 'employee.created'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  events!: string[];
}

export class UpdateWebhookEndpointDto {
  @ApiPropertyOptional({ description: 'Target URL' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  url?: string;

  @ApiPropertyOptional({ description: 'Human-readable description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ type: [String], description: 'Subscribed event names; ["*"] for all' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  events?: string[];

  @ApiPropertyOptional({ description: 'Enable / disable the endpoint' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class WebhookDeliveryQueryDto {
  @ApiPropertyOptional({ enum: WebhookDeliveryStatus, description: 'Filter by delivery status' })
  @IsOptional()
  @IsEnum(WebhookDeliveryStatus)
  status?: WebhookDeliveryStatus;

  @ApiPropertyOptional({ description: 'Filter by event name' })
  @IsOptional()
  @IsString()
  event?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}
