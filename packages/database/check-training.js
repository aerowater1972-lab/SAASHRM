const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const trainings = await p.training.findMany();
  console.log('Trainings:', trainings.length);
  const participants = await p.trainingParticipant.findMany();
  console.log('Participants:', participants.length);
  await p.$disconnect();
}

main().catch(e => { console.error(e); p.$disconnect(); });