const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:postgres@localhost:5432/flexy_hrms"
    }
  }
});

async function main() {
  const result = await prisma.grade.updateMany({
    where: {
      maxOvertimeHoursPerMonth: null
    },
    data: {
      maxOvertimeHoursPerMonth: 8
    }
  });
  console.log(`Updated ${result.count} grades to have maxOvertimeHoursPerMonth = 8`);
  await prisma.$disconnect();
}

main()
  .then(async () => {
    console.log('Done!');
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });