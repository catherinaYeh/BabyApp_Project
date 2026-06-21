# 技術分享 — 投影片大綱

> 搭配 [tech-share.md](./tech-share.md) 使用。每個 `##` 是一張投影片,內文是講者該講的條列重點。
> 預估 10–12 分鐘,約 11 張。

---

## 1 — 封面

**寶寶副食品試敏小遊戲**
把「副食品試敏」過程遊戲化的 Mobile-first Web App
（圖鑑解鎖 / 徽章 / 進度條）

- 講者 / 日期
- 一句話:全棧 TypeScript + spec-driven 開發實戰

---

## 2 — 這是什麼 App(1 張帶過)

- 新手爸媽記錄寶寶吃了什麼、有沒有過敏反應
- 痛點:市面 App 偏流水帳 → 容易中斷
- 解法:**遊戲化**(食材圖鑑解鎖、徽章、進度條)讓人願意持續記錄
- 支援多寶寶切換

---

## 3 — 技術全貌

| 層   | 技術                                                  |
| ---- | ----------------------------------------------------- |
| 前端 | React 18 · Vite · TanStack Query · Zustand · Tailwind |
| 後端 | Node 20 · Express · Prisma · Zod · Pino               |
| DB   | PostgreSQL → **Supabase**                             |
| 工程 | pnpm + Turborepo monorepo · TS 5                      |
| 測試 | Jest · Vitest · Playwright                            |
| 部署 | Render(API)· Vercel(Web)                              |

> 一句話:**前端 →(REST/react-query)→ 後端 →(Prisma)→ Postgres**,資料存取全封裝。

---

## 4 — 架構圖

（放 [architecture.md](./architecture.md) 的圖）

- 重點 1:UI 不直接碰資料來源 → 全走 API / service 層
- 重點 2:這個「解耦」是專案憲章硬性要求 → 換 DB 不動前端

---

## 5 — 開發方法:spec-driven(先寫規格再寫扣)

- 不是想到哪寫到哪 → **先把「要做什麼、怎麼設計、拆成哪些任務」寫清楚**
- 本專案用了**兩套** spec-driven 工具,剛好可以對比:
  - **OpenSpec** → 從零打造初版
  - **GitHub Spec Kit** → 做 Supabase 遷移
- 下面兩張分別講

---

## 6 — OpenSpec(初版建置)

**特性:輕量、change/能力導向**

```
explore → propose → apply → archive
探索      一步生出   逐項實作   完工歸檔
          提案+設計
          +spec+tasks
```

- 一個 `change/` 資料夾 = 一次完整變更
- spec 按**能力**拆:babies / foods / feedings / achievements…
- 👍 適合「我要從零開一個新東西」

---

## 7 — Spec Kit(Supabase 遷移)

**特性:嚴謹、feature/憲章導向**

```
constitution → specify → clarify → plan → tasks → analyze → implement
訂憲章         寫規格    釐清模糊  技術計畫 拆任務  一致性稽核 執行
```

- 多了 **憲章閘門**:訂死不可違反原則(不可改 UI、需解耦),每個計畫都要過
- **clarify** 主動發問、**analyze** 跨 spec/plan/tasks 對齊
- 👍 適合「對既有系統做受控、需審查的變更」

---

## 8 — 兩者差別一句話

> **OpenSpec 輕、開新功能快;**
> **Spec Kit 重、做受控變更穩。**

|      | OpenSpec     | Spec Kit        |
| ---- | ------------ | --------------- |
| 單位 | change       | feature         |
| 流程 | 輕(一步成案) | 重(多階段+憲章) |
| 強項 | greenfield   | 受控變更/稽核   |

---

## 9 — 為什麼搬到 Supabase(PostgreSQL → Supabase)

> 資料一直都在 **PostgreSQL**(不是 LocalStorage),這次是換「託管的地方」。

|        | Render 免費 Postgres               | Supabase 託管 Postgres |
| ------ | ---------------------------------- | ---------------------- |
| 期限   | **約 30 天到期**、資料會砍         | 長期可用               |
| 連線池 | 無、易連線耗盡                     | 內建 **Supavisor**     |
| 管理   | 陽春                               | Dashboard / SQL / 備份 |
| 共通   | 都是標準 Postgres → **程式不用改** |                        |

> 都是 PostgreSQL → Prisma schema / 資料模型 / API 全不動就能搬。

---

## 10 — 本案的反轉(demo 亮點 🎬)

- 需求文件寫:「把資料從 **LocalStorage** 搬到 Supabase」
- Spec Kit 的 **clarify** 一看程式碼 → **資料根本不在 LocalStorage**!
  - 早就用 Prisma 存在 PostgreSQL,LocalStorage 只存 UI 狀態(選哪隻寶寶、主題)
- 於是把需求**修正為 PostgreSQL → Supabase** 才動工
  - 動機:Render 免費 Postgres **快到期**、想要連線池與可備份
- 技術重點:Prisma `directUrl` 把連線分兩條
  - runtime 走連線池(6543)、migration 走直連(5432)

> 💡 教訓:**先釐清現況、再動工**,省下照錯誤假設亂改的白工。

---

## 11 — Takeaway

1. **選型**:全棧 TypeScript + Prisma + Postgres,monorepo 統一管理
2. **流程**:兩套 spec-driven 工具實戰 — OpenSpec 開新功能、Spec Kit 做受控遷移
3. **遷移**:PostgreSQL → Supabase,因同為 Postgres 程式不動就換到不會到期、有連線池的環境;動工前先 clarify 對齊現況

**Q & A**
