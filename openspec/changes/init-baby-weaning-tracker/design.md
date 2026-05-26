## Context

寶寶副食品試敏的核心痛點是「持續性」：父母需要在數個月內穩定記錄每種食材、注意敏度分級、避免重複、識別過敏徵兆。既有工具偏向流水帳，缺乏正向回饋。本 change 從零打造一個 Mobile-first Web App，採遊戲化（圖鑑解鎖 / 進度條 / 徽章）提升使用黏著。

技術上採前後端分離：Node 20 + Express + Prisma + PostgreSQL 15 為後端，React 18 + Vite + TS 為前端，REST API 契約見 [openapi.yaml](./openapi.yaml)，前端元件樹見 [component-architecture.md](./component-architecture.md)。

## Goals / Non-Goals

**Goals**:

1. 父母可在 30 秒內完成單筆餵食紀錄。
2. 首頁一目了然顯示各狀態食材數量與整體進度。
3. 系統依紀錄自動推導每個 (baby, food) 的試敏狀態，無需手動標記。
4. 視覺化區分低/中/高敏，引導使用者由低敏先試。
5. 多寶寶可獨立追蹤、即時切換。
6. 允許 CSV 批次匯入歷史紀錄（衝突一律 Skip）。
7. 達成條件後自動發放徽章，提升持續記錄動機。

**Non-Goals**:

- 不做使用者帳號／雲端同步（deferred 到 `add-email-auth-and-sync`）。
- 不做營養成分分析或熱量計算。
- 不做推播提醒／餵食排程。
- 不做社群／分享功能。
- 不做原生 App（PWA 列入後續考慮）。
- 不做多語系（本版僅繁體中文）。

## Decisions

### D1：試敏狀態為衍生欄位，存於 materialized view

PRD 的 FeedingRecord.Status (未嘗試/嘗試中/已解鎖/過敏) 是「該 baby 對該 food 的整體狀態」，不應存在單筆紀錄上。決定：

- FeedingRecord 為不可變事件流，每筆只記錄當次餵食的 `reaction` (NONE/MILD/SEVERE)。
- (Baby, Food) 整體狀態由 materialized view `baby_food_trial` 即時計算：
  - `UNTRIED`：無任何紀錄
  - `ALLERGIC`：任一筆 `reaction <> NONE`
  - `UNLOCKED`：紀錄 ≥ 3 且全部 `NONE`
  - `TRYING`：1–2 筆 `NONE`
- FeedingRecord 寫入後 async `REFRESH MATERIALIZED VIEW CONCURRENTLY baby_food_trial`。

**Trade-off**：refresh 有延遲，但寫入頻率低（每次餵食一筆），可接受。若未來嫌慢，改用 trigger 寫入 `baby_food_state` 表。

### D2：食材圖鑑 system + user 混合，用 `isSystem` flag

不分兩張表。`food_item.is_system = true` 的項目：

- 由 seed script 預載 (~80 項台灣常見副食品)
- 不可 update / delete (回 403)
- 仍可被 FeedingRecord 引用

使用者新增的 `is_system = false` 可全 CRUD。**Trade-off**：seed 資料的權威性責任在我們，需註明來源並加免責聲明頁面。

### D3：CSV 衝突採 Skip 策略

依 PRD 明定。唯一鍵 `(babyId, foodId, fedAt)`：

- 既有紀錄 → `skipped[]`
- 找不到 food name → `errors[]`
- 解析錯誤逐列獨立 try/catch，不阻止其他列
- 一次 transaction commit，全有或全無

支援 `dryRun=true` 純預覽不寫入。

### D4：徽章評估時機 — 同步於 FeedingRecord 寫入後

不採排程批次。理由：解鎖動畫即時回饋是遊戲化核心，延遲幾秒會破壞體驗。

condition DSL（JSONB 存於 `achievement.condition`）：

```json
{ "type": "UNLOCK_COUNT_BY_CATEGORY", "category": "VEGETABLE", "count": 10 }
{ "type": "UNLOCK_COUNT_BY_RISK",     "risk":     "HIGH",      "count": 5 }
{ "type": "FIRST_FEEDING_BY_AGE",     "ageMonth": 6 }
{ "type": "TOTAL_UNLOCK",             "count":    30 }
```

`AchievementEvaluator.evaluate(babyId)` 依 condition type 選資料來源：

- `UNLOCK_COUNT_*` / `TOTAL_UNLOCK` → 讀 `baby_food_trial WHERE status = 'UNLOCKED'`
- `FIRST_FEEDING_BY_AGE` → 讀 `feeding_record`，比對當時月齡

新解鎖隨 FeedingRecord 寫入 response 回前端，觸發 `BadgeUnlockToast` 彈窗。

### D5：無使用者抽象，babyId 為頂層 scope

API 路徑以 `/babies/{babyId}/...` 為主。**不**加 placeholder `userId`。理由：

- 避免假抽象，事後 migration 比保留無意義欄位乾淨
- 未來 `add-email-auth-and-sync` change 會用 migration 補上 `users` 表 + `babies.user_id` FK

### D6：API 設計原則

- 版本前綴 `/api/v1`
- 錯誤格式 RFC 7807 `application/problem+json`
- HTTP Status 標準語意 (200/201/204/400/404/409/422/500)
- 時區 ISO 8601 with offset；資料庫 `timestamptz`
- 分頁 cursor-based，`meta: { nextCursor, total }`
- CSV upload 限制 ≤ 2MB / ≤ 5000 列

## Risks / Trade-offs

| 風險 | 影響 | 緩解 |
| --- | --- | --- |
| 無認證 → API 對網路公開等於任何人可改任何寶寶資料 | 嚴重 | 第一版僅部署私有環境；CORS 限制單一前端 origin；rate limit；明確標示 V1 限制 |
| 食材敏度分級可能與官方建議不一致 | 中 | seed 資料註明來源；UI 顯示「僅供參考，過敏疑慮請諮詢醫師」 |
| materialized view refresh 卡住長交易 | 中 | 用 `REFRESH MATERIALIZED VIEW CONCURRENTLY`（前提：有 unique index，已加） |
| CSV 欄位多樣 → 解析失敗 | 中 | 提供標準模板下載；逐列回報 errors；dryRun 先預覽 |
| 試敏狀態計算成本隨紀錄增長 | 低 | 物化視圖 + index，目前資料量 < 1k 列/baby，不會慢 |
| 徽章同步評估增加 POST 延遲 | 低 | condition 數量有限（~12 個），全部評估 < 50ms |

## 主要決策表 (Decision Log 摘要)

| Decision | 採用 | 替代方案 | 為什麼 |
| --- | --- | --- | --- |
| 試敏狀態為衍生欄位 | Materialized View | 觸發器寫入 status 欄位 | 規則可能演進，view 重算簡單 |
| FeedingRecord 為事件流 | Yes，保留歷史 | 在 (baby, food) join 表直接存狀態 | 符合稽核需求，可追溯 |
| 無 user 概念 | 直接 babyId scope | 預留 placeholder userId | 避免假抽象 |
| CSV 衝突策略 | Skip on conflict | Upsert / Reject all | PRD 已明定 |
| 徽章評估時機 | 寫入後同步 | 排程批次 | 即時動畫回饋更重要 |
| 食材圖鑑 system+user | 加 `isSystem` flag | 分兩張表 | 減少 join，路徑單純 |
| PRD 的 Status 細化 | 拆成 Reaction 與衍生 TrialStatus | 在單筆紀錄存 Status | 單筆只代表當次事件，整體狀態屬 (baby, food) 對 |
