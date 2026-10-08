import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';

export class CreateSalaryComponentDto {
  @ApiProperty({ description: 'Employee ID' })
  @IsString()
  employeeId!: string;

  @ApiProperty({ description: 'Component type', enum: ['basic_salary', 'allowance', 'deduction'] })
  @IsEnum(['basic_salary', 'allowance', 'deduction'])
  componentType!: 'basic_salary' | 'allowance' | 'deduction';

  @ApiProperty({ description: 'Amount' })
  @IsString()
  amount!: string; // Decimal as string

  @ApiProperty({ description: 'Effective date (ISO)' })
  @IsDateString()
  effectiveDate!: string;

  @ApiPropertyOptional({ description: 'End date (ISO)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}