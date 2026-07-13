import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed katalog permission dasar (module x action) untuk modul yang sudah
 * diimplementasikan pada increment ini (System Administration). Modul
 * lain menambahkan permission miliknya sendiri ke katalog ini saat
 * dikembangkan (lihat Technical Architecture Document, Bagian 6.1) —
 * BUKAN membangun tabel permission terpisah.
 */
const PERMISSION_CATALOG: Array<{ module: string; action: string; description: string }> = [
  { module: 'tenant', action: 'create', description: 'Memprovisioning tenant baru' },
  { module: 'tenant', action: 'read', description: 'Melihat data tenant' },
  { module: 'role', action: 'create', description: 'Membuat custom role' },
  { module: 'role', action: 'read', description: 'Melihat role & permission' },
  { module: 'role', action: 'update', description: 'Mengubah permission suatu role' },
  { module: 'workflow', action: 'create', description: 'Membuat/memperbarui definisi workflow' },
  { module: 'workflow', action: 'read', description: 'Melihat definisi workflow aktif' },
  { module: 'audit_log', action: 'read', description: 'Mencari & mengekspor audit log' },
];

async function main() {
  console.log('Seeding permission catalog...');
  for (const perm of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { module_action: { module: perm.module, action: perm.action } },
      update: { description: perm.description },
      create: perm,
    });
  }

  console.log('Seeding tenant demo untuk local development...');
  const demoTenant = await prisma.tenant.upsert({
    where: { domain: 'demo.flexyhrms.local' },
    update: {},
    create: {
      name: 'PT Demo Flexy HRMS',
      domain: 'demo.flexyhrms.local',
      licensePackage: 'enterprise',
    },
  });

  const systemAdminRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: demoTenant.id, name: 'System Admin' } },
    update: {},
    create: { tenantId: demoTenant.id, name: 'System Admin', isCustom: false },
  });

  // System Admin mendapat SELURUH permission di katalog (super role default).
  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: systemAdminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: systemAdminRole.id, permissionId: perm.id, dataScope: 'tenant' },
    });
  }

  console.log(`Selesai. Tenant demo: ${demoTenant.id} (domain: ${demoTenant.domain})`);
  console.log(
    'Catatan: belum ada tabel User (identity) pada increment ini — assignment UserRole ' +
      'dapat dilakukan manual via Prisma Studio setelah user pertama dibuat di identity provider.',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
