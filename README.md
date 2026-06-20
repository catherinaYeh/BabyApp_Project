# Baby Weaning Gamified Tracker (寶寶副食品試敏小遊戲)

Mobile-first Web App，記錄並追蹤寶寶副食品試敏歷程。
規格見 [openspec/changes/init-baby-weaning-tracker/](openspec/changes/init-baby-weaning-tracker/)。

## 技術棧

| 層       | 工具                                                                 |
| -------- | -------------------------------------------------------------------- |
| Backend  | Node 20 · Express 4 · Prisma 5 · PostgreSQL 15 · Zod · Pino          |
| Frontend | React 18 · Vite · TanStack Query · Zustand · Tailwind                |
| Monorepo | pnpm workspaces · Turborepo · TypeScript 5                           |
| Spec     | OpenSpec (spec-driven schema)                                        |
| 測試     | Jest + supertest (API) · Vitest + Testing Library (Web) · Playwright |
| 部署     | Docker (multi-stage) + Caddy (web 靜態 + /api 反向代理) + PostgreSQL |

## 前置需求

- Node.js ≥ 20.18.0
- pnpm 9
- Docker Desktop（跑 PostgreSQL）

> 本機 Node 20 安裝於 `~/.local/nodejs-20/`（非 brew）。請在 shell 設定
> `export PATH="$HOME/.local/nodejs-20/bin:$PATH"`，或用 nvm/asdf 切換。

## 起手式 (Dev)

```bash
# 1. 安裝套件
pnpm install

# 2. 啟動 PostgreSQL + Adminer
docker compose up -d

# 3. 套用 migrations + seed
cd apps/api
cp .env.example .env                # 第一次而已
pnpm prisma migrate deploy
pnpm prisma generate
SEED_DEMO=true pnpm db:seed         # 80 食材 + 13 徽章 + 1 示範寶寶 + 20 餵食紀錄
cd ../..

# 4. 啟動 API
pnpm --filter @baby/api dev         # http://localhost:3000

# 5. 啟動 Web（另一個 shell）
pnpm --filter @baby/web dev         # http://localhost:5173
```

### 連線 Supabase（正式環境資料庫）

正式環境資料庫為 Supabase 託管的 PostgreSQL。需設定**兩組**連線字串（皆用 Supabase 的 pooler 主機，IPv4 相容）：

| 變數           | 用途                             | Pooler / Port                 | 額外參數                                             |
| -------------- | -------------------------------- | ----------------------------- | ---------------------------------------------------- |
| `DATABASE_URL` | 後端 runtime 查詢                | transaction pooler / **6543** | `?pgbouncer=true&connection_limit=1&sslmode=require` |
| `DIRECT_URL`   | `prisma migrate` / introspection | session pooler / **5432**     | `?sslmode=require`                                   |

> ⚠️ Prisma migration 引擎不支援經 transaction pooler（6543）執行，務必用 `DIRECT_URL`（5432）。

設定範例見 [`apps/api/.env.example`](apps/api/.env.example)。套用 schema 與系統資料：

```bash
cd apps/api
pnpm exec prisma migrate deploy    # 走 DIRECT_URL 套用 migration
pnpm db:seed                       # 80 食材 + 13 徽章（idempotent）
```

Render 部署時，`DATABASE_URL` / `DIRECT_URL` 以 Dashboard secret 注入（`render.yaml` 中 `sync: false`），容器啟動會自動執行 `prisma migrate deploy`（見 `apps/api/Dockerfile` CMD）。

- API: <http://localhost:3000/healthz>
- Swagger UI: <http://localhost:3000/api/v1/docs/>
- Web: <http://localhost:5173>
- Adminer: <http://localhost:8080>（伺服器 postgres、user baby、pwd baby_dev）

> 如果只要看 demo，跳過 `SEED_DEMO=true` 之後在 UI 自己建寶寶也可以。

## 測試

```bash
# 建立測試資料庫 (一次性)
docker exec baby-postgres psql -U baby -d postgres -c "CREATE DATABASE baby_weaning_test;"
DATABASE_URL="postgresql://baby:baby_dev@localhost:5432/baby_weaning_test?schema=public" \
  pnpm --filter @baby/api prisma migrate deploy

# API: Jest + supertest（80+ 測試, 含 csv import）
pnpm --filter @baby/api test

# 覆蓋率（target ≥ 80% lines/functions）
pnpm --filter @baby/api exec jest --runInBand --coverage

# Web: Vitest + Testing Library (元件 + store)
pnpm --filter @baby/web test

# E2E: Playwright (需 api + web 同時跑著)
pnpm --filter @baby/web exec playwright install --with-deps   # 首次
pnpm --filter @baby/web test:e2e
```

## Lighthouse

`pnpm --filter @baby/web build && pnpm --filter @baby/web preview` 啟動 preview 後：

```bash
npx lighthouse http://localhost:4173 --preset=desktop --view
# 或 mobile:
npx lighthouse http://localhost:4173 --view
```

目標 ≥ 90 Performance / Accessibility / Best Practices。

## 部署 (Single-host with Docker)

```bash
# 1. 建 web 靜態 → apps/web/dist/
pnpm --filter @baby/web build

# 2. 設 .env 給 prod (用強密碼)
echo 'POSTGRES_PASSWORD=請改我' > .env
echo 'PUBLIC_ORIGIN=http://localhost' >> .env

# 3. 起 stack: postgres + api + caddy
docker compose -f docker-compose.prod.yml up -d --build

# 4. Migrate + (選擇性) seed
docker compose -f docker-compose.prod.yml exec api \
  node ./node_modules/prisma/build/index.js migrate deploy
docker compose -f docker-compose.prod.yml exec -e SEED_DEMO=true api \
  node ./node_modules/tsx/dist/cli.mjs prisma/seed.ts
```

打開 <http://localhost>，API 在 `/api/v1/...`，web 在 `/`。要上 HTTPS：把 `Caddyfile`
的 `:80` 換成你的網域（如 `babyapp.example.com`），Caddy 會自動申請憑證。

## 目錄結構

```
.
├── apps/
│   ├── api/                 # Node + Express + Prisma 後端
│   │   ├── Dockerfile
│   │   ├── prisma/seed/     # foods / achievements / demo
│   │   └── src/modules/     # babies, foods, feedings, csv-import, trials, achievements, dashboard
│   └── web/                 # React + Vite 前端
│       ├── e2e/             # Playwright
│       ├── src/components/  # layout / common / baby / feeding / achievement
│       ├── src/pages/       # Home / Babies / Foods / History / Achievements / Import / Settings
│       └── tests/           # Vitest
├── packages/
│   └── shared-types/        # 共用型別 placeholder
├── openspec/
│   └── changes/init-baby-weaning-tracker/   # 規格與任務追蹤
├── .github/workflows/ci.yml
├── Caddyfile
├── docker-compose.yml       # dev: postgres + adminer
├── docker-compose.prod.yml  # prod: postgres + api + caddy
└── pnpm-workspace.yaml
```

## 開發流程

1. 看 [openspec/changes/.../tasks.md](openspec/changes/init-baby-weaning-tracker/tasks.md) 找下一個 task
2. 動工
3. 把 task 從 `[ ]` 改成 `[x]`
4. `pnpm --filter @baby/api typecheck test && pnpm --filter @baby/web typecheck test`
5. commit（commitlint + husky 會擋掉 `feat:` 之外的格式）
6. push → CI 跑 `.github/workflows/ci.yml`：api / web / openspec validate

## 規格

- [proposal.md](openspec/changes/init-baby-weaning-tracker/proposal.md)
- [design.md](openspec/changes/init-baby-weaning-tracker/design.md)
- [openapi.yaml](openspec/changes/init-baby-weaning-tracker/openapi.yaml)
- [component-architecture.md](openspec/changes/init-baby-weaning-tracker/component-architecture.md)
- [tasks.md](openspec/changes/init-baby-weaning-tracker/tasks.md)
- [specs/](openspec/changes/init-baby-weaning-tracker/specs/) — 7 個 capability spec
