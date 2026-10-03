import { PrismaClient, CourseEnrollmentStatus, FeedbackReviewerType, FeedbackStatus, IDPStatus, IDPActivityType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const allTenants = await prisma.tenant.findMany();
  if (!allTenants.length) {
    console.log('No tenant found, skipping seed');
    return;
  }

  // Find a tenant that actually has employees
  let tenant = null;
  let employee = null;
  for (const t of allTenants) {
    const emp = await prisma.employee.findFirst({ where: { tenantId: t.id } });
    if (emp) {
      tenant = t;
      employee = emp;
      break;
    }
  }

  if (!tenant || !employee) {
    console.log('No tenant with employees found, skipping seed');
    return;
  }

  const reviewCycle = await prisma.reviewCycle.findFirst({ where: { tenantId: tenant.id } });

  // Seed LMS Course
  const course = await prisma.course.create({
    data: {
      tenantId: tenant.id,
      title: 'Onboarding Fundamentals',
      description: 'Complete onboarding training for new hires',
      category: 'Onboarding',
      duration: 240,
      modules: {
        create: [
          {
            title: 'Welcome & Company Overview',
            description: 'Introduction to company mission and values',
            order: 1,
            lessons: {
              create: [
                {
                  title: 'Company History',
                  content: 'Our journey from startup to scale-up',
                  order: 1,
                  duration: 15,
                    quizzes: {
                      create: {
                        title: 'Onboarding Quiz',
                        description: 'Test your knowledge',
                        questions: {
                        create: [
                          { question: 'What is our core mission?', options: JSON.stringify(['Profit', 'Customer Success', 'Growth']), correctAnswer: 'Customer Success', order: 1 },
                          { question: 'When was the company founded?', options: JSON.stringify(['2010', '2015', '2020']), correctAnswer: '2015', order: 2 },
                        ],
                      },
                    },
                  },
                },
                { title: 'Mission & Values', content: 'Core principles that guide us', order: 2, duration: 20 },
              ],
            },
          },
          {
            title: 'Tools & Security',
            description: 'Essential tools and security practices',
            order: 2,
            lessons: {
              create: [
                { title: 'Communication Tools', content: 'Slack, Email, Video Calls', order: 1, duration: 30 },
                { title: 'Security Best Practices', content: 'Passwords, 2FA, Phishing', order: 2, duration: 25 },
              ],
            },
          },
        ],
      },
      trainees: {
        create: { employeeId: employee.id, status: CourseEnrollmentStatus.ENROLLED },
      },
    },
  });
  console.log(`Created course: ${course.title}`);

  // Seed 360° Feedback
  if (reviewCycle) {
    const feedback360 = await prisma.feedback360.create({
      data: {
        tenantId: tenant.id,
        reviewCycleId: reviewCycle.id,
        revieweeId: employee.id,
        reviewerId: employee.id,
        reviewerType: FeedbackReviewerType.SELF,
        status: FeedbackStatus.PENDING,
        questions: {
          create: [
            { questionText: 'Communicates clearly and effectively', questionType: 'LIKERT_5', order: 1 },
            { questionText: 'Demonstrates leadership qualities', questionType: 'LIKERT_5', order: 2 },
            { questionText: 'Collaborates well with team members', questionType: 'LIKERT_5', order: 3 },
          ],
        },
      },
    });
    console.log(`Created 360 feedback: ${feedback360.id}`);
  }

  // Seed IDP
  const idp = await prisma.individualDevelopmentPlan.create({
    data: {
      tenantId: tenant.id,
      employeeId: employee.id,
      reviewCycleId: reviewCycle?.id,
      title: 'Technical Leadership Growth',
      description: 'Develop skills to lead engineering teams',
      objectives: JSON.stringify([
        'Improve system design skills',
        'Learn team management',
        'Mentor junior engineers',
      ]),
      skillsGap: JSON.stringify(['People management', 'Strategic planning']),
      startDate: new Date(),
      endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      status: IDPStatus.ACTIVE,
      activities: {
        create: [
          {
            title: 'System Design Course',
            description: 'Complete "Designing Data-Intensive Applications" study',
            type: IDPActivityType.TRAINING,
            targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            status: 'IN_PROGRESS',
          },
          {
            title: 'Management Training',
            description: 'Attend internal leadership workshop',
            type: IDPActivityType.MENTORING,
            targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            status: 'PENDING',
          },
        ],
      },
    },
  });
  console.log(`Created IDP: ${idp.title}`);

  // Seed Provincial Minimum Wage (UMK/UMP)
  const wages = await Promise.all([
    prisma.provincialMinimumWage.create({
      data: { tenantId: tenant.id, province: 'DKI Jakarta', year: 2026, minimumWage: 5067230, effectiveDate: new Date('2026-01-01'), source: 'Peraturan Gubernur DKI Jakarta' },
    }),
    prisma.provincialMinimumWage.create({
      data: { tenantId: tenant.id, province: 'Jawa Barat', year: 2026, minimumWage: 2191232, effectiveDate: new Date('2026-01-01'), source: 'Keputusan Gubernur Jawa Barat' },
    }),
    prisma.provincialMinimumWage.create({
      data: { tenantId: tenant.id, province: 'Jawa Timur', year: 2026, minimumWage: 2211752, effectiveDate: new Date('2026-01-01'), source: 'Keputusan Gubernur Jawa Timur' },
    }),
    prisma.provincialMinimumWage.create({
      data: { tenantId: tenant.id, province: 'Banten', year: 2026, minimumWage: 2664924, effectiveDate: new Date('2026-01-01'), source: 'Keputusan Gubernur Banten' },
    }),
  ]);
  console.log(`Created ${wages.length} wage entries`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });