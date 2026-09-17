import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, Min } from 'class-validator';

export class GrossUpDto {
  @ApiProperty()
  @IsString()
  employeeId!: string;

  @ApiProperty({ description: 'Gaji bersih bulanan yang diinginkan (tunjangan pajak)' })
  @IsNumber()
  @Min(1)
  netMonthlyTarget!: number;
}
