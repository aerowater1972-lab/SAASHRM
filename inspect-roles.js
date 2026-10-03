require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const roles = await prisma.role.findMany({
    where: { tenantId: 'nusantara', deletedAt: null },
    include: { rolePermissions: { include: { permission: true } }, _count: { select: { userRoles: true } } },
  });
  for (const r of roles) {
    console.log(`\n== ${r.name} (${r.id}) users=${r._count.userRoles}`);
    const keys = r.rolePermissions.map((rp) => `${rp.permission.module}:${rp.permission.action}`).sort();
    console.log(keys.join('\n'));
  }
  const allPerms = await prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { action: 'asc' }] });
  console.log('\n== PERMISSION CATALOG ==');
  console.log(allPerms.map((p) => `${p.module}:${p.action}`).sort().join(', '));
  await prisma.$disconnect();
})().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });