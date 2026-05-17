import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteRepository() {
  try {
    const result = await prisma.repository.delete({
      where: {
        id: 'cmp9mkfv70000p9shmbkoulxn'
      }
    });
    console.log('✅ Repository deleted:', result.id);
  } catch (error) {
    console.error('❌ Error deleting repository:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

deleteRepository();

// Made with Bob
