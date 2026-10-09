-- OAuth2/OIDC fields for SSO connection (benefit platform SSO).
ALTER TABLE "SsoConnection" 
  ALTER COLUMN "entryPoint" DROP NOT NULL,
  ALTER COLUMN "issuer" DROP NOT NULL,
  ALTER COLUMN "cert" DROP NOT NULL;

ALTER TABLE "SsoConnection" 
  ADD COLUMN IF NOT EXISTS "clientSecret" TEXT,
  ADD COLUMN IF NOT EXISTS "tokenEndpoint" TEXT,
  ADD COLUMN IF NOT EXISTS "userInfoEndpoint" TEXT,
  ADD COLUMN IF NOT EXISTS "jwksUri" TEXT,
  ADD COLUMN IF NOT EXISTS "discoveryUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "scopes" TEXT[] DEFAULT ARRAY['openid', 'email', 'profile'];