import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'is_public';

/** Menandai endpoint sebagai publik (tidak memerlukan JWT), mis. health check
 * dan /authz/check itu sendiri (dipanggil sebelum request lain diautentikasi). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
