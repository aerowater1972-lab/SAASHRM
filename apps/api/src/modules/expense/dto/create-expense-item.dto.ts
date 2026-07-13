import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ExpenseCategory } from '@prisma/client';
export class CreateExpenseItemDto {
  @ApiProperty({ enum: ExpenseCategory })
  @IsEnum(ExpenseCategory)
  category!: ExpenseCategory;
  @ApiProperty()
  @IsString()
  description!: string;
  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount!: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receiptUrl?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;
}
