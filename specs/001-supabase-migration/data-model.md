# Phase 1 Data Model: Supabase 資料庫遷移

本功能**不變更資料模型語意**，僅將既有 Prisma schema 落地至 Supabase。下列為遷移後須在 Supabase 中存在且行為一致的核心實體（來源：`apps/api/prisma/schema.prisma`）。

## 實體與欄位

### Baby（寶寶）— 表 `baby`

| 欄位                         | 型別        | 規則           |
| ---------------------------- | ----------- | -------------- |
| id                           | UUID        | PK，預設 uuid  |
| name                         | VarChar(30) | 必填           |
| birthDate (`birth_date`)     | Date        | 必填           |
| avatarColor (`avatar_color`) | VarChar(7)  | 預設 `#FFB7B7` |
| createdAt / updatedAt        | Timestamptz | 自動           |

關聯：1 — N `FeedingRecord`；1 — N `AchievementUnlock`。

### FoodItem（食物項目）— 表 `food_item`

| 欄位                         | 型別              | 規則                            |
| ---------------------------- | ----------------- | ------------------------------- |
| id                           | UUID              | PK                              |
| name                         | VarChar(30)       | **唯一**                        |
| category                     | FoodCategory enum | 必填                            |
| allergyRisk (`allergy_risk`) | AllergyRisk enum  | 必填                            |
| isSystem (`is_system`)       | Boolean           | 預設 false；系統內建食物為 true |
| createdAt / updatedAt        | Timestamptz       | 自動                            |

關聯：1 — N `FeedingRecord`。

### FeedingRecord（餵食紀錄）— 表 `feeding_record`

| 欄位                           | 型別          | 規則                                   |
| ------------------------------ | ------------- | -------------------------------------- |
| id                             | UUID          | PK                                     |
| babyId (`baby_id`)             | UUID          | FK → baby，**onDelete: Cascade**       |
| foodId (`food_id`)             | UUID          | FK → food_item，**onDelete: Restrict** |
| fedAt (`fed_at`)               | Timestamptz   | 必填                                   |
| amountMl (`amount_ml`)         | Int           | 必填                                   |
| attemptCount (`attempt_count`) | Int           | 必填                                   |
| reaction                       | Reaction enum | 預設 NONE                              |
| note                           | VarChar(500)  | 選填                                   |
| createdAt                      | Timestamptz   | 自動                                   |

限制：

- **唯一**：`(babyId, foodId, fedAt)`（`feeding_baby_food_fedAt_unique`）。
- **索引**：`(babyId, fedAt DESC)`。

## Enums（須一併建立）

- `AllergyRisk`：LOW / MEDIUM / HIGH
- `FoodCategory`：VEGETABLE / MUSHROOM / FRUIT / SEAFOOD / MEAT / EGG / DAIRY / GRAIN / NUT / OTHER
- `Reaction`：NONE / MILD / SEVERE

## 範圍外但須一併遷移（既有 schema 的其餘部分）

- `Achievement`（表 `achievement`，`code` 唯一）與 `AchievementUnlock`（表 `achievement_unlock`，`(babyId, achievementId)` 唯一）。
- migration `baby_food_trial_view` 建立的資料庫 view（trial view）。
  > 這些非本 spec 三個核心實體，但屬同一資料庫，遷移時須隨 migration/seed 一併落地，否則既有功能（成就、trial 檢視）會缺漏。

## 完整性規則對應功能需求

- 刪除寶寶 → 連帶刪除其餵食紀錄（Cascade）→ FR-002 / US1 場景 3。
- 食物仍被紀錄引用 → 不可刪除（Restrict）→ FR-002。
- 同寶寶／食物／餵食時間唯一 → 防重複寫入 → FR-002 / Edge case。

## 遷移驗證資料點（對應 Success Criteria）

- 三表筆數：來源 vs Supabase 一致（SC-002）。
- 系統食物（`is_system = true`）於 Supabase 存在且數量等於 seed 清單（FR-004）。
- 新增一筆 `feeding_record` 後可於 Supabase 後台查得，App 重啟可載回（SC-001）。
