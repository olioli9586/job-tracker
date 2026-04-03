import { PrismaClient } from '@prisma/client';
import data from './seed-data.json';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  for (const app of data.applications) {
    await prisma.application.upsert({
      where: { id: app.id },
      update: {},
      create: {
        id: app.id,
        originalId: app.originalId ? BigInt(app.originalId) : null,
        company: app.company,
        position: app.position,
        date: app.date,
        timestamp: app.timestamp,
        fullDate: new Date(app.fullDate),
        status: app.status,
        lastUpdated: new Date(app.lastUpdated),
        nextStageType: app.nextStageType,
        deadline: app.deadline ? new Date(app.deadline) : null,
        notes: app.notes,
        jobDescription: app.jobDescription,
      },
    });
  }
  console.log(`Seeded ${data.applications.length} applications`);

  for (const entry of data.dailyEntries) {
    await prisma.dailyEntry.upsert({
      where: { date: entry.date },
      update: {},
      create: {
        id: entry.id,
        date: entry.date,
        count: entry.count,
        timestamps: entry.timestamps,
      },
    });
  }
  console.log(`Seeded ${data.dailyEntries.length} daily entries`);

  for (const setting of data.settings) {
    await prisma.settings.upsert({
      where: { key: setting.key },
      update: {},
      create: {
        key: setting.key,
        value: setting.value,
      },
    });
  }
  console.log(`Seeded ${data.settings.length} settings`);

  console.log('Done!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
