import { IsArray, IsString, IsOptional, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class AssignPermissionDto {
  @ApiProperty({
    example: ['module:action', 'employee:create'],
    description: 'Array of permission keys in module:action format',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  permissionKeys!: string[];
  @ApiPropertyOptional({ enum: ['ALL', 'OWN', 'DEPARTMENT'], default: 'ALL' })
  @IsOptional()
  @IsString()
  scope?: 'ALL' | 'OWN' | 'DEPARTMENT';
}
