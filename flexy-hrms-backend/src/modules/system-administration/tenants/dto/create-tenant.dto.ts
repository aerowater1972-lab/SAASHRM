import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  domain!: string;

  @IsOptional()
  @IsIn(['standard', 'professional', 'enterprise'])
  licensePackage?: string;
}
