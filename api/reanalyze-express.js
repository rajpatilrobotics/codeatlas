import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function reanalyze() {
  try {
    const expressRepoId = 'cmpadxosq0000p9weyw3w6i6f';
    
    console.log('\n🔄 Resetting Express.js repository for re-analysis...\n');
    
    // Delete existing relationships
    const deletedRels = await prisma.relationship.deleteMany({
      where: { repositoryId: expressRepoId }
    });
    console.log(`✅ Deleted ${deletedRels.count} relationships`);
    
    // Delete existing entities
    const deletedEntities = await prisma.entity.deleteMany({
      where: { repositoryId: expressRepoId }
    });
    console.log(`✅ Deleted ${deletedEntities.count} entities`);
    
    // Delete existing files
    const deletedFiles = await prisma.file.deleteMany({
      where: { repositoryId: expressRepoId }
    });
    console.log(`✅ Deleted ${deletedFiles.count} files`);
    
    // Reset repository status
    await prisma.repository.update({
      where: { id: expressRepoId },
      data: {
        status: 'pending',
        progress: 0,
        fileCount: 0,
        entityCount: 0,
        analyzedAt: null
      }
    });
    console.log(`✅ Repository status reset to pending\n`);
    
    console.log('🚀 Now trigger re-analysis with:');
    console.log('   curl -X POST http://localhost:3001/api/repo/analyze -H "Content-Type: application/json" -d \'{"url":"https://github.com/expressjs/express"}\'\n');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

reanalyze();

// Made with Bob
