const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function clean() {
  await p.leaveBalance.deleteMany({});
  await p.payslip.deleteMany({});
  await p.payrollItem.deleteMany({});
  await p.employment.deleteMany({});
  await p.employeeDocument.deleteMany({});
  await p.employee.deleteMany({});
  await p.userRole.deleteMany({ where: { userId: { not: 'user-1' } } });
  await p.user.deleteMany({ where: { id: { not: 'user-1' } } });
  console.log('Cleaned old data');
}
clean().finally(() => p.$disconnect());
