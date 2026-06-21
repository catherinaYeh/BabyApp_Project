# 介面契約（Phase 1）

## 對外契約：本功能維持不變

本遷移屬於**資料庫託管位置變更**，不更動任何對外介面：

- **REST API 契約**：後端 `/api/v1/*` 端點（babies、foods、feedings、dashboard、trials、achievements、csv-import）之路徑、請求/回應 schema **完全不變**。權威來源為既有 OpenAPI 規格：
  - `openspec/changes/init-baby-weaning-tracker/openapi.yaml`
  - 前端型別由其產生：`apps/web/src/types/api.ts`（`pnpm --filter @baby/web types:gen`）。
- **前端 API client 契約**：`apps/web/src/lib/api/*` 與 `apps/web/src/lib/hooks.ts` 的函式簽章不變；UI 元件與資料來源維持解耦（憲章）。

## 受影響的「設定契約」（非對外 API，但屬本功能交付物）

新增/變更的是**環境設定契約**，須在所有環境一致：

| 變數           | 用途                                               | 範例（值不入庫，僅格式）                                                                                                               |
| -------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL` | runtime 查詢，走 Supabase transaction pooler       | `postgresql://postgres.<ref>:<pwd>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require` |
| `DIRECT_URL`   | migration/introspection，走 session pooler（5432） | `postgresql://postgres.<ref>:<pwd>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require`                                   |

- `schema.prisma` 的 `datasource db` 須含 `url = env("DATABASE_URL")` 與 `directUrl = env("DIRECT_URL")`。
- `apps/api/src/config/env.ts` 的 zod schema 須驗證 `DIRECT_URL`。

## 驗證

- 契約一致性以既有後端契約測試（Jest + supertest）保證：遷移後同一套契約測試對 Supabase 後端仍須全綠，證明 API 行為未因換 DB 而改變。
