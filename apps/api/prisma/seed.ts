import { PrismaClient } from '@prisma/client';
import { seedFoods } from './seed/foods.js';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // Seed system food items (idempotent upsert by name)
  let created = 0;
  let updated = 0;
  for (const food of seedFoods) {
    const existing = await prisma.foodItem.findUnique({ where: { name: food.name } });
    if (existing) {
      await prisma.foodItem.update({
        where: { name: food.name },
        data: { category: food.category, allergyRisk: food.allergyRisk, isSystem: true },
      });
      updated += 1;
    } else {
      await prisma.foodItem.create({
        data: { ...food, isSystem: true },
      });
      created += 1;
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Seed complete: ${created} created, ${updated} updated, ${seedFoods.length} total`);
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
