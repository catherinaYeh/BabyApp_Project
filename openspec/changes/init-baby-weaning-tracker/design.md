# Design: 寶寶副食品試敏小遊戲

- **Change ID**: `init-baby-weaning-tracker`
- **Related**: [proposal.md](./proposal.md), [openapi.yaml](./openapi.yaml), [component-architecture.md](./component-architecture.md), [tasks.md](./tasks.md)

## 1. 系統架構 (System Architecture)

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser (Mobile-first)                                          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  React 18 SPA (Vite)                                       │  │
│  │  - Routing:  React Router v6                               │  │
│  │  - Server state:  TanStack Query                           │  │
│  │  - UI state:      Zustand (activeBabyId, drawers)          │  │
│  │  - Styling:       Tailwind CSS + shadcn/ui + Framer Motion │  │
│  └─────────────────────────┬──────────────────────────────────┘  │
└────────────────────────────┼─────────────────────────────────────┘
                             │ HTTPS /api/v1/*
┌────────────────────────────▼─────────────────────────────────────┐
│  Node.js 20 + Express 4 (TypeScript)                             │
│  ┌─────────┬───────────────────────────────────────────────────┐ │
│  │ Routes  │ /babies, /foods, /babies/:id/feedings, …          │ │
│  ├─────────┼───────────────────────────────────────────────────┤ │
│  │ Layer   │ Controller → Service → Repository (Prisma)        │ │
│  │         │ Zod request validation, problem+json errors       │ │
│  ├─────────┼───────────────────────────────────────────────────┤ │
│  │ Domain  │ TrialStateCalculator, AchievementEvaluator,       │ │
│  │         │ CsvImporter (skip-on-conflict)                    │ │
│  └─────────┴───────────────────────────────────────────────────┘ │
└────────────────────────────┬─────────────────────────────────────┘
                             │ Prisma 5
┌────────────────────────────▼─────────────────────────────────────┐
│  PostgreSQL 15                                                   │
│  Tables: baby, food_item, feeding_record, achievement,           │
│          achievement_unlock                                      │
│  Materialized view: baby_food_trial (per-baby per-food state)    │
└──────────────────────────────────────────────────────────────────┘
```

## 2. 技術選型理由 (Technology Choices)

| 區塊         | 選型                           | 理由                                                             |
| ------------ | ------------------------------ | ---------------------------------------------------------------- |
| 前端框架     | React 18 + Vite + TS           | 生態豐富、Mobile SSR 非必要、Vite 開發體驗佳                     |
| 路由         | React Router v6                | 公認標準、檔案結構單純                                           |
| 伺服端狀態   | TanStack Query                 | 快取、樂觀更新、自動 retry，省下大量 useEffect                   |
| UI 狀態      | Zustand                        | 比 Redux 輕量，無 boilerplate                                    |
| 樣式         | Tailwind CSS + shadcn/ui       | 快速建構 + 一致設計系統、shadcn 元件可改可控                     |
| 動畫         | Framer Motion                  | 遊戲化解鎖／徽章彈出動畫                                         |
| 後端框架     | Express 4                      | 學習曲線低、與 Prisma 配合穩定                                   |
| ORM          | Prisma 5                       | Type-safe、migration、relations 清楚                             |
| 資料庫       | PostgreSQL 15                  | 支援 enum、JSONB、materialized view                              |
| 驗證         | Zod                            | 與 TS 型別整合，可同時做 runtime + compile-time                  |
| 測試         | Jest + supertest (BE), Vitest + Testing Library (FE), Playwright (e2e) | 業界主流組合 |

## 3. 資料模型 (Data Model)

### 3.1 ER 圖

```
   ┌──────────┐         ┌─────────────────┐         ┌────────────┐
   │  Baby    │ 1     ∞ │ FeedingRecord   │ ∞     1 │ FoodItem   │
   │──────────│─────────│─────────────────│─────────│────────────│
   │ id (PK)  │         │ id (PK)         │         │ id (PK)    │
   │ name     │         │ baby_id (FK)    │         │ name       │
   │ birth_date│        │ food_id (FK)    │         │ category   │
   │ avatar_  │         │ fed_at          │         │ allergy_   │
   │ color    │         │ amount_ml       │         │ risk       │
   │ created_at│        │ attempt_count   │         │ is_system  │
   │ updated_at│        │ reaction        │         │ created_at │
   └──────────┘         │ note            │         │ updated_at │
        │ 1             │ created_at      │         └────────────┘
        │               └─────────────────┘
        │ ∞
   ┌─────────────────────┐         ┌──────────────────────┐
   │ AchievementUnlock   │ ∞     1 │ Achievement          │
   │─────────────────────│─────────│──────────────────────│
   │ id (PK)             │         │ id (PK)              │
   │ baby_id (FK)        │         │ code (UNIQUE)        │
   │ achievement_id (FK) │         │ name                 │
   │ unlocked_at         │         │ description          │
   └─────────────────────┘         │ condition (JSONB)    │
                                   │ icon                 │
                                   └──────────────────────┘
```

### 3.2 Enum 定義

```sql
CREATE TYPE allergy_risk AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE food_category AS ENUM (
  'VEGETABLE', 'MUSHROOM', 'FRUIT', 'SEAFOOD',
  'MEAT', 'EGG', 'DAIRY', 'GRAIN', 'NUT', 'OTHER'
);
CREATE TYPE reaction AS ENUM (
  'NONE',          -- 無反應
  'MILD',          -- 輕微 (紅疹/腸胃不適)
  'SEVERE'         -- 嚴重 (蕁麻疹/呼吸/嘔吐)
);
CREATE TYPE trial_status AS ENUM (
  'UNTRIED', 'TRYING', 'UNLOCKED', 'ALLERGIC'
);
```

### 3.3 Prisma Schema 概覽

```prisma
model Baby {
  id          String   @id @default(uuid())
  name        String
  birthDate   DateTime @db.Date
  avatarColor String   @default("#FFB7B7")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  feedings    FeedingRecord[]
  unlocks     AchievementUnlock[]

  @@map("baby")
}

model FoodItem {
  id          String       @id @default(uuid())
  name        String       @unique
  category    FoodCategory
  allergyRisk AllergyRisk
  isSystem    Boolean      @default(false)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  feedings    FeedingRecord[]

  @@map("food_item")
}

model FeedingRecord {
  id           String   @id @default(uuid())
  babyId       String
  foodId       String
  fedAt        DateTime
  amountMl     Int
  attemptCount Int      // 第幾次嘗試 (1-based)
  reaction     Reaction @default(NONE)
  note         String?
  createdAt    DateTime @default(now())
  baby Baby     @relation(fields: [babyId], references: [id], onDelete: Cascade)
  food FoodItem @relation(fields: [foodId], references: [id], onDelete: Restrict)

  @@unique([babyId, foodId, fedAt], name: "baby_food_fedAt_unique")
  @@index([babyId, fedAt])
  @@map("feeding_record")
}

model Achievement {
  id          String   @id @default(uuid())
  code        String   @unique         // e.g. "UNLOCK_10_VEG"
  name        String
  description String
  condition   Json
  icon        String
  unlocks     AchievementUnlock[]

  @@map("achievement")
}

model AchievementUnlock {
  id             String      @id @default(uuid())
  babyId         String
  achievementId  String
  unlockedAt     DateTime    @default(now())
  baby           Baby        @relation(fields: [babyId], references: [id], onDelete: Cascade)
  achievement    Achievement @relation(fields: [achievementId], references: [id], onDelete: Cascade)

  @@unique([babyId, achievementId])
  @@map("achievement_unlock")
}
```

### 3.4 Materialized View: `baby_food_trial`

衍生欄位，避免每次查詢重算：

```sql
CREATE MATERIALIZED VIEW baby_food_trial AS
SELECT
  b.id  AS baby_id,
  f.id  AS food_id,
  COUNT(fr.id)                                         AS attempts,
  MAX(fr.fed_at)                                       AS last_fed_at,
  BOOL_OR(fr.reaction <> 'NONE')                       AS has_reaction,
  CASE
    WHEN COUNT(fr.id) = 0                  THEN 'UNTRIED'
    WHEN BOOL_OR(fr.reaction <> 'NONE')    THEN 'ALLERGIC'
    WHEN COUNT(fr.id) >= 3                 THEN 'UNLOCKED'
    ELSE                                        'TRYING'
  END                                                  AS status
FROM baby b
CROSS JOIN food_item f
LEFT JOIN feeding_record fr ON fr.baby_id = b.id AND fr.food_id = f.id
GROUP BY b.id, f.id;

CREATE UNIQUE INDEX ON baby_food_trial (baby_id, food_id);
```

每次 `FeedingRecord` 寫入/更新/刪除後，後端會非同步 `REFRESH MATERIALIZED VIEW CONCURRENTLY baby_food_trial`。

## 4. 業務規則 (Business Rules)

### 4.1 月齡計算

```ts
function ageInMonths(birthDate: Date, on: Date = new Date()): number {
  const months = (on.getFullYear() - birthDate.getFullYear()) * 12
               + (on.getMonth() - birthDate.getMonth());
  return on.getDate() < birthDate.getDate() ? months - 1 : months;
}
```

UI 顯示為 `${m}M` (e.g. `7M`)。

### 4.2 試敏狀態流轉

| 條件                                                | 狀態         |
| --------------------------------------------------- | ------------ |
| 該 (baby, food) 無任何 FeedingRecord                | `UNTRIED`    |
| 至少一筆 FeedingRecord 且 `reaction <> NONE`        | `ALLERGIC`   |
| FeedingRecord 數量 ≥ 3 且 `reaction = NONE` 全程    | `UNLOCKED`   |
| 其他 (1~2 筆紀錄、皆 `NONE`)                        | `TRYING`     |

> **Note**：`ALLERGIC` 一經觸發即鎖定，僅允許管理員透過 DELETE 該過敏紀錄後重算。一般使用者只能新增「再次嘗試」紀錄但狀態仍維持 `ALLERGIC`，避免誤導。

### 4.3 引導低敏先試

`GET /api/v1/foods` 支援 `sort=risk_asc`，前端首頁「下一個建議嘗試」區塊呼叫 `GET /api/v1/babies/{id}/recommendations`，後端回傳：

- 目前月齡可嘗試 (依 `food_item.min_age_month` 欄位 — 第二版加入；本版以全部 ≥ 6M 為前提)
- 狀態為 `UNTRIED`
- 按 `allergyRisk` ASC，再按 `category` 多元化

### 4.4 CSV 匯入規則

**檔案格式**：UTF-8 with BOM，逗號分隔，第一列為標頭：

```
food_name,fed_at,amount_ml,reaction,note
紅蘿蔔泥,2026-04-10 11:30,30,NONE,
高麗菜泥,2026-04-11 11:30,30,MILD,有紅疹
```

**處理流程**：

1. 解析每列 → 對 `food_item.name` 查表 (大小寫不敏感)；找不到 → `errors[]`。
2. `attempt_count` 由系統依該 (baby, food) 既有紀錄數 + 該批次內順序自動編號。
3. 唯一鍵衝突 `(baby_id, food_id, fed_at)` → 列入 `skipped[]`。
4. 全部處理完後一次性 transaction commit；任一列 errors 不阻止其他列。
5. 回應 JSON：`{ imported: number, skipped: number, errors: ErrorRow[] }`。

### 4.5 徽章發放規則

每次 FeedingRecord 變動後（同步呼叫 `AchievementEvaluator.evaluate(babyId)`）：

1. 依 condition `type` 決定資料來源：
   - `UNLOCK_COUNT_BY_CATEGORY` / `UNLOCK_COUNT_BY_RISK` / `TOTAL_UNLOCK` → 讀 `baby_food_trial WHERE status = 'UNLOCKED'`
   - `FIRST_FEEDING_BY_AGE` → 讀原始 `feeding_record`，比對 fedAt 當下的月齡 ≤ ageMonth
2. 對每個 `Achievement.condition` (JSONB) 做評估。Condition DSL 範例：
   ```json
   { "type": "UNLOCK_COUNT_BY_CATEGORY", "category": "VEGETABLE", "count": 10 }
   { "type": "UNLOCK_COUNT_BY_RISK",     "risk":     "HIGH",      "count": 5 }
   { "type": "FIRST_FEEDING_BY_AGE",     "ageMonth": 6 }
   ```
3. 條件達成 → upsert 到 `achievement_unlock`，回應給前端供彈窗動畫。

## 5. API 設計原則 (API Design Principles)

- **版本前綴**：`/api/v1`
- **資源命名**：複數名詞、kebab-case 不使用，全小寫
- **錯誤格式**：[RFC 7807 problem+json](https://datatracker.ietf.org/doc/html/rfc7807)
  ```json
  {
    "type": "https://babyapp.example.com/problems/validation-error",
    "title": "Validation failed",
    "status": 422,
    "detail": "field 'amount_ml' must be >= 1",
    "errors": [{ "path": "amount_ml", "message": "must be >= 1" }]
  }
  ```
- **HTTP Status**：
  - `200 OK` 成功讀取／更新
  - `201 Created` 成功建立
  - `204 No Content` 成功刪除
  - `400 Bad Request` JSON 格式錯誤
  - `404 Not Found` 資源不存在
  - `409 Conflict` 資源衝突 (如重複 fedAt)
  - `422 Unprocessable Entity` 驗證失敗
  - `500 Internal Server Error` 未預期錯誤
- **時區**：所有 `fedAt` 等 timestamp 使用 ISO 8601 with offset。資料庫存 `timestamptz`。
- **分頁**：cursor-based。回應含 `meta: { nextCursor, total }`。
- **排序／過濾**：`?sort=field_dir&filter[status]=UNTRIED&filter[category]=VEGETABLE`

完整 endpoint 清單與 schema 見 [openapi.yaml](./openapi.yaml)。

## 6. 安全與部署 (Security & Deployment)

- **無認證版本**：CORS 限制單一前端 origin；deploy 在私有環境或內網。
- **Rate limit**：`express-rate-limit` 預設每 IP 60req/min。
- **CSV 上傳大小**：≤ 2MB，最多 5000 列。
- **環境變數**：`DATABASE_URL`, `PORT`, `CORS_ORIGIN`, `LOG_LEVEL`, `NODE_ENV`。
- **部署**：Docker Compose (api + db) 為開發/單機部署；正式環境可推到 Railway / Fly.io / Render。

## 7. 監測與日誌 (Observability)

- **Logging**：`pino` JSON logs，包含 request id、duration。
- **Metrics**：`/metrics` 暴露 Prometheus format（請求數、p95 latency）。
- **Health check**：`GET /healthz` 回 200 + DB ping 結果。

## 8. 主要決策表 (Decision Log)

| Decision                             | 採用                                     | 替代方案                                | 為什麼採用                                |
| ------------------------------------ | ---------------------------------------- | --------------------------------------- | ----------------------------------------- |
| 試敏狀態為衍生欄位                   | Materialized View                        | 觸發器寫入 status 欄位                  | 規則可能演進，view 重算簡單               |
| FeedingRecord 為事件流，狀態不存實體 | Yes                                      | 在 (baby, food) join table 直接存狀態   | 保留歷史軌跡，符合稽核需求                |
| 無 user 概念                         | 直接以 babyId 為 scope                   | 加 placeholder userId                   | 避免假抽象，第二版自然擴展                |
| CSV 衝突策略                         | Skip on conflict                         | Upsert / Reject all                     | PRD 已明定                                |
| 徽章評估時機                         | 寫入後同步                               | 排程批次                                | 即時動畫回饋更重要                        |
| 食材圖鑑 system + user 混合          | 加 `is_system` flag                      | 分兩張表                                | 減少 join、查詢與寫入路徑單純             |
| PRD 的 FeedingRecord.Status 細化     | 拆成 `Reaction` (NONE/MILD/SEVERE) + 衍生 `TrialStatus` | 直接照 PRD 用 4 值 Status enum 存 record | PRD 的 Status (未嘗試/嘗試中/已解鎖/過敏) 是「該 baby 對該 food 的整體狀態」，不應存在單筆紀錄上；單筆只需記錄當次有無反應 |
