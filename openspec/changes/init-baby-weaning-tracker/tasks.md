# Tasks: init-baby-weaning-tracker

實作步驟依「Monorepo → Backend → Frontend → Integration」分段。每個 chunk 控制在 ~2 小時內可完成；可獨立執行的標 ⚡。

> **Apply 指令**：當所有 task 標記 `[x]` 後即可宣告 change 完成。

## Phase 0 — Repo Bootstrap (~3h)

- [ ] T0.1 ⚡ 建立 monorepo 結構：`apps/api`, `apps/web`, `packages/shared-types`，採 pnpm workspaces。
- [ ] T0.2 ⚡ 加入 `pnpm-workspace.yaml`、`turbo.json` (任務管線)、根 `.editorconfig`、`.gitignore`、`.nvmrc` (`v20.11.1`)。
- [ ] T0.3 ⚡ Root `package.json`：scripts `dev`、`build`、`test`、`lint`、`types:gen`。
- [ ] T0.4 ⚡ 設定 ESLint + Prettier 共用 preset，於 root 套用。
- [ ] T0.5 ⚡ 設定 commitlint + husky pre-commit (lint + types:gen)。

## Phase 1 — Backend Foundation (~6h)

- [ ] T1.1 `apps/api` 初始化：`pnpm init`、TypeScript、tsx、express 4、cors、pino、pino-http、zod、prisma、@prisma/client、dotenv。
- [ ] T1.2 Docker Compose：postgres:15 + adminer，volume 持久化。
- [ ] T1.3 Prisma schema：建 enum (`AllergyRisk`, `FoodCategory`, `Reaction`) + model (`Baby`, `FoodItem`, `FeedingRecord`, `Achievement`, `AchievementUnlock`)。Migration 1 (`init`)。
- [ ] T1.4 Migration 2：建立 `baby_food_trial` materialized view + unique index。
- [ ] T1.5 共用 middleware：`requestId`、`errorHandler` (RFC 7807)、`zodValidate` (params/query/body)、`rateLimit`。
- [ ] T1.6 ⚡ `GET /healthz` (含 DB ping)。
- [ ] T1.7 OpenAPI 載入：以 `openapi.yaml` 為 single source；用 `swagger-ui-express` 掛 `/api/v1/docs`。
- [ ] T1.8 ⚡ Pino logger pretty/json 兩種環境設定。

## Phase 2 — Domain Modules (~10h)

### 2A Babies
- [ ] T2A.1 Repository (Prisma) + Service (含 `ageInMonths` 衍生欄位)。
- [ ] T2A.2 Routes: `GET/POST /babies`、`GET/PATCH/DELETE /babies/:id`。
- [ ] T2A.3 Zod schemas (`BabyCreate`, `BabyUpdate`)。
- [ ] T2A.4 單元測試 + integration test (supertest)。

### 2B Foods
- [ ] T2B.1 Seed script：載入台灣常見 ~80 項食材 (是 LOW/MEDIUM/HIGH，含 category)。檔案 `prisma/seed/foods.ts`。
- [ ] T2B.2 Routes：`GET/POST /foods`、`GET/PATCH/DELETE /foods/:id`，PATCH/DELETE 對 `isSystem=true` 回 403。
- [ ] T2B.3 篩選/排序/搜尋實作 (`category`, `allergyRisk`, `search`, `sort=risk_asc/...`)。
- [ ] T2B.4 唯一名稱衝突 409。
- [ ] T2B.5 測試。

### 2C Feedings
- [ ] T2C.1 Service：建立紀錄時自動算 `attemptCount = COUNT(*) + 1 of (babyId, foodId)`。
- [ ] T2C.2 Routes：`GET/POST /babies/:id/feedings`、`GET/PATCH/DELETE /babies/:id/feedings/:fid`。
- [ ] T2C.3 `view=week|month` 自動套用 from/to。
- [ ] T2C.4 寫入後同步：`REFRESH MATERIALIZED VIEW CONCURRENTLY baby_food_trial`。
- [ ] T2C.5 寫入後同步呼叫 `AchievementEvaluator`，將新解鎖一併回傳 (`FeedingCreateResponse`)。
- [ ] T2C.6 測試 (含 attemptCount 自動編號、unique violation 409)。

### 2D Trials & Recommendations
- [ ] T2D.1 `GET /babies/:id/trials`：直接讀 materialized view。
- [ ] T2D.2 `GET /babies/:id/recommendations`：UNTRIED + risk ASC + category 多元化 (取每類至多 2 個)。
- [ ] T2D.3 測試。

### 2E Achievements
- [ ] T2E.1 Seed script：定義 ~12 個徽章 (`UNLOCK_5_VEG`, `UNLOCK_10_VEG`, `UNLOCK_5_FRUIT`, `UNLOCK_3_HIGH_RISK`, `FIRST_FEEDING_BY_AGE_6M`, `TOTAL_UNLOCK_30`, ...)。
- [ ] T2E.2 `AchievementEvaluator.evaluate(babyId)`：依 condition DSL 比對 trial state，upsert 解鎖。
- [ ] T2E.3 Routes：`GET /achievements`、`GET /babies/:id/achievements`。
- [ ] T2E.4 測試（每種 condition type 一個 case）。

### 2F CSV Import
- [ ] T2F.1 `multer` (memory storage, ≤ 2MB)、`csv-parse`。
- [ ] T2F.2 解析 → 對 `food_item.name` 查表 (case-insensitive)。
- [ ] T2F.3 attemptCount 編號 (現有 + 批次內 ordering)。
- [ ] T2F.4 衝突偵測：(babyId, foodId, fedAt) 已存在 → skip。
- [ ] T2F.5 Transaction，所有列獨立 try/catch，匯出 `{ imported, skipped, errors[] }`。
- [ ] T2F.6 dryRun=true 路徑（不寫入）。
- [ ] T2F.7 `POST /babies/:id/feedings:import` route + 測試（含畸形 CSV、超長、重複欄位）。

### 2G Dashboard
- [ ] T2G.1 `GET /babies/:id/dashboard` 組合：statusCounts (從 view 聚合) + progress + recentUnlocks (limit 5) + recommendations。
- [ ] T2G.2 `GET /babies/:id/progress` (含 byCategory)。
- [ ] T2G.3 測試。

## Phase 3 — Frontend Foundation (~6h)

- [ ] T3.1 `apps/web` Vite + React 18 + TS。安裝 react-router-dom、@tanstack/react-query、zustand、tailwindcss、shadcn-ui CLI 初始化、framer-motion、clsx、@heroicons/react 或 lucide-react。
- [ ] T3.2 ⚡ Tailwind 設定 + design tokens (色彩在 [component-architecture.md](./component-architecture.md) §6)、Noto Sans TC / Manrope 載入。
- [ ] T3.3 安裝 `openapi-typescript`，建立 `types:gen` script；產出 `src/types/api.ts`。
- [ ] T3.4 ⚡ API client `lib/api/client.ts`：fetch wrapper、自動 ISO 解析、problem+json 錯誤展開。
- [ ] T3.5 Zustand store `useAppStore` (含 persist middleware 寫 `activeBabyId`)。
- [ ] T3.6 React Query `QueryClientProvider`，預設 `staleTime: 30s`、`retry: 1`。
- [ ] T3.7 ⚡ `AppShell`、`TopBar`、`BottomNav`、`FabAddFeeding`（純 UI，行為後段補）。

## Phase 4 — Frontend Features (~14h)

### 4A 共用元件
- [ ] T4A.1 `AllergyBadge`、`TrialStatusChip`、`ProgressRing`、`EmptyState`、`ErrorState`、`LoadingSpinner`、`ConfirmDialog`。
- [ ] T4A.2 ⚡ Storybook 寫 5 個關鍵元件 stories（可選）。

### 4B Baby 管理
- [ ] T4B.1 `BabiesPage`：列表 + 新增按鈕。
- [ ] T4B.2 `BabyEditPage` (new/edit)：form (name、birthDate、avatarColor)。
- [ ] T4B.3 `BabySwitcher` + `BabyPickerDrawer`：切換時 set store + invalidate per-baby queries。

### 4C 食材圖鑑
- [ ] T4C.1 `FoodCatalogPage`：CategoryTabs + FoodList。
- [ ] T4C.2 `FoodCard`：name、AllergyBadge、TrialStatusChip（融合 useTrials）。
- [ ] T4C.3 ⚡ 搜尋與排序 UI 綁定 query params。
- [ ] T4C.4 `FoodDetailPage`：食材資訊 + 該寶寶的 FeedingTimeline。
- [ ] T4C.5 新增/編輯自訂食材表單（系統食材 read-only）。

### 4D 餵食紀錄
- [ ] T4D.1 `AddFeedingSheet`：bottom-sheet form (foodId search、fedAt picker、amountMl、reaction、note)；submit → mutation。
- [ ] T4D.2 衝突處理 (409) UX：在 sheet 內顯示提示。
- [ ] T4D.3 `FeedingTimeline`：依日期分組、時間倒序。
- [ ] T4D.4 編輯/刪除單筆紀錄（confirm dialog）。

### 4E 歷史視圖
- [ ] T4E.1 `HistoryPage` + ViewToggle。
- [ ] T4E.2 `WeekCalendar`：7 日水平捲動，每日彩色點代表類別。
- [ ] T4E.3 `MonthCalendar`：月曆網格，紀錄日標亮。
- [ ] T4E.4 點選日期 → 顯示當日 FeedingTimeline。

### 4F 首頁
- [ ] T4F.1 `HomePage`：useDashboard 一次取得所需資料。
- [ ] T4F.2 `StatusCountCard` × 4。
- [ ] T4F.3 `ProgressRing` + percent 數字。
- [ ] T4F.4 `RecommendationStrip`：橫向滑動，點選 → 預填 AddFeedingSheet。
- [ ] T4F.5 `RecentUnlockBanner`：近 3 個徽章卡片。

### 4G 徽章
- [ ] T4G.1 `AchievementsPage`：BadgeWall 顯示已/未解鎖、進度提示。
- [ ] T4G.2 `BadgeUnlockToast`：監聽 `useAppStore.pendingUnlocks`，Framer Motion 彈窗 + confetti。

### 4H CSV 匯入
- [ ] T4H.1 `ImportPage`：CsvDropzone。
- [ ] T4H.2 前端 papaparse 解析 preview。
- [ ] T4H.3 dryRun 呼叫 → ImportPreviewTable（顯示 skipped/error 預估）。
- [ ] T4H.4 正式匯入 → ImportResultSummary。

### 4I 設定
- [ ] T4I.1 `SettingsPage`：clear all data、export CSV (call backend bulk), 版本資訊。

## Phase 5 — Quality (~5h)

- [ ] T5.1 ⚡ Backend：Jest + supertest 覆蓋所有 service & route happy + 1 error path，目標 ≥ 80%。
- [ ] T5.2 ⚡ Frontend：Vitest + Testing Library 覆蓋共用元件 + 關鍵 hook。
- [ ] T5.3 Playwright e2e：US01 + US07 + US08 至少一條 happy path。
- [ ] T5.4 ⚡ Lighthouse mobile 跑分 ≥ 90 (Performance / A11y / Best Practices)。
- [ ] T5.5 ⚡ A11y 檢查：所有 button 有 label、焦點順序合理、色彩對比達 AA。

## Phase 6 — Deploy & Docs (~3h)

- [ ] T6.1 Dockerfile (api) + multi-stage build。
- [ ] T6.2 `docker-compose.prod.yml`：api + postgres + caddy (reverse proxy, https)。
- [ ] T6.3 GitHub Actions：lint + typecheck + test 在 PR；main push 走 build & push image。
- [ ] T6.4 `README.md`：how to dev / how to seed / how to deploy。
- [ ] T6.5 `apps/web` 部署：建 `Caddyfile` 服務靜態檔，或推到 Vercel/Netlify。
- [ ] T6.6 ⚡ Seed sample baby (`bb-demo`) 加 20 筆紀錄方便 demo。

---

## 依賴關係速覽 (Dependency Graph)

> `openapi.yaml` 是本 change 已定稿的契約檔；Phase 1 起即可平行進行前後端，不需要等對方完成。

```
                        ┌── openapi.yaml (contract, frozen) ──┐
                        │                                      │
Phase 0 ─► Phase 1 ─►  Phase 2 (2A & 2B 並行 → 2C → 2D/2E/2F/2G 並行)
                        │
                        └────────────────► Phase 3 (FE 基礎; T3.3 由 openapi.yaml 產 types)
                                              │
                                              ▼
                                            Phase 4 (4A → 4B/4C/4D/4E/4F/4G/4H/4I 並行)
                                              │
                                              ▼
                                            Phase 5 ─► Phase 6
```

## 估時加總

| Phase | 內容                  | 估時       |
| ----- | --------------------- | ---------- |
| 0     | Repo bootstrap        | ~3h        |
| 1     | Backend foundation    | ~6h        |
| 2     | Domain modules        | ~10h       |
| 3     | Frontend foundation   | ~6h        |
| 4     | Frontend features     | ~14h       |
| 5     | Quality               | ~5h        |
| 6     | Deploy & docs         | ~3h        |
| **總計** |                    | **~47h**   |
