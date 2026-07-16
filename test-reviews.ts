import { PrismaClient, ReviewStatus } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const reviews = await prisma.review.findMany({
      where: {
        status: ReviewStatus.approved,
        deletedAt: null,
        rating: { gte: 4 },
        content: { not: null }
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true,
        rating: true,
        title: true,
        content: true,
        authorName: true,
        createdAt: true,
        user: { select: { name: true, avatar: true } },
      },
    });
    console.log(JSON.stringify(reviews, null, 2));
  } catch (e) {
    console.error('ERROR:', e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
