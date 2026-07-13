import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class AssignRoleDto {
  @ApiProperty({ example: 'role-uuid' })
  @IsString()
  roleId!: string;
  @ApiPropertyOptional({ example: 'entity-uuid', description: 'Optional data scope restriction' })
  @IsOptional()
  @IsString()
  entityId?: string;
}
