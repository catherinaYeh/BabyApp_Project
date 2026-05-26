-- CreateEnum
CREATE TYPE "AllergyRisk" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "FoodCategory" AS ENUM ('VEGETABLE', 'MUSHROOM', 'FRUIT', 'SEAFOOD', 'MEAT', 'EGG', 'DAIRY', 'GRAIN', 'NUT', 'OTHER');

-- CreateEnum
CREATE TYPE "Reaction" AS ENUM ('NONE', 'MILD', 'SEVERE');

-- CreateTable
CREATE TABLE "baby" (
    "id" UUID NOT NULL,
    "name" VARCHAR(30) NOT NULL,
    "birth_date" DATE NOT NULL,
    "avatar_color" VARCHAR(7) NOT NULL DEFAULT '#FFB7B7',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "baby_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_item" (
    "id" UUID NOT NULL,
    "name" VARCHAR(30) NOT NULL,
    "category" "FoodCategory" NOT NULL,
    "allergy_risk" "AllergyRisk" NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "food_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feeding_record" (
    "id" UUID NOT NULL,
    "baby_id" UUID NOT NULL,
    "food_id" UUID NOT NULL,
    "fed_at" TIMESTAMPTZ NOT NULL,
    "amount_ml" INTEGER NOT NULL,
    "attempt_count" INTEGER NOT NULL,
    "reaction" "Reaction" NOT NULL DEFAULT 'NONE',
    "note" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feeding_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievement" (
    "id" UUID NOT NULL,
    "code" VARCHAR(60) NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "description" VARCHAR(200) NOT NULL,
    "icon" VARCHAR(60) NOT NULL,
    "condition" JSONB NOT NULL,

    CONSTRAINT "achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievement_unlock" (
    "id" UUID NOT NULL,
    "baby_id" UUID NOT NULL,
    "achievement_id" UUID NOT NULL,
    "unlocked_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievement_unlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "food_item_name_key" ON "food_item"("name");

-- CreateIndex
CREATE INDEX "feeding_record_baby_id_fed_at_idx" ON "feeding_record"("baby_id", "fed_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "feeding_record_baby_id_food_id_fed_at_key" ON "feeding_record"("baby_id", "food_id", "fed_at");

-- CreateIndex
CREATE UNIQUE INDEX "achievement_code_key" ON "achievement"("code");

-- CreateIndex
CREATE UNIQUE INDEX "achievement_unlock_baby_id_achievement_id_key" ON "achievement_unlock"("baby_id", "achievement_id");

-- AddForeignKey
ALTER TABLE "feeding_record" ADD CONSTRAINT "feeding_record_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "baby"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feeding_record" ADD CONSTRAINT "feeding_record_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "food_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievement_unlock" ADD CONSTRAINT "achievement_unlock_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "baby"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievement_unlock" ADD CONSTRAINT "achievement_unlock_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
