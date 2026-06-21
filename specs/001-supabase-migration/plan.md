# Implementation Plan: Supabase 資料庫遷移

**Branch**: `feature/supabase-migration` | **Date**: 2026-06-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-supabase-migration/spec.md`

## Summary

將既有後端（Express + Prisma）的 PostgreSQL 資料庫由 Render 託管的免費 Postgres（約 30 天到期）遷移至 **Supabase 託管的 PostgreSQL**。前端（Vite + React + react-query）與後端 API 介面、資料模型維持不變。核心技術手段：

- 在 `schema.prisma` 的 `datasource` 加入 `directUrl`，將 **runtime 走連線池（Supavisor transaction pooler，port 6543）**、**migration 走直連／session pooler（port 5432）** 分離。
- 後端環境設定新增 `DIRECT_URL`，並更新 `env.ts` 驗證 schema。
- 既有 Prisma migrations（`init`、`baby_food_trial_view`）以 `prisma migrate deploy` 套用至 Supabase，再以 `db:seed` 灌入系統食物與成就。
- 既有資料（若有）由來源 Postgres 搬移至 Supabase（`pg_dump`/`pg_restore`）。
- 補齊前端錯誤處理缺口（部分頁面僅處理 loading、缺少 error 與重試）以滿足 US3。

對應 spec 三個使用者故事：US1（資料持久保存於 Supabase）= DB 遷移＋migrate＋seed＋資料搬移；US2（載入回饋）= 既有 react-query loading 已大致具備，補齊一致性；US3（錯誤處理與重試）= 補齊頁面 error 狀態與 retry。

## Technical Context

**Language/Version**: TypeScript 5.6；Node（後端 ESM, `tsx`/`tsc`），前端 Vite + React 18

**Primary Dependencies**: 後端 — Express 4、Prisma 5.20（`@prisma/client`）、Zod、pino；前端 — React 18、@tanstack/react-query 5、zustand 5、react-router 6

**Storage**: PostgreSQL（現為 Render 託管／本機 docker-compose postgres:15）→ 目標 **Supabase 託管 PostgreSQL（含 Supavisor 連線池）**

**Testing**: 後端 Jest + supertest；前端 Vitest + @testing-library + Playwright（e2e）

**Target Platform**: 後端 Docker（Render）；前端靜態站（Vercel）；本機開發 docker-compose

**Project Type**: Web application（pnpm monorepo：`apps/api` 後端、`apps/web` 前端）

**Performance Goals**: 主要資料畫面（首頁、歷史）自開啟到顯示資料 < 3 秒（SC-006）；連線池避免 serverless/重啟時連線耗盡

**Constraints**:

- 不得改變現有 UI 外觀與操作流程（憲章）；資料存取維持封裝於 service／API 層（憲章）。
- 不含使用者認證、維持單租戶。
- Prisma migration 引擎不支援經 PgBouncer 連線池執行 → 必須使用 `directUrl` 直連／session pooler。
- Supabase 直連為 IPv6，Render 容器網路需確認 IPv4 可達性（改用 pooler 主機或 IPv4 add-on）。

**Scale/Scope**: 個人／家庭用量級小資料集；3 個核心實體（Baby/FoodItem/FeedingRecord）＋既有 Achievement 等；變更面集中於後端連線設定、migration/seed 流程、部署環境變數，加上少量前端錯誤處理補強。

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

專案憲章已填寫的核心原則（第一條）對本功能的約束與符合狀況：

| 憲章要求                                                 | 本計畫符合方式                                                                                                                                            | 狀態    |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 後端資料庫升級「絕對不可改變現有 UI 元件外觀與操作流程」 | 遷移僅更動後端 DB 連線目標與 migration/seed 流程；前端 API client 不變；US3 的錯誤處理沿用既有 `EmptyState`/`Spinner` 元件，不新增視覺風格                | ✅ PASS |
| 所有資料存取邏輯封裝於獨立 Service 層、前後端解耦        | 沿用既有 `apps/api/src/modules/*/​*.service.ts` 與 `apps/web/src/lib/api/*` 封裝；前端不直接接觸資料庫；連線設定集中於 `config/env.ts` 與 `lib/prisma.ts` | ✅ PASS |

**結論**：無違反項，無需 Complexity Tracking。設計後重新檢查（Phase 1 後）仍 PASS — 未引入新專案、未繞過 service 層、未變更 UI 契約。

## Project Structure

### Documentation (this feature)

```text
specs/001-supabase-migration/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output（介面契約：本功能不變更，記錄現況）
│   └── README.md
├── checklists/
│   └── requirements.md  # /speckit-specify output
└── tasks.md             # /speckit-tasks output（本指令不產生）
```

### Source Code (repository root)

實際變更落點（既有 monorepo，無新增頂層目錄）：

```text
apps/api/
├── prisma/
│   ├── schema.prisma          # 變更：datasource 加入 directUrl
│   ├── migrations/            # 既有 migration，套用至 Supabase（不新增）
│   └── seed.ts, seed/         # 既有 seed，對 Supabase 執行
├── src/
│   ├── config/env.ts          # 變更：新增 DIRECT_URL 驗證
│   ├── lib/prisma.ts          # 視需要：連線錯誤日誌
│   └── modules/{babies,foods,feedings}/*.service.ts  # 不變（沿用）
├── .env.example               # 變更：示範 DATABASE_URL(6543)+DIRECT_URL(5432)
└── Dockerfile                 # 視需要：確認 migrate deploy 於部署時執行

apps/web/
└── src/pages/{HistoryPage,FoodCatalogPage,...}.tsx   # 補齊 isError + 重試（US3）
   src/lib/hooks.ts            # 視需要：retry 預設策略

render.yaml                    # 變更：移除/停用內建 databases，改注入 Supabase 連線字串
```

**Structure Decision**: 沿用既有 pnpm monorepo（`apps/api` + `apps/web`）。本功能不新增專案或目錄，變更集中於後端連線／migration／部署設定與少量前端錯誤處理，符合「Web application」結構與憲章的前後端解耦要求。

## Complexity Tracking

> 無憲章違反項，無需填寫。
