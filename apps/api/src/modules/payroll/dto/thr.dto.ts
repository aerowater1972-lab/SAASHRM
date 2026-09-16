import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateThrRunDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Mis. Idul Fitri, Natal, Nyepi, Waisak, Imlek' })
  @IsString()
  holidayName!: string;

  @ApiProperty()
  @IsDateString()
  holidayDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
