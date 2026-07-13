export const AUDIT_QUEUE = 'audit-log-ingest';

/**
 * Job payload untuk BullMQ. Divalidasi ULANG di processor (audit.processor.ts)
 * sebagai defense-in-depth, meskipun sudah divalidasi di controller —
 * karena job bisa saja di-retry setelah deploy baru dengan skema berbeda.
 */
export interface AuditIngestJobPayload {
  tenantId: string;
  module: string;
  entity: string;
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'approve' | 'reject';
  changedBy: string;
  diff?: Record<string, unknown>;
}
