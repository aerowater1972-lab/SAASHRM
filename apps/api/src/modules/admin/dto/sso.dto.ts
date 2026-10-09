import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsUrl, MinLength } from 'class-validator';

export class CreateSsoConnectionDto {
  @ApiProperty({ description: 'IdP SSO URL (redirect target)', example: 'https://idp.example.com/sso/saml' })
  @IsUrl({ require_tld: false })
  entryPoint!: string;

  @ApiProperty({ description: 'SP entity ID issued for this tenant' })
  @IsString()
  @MinLength(1)
  issuer!: string;

  @ApiProperty({ description: 'IdP signing certificate (PEM, armor optional)' })
  @IsString()
  @MinLength(10)
  cert!: string;

  @ApiPropertyOptional({ description: 'SAML NameID format' })
  @IsOptional()
  @IsString()
  nameIdFormat?: string;

  @ApiPropertyOptional({ description: 'Enable connection immediately', default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateSsoConnectionDto {
  @ApiPropertyOptional({ description: 'IdP SSO URL' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  entryPoint?: string;

  @ApiPropertyOptional({ description: 'SP entity ID' })
  @IsOptional()
  @IsString()
  issuer?: string;

  @ApiPropertyOptional({ description: 'IdP signing certificate (PEM, armor optional)' })
  @IsOptional()
  @IsString()
  cert?: string;

  @ApiPropertyOptional({ description: 'SAML NameID format' })
  @IsOptional()
  @IsString()
  nameIdFormat?: string;

  @ApiPropertyOptional({ description: 'Enable/disable connection' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
