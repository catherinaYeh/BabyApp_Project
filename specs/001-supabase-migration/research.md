# Phase 0 Research: Supabase 資料庫遷移

本文件解析遷移的所有技術未知點，重點在 Prisma ↔ Supabase 的連線池與 migration 機制、資料搬移、部署環境變數，以及前端 loading/error 現況缺口。

## R1. Prisma 連線方式：連線池 vs 直連（最關鍵）

- **Decision**：在 `schema.prisma` 的 `datasource db` 同時設定 `url = env("DATABASE_URL")` 與 `directUrl = env("DIRECT_URL")`。
  - `DATABASE_URL` → Supabase **Supavisor transaction pooler**，host 形如 `aws-0-<region>.pooler.supabase.com`，**port 6543**，附 `?pgbouncer=true&connection_limit=1`（runtime 查詢用）。
  - `DIRECT_URL` → Supabase **session pooler / 直連**，**port 5432**（migration 與 introspection 用）。
- **Rationale**：Prisma 的 Schema/Migration 引擎使用單一連線且**不支援透過 PgBouncer（transaction 模式）執行**，否則會出現 prepared statement 相關錯誤；`directUrl` 讓 `prisma migrate`/`db push` 走直連繞過池化，runtime 查詢仍享有連線池，避免 serverless/容器重啟時連線耗盡。
- **Alternatives considered**：
  - 只用直連 5432（不設池）：個人專案資料量小可行，但容器重啟或多實例時易連線數爆掉，且 Supabase 直連為 IPv6，部分託管環境不可達 → 不採。
  - 只用 pooler 6543 做所有事：migration 會失敗（prepared statements）→ 不採。

## R2. IPv4 / IPv6 與 Render 連線可達性

- **Decision**：Render 容器對 Supabase 一律走 **pooler 主機（IPv4 相容）**；`DATABASE_URL` 用 transaction pooler（6543），`DIRECT_URL` 用 **session pooler（5432，pooler 主機）** 而非 `db.<ref>.supabase.co` 直連主機。
- **Rationale**：Supabase 的 `db.<ref>.supabase.co` 直連僅 IPv6；Render 免費/標準容器網路 IPv4 較穩。Session pooler 主機提供 IPv4 且支援 migration 所需的 session 連線。
- **Alternatives considered**：購買 Supabase IPv4 add-on 走直連主機 → 增加成本，個人專案不採。

## R3. SSL 連線

- **Decision**：連線字串維持 Supabase 提供的 `sslmode=require`（Supabase 連線字串預設帶）。本機 docker-compose 不需要。
- **Rationale**：Supabase 強制 TLS；Prisma 透過連線字串參數即可，無需額外憑證設定。

## R4. Migration 套用方式（既有 migration 落地）

- **Decision**：對 Supabase 執行 `prisma migrate deploy`（非 `migrate dev`），套用既有兩個 migration（`20260526145019_init`、`20260526145047_baby_food_trial_view`）；隨後執行 `pnpm --filter @baby/api db:seed`。
- **Rationale**：`migrate deploy` 適用於既有 migration 對正式/雲端環境的非互動套用，不會嘗試產生新 migration。既有 seed 為 idempotent upsert（依 name/code），可安全重跑。
- **Alternatives considered**：`db push` → 不記錄 migration 歷史，與既有 migration 流程不一致 → 不採。
- **注意**：第二個 migration 名為 `baby_food_trial_view`，可能含 **資料庫 view**；需確認其 SQL 在 Supabase（標準 Postgres 15+）可正常建立（一般可行；若用到特定擴充需另確認）。

## R5. 既有資料搬移

- **Decision**：若來源（Render/本機）已有正式資料，使用 `pg_dump --data-only --no-owner --no-acl`（schema 由 migrate 建立後）僅匯資料，再 `psql`/`pg_restore` 灌入 Supabase；遷移後比對三類實體筆數一致（SC-002）。系統食物與成就改由 `db:seed` 重建、不從來源搬移，避免重複。
- **Rationale**：schema 由 migration 保證一致，data-only 匯入避免 owner/權限衝突；seed 為 idempotent，分開處理較乾淨。
- **Alternatives considered**：整庫 dump（含 schema）→ 易與 Prisma migration 歷史及 Supabase 既有角色衝突 → 不採。若本機/開發資料無保留價值，可跳過搬移、直接 seed（依實際情況於 tasks 決定）。

## R6. 後端設定與驗證（env.ts）

- **Decision**：`apps/api/src/config/env.ts` 的 zod schema 新增 `DIRECT_URL: z.string().url()`；`.env.example` 補上 `DATABASE_URL`(6543) 與 `DIRECT_URL`(5432) 範例；本機 docker-compose 開發時兩者可同指 localhost:5432。
- **Rationale**：env 啟動時驗證可及早攔截缺漏設定（現況缺 `DIRECT_URL` 會讓 Prisma migration 失敗卻無明確錯誤）。

## R7. 部署設定（render.yaml）

- **Decision**：移除或停用 `render.yaml` 內建的 `databases: babyapp-db` 區塊；改以 secret 環境變數注入 Supabase 的 `DATABASE_URL` 與 `DIRECT_URL`（不寫入 repo）。部署流程（Dockerfile/啟動）確保在 `start` 前執行 `prisma migrate deploy`。
- **Rationale**：render.yaml 註解本身已建議「免費 Postgres 約 30 天到期，長期改用 Neon/Supabase」，與本遷移目標一致。連線字串含密碼，必須走 secret，不可 fromDatabase 自動注入。
- **既知部署地雷對照**（與專案記憶一致）：vercel.json 置於 repo 根、CORS_ORIGIN 設定、Docker build context 為 repo 根、PORT 由平台注入 — 本遷移不改動這些，僅替換 DB 連線來源。

## R8. 前端 Loading / Error 現況與缺口

- **現況（已具備，US2 大致達成）**：前端以 `@tanstack/react-query` 封裝（`apps/web/src/lib/hooks.ts`）。`HomePage` 已處理 `isLoading`（Spinner）、`isError`（EmptyState）；`HistoryPage` 已處理 `isLoading` 與空狀態。
- **缺口（US3）**：
  - `HistoryPage` 等頁面**僅處理 `isLoading`，未處理 `isError`、無重試**。
  - 各頁錯誤呈現不一致；無統一「重試」入口（react-query 的 `refetch`）。
  - mutation（新增/刪除）失敗目前多數無使用者可見回饋（FR-011）。
- **Decision**：以既有 `EmptyState`/`Spinner` 元件補齊：為讀取查詢頁面一致加上 `isError` 分支＋呼叫 `refetch` 的重試；mutation 失敗以既有 UI 模式（如 toast/inline 提示，沿用現有風格）告知未成功。設定 react-query 合理 `retry`（如 1 次）與錯誤邊界，不更動視覺風格（憲章）。
- **Rationale**：滿足 FR-008~FR-011 與 US3，且零 UI 風格變更。

## 未解決澄清項

- 無阻斷性 NEEDS CLARIFICATION。方向（保留後端、DB 換 Supabase、不含 Auth）已於 `/speckit-specify` 階段由使用者確認。
- 待實作期確認（非阻斷）：(a) 是否有需保留的既有正式資料（決定是否執行 R5 搬移）；(b) `baby_food_trial_view` migration 是否含 Supabase 不支援的元素（預期相容）。

## Sources

- [Prisma | Supabase Docs](https://supabase.com/docs/guides/database/prisma)
- [Supabase | Prisma Documentation](https://www.prisma.io/docs/orm/v6/overview/databases/supabase)
- [Configure Prisma Client with PgBouncer | Prisma Documentation](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/pgbouncer)
- [Troubleshooting prisma errors | Supabase Docs](https://supabase.com/docs/guides/database/prisma/prisma-troubleshooting)
- [Migrations with Supabase Supavisor in transaction mode don't work · prisma/prisma#22779](https://github.com/prisma/prisma/issues/22779)
