import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class PermissionAssignmentDto {
  @IsUUID()
  permissionId!: string;

  @IsOptional()
  @IsIn(['own', 'team', 'department', 'tenant'])
  dataScope?: string;
}

export class SetRolePermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionAssignmentDto)
  permissions!: PermissionAssignmentDto[];
}
