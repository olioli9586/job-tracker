import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = parseInt((await params).id);
        const body = await request.json();

        // Remove id from body to avoid trying to update it
        const { id: _, ...updateData } = body;

        // Ensure jobDescription is included if present
        // Prisma update will handle it automatically as part of ...updateData

        const application = await prisma.application.update({
            where: { id },
            data: {
                ...updateData,
                lastUpdated: new Date(),
            },
        });

        const serializedApplication = {
            ...application,
            originalId: application.originalId ? Number(application.originalId) : null,
        };

        return NextResponse.json(serializedApplication);
    } catch (error) {
        return NextResponse.json({ error: 'Error updating application' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = parseInt((await params).id);
        await prisma.application.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Error deleting application' }, { status: 500 });
    }
}
