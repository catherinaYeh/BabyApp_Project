## 1. Monorepo Bootstrap

- [x] 1.1 建立 monorepo 結構：`apps/api`、`apps/web`、`packages/shared-types`，pnpm workspaces
- [x] 1.2 `pnpm-workspace.yaml`、`turbo.json`、根 `.editorconfig`、`.nvmrc` (`v20.18.1`)
- [x] 1.3 Root `package.json` scripts：`dev`、`build`、`test`、`lint`、`types:gen`
- [x] 1.4 ESLint + Prettier 共用 preset 套用 root
- [x] 1.5 commitlint + husky pre-commit (lint + types:gen)

## 2. Backend Foundation (apps/api)

- [x] 2.1 初始化 TypeScript + tsx + express 4 + cors + pino + pino-http + zod + prisma + @prisma/client + dotenv
- [x] 2.2 Docker Compose：postgres:15 + adminer，volume 持久化
- [x] 2.3 Prisma schema：enum (AllergyRisk / FoodCategory / Reaction) + model (Baby / FoodItem / FeedingRecord / Achievement / AchievementUnlock)，產 migration 1 (init)
- [x] 2.4 Migration 2：建立 `baby_food_trial` materialized view + unique index (baby_id, food_id)
- [x] 2.5 共用 middleware：`requestId`、`errorHandler` (RFC 7807)、`zodValidate`、`rateLimit`
- [x] 2.6 `GET /healthz` 含 DB ping，回傳 `{ status, db, version }`
- [x] 2.7 swagger-ui-express 掛 `/api/v1/docs` 載入 openapi.yaml
- [x] 2.8 Pino logger pretty (dev) / json (prod) 兩種設定

## 3. Babies 模組 (capability: babies)

- [x] 3.1 Repository (Prisma) + Service (含 `ageInMonths` 計算)
- [x] 3.2 Routes：`GET/POST /babies`、`GET/PATCH/DELETE /babies/:id`
- [x] 3.3 Zod schemas BabyCreate / BabyUpdate (含 birthDate 不可為未來)
- [x] 3.4 單元 + integration test (含未來日、姓名長度、avatarColor 格式)

## 4. Food Catalog 模組 (capability: food-catalog)

- [x] 4.1 Seed script：~80 項台灣常見副食品，`is_system = true`，10 個 category 全覆蓋
- [x] 4.2 Routes：`GET/POST /foods`、`GET/PATCH/DELETE /foods/:id`
- [x] 4.3 系統食材 PATCH/DELETE 回 403；被引用食材 DELETE 回 409
- [x] 4.4 篩選/排序/搜尋 (category、allergyRisk、search icontains、sort=risk_asc/...)
- [x] 4.5 名稱唯一衝突 409
- [x] 4.6 測試（含 seed idempotency、系統項唯讀、被引用無法刪）

## 5. Feeding Records 模組 (capability: feeding-records)

- [x] 5.1 Service：建立時自動算 `attemptCount = COUNT(*) + 1 of (babyId, foodId)`
- [x] 5.2 Routes：`GET/POST /babies/:id/feedings`、`GET/PATCH/DELETE /babies/:id/feedings/:fid`
- [x] 5.3 `view=week|month` 自動套用 from/to
- [x] 5.4 寫入/修改/刪除後同步 `REFRESH MATERIALIZED VIEW CONCURRENTLY baby_food_trial`
- [x] 5.5 寫入後同步呼叫 `AchievementEvaluator`，新解鎖一併回 `FeedingCreateResponse` (Phase 8 前為 stub)
- [x] 5.6 唯一鍵 (babyId, foodId, fedAt) 衝突 409
- [x] 5.7 測試（attemptCount 自動編號、衝突、刪除後狀態回滾、reaction 各值）

## 6. Trial Tracking 模組 (capability: trial-tracking)

- [x] 6.1 `GET /babies/:id/trials` 從 materialized view 讀
- [x] 6.2 `GET /babies/:id/recommendations` 邏輯：UNTRIED + risk ASC + 每類 ≤ 2 多元化
- [x] 6.3 測試（4 狀態各覆蓋一個、ALLERGIC 鎖定、推薦多元化、全部完成回 []）

## 7. CSV Import 模組 (capability: csv-import)

- [x] 7.1 multer (memory, ≤ 2MB) + csv-parse
- [x] 7.2 解析 → 對 `food_item.name` 查表 (trim + case-insensitive)
- [x] 7.3 attemptCount 編號（既有 + 批次內 fedAt 順序）
- [x] 7.4 衝突偵測 (babyId, foodId, fedAt) → skip
- [x] 7.5 transaction，所有列獨立 try/catch，匯出 `{ imported, skipped, errors[] }`
- [x] 7.6 dryRun=true 路徑（不寫入）
- [x] 7.7 `POST /babies/:id/feedings/import` route + 測試（畸形 CSV / 衝突 / dryRun 一致 / missing header / 404）

## 8. Achievements 模組 (capability: achievements)

- [x] 8.1 Seed script：≥ 12 個徽章，4 種 condition type 各 ≥ 1 筆
- [x] 8.2 `AchievementEvaluator.evaluate(babyId)` 依 condition type 選資料源
- [x] 8.3 Routes：`GET /achievements`、`GET /babies/:id/achievements`
- [x] 8.4 進度計算 (current / target) 對未解鎖徽章
- [x] 8.5 測試（每種 condition type 一個 case、不重複解鎖、進度顯示）

## 9. Dashboard 模組 (capability: dashboard)

- [x] 9.1 `GET /babies/:id/dashboard`：聚合 baby + statusCounts + progress + recentUnlocks(5) + recommendations
- [x] 9.2 `GET /babies/:id/progress` 含 byCategory
- [x] 9.3 測試（四狀態總和、percent 計算、byCategory 對齊、recommendations 與獨立端點一致）

## 10. Frontend Foundation (apps/web)

- [x] 10.1 Vite + React 18 + TS。安裝 react-router-dom、@tanstack/react-query、zustand、tailwindcss、lucide-react、clsx (shadcn-ui / framer-motion 後續引入)
- [x] 10.2 Tailwind tokens (色彩見 [component-architecture.md](./component-architecture.md) §6)、Noto Sans TC / Manrope 載入
- [x] 10.3 openapi-typescript：`types:gen` 從 `openapi.yaml` 產 `src/types/api.ts`
- [x] 10.4 API client `lib/api/client.ts`：fetch wrapper + problem+json 錯誤展開
- [x] 10.5 Zustand `useAppStore` (含 persist 寫 activeBabyId)
- [x] 10.6 QueryClientProvider 預設 staleTime 30s、retry 1
- [x] 10.7 AppShell / TopBar / BottomNav / FabAddFeeding 殼層

## 11. Frontend Features

- [x] 11.1 共用元件：AllergyBadge、TrialStatusChip、ProgressRing、EmptyState、Spinner (ErrorState/ConfirmDialog 後續補)
- [x] 11.2 Baby 管理：BabiesPage、BabyEditPage、BabySwitcher + BabyPickerDrawer
- [x] 11.3 食材圖鑑：FoodCatalogPage (CategoryTabs + FoodList + FoodCard) — FoodDetailPage / 自訂食材表單後續補
- [x] 11.4 餵食紀錄：AddFeedingSheet（搜尋食材 + 預填 + 衝突提示）、FeedingTimeline、編輯/刪除 confirm dialog (Timeline 待 Phase 11.5)
- [x] 11.5 歷史視圖：HistoryPage + ViewToggle (本週/本月/全部) + 日誌式群組分組 (WeekCalendar / MonthCalendar 後續可補)
- [x] 11.6 首頁：HomePage 用 useDashboard，StatusCountCard × 4、ProgressRing、RecommendationStrip、RecentUnlockBanner
- [x] 11.7 徽章：AchievementsPage BadgeWall (已解鎖/待解鎖 + 進度條)、BadgeUnlockToast (CSS transition, confetti 後續可加)
- [x] 11.8 CSV 匯入：ImportPage、模板下載、dryRun 預檢、實際匯入摘要、errors 詳列
- [x] 11.9 設定：SettingsPage (版本、入口連結、GitHub) — 清空資料/匯出 CSV 後續加

## 12. Quality

- [ ] 12.1 Backend：Jest + supertest 涵蓋所有 service & route happy + 1 error path，覆蓋率 ≥ 80%
- [ ] 12.2 Frontend：Vitest + Testing Library 涵蓋共用元件 + 關鍵 hook
- [ ] 12.3 Playwright e2e：US01 + US07 + US08 happy path
- [ ] 12.4 Lighthouse mobile ≥ 90 (Performance / A11y / Best Practices)
- [ ] 12.5 A11y 檢查：button label、焦點順序、對比 AA

## 13. Deploy & Docs

- [ ] 13.1 Dockerfile (api) multi-stage
- [ ] 13.2 docker-compose.prod.yml：api + postgres + caddy (https)
- [ ] 13.3 GitHub Actions：PR 跑 lint + typecheck + test；main push build & push image
- [ ] 13.4 README.md：dev / seed / deploy 指南
- [ ] 13.5 apps/web 部署：Caddyfile 服務靜態檔，或推 Vercel/Netlify
- [ ] 13.6 Seed sample baby + 20 筆 demo 紀錄
