import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class CreateRoleDto {
  @ApiProperty({ example: 'Manager' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;
  @ApiPropertyOptional({ example: 'Can manage team and approve requests' })
  @IsOptional()
  @IsString()
  description?: string;
}
