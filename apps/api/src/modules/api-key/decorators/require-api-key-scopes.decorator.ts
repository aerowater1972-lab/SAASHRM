import { SetMetadata } from '@nestjs/common';

/** Metadata key untuk daftar scope API key yang wajib dimiliki sebuah route. */
export const REQUIRE_API_KEY_SCOPES_KEY = 'require_api_key_scopes';

/**
 * Menandai route yang hanya boleh diakses oleh API key dengan scope tertentu.
 * Diperiksa oleh `ApiKeyAuthGuard` setelah key terverifikasi; key dengan
 * scope `*` lolos semua route. Contoh: `@RequireApiKeyScopes('slack:write')`.
 *
 * Route tanpa dekorator ini tidak memeriksa scope (hanya validasi key).
 */
export const RequireApiKeyScopes = (...scopes: string[]) =>
  SetMetadata(REQUIRE_API_KEY_SCOPES_KEY, scopes);
