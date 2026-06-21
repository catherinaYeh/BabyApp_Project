---
marp: true
title: 寶寶副食品試敏小遊戲 — 技術分享
author: Catherina
paginate: true
theme: uncover
class: lead
backgroundColor: #fdfcff
color: #1f2430
style: |
  section {
    font-family: -apple-system, "PingFang TC", "Microsoft JhengHei", sans-serif;
    font-size: 30px;
    padding: 60px 70px;
    text-align: left;
    justify-content: flex-start;
  }
  section.lead { text-align: center; justify-content: center; }
  h1 { color: #6b4bd6; font-size: 52px; }
  h2 { color: #6b4bd6; font-size: 40px; border-bottom: 3px solid #efeaff; padding-bottom: 10px; }
  h3 { color: #e0699a; font-size: 30px; }
  table { font-size: 24px; margin: 8px 0; }
  th { background: #6b4bd6; color: #fff; }
  tr:nth-child(even) { background: #f4f0ff; }
  code { background: #efeaff; color: #6b4bd6; padding: 1px 6px; border-radius: 4px; }
  pre { background: #1f2430; border-radius: 10px; font-size: 19px; }
  blockquote { border-left: 6px solid #e0699a; color: #555; font-size: 24px; }
  strong { color: #6b4bd6; }
  .small { font-size: 22px; }
---

<!-- _class: lead -->

# 寶寶副食品試敏小遊戲 🍼

把副食品「試敏」過程遊戲化的 Mobile-first Web App
圖鑑解鎖 · 徽章 · 進度條

<br>

**技術分享** — 全棧 TypeScript × Spec-Driven 開發實戰
Catherina · 2026

---

## 這是什麼 App?

- 新手爸媽記錄寶寶吃了什麼、有沒有過敏反應
- 😣 痛點:市面 App 偏流水帳 → 容易記到一半就放棄
- 🎮 解法:**遊戲化**(食材圖鑑解鎖、徽章、進度條)讓人願意持續記錄
- 👶👶 支援多寶寶切換

---

## 技術全貌

| 層   | 技術                                                  |
| ---- | ----------------------------------------------------- |
| 前端 | React 18 · Vite · TanStack Query · Zustand · Tailwind |
| 後端 | Node 20 · Express · Prisma · Zod · Pino               |
| DB   | PostgreSQL → **Supabase**                             |
| 工程 | pnpm + Turborepo monorepo · TS 5                      |
| 測試 | Jest · Vitest · Playwright                            |
| 部署 | Render(API) · Vercel(Web)                             |

> 前端 →(REST/react-query)→ 後端 →(Prisma)→ Postgres,**資料存取全封裝**

---

## 架構一覽

```text
┌────────── 使用者瀏覽器 ──────────┐
│ React UI ─► TanStack Query ─┐    │
│    └─► Zustand ─► LocalStorage│   │ REST/JSON(非同步)
│            (僅 UI 狀態)       │   │
└──────────────────────────────┼───┘
                               ▼
                ┌──── Render(Docker)────┐
                │ Express API ─► Service │
                │        └─► Prisma(ORM) │
                └────┬──────────────┬────┘
   runtime :6543     ▼              ▼   migrate :5432
                ┌──── Supabase PostgreSQL ────┐
                │ Supavisor 連線池 ─► PG 15    │
                │ Baby / FoodItem / Feeding…  │
                └─────────────────────────────┘
```

<span class="small">① UI 不直接碰資料(全走 API/service)　② LocalStorage 只存 UI 狀態　③ DB 兩條連線</span>

---

<!-- _class: lead -->

## 開發方法:Spec-Driven 🧭

**先把「做什麼、怎麼設計、拆成哪些任務」寫清楚,再寫程式**

本專案用了**兩套**工具,剛好可以對比 👇
OpenSpec(從零開新版) ＋ Spec Kit(做 Supabase 遷移)

---

## OpenSpec — 初版建置

**特性:輕量、change / 能力導向**

```text
explore → propose → apply → archive
 探索      一步生出    逐項實作   完工歸檔
           提案+設計+spec+tasks
```

- 一個 `change/` 資料夾 = 一次完整變更
- spec 按**能力**拆:babies / foods / feedings / achievements…
- 👍 適合「我要從零開一個新東西」

---

## Spec Kit — Supabase 遷移

**特性:嚴謹、feature / 憲章導向**

```text
constitution → specify → clarify → plan → tasks → analyze → implement
   訂憲章       寫規格    釐清模糊  技術計畫 拆任務  一致性稽核   執行
```

- 多了 **憲章閘門**:訂死不可違反原則(不可改 UI、需解耦)
- **clarify** 主動發問 · **analyze** 跨 spec/plan/tasks 對齊
- 👍 適合「對既有系統做受控、需審查的變更」

---

## 兩者差別一句話

> **OpenSpec 輕、開新功能快;**
> **Spec Kit 重、做受控變更穩。**

|      | OpenSpec          | Spec Kit         |
| ---- | ----------------- | ---------------- |
| 單位 | change            | feature          |
| 流程 | 輕(一步成案)      | 重(多階段＋憲章) |
| 強項 | greenfield 新功能 | 受控變更 / 稽核  |

---

## 為什麼搬到 Supabase?

> 資料一直都在 **PostgreSQL**(不是 LocalStorage)——這次換的是「託管的地方」

|        | Render 免費 Postgres               | Supabase 託管 Postgres |
| ------ | ---------------------------------- | ---------------------- |
| 期限   | **約 30 天到期**、資料會砍         | 長期可用               |
| 連線池 | 無、易連線耗盡                     | 內建 **Supavisor**     |
| 管理   | 陽春                               | Dashboard / SQL / 備份 |
| 共通   | 都是標準 Postgres → **程式不用改** |                        |

---

## 本案的反轉 🎬

- 需求文件寫:「把資料從 **LocalStorage** 搬到 Supabase」
- Spec Kit 的 **clarify** 一看程式碼 → **資料根本不在 LocalStorage!**
  - 早就用 Prisma 存在 PostgreSQL,LocalStorage 只存 UI 狀態
- 於是把需求**修正為 PostgreSQL → Supabase** 才動工
- 技術重點:Prisma `directUrl` 分兩條連線
  - runtime 走連線池 `6543` · migration 走直連 `5432`

> 💡 **先釐清現況、再動工**,省下照錯誤假設亂改的白工

---

<!-- _class: lead -->

## Takeaway

**1. 選型** — 全棧 TypeScript + Prisma + Postgres,monorepo 統一管理

**2. 流程** — 兩套 spec-driven:OpenSpec 開新功能 · Spec Kit 做受控遷移

**3. 遷移** — 同為 Postgres,程式不動就換到不會到期、有連線池的環境

<br>

# Q & A 🙋
