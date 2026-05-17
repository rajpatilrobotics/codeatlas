import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteAllRepositories() {
  try {
    // Delete all relationships first (foreign key constraint)
    const relationships = await prisma.relationship.deleteMany({});
    console.log(`✅ Deleted ${relationships.count} relationships`);

    // Delete all entities
    const entities = await prisma.entity.deleteMany({});
    console.log(`✅ Deleted ${entities.count} entities`);

    // Delete all files
    const files = await prisma.file.deleteMany({});
    console.log(`✅ Deleted ${files.count} files`);

    // Delete all repositories
    const repos = await prisma.repository.deleteMany({});
    console.log(`✅ Deleted ${repos.count} repositories`);

    console.log('\n🎉 All repositories and related data deleted!');
    console.log('You can now test with a fresh repository.\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllRepositories();

// Made with Bob
