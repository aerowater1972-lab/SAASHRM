import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsUrl, MinLength, IsEnum, IsArray } from 'class-validator';

export enum SsoProvider {
  SAML = 'SAML',
  OIDC = 'OIDC',
}

export class CreateSsoConnectionDto {
  @ApiProperty({ enum: SsoProvider, default: SsoProvider.SAML, description: 'SSO provider type' })
  @IsOptional()
  @IsEnum(SsoProvider)
  provider?: SsoProvider = SsoProvider.SAML;

  // SAML fields
  @ApiPropertyOptional({ description: 'SAML: IdP SSO URL (redirect target)', example: 'https://idp.example.com/sso/saml' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  entryPoint?: string;

  @ApiPropertyOptional({ description: 'SAML: SP entity ID issued for this tenant' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  issuer?: string;

  @ApiPropertyOptional({ description: 'SAML: IdP signing certificate (PEM, armor optional)' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  cert?: string;

  @ApiPropertyOptional({ description: 'SAML: NameID format' })
  @IsOptional()
  @IsString()
  nameIdFormat?: string;

  // OIDC fields
  @ApiPropertyOptional({ description: 'OIDC: Client ID', example: 'my-client-id' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: 'OIDC: Client secret (will be encrypted at rest)' })
  @IsOptional()
  @IsString()
  clientSecret?: string;

  @ApiPropertyOptional({ description: 'OIDC: Authorization endpoint', example: 'https://idp.example.com/oauth2/authorize' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  authorizationEndpoint?: string;

  @ApiPropertyOptional({ description: 'OIDC: Token endpoint', example: 'https://idp.example.com/oauth2/token' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  tokenEndpoint?: string;

  @ApiPropertyOptional({ description: 'OIDC: UserInfo endpoint', example: 'https://idp.example.com/oauth2/userinfo' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  userInfoEndpoint?: string;

  @ApiPropertyOptional({ description: 'OIDC: JWKS URI for token validation', example: 'https://idp.example.com/.well-known/jwks.json' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  jwksUri?: string;

  @ApiPropertyOptional({ description: 'OIDC: Discovery URL (e.g., https://idp.example.com/.well-known/openid-configuration)' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  discoveryUrl?: string;

  @ApiPropertyOptional({ description: 'OIDC: Scopes to request', default: ['openid', 'email', 'profile'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[] = ['openid', 'email', 'profile'];

  @ApiPropertyOptional({ description: 'Enable connection immediately', default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateSsoConnectionDto {
  @ApiPropertyOptional({ enum: SsoProvider, description: 'SSO provider type (cannot be changed after creation)' })
  @IsOptional()
  @IsEnum(SsoProvider)
  provider?: SsoProvider;

  // SAML fields
  @ApiPropertyOptional({ description: 'SAML: IdP SSO URL' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  entryPoint?: string;

  @ApiPropertyOptional({ description: 'SAML: SP entity ID' })
  @IsOptional()
  @IsString()
  issuer?: string;

  @ApiPropertyOptional({ description: 'SAML: IdP signing certificate (PEM, armor optional)' })
  @IsOptional()
  @IsString()
  cert?: string;

  @ApiPropertyOptional({ description: 'SAML: NameID format' })
  @IsOptional()
  @IsString()
  nameIdFormat?: string;

  // OIDC fields
  @ApiPropertyOptional({ description: 'OIDC: Client ID' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: 'OIDC: Client secret' })
  @IsOptional()
  @IsString()
  clientSecret?: string;

  @ApiPropertyOptional({ description: 'OIDC: Authorization endpoint' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  authorizationEndpoint?: string;

  @ApiPropertyOptional({ description: 'OIDC: Token endpoint' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  tokenEndpoint?: string;

  @ApiPropertyOptional({ description: 'OIDC: UserInfo endpoint' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  userInfoEndpoint?: string;

  @ApiPropertyOptional({ description: 'OIDC: JWKS URI' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  jwksUri?: string;

  @ApiPropertyOptional({ description: 'OIDC: Discovery URL' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  discoveryUrl?: string;

  @ApiPropertyOptional({ description: 'OIDC: Scopes' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  @ApiPropertyOptional({ description: 'Enable/disable connection' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
