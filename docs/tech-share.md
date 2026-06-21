# 寶寶副食品試敏小遊戲 — 技術分享 Demo

> Mobile-first Web App，把寶寶副食品「試敏」過程遊戲化（圖鑑解鎖 / 徽章 / 進度條）。
> 本篇為 demo 分享用的精簡技術整理。

---

## 1. 使用的技術

| 層面         | 技術                                                                                                            |
| ------------ | --------------------------------------------------------------------------------------------------------------- |
| **前端**     | React 18 · Vite · TypeScript 5 · TanStack Query（資料同步/快取）· Zustand（UI 狀態）· React Router 6 · Tailwind |
| **後端**     | Node 20 · Express 4 · Prisma 5（ORM）· Zod（驗證）· Pino（log）· Swagger UI                                     |
| **資料庫**   | PostgreSQL 15 → **Supabase 託管 Postgres**（含 Supavisor 連線池）                                               |
| **Monorepo** | pnpm workspaces · Turborepo（`apps/api` + `apps/web` + `packages/shared-types`）                                |
| **測試**     | Jest + supertest（API）· Vitest + Testing Library（Web）· Playwright（E2E）                                     |
| **部署**     | 後端 Render（Docker）· 前端 Vercel（靜態站）· 本機 docker-compose                                               |
| **規格驅動** | **OpenSpec**（初版建置）+ **GitHub Spec Kit**（Supabase 遷移）                                                  |
| **工程治理** | ESLint · Prettier · Husky + commitlint · GitHub Actions CI                                                      |

**一句話架構**：前端透過 REST API（react-query）打後端 → 後端用 Prisma 操作 Postgres。
資料存取全部封裝在 service / API 層，UI 不直接碰資料來源（這是專案「憲章」的硬性要求）。

---

## 2. OpenSpec vs Spec Kit（兩個 spec-driven 工具）

兩者都是「**先寫規格、再寫程式**」的 spec-driven development 工具，但顆粒度與流程不同。
本專案剛好兩個都用過，可以直接對比：

| 面向       | **OpenSpec**                                                 | **GitHub Spec Kit**                                                                                 |
| ---------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| 核心單位   | **change（一次變更）**                                       | **feature（一個功能分支）**                                                                         |
| 組織方式   | 依「能力(capability)」切 spec：`babies / foods / feedings…`  | 依「編號功能」：`specs/001-xxx/`                                                                    |
| 產出檔案   | `proposal.md` · `design.md` · `specs/*/spec.md` · `tasks.md` | `spec.md` · `plan.md` · `tasks.md` · `research.md` · `data-model.md` · `contracts/` · `checklists/` |
| 流程階段   | 較**輕**：一步到位產生提案                                   | 較**重**：多階段 + 有「憲章(constitution)」閘門                                                     |
| 強項       | 快速、greenfield 初始化、能力導向好維護                      | 嚴謹、適合對既有系統做受控變更、可做交叉一致性分析                                                  |
| 本專案用途 | 從零打造整個 App（`init-baby-weaning-tracker`）              | Supabase 資料庫遷移（`001-supabase-migration`）                                                     |

### OpenSpec 流程（本專案的初版建置）

```
explore  →  propose  →  apply  →  archive
(探索想法)  (一步生出     (依 tasks   (完工後
            提案+設計+    逐項實作)    歸檔變更)
            spec+tasks)
```

- 一個 `change/` 資料夾就是一次完整變更，內含「為什麼(proposal)、怎麼設計(design)、規格(specs)、待辦(tasks)」。
- spec 按**能力**拆分（babies / food-catalog / feeding-records / trial-tracking / csv-import / achievements / dashboard），各自獨立、好讀好維護。
- 適合「我要做一個新東西」，從零開到能跑。

### Spec Kit 流程（本專案的 Supabase 遷移）

```
constitution → specify → clarify → plan → tasks → analyze → implement
(訂專案憲章)  (寫規格)  (釐清模糊)(技術計畫)(拆任務)(一致性  (執行)
                                                    檢查)
```

- 多了 **constitution（憲章）** 這層：先訂死不可違反的原則（本專案是「不可改變現有 UI、資料存取需解耦」），每個 plan 都要過憲章閘門檢查。
- `clarify` 會主動針對模糊處發問再寫回 spec；`analyze` 會跨 `spec / plan / tasks` 做一致性稽核。
- 產物更細（多了 research、data-model、contracts、checklists），適合「對既有系統做受控、需被審查的變更」。

### 最大差別一句話

> **OpenSpec 輕、change/capability 導向，適合從零快速開新功能；
> Spec Kit 重、feature/憲章導向、多了釐清與一致性稽核，適合對現有系統做嚴謹受控的變更。**

---

## 3. 為什麼從 PostgreSQL 搬到 Supabase

> 釐清一下：這個 App 的領域資料**一開始就用 Prisma 存在 PostgreSQL**（不是 LocalStorage；LocalStorage 只存「選哪隻寶寶、佈景主題」這類 UI 狀態）。
> 所以這次遷移是 **Render 託管的免費 Postgres → Supabase 託管的 Postgres**——同樣是 PostgreSQL，換的是「託管的地方」。

### Render 免費 Postgres vs Supabase 託管 Postgres 的差異

|          | **Render 免費 Postgres（原本）**                                | **Supabase 託管 Postgres（搬過去）**                   |
| -------- | --------------------------------------------------------------- | ------------------------------------------------------ |
| 存活期限 | 免費方案**約 30 天到期**，到期資料會被砍                        | 免費方案長期可用，不會 30 天歸零                       |
| 連線池   | 無內建 pooler，serverless / 重啟易**連線耗盡**                  | 內建 **Supavisor 連線池**，撐得住短連線爆量            |
| 管理介面 | 較陽春                                                          | 完整 Dashboard：資料表瀏覽、SQL 編輯器、備份           |
| 擴充性   | 僅資料庫                                                        | 同平台還有 Auth / Storage / Realtime，未來要加帳號好接 |
| 兩者共通 | 都是標準 PostgreSQL → **Prisma schema、資料模型、API 全不用改** |                                                        |

**核心動機**：原本 Render 的免費 Postgres **約 30 天就到期**，資料會遺失——對「長期累積、不能掉」的試敏紀錄是致命傷。換到 Supabase 後資料**長期持久保存**、有**連線池**扛住重啟、還有 Dashboard 可備份與排查，而且因為兩邊都是 PostgreSQL，**前後端程式幾乎不動**就能搬。

### 搬遷時的小插曲（demo 時值得一提的「真相」）

- 原始需求文件寫的是「從 **LocalStorage** 搬到 Supabase」。
- 但用 Spec Kit 的 **clarify** 階段一看程式碼就發現：**領域資料根本不在 LocalStorage**，
  早就在後端 PostgreSQL 裡了；於是把需求**修正為 PostgreSQL → Supabase**，才開始動工。

> 這正好凸顯 spec-driven 的價值：**先釐清、再動工**，避免照著錯誤假設亂改一通。

### 遷移的關鍵技術點

- Prisma 的 `datasource` 加 `directUrl`，把連線分兩條：
  - **Runtime 查詢** 走 transaction pooler（**port 6543**，連線池避免 serverless 重啟時連線耗盡）
  - **Migration** 走 session pooler / 直連（**port 5432**，因為 Prisma migration 引擎不支援經 pooler 跑）
- 用 `prisma migrate deploy` 把既有 migration 套到 Supabase，再 `db:seed` 灌入系統食物與徽章。
- 連線字串全用環境變數（`DATABASE_URL` / `DIRECT_URL`），不硬編、各環境可注入。
- 順手補齊前端錯誤處理缺口（部分頁面只處理 loading、缺 error 與重試）。

---

## Demo 收尾 takeaway

1. **技術選型**：TypeScript 全棧 + Prisma + Postgres，monorepo 一致管理。
2. **流程**：兩套 spec-driven 工具實戰對比 — OpenSpec 開新功能、Spec Kit 做受控遷移。
3. **遷移**：免費 Postgres 會到期、無連線池；搬到 **Supabase 同樣是 PostgreSQL** → 程式不動就換到長期、有 pooler、可備份的託管環境。動工前先用 clarify 對齊現況，省下白工。
