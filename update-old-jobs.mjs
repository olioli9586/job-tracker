/**
 * Script to update job applications to have old lastUpdated dates
 * This simulates jobs that haven't been updated in 3+ months to test auto-ghosting
 * 
 * Usage: node update-old-jobs.mjs <number_of_jobs>
 * Example: node update-old-jobs.mjs 5
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateOldJobs(count = 5) {
    try {
        // Get Applied jobs
        const appliedJobs = await prisma.application.findMany({
            where: {
                status: 'Applied'
            },
            take: count,
            orderBy: {
                id: 'asc'
            }
        });

        if (appliedJobs.length === 0) {
            console.log('No Applied jobs found to update.');
            return;
        }

        // Set date to 4 months ago
        const fourMonthsAgo = new Date();
        fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);

        console.log(`Updating ${appliedJobs.length} jobs to have lastUpdated date: ${fourMonthsAgo.toISOString()}`);

        // Update each job
        for (const job of appliedJobs) {
            await prisma.application.update({
                where: { id: job.id },
                data: {
                    lastUpdated: fourMonthsAgo
                }
            });
            console.log(`✓ Updated job #${job.id}: ${job.company} - ${job.position}`);
        }

        console.log('\n✅ Done! Refresh your browser to trigger auto-ghosting.');
        console.log(`These ${appliedJobs.length} jobs should now be moved to Ghosted status.`);

    } catch (error) {
        console.error('Error updating jobs:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Get count from command line argument
const count = parseInt(process.argv[2]) || 5;
updateOldJobs(count);
