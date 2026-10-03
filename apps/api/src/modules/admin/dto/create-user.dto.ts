import { IsEmail, IsOptional, IsString, MinLength, IsArray, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

export class CreateUserDto {
  @ApiProperty({ example: 'jane.doe@acme.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  fullName!: string;

  @ApiProperty({ example: 'Str0ngP@ssw0rd', minLength: 8 })
  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_POLICY, {
    message: 'password must contain uppercase, lowercase and number',
  })
  password!: string;

  @ApiPropertyOptional({ example: '+628123456789' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Link to an Employee record (ID)' })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({ type: [String], description: 'Role IDs to assign on creation' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[];
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: '+628123456789' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Link to an Employee record (ID) or null to unlink' })
  @IsOptional()
  @IsString()
  employeeId?: string | null;
}

export class ResetPasswordDto {
  @ApiPropertyOptional({
    description: 'New password (min 8, upper+lower+number). If omitted, a random password is generated and returned.',
    minLength: 8,
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_POLICY, {
    message: 'password must contain uppercase, lowercase and number',
  })
  password?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'CurrentP@ss' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ example: 'NewStr0ngP@ss', minLength: 8 })
  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_POLICY, {
    message: 'password must contain uppercase, lowercase and number',
  })
  newPassword!: string;
}
