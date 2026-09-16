import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export interface AnnualMonthInput {
  month: number;
  gross: number;
  bpjsEmployee?: number;
  otherDeductions?: number;
  terWithheld?: number;
}

export class AnnualMonthDto {
  @ApiProperty({ minimum: 1, maximum: 12 })
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  gross!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  bpjsEmployee?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  otherDeductions?: number;

  @ApiPropertyOptional({ description: 'PPh21 TER yang sudah dipotong bulan tersebut' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  terWithheld?: number;
}

export class AnnualReconcileDto {
  @ApiProperty()
  @IsString()
  employeeId!: string;

  @ApiProperty()
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @ApiProperty({ type: [AnnualMonthDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnnualMonthDto)
  months!: AnnualMonthDto[];
}
