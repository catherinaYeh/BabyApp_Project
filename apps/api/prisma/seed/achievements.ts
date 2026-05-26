/**
 * 徽章 seed 資料 — 13 個徽章涵蓋 4 種 condition type。
 * condition 為 JSONB DSL，由 AchievementEvaluator 解讀。
 */

import type { Prisma } from '@prisma/client';

export type SeedAchievement = {
  code: string;
  name: string;
  description: string;
  icon: string;
  condition: Prisma.InputJsonValue;
};

export const seedAchievements: SeedAchievement[] = [
  // UNLOCK_COUNT_BY_CATEGORY
  {
    code: 'UNLOCK_5_VEG',
    name: '蔬菜小達人',
    description: '解鎖 5 種蔬菜',
    icon: '🥕',
    condition: { type: 'UNLOCK_COUNT_BY_CATEGORY', category: 'VEGETABLE', count: 5 },
  },
  {
    code: 'UNLOCK_10_VEG',
    name: '蔬菜大師',
    description: '解鎖 10 種蔬菜',
    icon: '🥦',
    condition: { type: 'UNLOCK_COUNT_BY_CATEGORY', category: 'VEGETABLE', count: 10 },
  },
  {
    code: 'UNLOCK_5_FRUIT',
    name: '水果探險家',
    description: '解鎖 5 種水果',
    icon: '🍎',
    condition: { type: 'UNLOCK_COUNT_BY_CATEGORY', category: 'FRUIT', count: 5 },
  },
  {
    code: 'UNLOCK_5_GRAIN',
    name: '五穀達人',
    description: '解鎖 5 種五穀類',
    icon: '🌾',
    condition: { type: 'UNLOCK_COUNT_BY_CATEGORY', category: 'GRAIN', count: 5 },
  },
  {
    code: 'UNLOCK_3_SEAFOOD',
    name: '海鮮初體驗',
    description: '解鎖 3 種海鮮類',
    icon: '🐟',
    condition: { type: 'UNLOCK_COUNT_BY_CATEGORY', category: 'SEAFOOD', count: 3 },
  },
  {
    code: 'UNLOCK_3_MEAT',
    name: '肉食小怪獸',
    description: '解鎖 3 種肉類',
    icon: '🍖',
    condition: { type: 'UNLOCK_COUNT_BY_CATEGORY', category: 'MEAT', count: 3 },
  },

  // UNLOCK_COUNT_BY_RISK
  {
    code: 'UNLOCK_3_HIGH',
    name: '高敏挑戰者',
    description: '解鎖 3 種高敏食材',
    icon: '⚡',
    condition: { type: 'UNLOCK_COUNT_BY_RISK', risk: 'HIGH', count: 3 },
  },
  {
    code: 'UNLOCK_5_HIGH',
    name: '過敏無懼',
    description: '解鎖 5 種高敏食材',
    icon: '🛡️',
    condition: { type: 'UNLOCK_COUNT_BY_RISK', risk: 'HIGH', count: 5 },
  },

  // FIRST_FEEDING_BY_AGE
  {
    code: 'FIRST_FEEDING_6M',
    name: '六個月里程碑',
    description: '滿 6 個月即開始嘗試副食品',
    icon: '🌱',
    condition: { type: 'FIRST_FEEDING_BY_AGE', ageMonth: 6 },
  },
  {
    code: 'FIRST_FEEDING_8M',
    name: '八個月里程碑',
    description: '滿 8 個月時已有副食品紀錄',
    icon: '🌿',
    condition: { type: 'FIRST_FEEDING_BY_AGE', ageMonth: 8 },
  },

  // TOTAL_UNLOCK
  {
    code: 'TOTAL_UNLOCK_10',
    name: '探索 10 種食材',
    description: '已解鎖 10 種食材',
    icon: '🎯',
    condition: { type: 'TOTAL_UNLOCK', count: 10 },
  },
  {
    code: 'TOTAL_UNLOCK_30',
    name: '探索 30 種食材',
    description: '已解鎖 30 種食材',
    icon: '🏆',
    condition: { type: 'TOTAL_UNLOCK', count: 30 },
  },
  {
    code: 'TOTAL_UNLOCK_50',
    name: '副食品大冒險',
    description: '已解鎖 50 種食材',
    icon: '👑',
    condition: { type: 'TOTAL_UNLOCK', count: 50 },
  },
];
