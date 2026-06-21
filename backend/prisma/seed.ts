import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create categories
  const sports = await prisma.category.upsert({
    where: { slug: 'sports' },
    update: {},
    create: {
      name: 'Sports',
      slug: 'sports',
      description: 'Latest sports news, analysis, and updates from the world of athletics',
    },
  });

  const entertainment = await prisma.category.upsert({
    where: { slug: 'entertainment' },
    update: {},
    create: {
      name: 'Entertainment',
      slug: 'entertainment',
      description: 'Entertainment news, celebrity updates, movie reviews, and pop culture',
    },
  });

  // Head terms by category
  const sportsTerms = [
    'NBA',
    'NFL',
    'Premier League',
    'LeBron James',
    'Patrick Mahomes',
    'Cristiano Ronaldo',
    'F1',
    'UFC',
    'Serena Williams',
    'Champions League',
    'Super Bowl',
    'World Cup',
    'Olympics',
    'MLB',
    'NHL',
  ];

  const entertainmentTerms = [
    'Marvel',
    'Netflix',
    'Taylor Swift',
    'Oscars',
    'Stranger Things',
    'K-pop',
    'Disney',
    'Gaming',
    'YouTube',
    'Beyoncé',
    'Grammys',
    'HBO',
    'Spotify',
    'TikTok',
    'Star Wars',
  ];

  // Modifiers
  const modifiers = [
    'stats',
    'rumors',
    'highlights',
    'schedule',
    'standings',
    'news',
    'predictions',
    'analysis',
    'history',
    'records',
    'rankings',
    'draft',
    'trades',
    'injuries',
    'transfers',
    'review',
    'recap',
    'trailer',
    'cast',
    'soundtrack',
    'box office',
    'ratings',
    'interview',
    'update',
    'breakdown',
  ];

  // Generate and upsert keyword entries
  let keywordCount = 0;

  for (const term of sportsTerms) {
    for (const modifier of modifiers) {
      const keyword = `${term} ${modifier}`;
      await prisma.keyword.upsert({
        where: { keyword },
        update: {},
        create: {
          keyword,
          headTerm: term,
          modifier,
          categoryId: sports.id,
          status: 'pending',
          timesTargeted: 0,
        },
      });
      keywordCount++;
    }
  }

  for (const term of entertainmentTerms) {
    for (const modifier of modifiers) {
      const keyword = `${term} ${modifier}`;
      await prisma.keyword.upsert({
        where: { keyword },
        update: {},
        create: {
          keyword,
          headTerm: term,
          modifier,
          categoryId: entertainment.id,
          status: 'pending',
          timesTargeted: 0,
        },
      });
      keywordCount++;
    }
  }

  console.log(`Seeding complete: 2 categories, ${keywordCount} keywords`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
