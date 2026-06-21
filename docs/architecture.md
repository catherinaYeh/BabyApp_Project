# 系統架構圖

> 搭配 [tech-share.md](./tech-share.md) / [tech-share-slides.md](./tech-share-slides.md) 使用。
> 下方提供 Mermaid（GitHub / VS Code 可直接渲染）與純文字 ASCII 兩版。

---

## 1. 整體架構（Mermaid）

```mermaid
flowchart TB
    subgraph Client["🧑‍💻 使用者瀏覽器"]
        UI["React 18 + Vite UI<br/>(pages / components)"]
        RQ["TanStack Query<br/>(資料快取/同步)"]
        ZU["Zustand<br/>(UI 狀態: 選取寶寶 / 主題)"]
        LS["LocalStorage<br/>(僅存 UI 狀態)"]
        UI --> RQ
        UI --> ZU
        ZU -.持久化 UI 狀態.-> LS
    end

    subgraph Vercel["☁️ Vercel(前端靜態站)"]
        Static["build 後的靜態檔"]
    end

    subgraph Render["☁️ Render(後端 Docker)"]
        API["Express REST API v1"]
        SVC["Service 層<br/>babies / foods / feedings…"]
        PRISMA["Prisma Client (ORM)"]
        API --> SVC --> PRISMA
    end

    subgraph Supabase["☁️ Supabase(託管 PostgreSQL)"]
        POOL["Supavisor 連線池"]
        PG[("PostgreSQL 15<br/>Baby / FoodItem / FeedingRecord …")]
        POOL --> PG
    end

    RQ -->|"REST / JSON<br/>(非同步)"| API
    PRISMA -->|"runtime 查詢<br/>transaction pooler :6543"| POOL
    PRISMA -.->|"migrate / seed<br/>session pooler :5432"| PG

    Static -.serve.-> UI
```

**讀圖三個重點**

1. **解耦**:UI 不直接碰資料 → 一律走 `react-query → REST API → service → Prisma → DB`。換 DB(Render→Supabase)前端完全不動。
2. **LocalStorage 只存 UI 狀態**(選哪隻寶寶、佈景主題),領域資料一律在雲端 Postgres。
3. **兩條 DB 連線**:runtime 查詢走連線池(6543);migration/seed 走直連(5432,Prisma 引擎不支援經 pooler 跑)。

---

## 2. 純文字版(投影片 / 終端機用)

```text
┌─────────────────── 使用者瀏覽器 ───────────────────┐
│  React UI ──► TanStack Query ─┐                     │
│     │                          │ REST / JSON(非同步)│
│     └──► Zustand ──► LocalStorage(僅 UI 狀態)       │
└────────────────────────────────┼───────────────────┘
                                  │
                                  ▼
                    ┌──────── Render(Docker)────────┐
                    │  Express API v1                │
                    │     └► Service 層              │
                    │          └► Prisma (ORM)       │
                    └──────┬──────────────────┬──────┘
        runtime 查詢       │                  │  migrate / seed
        pooler :6543       ▼                  ▼  直連 :5432
                    ┌──────── Supabase ─────────────┐
                    │  Supavisor 連線池             │
                    │     └► PostgreSQL 15          │
                    │        Baby / FoodItem /      │
                    │        FeedingRecord …        │
                    └───────────────────────────────┘

前端部署:Vercel(靜態站)    後端部署:Render(Docker)
```

---

## 3. 資料模型(核心三表)

```mermaid
erDiagram
    Baby ||--o{ FeedingRecord : "一對多"
    FoodItem ||--o{ FeedingRecord : "一對多"

    Baby {
        string id PK
        string name
        date   birthday
        string avatarColor
    }
    FoodItem {
        string  id PK
        string  name "唯一"
        string  category
        string  allergyLevel
        boolean isSystem "系統內建唯讀"
    }
    FeedingRecord {
        string   id PK
        string   babyId FK
        string   foodId FK
        datetime fedAt
        int      attemptCount
        string   reaction
    }
```

**規則重點**:刪寶寶 → 連帶刪其餵食紀錄;食物仍被引用則不可刪;同寶寶/食物/時間維持唯一鍵。
