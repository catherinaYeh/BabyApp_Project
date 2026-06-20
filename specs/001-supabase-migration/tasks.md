---
description: 'Task list for Supabase 資料庫遷移'
---

# Tasks: Supabase 資料庫遷移

**Input**: Design documents from `specs/001-supabase-migration/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: 本功能不重寫資料模型，主要為 DB 託管位置變更 + 前端錯誤處理補強。測試策略採「驗證既有測試套件不回歸」＋「US3 新增針對錯誤處理的前端測試」，不採全面 TDD。

**Organization**: 任務依使用者故事分組，每組可獨立實作與驗證。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可平行（不同檔案、無未完成相依）
- **[Story]**: US1 / US2 / US3
- 描述含確切檔案路徑

## Path Conventions

pnpm monorepo：後端 `apps/api/`、前端 `apps/web/`。

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 建立 Supabase 專案與取得連線資訊（不寫入 repo）

- [x] T001 在 Supabase 建立專案，並從 Dashboard → Database → Connection 取得兩組連線字串：transaction pooler（port 6543）與 session pooler（port 5432）；妥善保存於本機 `apps/api/.env`（勿提交）。參考 `specs/001-supabase-migration/research.md` R1–R3。
- [ ] T002 [P] 確認本機開發路徑仍可用：`docker-compose up -d postgres` 啟動本機 Postgres，作為非 Supabase 的開發/測試後備（`docker-compose.yml`）。

**Checkpoint**: 具備 Supabase 連線字串與本機開發後備。

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 連線設定的程式變更——所有故事都依賴正確的雙 URL 連線設定

**⚠️ CRITICAL**: 未完成本階段，任何資料庫操作（migrate/seed/讀寫）都無法對 Supabase 正確進行

- [x] T003 在 `apps/api/prisma/schema.prisma` 的 `datasource db` 區塊新增 `directUrl = env("DIRECT_URL")`（保留 `url = env("DATABASE_URL")`）。依 `research.md` R1。
- [x] T004 在 `apps/api/src/config/env.ts` 的 zod schema 新增 `DIRECT_URL: z.string().url()`，使啟動時驗證缺漏設定。依 `research.md` R6。
- [x] T005 [P] 更新 `apps/api/.env.example`：加入 `DATABASE_URL`（6543，含 `?pgbouncer=true&connection_limit=1&sslmode=require`）與 `DIRECT_URL`（5432，含 `sslmode=require`）的格式範例與註解。
- [x] T006 [P] 執行 `pnpm --filter @baby/api exec prisma generate` 確認加入 `directUrl` 後 Prisma client 仍正常產生、`pnpm --filter @baby/api typecheck` 通過。

**Checkpoint**: 連線設定就緒，可對 Supabase 執行 migration 與 runtime 查詢。

---

## Phase 3: User Story 1 - 副食品資料持久保存於雲端資料庫 (Priority: P1) 🎯 MVP

**Goal**: 三張資料表（Baby/FoodItem/FeedingRecord ＋ 既有 Achievement 等）與系統食物落地於 Supabase，App 新增/讀回資料皆對 Supabase 生效，既有資料（若有）完整搬移。

**Independent Test**: 後端指向 Supabase 後新增一筆餵食紀錄，於 Supabase Table editor 查得該筆；重啟 App 資料完整載回（quickstart 驗證 1）。

### Implementation for User Story 1

- [x] T007 [US1] 以 `DIRECT_URL` 對 Supabase 執行 `pnpm --filter @baby/api exec prisma migrate deploy`，套用既有兩個 migration（`20260526145019_init`、`20260526145047_baby_food_trial_view`）。依 `research.md` R4。
- [x] T008 [US1] 確認 `baby_food_trial_view` migration 於 Supabase（Postgres 15）成功建立其 view，無不支援元素（依 `research.md` R4 注意事項）；如有問題記錄並調整 migration。
- [x] T009 [US1] 對 Supabase 執行 `pnpm --filter @baby/api db:seed`，灌入系統食物（`is_system=true`）與成就；確認輸出 `Seed complete`，滿足 FR-004。
- [ ] T010 [US1] ⏭️ 跳過(全新 Supabase 庫,無既有正式資料需搬移) — （條件性，依 `research.md` R5）若來源 Postgres 有需保留之正式資料，以 `pg_dump --data-only --no-owner --no-acl`（表：baby、food_item、feeding_record、achievement、achievement_unlock）匯出，再 `psql "<DIRECT_URL>"` 匯入 Supabase；系統食物/成就不從來源搬移以避免重複。
- [x] T011 [US1] 將後端 `apps/api/.env` 的 `DATABASE_URL`/`DIRECT_URL` 切到 Supabase，啟動 `pnpm --filter @baby/api dev`，透過前端新增一筆餵食紀錄並於 Supabase Table editor 確認寫入（SC-001）。
- [x] T012 [US1] 驗證資料完整性規則於 Supabase 生效：刪除寶寶連帶刪除其餵食紀錄（Cascade）、被引用食物不可刪（Restrict）、同寶寶/食物/時間唯一（對應 `data-model.md` 與 FR-002）。
- [ ] T013 [US1] ⏭️ N/A(未執行 T010) — （若執行 T010）以 SQL 比對來源與 Supabase 三表筆數一致（差異 0，SC-002），記錄於遷移筆記。

**Checkpoint**: 資料已可靠保存於 Supabase 並可讀回 → MVP 達成，可單獨驗證/展示。

---

## Phase 4: User Story 2 - 資料載入時的清楚進度回饋 (Priority: P2)

**Goal**: 所有需從雲端讀取資料的畫面，在資料抵達前顯示載入回饋，空結果顯示空狀態。

**Independent Test**: DevTools 節流（Slow 3G）開啟首頁/歷史頁，載入期間見 Spinner，抵達後見內容，無資料見空狀態（quickstart 驗證 2）。

### Implementation for User Story 2

- [x] T014 [US2] 盤點所有讀取查詢頁面的 loading 處理現況：`apps/web/src/pages/HomePage.tsx`、`HistoryPage.tsx`、`FoodCatalogPage.tsx`、`AchievementsPage.tsx`、`BabiesPage.tsx`、`ImportPage.tsx`，列出已具備/缺少 `isLoading` Spinner 的頁面。
- [x] T015 [US2] 為缺少載入回饋的頁面，以既有 `apps/web/src/components/common/Spinner.tsx` 補上 `isLoading` 分支（沿用現有視覺，憲章：不改 UI 風格），滿足 FR-008。
- [x] T016 [US2] 確認空結果情境顯示既有 `apps/web/src/components/common/EmptyState.tsx`（非持續載入），滿足 FR-009；針對新寶寶無紀錄等情境逐頁確認。

**Checkpoint**: 所有雲端讀取畫面皆有一致的載入/空狀態回饋。

---

## Phase 5: User Story 3 - 連線或讀寫失敗時的友善錯誤處理 (Priority: P3)

**Goal**: 讀寫失敗時顯示友善錯誤與重試；寫入失敗不留假成功資料。

**Independent Test**: 讓 DB 不可用後開啟頁面見友善錯誤＋重試，恢復後重試成功；mutation 失敗有可見回饋（quickstart 驗證 3）。

### Tests for User Story 3 ⚠️

- [x] T017 [P] [US3] 在 `apps/web/tests/` 新增測試：模擬查詢 `isError` 時頁面渲染錯誤狀態與重試按鈕（沿用 Vitest + @testing-library 既有模式）。

### Implementation for User Story 3

- [x] T018 [US3] 在 `apps/web/src/lib/queryClient.ts` 設定 react-query 合理預設（如 `retry: 1`），避免暫時性失敗即報錯，並使 `refetch` 行為一致。
- [x] T019 [US3] 為讀取查詢頁面（`HistoryPage.tsx`、`FoodCatalogPage.tsx`、`AchievementsPage.tsx`、`BabiesPage.tsx` 等目前僅處理 `isLoading` 者）加入 `isError` 分支，以既有 `EmptyState` 呈現友善訊息並提供呼叫 `refetch` 的「重試」入口，滿足 FR-010（依 `research.md` R8）。
- [x] T020 [US3] 為 mutation（新增/刪除：`useCreateBaby`/`useDeleteBaby`/新增餵食等於 `apps/web/src/lib/hooks.ts`）的失敗情境加入使用者可見回饋（沿用現有 UI 模式，如 inline/toast），且確保失敗時不在畫面保留看似成功的資料，滿足 FR-011。
- [ ] T021 [US3] (待手動在瀏覽器驗證;錯誤 UI 已就緒並有單元測試) — 手動模擬 DB 不可用（錯誤 `DATABASE_URL` 或停後端），逐頁確認友善錯誤＋重試可用、恢復後重試成功（SC-004）。

**Checkpoint**: 三個使用者故事皆可獨立運作。

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 部署落地與回歸驗證

- [x] T022 更新 `render.yaml`：移除/停用內建 `databases: babyapp-db` 區塊，改以 Render secret 環境變數注入 Supabase `DATABASE_URL` 與 `DIRECT_URL`（不提交至 repo），依 `research.md` R7。
- [x] T023 確認後端部署流程於 `start` 前執行 `prisma migrate deploy`（檢查 `apps/api/Dockerfile` 或 Render start command），使正式環境自動套用 migration。
- [x] T024 [P] 確認 Render → Supabase 連線採 pooler 主機（IPv4 相容），避免 IPv6 直連不可達（`research.md` R2）。
- [ ] T025 回歸驗證(web 32 tests ✅;後端整合測試需本機 test DB,不對 Supabase 執行) —：`pnpm --filter @baby/api test`（後端契約測試對 Supabase 後端全綠，證明 API 契約未因換 DB 改變，SC-005）、`pnpm --filter @baby/web test`、`pnpm --filter @baby/web test:e2e`。
- [ ] T026 [P] (待實際 Render 部署後執行) — 部署後驗證：正式前端（Vercel）`/healthz` 正常、主要頁面 < 3 秒顯示資料（SC-006）；走一遍 `specs/001-supabase-migration/quickstart.md` 全部驗證。
- [x] T027 [P] 更新文件：在 `README.md` 與 `apps/api/.env.example` 註明 Supabase 雙 URL 設定與 migration/seed 指令。

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 無相依，可立即開始。
- **Foundational (Phase 2)**: 依賴 Setup；**阻擋所有使用者故事**（沒有雙 URL 設定就無法對 Supabase 操作）。
- **User Stories (Phase 3–5)**: 皆依賴 Foundational。
  - US1 為 MVP，必須先完成（US2/US3 的驗證需先有 Supabase 後端在跑）。
  - US2、US3 為前端補強，彼此獨立，可平行；但實務上建議在 US1 後依序進行。
- **Polish (Phase 6)**: 依賴所需故事完成。

### User Story Dependencies

- **US1 (P1)**: Foundational 後即可開始，無對其他故事相依。
- **US2 (P2)**: 前端載入回饋，技術上獨立；驗證時需 US1 的 Supabase 後端運作。
- **US3 (P3)**: 前端錯誤處理，技術上獨立；與 US2 改動不同分支但同屬頁面層，注意同檔避免衝突。

### Within Each User Story

- US1：migrate（T007）→ view 確認（T008）→ seed（T009）→ 資料搬移（T010）→ 切換後端驗證（T011–T013）。
- US3：queryClient 預設（T018）→ 各頁 error 分支（T019）→ mutation 回饋（T020）→ 手動驗證（T021）。

### Parallel Opportunities

- Setup：T002 與 T001 可平行。
- Foundational：T005、T006 標記 [P]（不同檔案）。
- US2 與 US3 可由不同人平行，但 T015/T019 可能更動相同頁面檔案 → 同頁時需序列化避免衝突。
- Polish：T024、T026、T027 標記 [P]。

---

## Parallel Example: Foundational (Phase 2)

```bash
# T005 與 T006 可平行（不同檔案/動作）：
Task: "更新 apps/api/.env.example 加入 DATABASE_URL/DIRECT_URL 範例"
Task: "執行 prisma generate + typecheck 驗證 directUrl 設定"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup（建立 Supabase 專案、取得雙 URL）
2. Phase 2 Foundational（schema directUrl + env.ts + .env.example）— **阻擋性**
3. Phase 3 US1（migrate deploy + seed + 資料搬移 + 驗證）
4. **STOP and VALIDATE**：在 Supabase 上獨立驗證資料持久保存
5. 可部署/展示（資料層已遷移完成）

### Incremental Delivery

1. Setup + Foundational → 連線基礎就緒
2. US1 → 資料保存於 Supabase（MVP，可部署）
3. US2 → 載入回饋一致化（可部署）
4. US3 → 錯誤處理與重試（可部署）
5. Polish → 部署設定（render.yaml）、回歸測試、文件

---

## Notes

- 本功能多數為基礎建設/設定/資料維運任務，而非新增領域程式；務必遵守憲章：不改 UI 外觀與操作流程、維持 service 層封裝。
- 連線字串含密碼，一律走 secret/.env，絕不提交至 repo。
- 最大地雷：Prisma migration 必須走 `DIRECT_URL`（非 pooler 6543），否則 prepared statement 報錯。
- 每完成一個任務或邏輯群組即 commit；可於各 Checkpoint 停下獨立驗證。
