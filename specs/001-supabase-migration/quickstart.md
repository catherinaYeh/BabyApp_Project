# Quickstart：驗證 Supabase 遷移

本指南提供可執行的端到端驗證步驟，證明遷移成立。實作細節（程式碼、migration 內容）見 `tasks.md` 與實作階段；此處只談「如何跑、看到什麼算成功」。

## 前置條件

- 已建立 Supabase 專案，並從 Dashboard → Database → Connection 取得：
  - Transaction pooler 連線字串（port **6543**）→ `DATABASE_URL`
  - Session pooler 連線字串（port **5432**）→ `DIRECT_URL`
- 本機已安裝 pnpm；可連網。
- （選用）若要搬移既有資料：可存取來源 Postgres（Render/本機）。

## 設定（後端）

1. 於 `apps/api/.env` 設定 `DATABASE_URL`（6543，含 `?pgbouncer=true&connection_limit=1&sslmode=require`）與 `DIRECT_URL`（5432，含 `sslmode=require`）。
2. 確認 `schema.prisma` 的 `datasource db` 含 `directUrl = env("DIRECT_URL")`，且 `env.ts` 驗證 `DIRECT_URL`。

## 套用 schema 與 seed

```bash
pnpm --filter @baby/api exec prisma migrate deploy   # 套用既有 migration 到 Supabase
pnpm --filter @baby/api db:seed                       # 灌入系統食物與成就（idempotent）
```

**預期**：migrate deploy 顯示兩個 migration 皆 applied；seed 印出 `Seed complete: foods=…, achievements=…`。

## （選用）搬移既有資料

```bash
pg_dump --data-only --no-owner --no-acl "<SOURCE_DATABASE_URL>" \
  -t baby -t food_item -t feeding_record -t achievement -t achievement_unlock > data.sql
psql "<DIRECT_URL>" -f data.sql
```

**預期**：匯入無錯誤；下一步筆數比對一致。

## 驗證 1 — 資料持久保存（US1 / SC-001, SC-002）

1. 啟動後端與前端：`pnpm --filter @baby/api dev` 與 `pnpm --filter @baby/web dev`。
2. 在 App 新增一隻寶寶並記錄一筆餵食。
3. 於 Supabase Dashboard → Table editor 查 `feeding_record`，**應看到該筆資料**。
4. 重新整理 App，**先前資料完整載回**。
5. （若有搬移）比對筆數：

```bash
psql "<DIRECT_URL>" -c "select 'baby' t, count(*) from baby union all select 'food_item', count(*) from food_item union all select 'feeding_record', count(*) from feeding_record;"
```

**預期**：與來源一致（差異 0）。

## 驗證 2 — Loading 回饋（US2 / SC-003）

1. 於瀏覽器 DevTools 將網路節流（Slow 3G）。
2. 開啟首頁／歷史頁。
   **預期**：資料抵達前顯示 Spinner（非空白）；抵達後顯示內容；無資料時顯示空狀態（非持續載入）。

## 驗證 3 — 錯誤處理與重試（US3 / SC-004）

1. 暫時讓 DB 不可用（停掉後端或填入錯誤 `DATABASE_URL`）。
2. 開啟需讀取資料的頁面。
   **預期**：顯示友善錯誤訊息與「重試」入口（非技術堆疊／空白）。
3. 恢復連線後點重試。
   **預期**：資料成功載入，回到正常狀態。

## 驗證 4 — 契約與 UI 無回歸（SC-005）

```bash
pnpm --filter @baby/api test     # 後端契約測試對 Supabase 後端應全綠
pnpm --filter @baby/web test     # 前端單元測試
pnpm --filter @baby/web test:e2e # 快速記錄流程 e2e
```

**預期**：既有測試全數通過；新增一筆餵食的操作步驟與畫面外觀與遷移前一致。

## 部署驗證（Render + Supabase）

1. 於 Render 服務以 secret 設定 `DATABASE_URL`、`DIRECT_URL`（指向 Supabase）；移除/停用內建 Postgres。
2. 部署流程於啟動前執行 `prisma migrate deploy`。
3. 開啟正式前端（Vercel），健康檢查 `/healthz` 正常，主要頁面 < 3 秒顯示資料（SC-006）。
