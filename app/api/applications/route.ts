import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const applications = await prisma.application.findMany({
            orderBy: {
                fullDate: 'desc',
            },
        });

        const serializedApplications = applications.map(app => ({
            ...app,
            originalId: app.originalId ? Number(app.originalId) : null,
        }));

        return NextResponse.json(serializedApplications);
    } catch (error) {
        console.error('Error fetching applications:', error);
        return NextResponse.json({ error: 'Error fetching applications' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { company, position, date, timestamp, fullDate, status } = body;

        const application = await prisma.application.create({
            data: {
                company,
                position,
                date,
                timestamp,
                fullDate: new Date(fullDate),
                status,
                jobDescription: body.jobDescription || null,
                lastUpdated: new Date(),
            },
        });

        return NextResponse.json(application);
    } catch (error) {
        return NextResponse.json({ error: 'Error creating application' }, { status: 500 });
    }
}
