import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateExpenseItemDto } from './create-expense-item.dto';
export enum ExpenseClaimStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}
export class CreateExpenseClaimDto {
  @ApiProperty()
  @IsString()
  title!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
  @ApiPropertyOptional({ type: [CreateExpenseItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExpenseItemDto)
  items?: CreateExpenseItemDto[];
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
