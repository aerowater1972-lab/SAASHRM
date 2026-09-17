import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

/**
 * Segregation of duties bersama: approver (user id) tidak boleh
 * memutuskan pengajuan miliknya sendiri. User id dipetakan ke employee
 * via user.employeeId (fallback: id employee langsung untuk endpoint ESS
 * lama); dilewati bila akun tak tertaut (mis. sysadmin).
 */
export async function assertNotSelfApproval(
  prisma: PrismaService,
  approverUserId: string,
  ownerEmployeeId: string,
): Promise<void> {
  const approver = await prisma.user.findUnique({
    where: { id: approverUserId },
    select: { employeeId: true },
  });
  const approverEmployeeId =
    approver?.employeeId ??
    (await prisma.employee.findUnique({ where: { id: approverUserId }, select: { id: true } }))?.id ??
    null;
  if (approverEmployeeId && approverEmployeeId === ownerEmployeeId) {
    throw new ForbiddenException('Tidak dapat menyetujui pengajuan sendiri (segregation of duties)');
  }
}

/**
 * Kepemilikan untuk operasi mutasi: pemilik atau pemegang permission
 * approve terkait (HR/manager) boleh lanjut; selain itu Forbidden.
 */
export function assertOwnerOrApprover(
  ownerEmployeeId: string,
  requesterEmployeeId: string | null | undefined,
  approverPermissions: string[],
  approvePermission: string,
  entityName = 'Data',
): void {
  if (requesterEmployeeId && requesterEmployeeId === ownerEmployeeId) return;
  if (approverPermissions.includes(approvePermission)) return;
  throw new ForbiddenException(`${entityName} ini bukan milik Anda`);
}
