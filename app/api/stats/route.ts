import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const dailyEntries = await prisma.dailyEntry.findMany({
            orderBy: {
                id: 'desc', // or date
            },
        });

        const rejectionSetting = await prisma.settings.findUnique({
            where: { key: 'rejectionCount' },
        });

        return NextResponse.json({
            entries: dailyEntries,
            rejectionCount: rejectionSetting ? parseInt(rejectionSetting.value) : 0,
        });
    } catch (error) {
        return NextResponse.json({ error: 'Error fetching stats' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action, date, timestamp } = body;

        if (action === 'increment_daily') {
            const existingEntry = await prisma.dailyEntry.findUnique({
                where: { date },
            });

            let entry;
            if (existingEntry) {
                const currentTimestamps = JSON.parse(existingEntry.timestamps || '[]');
                entry = await prisma.dailyEntry.update({
                    where: { date },
                    data: {
                        count: { increment: 1 },
                        timestamps: JSON.stringify([...currentTimestamps, timestamp]),
                    },
                });
            } else {
                entry = await prisma.dailyEntry.create({
                    data: {
                        date,
                        count: 1,
                        timestamps: JSON.stringify([timestamp]),
                    },
                });
            }
            return NextResponse.json(entry);
        }

        if (action === 'increment_rejection') {
            const existingSetting = await prisma.settings.findUnique({
                where: { key: 'rejectionCount' },
            });

            const newValue = existingSetting ? parseInt(existingSetting.value) + 1 : 1;

            const setting = await prisma.settings.upsert({
                where: { key: 'rejectionCount' },
                update: {
                    value: newValue.toString(),
                },
                create: {
                    key: 'rejectionCount',
                    value: '1',
                },
            });
            return NextResponse.json({ rejectionCount: parseInt(setting.value) });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Error updating stats' }, { status: 500 });
    }
}
