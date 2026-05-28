import { PrismaClient } from '@prisma/client';
import { seedFoods } from './seed/foods.js';
import { seedAchievements } from './seed/achievements.js';
import { seedDemo } from './seed/demo.js';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // Foods (idempotent upsert by name)
  let foodCreated = 0;
  let foodUpdated = 0;
  for (const food of seedFoods) {
    const existing = await prisma.foodItem.findUnique({ where: { name: food.name } });
    if (existing) {
      await prisma.foodItem.update({
        where: { name: food.name },
        data: { category: food.category, allergyRisk: food.allergyRisk, isSystem: true },
      });
      foodUpdated += 1;
    } else {
      await prisma.foodItem.create({ data: { ...food, isSystem: true } });
      foodCreated += 1;
    }
  }

  // Achievements (idempotent upsert by code)
  let achCreated = 0;
  let achUpdated = 0;
  for (const ach of seedAchievements) {
    const existing = await prisma.achievement.findUnique({ where: { code: ach.code } });
    if (existing) {
      await prisma.achievement.update({
        where: { code: ach.code },
        data: {
          name: ach.name,
          description: ach.description,
          icon: ach.icon,
          condition: ach.condition,
        },
      });
      achUpdated += 1;
    } else {
      await prisma.achievement.create({ data: ach });
      achCreated += 1;
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    `Seed complete: foods=${foodCreated}c/${foodUpdated}u (total ${seedFoods.length}), ` +
      `achievements=${achCreated}c/${achUpdated}u (total ${seedAchievements.length})`,
  );

  // Demo data is opt-in via SEED_DEMO=true so it doesn't bloat test DBs.
  if (process.env.SEED_DEMO === 'true') {
    await seedDemo(prisma);
  }
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
