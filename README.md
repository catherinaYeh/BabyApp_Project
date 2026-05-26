# Baby Weaning Gamified Tracker (寶寶副食品試敏小遊戲)

Mobile-first Web App，記錄並追蹤寶寶副食品試敏歷程。詳細規格見 [openspec/changes/init-baby-weaning-tracker/](openspec/changes/init-baby-weaning-tracker/)。

## 技術棧

| 層       | 工具                                                                                   |
| -------- | -------------------------------------------------------------------------------------- |
| Backend  | Node 20 · Express 4 · Prisma 5 · PostgreSQL 15 · Zod · Pino                            |
| Frontend | React 18 · Vite · TanStack Query · Zustand · Tailwind · shadcn/ui (尚未 bootstrapping) |
| Monorepo | pnpm workspaces · Turborepo · TypeScript 5                                             |
| Spec     | OpenSpec (spec-driven schema)                                                          |

## 前置需求

- Node.js ≥ 20.18.0
- pnpm 9
- Docker Desktop (跑 PostgreSQL)

> 本機 Node 20 安裝在 `~/.local/nodejs-20/`（非 brew）。請在 shell 設定 `PATH="$HOME/.local/nodejs-20/bin:$PATH"`，或用 nvm/asdf 切換。

## 起手式

```bash
# 1. 安裝套件
pnpm install

# 2. 啟動 PostgreSQL + Adminer
docker compose up -d

# 3. 套用 migrations + 產生 Prisma Client
cd apps/api
cp .env.example .env          # 第一次而已
pnpm prisma migrate deploy
pnpm prisma generate

# 4. 啟動 API
pnpm dev                      # http://localhost:3000
```

開啟 [http://localhost:3000/healthz](http://localhost:3000/healthz) 驗證、API 文件在 [http://localhost:3000/api/v1/docs/](http://localhost:3000/api/v1/docs/)，Adminer 在 [http://localhost:8080](http://localhost:8080)。

## 測試

```bash
# 建立測試資料庫 (一次性)
docker exec baby-postgres psql -U baby -d postgres -c "CREATE DATABASE baby_weaning_test;"
DATABASE_URL="postgresql://baby:baby_dev@localhost:5432/baby_weaning_test?schema=public" pnpm --filter @baby/api prisma migrate deploy

# 跑測試
pnpm --filter @baby/api test
```

## 目錄結構

```
.
├── apps/
│   ├── api/                 # Node + Express + Prisma 後端
│   └── web/                 # React 前端（待 Phase 10 起手）
├── packages/
│   └── shared-types/        # 共用型別（之後從 openapi.yaml 產出）
├── openspec/
│   └── changes/init-baby-weaning-tracker/   # 規格與任務追蹤
├── docker-compose.yml
├── package.json             # workspace root
├── pnpm-workspace.yaml
└── turbo.json
```

## 開發流程

1. 看 [tasks.md](openspec/changes/init-baby-weaning-tracker/tasks.md) 找下一個 task
2. 動工
3. 把 task 從 `[ ]` 改成 `[x]`
4. `pnpm --filter @baby/api typecheck && pnpm --filter @baby/api test`
5. commit (commitlint 會擋格式錯誤的訊息)

完整 capability spec 在 [openspec/changes/init-baby-weaning-tracker/specs/](openspec/changes/init-baby-weaning-tracker/specs/)。
