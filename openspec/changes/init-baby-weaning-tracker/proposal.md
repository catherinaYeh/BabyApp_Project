# Proposal: 寶寶副食品試敏小遊戲 (Baby Weaning Gamified Tracker)

- **Change ID**: `init-baby-weaning-tracker`
- **Status**: Proposed
- **Created**: 2026-05-18
- **Owner**: samuel325365@gmail.com

## 1. 摘要 (Summary)

打造一個 Mobile-first 的 Web App，協助新手父母以「遊戲化」方式記錄並追蹤寶寶副食品試敏歷程。系統提供食材圖鑑、餵食紀錄、試敏狀態自動推導、進度條與徽章成就，支援多寶寶切換與 CSV 批次匯入。

## 2. 動機與問題陳述 (Motivation)

- **痛點**：新手父母試敏時容易遺漏紀錄、混亂順序、不確定要由低敏先開始。
- **既有工具不足**：市面記錄類 App 多偏向流水帳，缺乏「圖鑑解鎖」「進度推進」這類能讓父母持續使用的回饋機制。
- **多寶寶情境**：兩寶以上家庭難以切換不同進度。

## 3. 目標 (Goals)

1. 父母能在 30 秒內完成單筆餵食紀錄 (US01)。
2. 首頁一目了然顯示各狀態食材數量與整體進度 (US02, US04)。
3. 系統依紀錄自動推導每個食材的試敏狀態，無需手動標記。
4. 提供低/中/高敏視覺分級，引導使用者由低敏先試。
5. 多寶寶可獨立追蹤、即時切換。
6. 允許 CSV 批次匯入歷史紀錄（衝突一律 Skip）。
7. 達成條件後自動發放徽章，提升父母持續記錄的動機。

## 4. 非目標 (Non-Goals)

- **不做使用者帳號／雲端同步**：第一版採無認證、單裝置使用，由瀏覽器透過後端 API 直接讀寫單一資料庫。
- **不做營養成分分析或熱量計算**：本版聚焦試敏紀錄，不取代營養師建議。
- **不做推播提醒／餵食排程**。
- **不做社群／分享功能**。
- **不做原生 App**：純 Web (PWA 於後續版本考慮)。
- **不做多語系**：本版僅繁體中文。

## 5. 使用者故事覆蓋表 (User Story Coverage)

| ID   | 故事              | 本提案涵蓋方式                                                                 |
| ---- | ----------------- | ------------------------------------------------------------------------------ |
| US01 | 快速紀錄          | `POST /api/v1/babies/{babyId}/feedings`，前端浮動按鈕 + 半屏表單               |
| US02 | 進度總覽          | `GET /api/v1/babies/{babyId}/dashboard`，首頁狀態統計卡片                      |
| US03 | 歷史日誌          | `GET /api/v1/babies/{babyId}/feedings?view=week|month`，行事曆視圖元件         |
| US04 | 經驗值進度        | `GET /api/v1/babies/{babyId}/progress`，環形/條狀進度元件                      |
| US05 | 徽章收集          | `GET /api/v1/babies/{babyId}/achievements`，徽章牆，伺服端條件評估後發放       |
| US06 | 基礎 CRUD         | 全資源 (Baby / FoodItem / FeedingRecord) 皆提供 CRUD endpoint                  |
| US07 | 多寶寶管理        | `Baby` 為頂層資源，前端透過 `activeBabyId` context 切換                        |
| US08 | 批次匯入          | `POST /api/v1/babies/{babyId}/feedings:import` (multipart CSV)，Skip-on-conflict |

## 6. 解決方案概觀 (Solution Overview)

- **前端**：React 18 + TypeScript + Vite，Mobile-first SPA。狀態管理採 TanStack Query（伺服端狀態）＋ Zustand（UI／active baby）。UI 組件以 Tailwind CSS + shadcn/ui 為基底，搭配自繪遊戲化元件（進度條、徽章）。
- **後端**：Node.js 20 + Express 4 + TypeScript，Prisma 5 為 ORM，PostgreSQL 15 為資料庫。Zod 做請求驗證。
- **API**：RESTful，URL 版本化 (`/api/v1`)。完整 OpenAPI 3.1 規格見 [openapi.yaml](./openapi.yaml)。
- **食材圖鑑**：Seed script 預載一份台灣常見副食品 (~80 項)，標註敏度分級。使用者可額外新增/修改自訂食材；系統食材不可刪除（僅可隱藏）。
- **試敏狀態推導**：FeedingRecord 為不可變事件流，狀態由後端依以下規則動態計算：
  - `未嘗試 (UNTRIED)` — 該寶寶對該食材無任何 FeedingRecord
  - `嘗試中 (TRYING)` — 有紀錄、未過敏、AttemptCount < 3
  - `已解鎖 (UNLOCKED)` — 連續 3 次無過敏反應且最後一次距今 ≥ 0 天
  - `過敏 (ALLERGIC)` — 任一筆紀錄標註過敏反應
- **CSV 匯入**：解析後以 `(babyId, foodId, date, time)` 為唯一鍵；既有紀錄一律 Skip，回傳 `skipped[]` 與 `imported[]` 統計。
- **徽章**：伺服端在每次 FeedingRecord 寫入後重新評估該寶寶的 Achievement 條件 (e.g. 「解鎖 10 種蔬菜」、「7M 完成 5 種高敏食材」)，新解鎖者寫入 `achievement_unlocks` 表。

## 7. 主要交付物 (Deliverables)

| 檔案                                          | 內容                                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------- |
| [design.md](./design.md)                      | 系統架構、資料模型、業務規則、技術選型理由                                      |
| [openapi.yaml](./openapi.yaml)                | 完整 OpenAPI 3.1 規格，含所有 endpoint、Schema、錯誤碼                          |
| [component-architecture.md](./component-architecture.md) | React 元件樹、路由、狀態管理、目錄結構、設計系統規範                            |
| [tasks.md](./tasks.md)                        | 實作步驟 (前端 / 後端 / 資料庫 / Seed / 測試) 拆分為可獨立完成的 chunk          |

## 8. 風險與相依 (Risks & Dependencies)

| 風險                                            | 緩解                                                          |
| ----------------------------------------------- | ------------------------------------------------------------- |
| 無認證 → API 開放，任何人可改任何寶寶資料       | 限制 CORS 來源 + 部署於私有環境；後續版本加上 Auth            |
| 食材敏度分級可能與權威建議不一致                | Seed 資料註明資料來源；設「免責聲明」頁面                     |
| CSV 欄位多樣 → 解析失敗                         | 提供標準模板下載；解析錯誤逐列回報                            |
| 試敏狀態計算成本隨紀錄增長                      | 物化視圖 (`baby_food_trial`) + Prisma 透過 trigger 維護      |

## 9. 成功指標 (Success Metrics)

- 父母可在新增 1 隻寶寶 + 10 筆餵食紀錄 + 1 次 CSV 匯入 的 happy path 全程不出錯。
- 後端 API 涵蓋率 ≥ 80% (Jest + supertest)，前端關鍵流程有 e2e (Playwright) 覆蓋。
- Lighthouse Mobile 分數 ≥ 90（Performance / Accessibility / Best Practices）。
