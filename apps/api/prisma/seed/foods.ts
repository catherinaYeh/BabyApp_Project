/**
 * 台灣常見副食品 seed 資料。
 * AllergyRisk 分級為通用建議（過敏疑慮請諮詢醫師）。
 * 80 項，10 category 全覆蓋。
 */

import type { AllergyRisk, FoodCategory } from '@prisma/client';

export type SeedFood = {
  name: string;
  category: FoodCategory;
  allergyRisk: AllergyRisk;
};

export const seedFoods: SeedFood[] = [
  // VEGETABLE (16)
  { name: '紅蘿蔔泥', category: 'VEGETABLE', allergyRisk: 'LOW' },
  { name: '南瓜泥', category: 'VEGETABLE', allergyRisk: 'LOW' },
  { name: '地瓜泥', category: 'VEGETABLE', allergyRisk: 'LOW' },
  { name: '馬鈴薯泥', category: 'VEGETABLE', allergyRisk: 'LOW' },
  { name: '高麗菜泥', category: 'VEGETABLE', allergyRisk: 'LOW' },
  { name: '青江菜泥', category: 'VEGETABLE', allergyRisk: 'LOW' },
  { name: '小白菜泥', category: 'VEGETABLE', allergyRisk: 'LOW' },
  { name: '菠菜泥', category: 'VEGETABLE', allergyRisk: 'MEDIUM' },
  { name: '花椰菜泥', category: 'VEGETABLE', allergyRisk: 'LOW' },
  { name: '青花椰菜泥', category: 'VEGETABLE', allergyRisk: 'LOW' },
  { name: '櫛瓜泥', category: 'VEGETABLE', allergyRisk: 'LOW' },
  { name: '玉米泥', category: 'VEGETABLE', allergyRisk: 'MEDIUM' },
  { name: '番茄泥', category: 'VEGETABLE', allergyRisk: 'MEDIUM' },
  { name: '甜椒泥', category: 'VEGETABLE', allergyRisk: 'LOW' },
  { name: '蘆筍泥', category: 'VEGETABLE', allergyRisk: 'LOW' },
  { name: '茄子泥', category: 'VEGETABLE', allergyRisk: 'MEDIUM' },

  // MUSHROOM (4)
  { name: '香菇泥', category: 'MUSHROOM', allergyRisk: 'MEDIUM' },
  { name: '杏鮑菇泥', category: 'MUSHROOM', allergyRisk: 'MEDIUM' },
  { name: '金針菇泥', category: 'MUSHROOM', allergyRisk: 'MEDIUM' },
  { name: '木耳泥', category: 'MUSHROOM', allergyRisk: 'MEDIUM' },

  // FRUIT (14)
  { name: '蘋果泥', category: 'FRUIT', allergyRisk: 'LOW' },
  { name: '香蕉泥', category: 'FRUIT', allergyRisk: 'LOW' },
  { name: '梨子泥', category: 'FRUIT', allergyRisk: 'LOW' },
  { name: '木瓜泥', category: 'FRUIT', allergyRisk: 'LOW' },
  { name: '芒果泥', category: 'FRUIT', allergyRisk: 'HIGH' },
  { name: '草莓泥', category: 'FRUIT', allergyRisk: 'HIGH' },
  { name: '奇異果泥', category: 'FRUIT', allergyRisk: 'HIGH' },
  { name: '葡萄泥', category: 'FRUIT', allergyRisk: 'MEDIUM' },
  { name: '藍莓泥', category: 'FRUIT', allergyRisk: 'MEDIUM' },
  { name: '西瓜泥', category: 'FRUIT', allergyRisk: 'LOW' },
  { name: '哈密瓜泥', category: 'FRUIT', allergyRisk: 'LOW' },
  { name: '酪梨泥', category: 'FRUIT', allergyRisk: 'LOW' },
  { name: '柳橙泥', category: 'FRUIT', allergyRisk: 'MEDIUM' },
  { name: '鳳梨泥', category: 'FRUIT', allergyRisk: 'HIGH' },

  // SEAFOOD (8)
  { name: '鯛魚泥', category: 'SEAFOOD', allergyRisk: 'HIGH' },
  { name: '鱸魚泥', category: 'SEAFOOD', allergyRisk: 'HIGH' },
  { name: '鮭魚泥', category: 'SEAFOOD', allergyRisk: 'HIGH' },
  { name: '鱈魚泥', category: 'SEAFOOD', allergyRisk: 'HIGH' },
  { name: '吻仔魚泥', category: 'SEAFOOD', allergyRisk: 'HIGH' },
  { name: '蝦泥', category: 'SEAFOOD', allergyRisk: 'HIGH' },
  { name: '蛤蜊泥', category: 'SEAFOOD', allergyRisk: 'HIGH' },
  { name: '牡蠣泥', category: 'SEAFOOD', allergyRisk: 'HIGH' },

  // MEAT (8)
  { name: '雞胸肉泥', category: 'MEAT', allergyRisk: 'LOW' },
  { name: '雞腿肉泥', category: 'MEAT', allergyRisk: 'LOW' },
  { name: '豬里肌泥', category: 'MEAT', allergyRisk: 'LOW' },
  { name: '豬絞肉', category: 'MEAT', allergyRisk: 'LOW' },
  { name: '牛肉泥', category: 'MEAT', allergyRisk: 'MEDIUM' },
  { name: '羊肉泥', category: 'MEAT', allergyRisk: 'MEDIUM' },
  { name: '鴨肉泥', category: 'MEAT', allergyRisk: 'MEDIUM' },
  { name: '肝臟泥', category: 'MEAT', allergyRisk: 'MEDIUM' },

  // EGG (3)
  { name: '蛋黃泥', category: 'EGG', allergyRisk: 'MEDIUM' },
  { name: '全蛋', category: 'EGG', allergyRisk: 'HIGH' },
  { name: '蒸蛋', category: 'EGG', allergyRisk: 'HIGH' },

  // DAIRY (5)
  { name: '無糖優格', category: 'DAIRY', allergyRisk: 'HIGH' },
  { name: '原味起司', category: 'DAIRY', allergyRisk: 'HIGH' },
  { name: '寶寶奶酪', category: 'DAIRY', allergyRisk: 'HIGH' },
  { name: '茅屋起司', category: 'DAIRY', allergyRisk: 'HIGH' },
  { name: '無糖優酪乳', category: 'DAIRY', allergyRisk: 'HIGH' },

  // GRAIN (12)
  { name: '十倍粥', category: 'GRAIN', allergyRisk: 'LOW' },
  { name: '七倍粥', category: 'GRAIN', allergyRisk: 'LOW' },
  { name: '五倍粥', category: 'GRAIN', allergyRisk: 'LOW' },
  { name: '糙米粥', category: 'GRAIN', allergyRisk: 'LOW' },
  { name: '小米粥', category: 'GRAIN', allergyRisk: 'LOW' },
  { name: '燕麥粥', category: 'GRAIN', allergyRisk: 'MEDIUM' },
  { name: '藜麥粥', category: 'GRAIN', allergyRisk: 'LOW' },
  { name: '麵線', category: 'GRAIN', allergyRisk: 'HIGH' },
  { name: '寶寶麵條', category: 'GRAIN', allergyRisk: 'HIGH' },
  { name: '吐司', category: 'GRAIN', allergyRisk: 'HIGH' },
  { name: '饅頭', category: 'GRAIN', allergyRisk: 'HIGH' },
  { name: '紅豆泥', category: 'GRAIN', allergyRisk: 'MEDIUM' },

  // NUT (5)
  { name: '花生醬', category: 'NUT', allergyRisk: 'HIGH' },
  { name: '芝麻醬', category: 'NUT', allergyRisk: 'HIGH' },
  { name: '杏仁醬', category: 'NUT', allergyRisk: 'HIGH' },
  { name: '腰果醬', category: 'NUT', allergyRisk: 'HIGH' },
  { name: '核桃粉', category: 'NUT', allergyRisk: 'HIGH' },

  // OTHER (5)
  { name: '豆腐泥', category: 'OTHER', allergyRisk: 'HIGH' },
  { name: '豆漿', category: 'OTHER', allergyRisk: 'HIGH' },
  { name: '味噌湯', category: 'OTHER', allergyRisk: 'HIGH' },
  { name: '海苔粉', category: 'OTHER', allergyRisk: 'MEDIUM' },
  { name: '芝麻粉', category: 'OTHER', allergyRisk: 'HIGH' },
];
