import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'required_permission';

export interface RequiredPermission {
  module: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'approve';
}

/**
 * Decorator untuk menandai endpoint dengan permission yang dibutuhkan.
 * Dibaca oleh AuthzGuard pada setiap request (lihat common/guards/authz.guard.ts).
 *
 * Contoh:
 *   @RequirePermission({ module: 'employee', action: 'create' })
 *   @Post()
 *   createEmployee() { ... }
 */
export const RequirePermission = (permission: RequiredPermission) =>
  SetMetadata(PERMISSION_KEY, permission);
