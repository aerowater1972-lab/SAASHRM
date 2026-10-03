const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const correctionPerms = await p.permission.findMany({ where: { action: { contains: 'correction' } } });
  console.log('correction perms:', correctionPerms.length);
  correctionPerms.forEach(x => console.log('  ', x.id, x.module, x.action));
  
  const attPerms = await p.permission.findMany({ where: { module: 'attendance' } });
  console.log('attendance perms:', attPerms.length);
  attPerms.forEach(x => console.log('  ', x.module, x.action));
  
  await p.$disconnect();
}
main().catch(e => { console.error(e.message); p.$disconnect(); });
