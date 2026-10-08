const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRaw`
    SELECT id, salary, salary_enc FROM "Employment" WHERE salary_enc IS NOT NULL LIMIT 5
  `;
  console.log(rows);
  await prisma.$disconnect();
}
main();