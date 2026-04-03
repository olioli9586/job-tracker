import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { entries, applications, rejectionCount } = body;

        // Transaction to ensure all or nothing
        await prisma.$transaction(async (tx) => {
            // Clear existing data? Maybe optional. For now, we assume fresh start or append.
            // But user might want to clear. Let's just append/upsert.

            // Import Daily Entries
            for (const entry of entries) {
                await tx.dailyEntry.upsert({
                    where: { date: entry.date },
                    update: {
                        count: entry.count,
                        timestamps: JSON.stringify(entry.timestamps || []),
                    },
                    create: {
                        date: entry.date,
                        count: entry.count,
                        timestamps: JSON.stringify(entry.timestamps || []),
                    },
                });
            }

            // Import Applications
            for (const app of applications) {
                // We use originalId to prevent duplicates if imported twice?
                // Or just create new ones. The schema has originalId.
                // Let's check if we already have this originalId
                const existing = await tx.application.findFirst({
                    where: { originalId: app.id },
                });

                if (!existing) {
                    await tx.application.create({
                        data: {
                            originalId: app.id,
                            company: app.company,
                            position: app.position,
                            date: app.date,
                            timestamp: app.timestamp,
                            fullDate: new Date(app.fullDate),
                            status: app.status,
                            lastUpdated: app.lastUpdated ? new Date(app.lastUpdated) : new Date(),
                            nextStageType: app.nextStageType,
                            deadline: app.deadline ? new Date(app.deadline) : null,
                            notes: app.notes,
                        },
                    });
                }
            }

            // Import Rejection Count
            if (rejectionCount !== undefined) {
                await tx.settings.upsert({
                    where: { key: 'rejectionCount' },
                    update: { value: rejectionCount.toString() },
                    create: { key: 'rejectionCount', value: rejectionCount.toString() },
                });
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Import error:', error);
        return NextResponse.json({ error: 'Error importing data' }, { status: 500 });
    }
}
