import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = parseInt((await params).id);
        const body = await request.json();

        const updateData: Record<string, unknown> = {};
        if (body.date !== undefined) updateData.date = body.date;
        if (body.easy !== undefined) updateData.easy = body.easy;
        if (body.medium !== undefined) updateData.medium = body.medium;
        if (body.hard !== undefined) updateData.hard = body.hard;
        if (body.topics !== undefined) updateData.topics = JSON.stringify(body.topics);
        if (body.notes !== undefined) updateData.notes = body.notes;

        const session = await prisma.leetCodeSession.update({
            where: { id },
            data: updateData,
        });
        return NextResponse.json(session);
    } catch (error) {
        return NextResponse.json({ error: 'Error updating session' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = parseInt((await params).id);
        await prisma.leetCodeSession.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Error deleting session' }, { status: 500 });
    }
}
