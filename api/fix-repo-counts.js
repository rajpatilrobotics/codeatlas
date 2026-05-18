/**
 * Fix Repository Counts
 * Updates repository fileCount and entityCount based on actual database records
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixRepositoryCounts() {
  try {
    console.log('🔧 Fixing repository counts...\n');

    // Get all repositories
    const repositories = await prisma.repository.findMany({
      include: {
        _count: {
          select: {
            files: true,
            entities: true,
            relationships: true
          }
        }
      }
    });

    console.log(`Found ${repositories.length} repositories\n`);

    for (const repo of repositories) {
      const actualFileCount = repo._count.files;
      const actualEntityCount = repo._count.entities;
      const actualRelationshipCount = repo._count.relationships;

      console.log(`📦 ${repo.name} (${repo.owner})`);
      console.log(`   Current: fileCount=${repo.fileCount}, entityCount=${repo.entityCount}`);
      console.log(`   Actual:  fileCount=${actualFileCount}, entityCount=${actualEntityCount}, relationships=${actualRelationshipCount}`);

      if (repo.fileCount !== actualFileCount || repo.entityCount !== actualEntityCount) {
        await prisma.repository.update({
          where: { id: repo.id },
          data: {
            fileCount: actualFileCount,
            entityCount: actualEntityCount
          }
        });
        console.log(`   ✅ Updated counts\n`);
      } else {
        console.log(`   ✓ Counts already correct\n`);
      }
    }

    console.log('✅ All repository counts fixed!');
  } catch (error) {
    console.error('❌ Error fixing counts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixRepositoryCounts();

// Made with Bob
