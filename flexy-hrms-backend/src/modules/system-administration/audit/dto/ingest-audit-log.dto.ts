import { IsIn, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * Payload kontrak event *.data.changed (lihat Consolidated API & Event
 * Contract, Bagian 15). Divalidasi ketat sesuai FR-09b (System
 * Administration v1.1 Addendum) — event tidak lengkap ditolak, BUKAN
 * diam-diam diabaikan.
 */
export class IngestAuditLogDto {
  @IsUUID()
  tenantId!: string;

  @IsString()
  @IsNotEmpty()
  module!: string;

  @IsString()
  @IsNotEmpty()
  entity!: string;

  @IsUUID()
  entityId!: string;

  @IsIn(['create', 'update', 'delete', 'approve', 'reject'])
  action!: 'create' | 'update' | 'delete' | 'approve' | 'reject';

  @IsUUID()
  changedBy!: string;

  @IsOptional()
  @IsObject()
  diff?: Record<string, unknown>;
}
