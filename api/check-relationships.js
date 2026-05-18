import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRelationships() {
  try {
    const repos = [
      { id: 'cmpadxosq0000p9weyw3w6i6f', name: 'Express.js' },
      { id: 'cmpatg4gn0000p94ncy147h47', name: 'is (sindresorhus)' }
    ];
    
    for (const repo of repos) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📦 Repository: ${repo.name}`);
      console.log(`${'='.repeat(60)}`);
      
      // Count relationships
      const relationshipCount = await prisma.relationship.count({
        where: { repositoryId: repo.id }
      });
      
      console.log(`\n📊 Relationship Count: ${relationshipCount}`);
      
      if (relationshipCount > 0) {
        // Get sample relationships
        const sampleRelationships = await prisma.relationship.findMany({
          where: { repositoryId: repo.id },
          take: 3
        });
        
        console.log('\n📋 Sample Relationships:');
        sampleRelationships.forEach((rel, i) => {
          console.log(`\n  ${i + 1}. ${rel.type}`);
          console.log(`     Source: ${rel.sourceId}`);
          console.log(`     Target: ${rel.targetId}`);
        });
        
        console.log(`\n✅ Relationships exist for ${repo.name}!`);
      } else {
        console.log(`\n❌ No relationships found for ${repo.name}!`);
      }
    }
    
    console.log(`\n${'='.repeat(60)}\n`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRelationships();

// Made with Bob
