## Why

新手父母在進行寶寶副食品試敏時，常因紀錄不一致、混淆嘗試順序、缺乏成就回饋而中斷。市面記錄類 App 多偏流水帳，不提供「圖鑑解鎖／進度推進」這類維持習慣的回饋；雙寶以上家庭也難以分別追蹤進度。這個 change 從零打造一個 Mobile-first Web App，把試敏過程遊戲化，讓父母願意持續記錄並用低敏先試的引導減少風險。

## What Changes

- **新建 monorepo**：`apps/api` (Node 20 + Express + Prisma + PostgreSQL 15) 與 `apps/web` (React 18 + Vite + TS)
- **REST API v1**：Babies / Foods / Feedings / Trials / Achievements / Dashboard 完整 CRUD + CSV 匯入，契約見 [openapi.yaml](./openapi.yaml)
- **資料模型**：Baby / FoodItem / FeedingRecord / Achievement / AchievementUnlock 五張表 + 物化視圖 `baby_food_trial` 計算試敏狀態
- **食材圖鑑**：seed 約 80 項台灣常見副食品，使用者可加自訂；系統項 read-only
- **遊戲化前端**：首頁狀態總覽、進度條、徽章牆、解鎖動畫；多寶寶切換器 (`activeBabyId` Zustand)
- **CSV 批次匯入**：標準欄位、Skip-on-conflict、支援 `dryRun`
- **無認證單裝置**：第一版不做 user/login；多裝置同步 deferred 到另一個 change `add-email-auth-and-sync`

## Capabilities

### New Capabilities

- `babies`：寶寶檔案 CRUD、月齡推算、avatar 色彩、跨資源 scope
- `food-catalog`：食材圖鑑 (系統預載 + 使用者自訂)、敏度分級、CRUD 與 read-only 規則
- `feeding-records`：餵食紀錄 CRUD、attempt count 自動編號、reaction 追蹤、唯一鍵衝突處理
- `trial-tracking`：試敏狀態自動推導 (UNTRIED/TRYING/UNLOCKED/ALLERGIC)、下一個建議食材
- `csv-import`：CSV 批次匯入歷史紀錄、skip-on-conflict、dryRun 預覽
- `achievements`：徽章定義 (condition DSL)、自動評估、解鎖紀錄
- `dashboard`：首頁總覽 (狀態計數 + 進度條 + 最近解鎖 + 推薦)

### Modified Capabilities

無，本 change 是 greenfield 初始化。

## Impact

- **新增程式碼**：完整 monorepo (frontend + backend + Prisma schema + migrations)
- **新依賴**：Express、Prisma、Zod、Pino、Multer、csv-parse、React、Vite、TanStack Query、Zustand、Tailwind、shadcn/ui、Framer Motion
- **資料庫**：建立 PostgreSQL 15 instance (Docker Compose for dev)
- **部署**：第一版只在本機／私有環境（無認證）
- **後續 change 銜接**：`add-email-auth-and-sync` 將為所有資源加上 userId scope，本 change 的 schema 不留 placeholder（避免假抽象）；屆時以 migration 補上 `user_id` FK + 預設 user。
