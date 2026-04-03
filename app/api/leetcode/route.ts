import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const sessions = await prisma.leetCodeSession.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(sessions);
    } catch (error) {
        console.error('Error fetching LeetCode sessions:', error);
        return NextResponse.json({ error: 'Error fetching sessions' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const session = await prisma.leetCodeSession.create({
            data: {
                date: body.date,
                easy: body.easy ?? 0,
                medium: body.medium ?? 0,
                hard: body.hard ?? 0,
                topics: JSON.stringify(body.topics ?? []),
                notes: body.notes ?? null,
            },
        });
        return NextResponse.json(session);
    } catch (error) {
        console.error('Error creating LeetCode session:', error);
        return NextResponse.json({ error: 'Error creating session' }, { status: 500 });
    }
}
