/**
 * Count jobs by application date before Sept 19, 2025
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function countOldJobs() {
    try {
        const threeMonthsAgo = new Date('2025-09-19');

        console.log(`Checking for jobs applied before: ${threeMonthsAgo.toLocaleDateString()}\n`);

        const activeStatuses = ['Applied', 'Waiting for Response', 'Next Stage', 'Offer'];

        const oldJobs = await prisma.application.findMany({
            where: {
                status: {
                    in: activeStatuses
                },
                fullDate: {
                    lt: threeMonthsAgo
                }
            },
            select: {
                id: true,
                company: true,
                position: true,
                status: true,
                date: true,
                fullDate: true
            },
            orderBy: {
                fullDate: 'desc'
            }
        });

        console.log(`Found ${oldJobs.length} jobs that should be ghosted (applied before 9/19/2025):\n`);

        oldJobs.slice(0, 10).forEach((job, index) => {
            console.log(`${index + 1}. ${job.company} - ${job.position}`);
            console.log(`   Applied: ${new Date(job.fullDate).toLocaleDateString()}\n`);
        });

        if (oldJobs.length > 10) {
            console.log(`... and ${oldJobs.length - 10} more\n`);
        }

        const currentlyGhosted = await prisma.application.count({
            where: { status: 'Ghosted' }
        });

        console.log(`Currently ghosted: ${currentlyGhosted}`);
        console.log(`Should be ghosted: ${oldJobs.length}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

countOldJobs();
