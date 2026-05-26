## ADDED Requirements

### Requirement: 首頁總覽聚合端點

系統 SHALL 提供 `GET /api/v1/babies/{babyId}/dashboard` 一次回傳首頁所需資料：寶寶資訊、狀態計數、進度、最近解鎖、推薦食材。

#### Scenario: 一次取齊
- **WHEN** 使用者 `GET /api/v1/babies/{babyId}/dashboard`
- **THEN** 系統回應 `200 OK` 與 `{ baby, statusCounts, progress, recentUnlocks, recommendations }`，無需多次往返

#### Scenario: 寶寶不存在
- **WHEN** 使用者 `GET /api/v1/babies/{無效id}/dashboard`
- **THEN** 系統回應 `404 Not Found`

### Requirement: 狀態計數

系統 SHALL 在 dashboard response 的 `statusCounts` 含 UNTRIED / TRYING / UNLOCKED / ALLERGIC 四個欄位的數字總和。

#### Scenario: 四狀態總和等於 food_item 總數
- **GIVEN** 系統 + 使用者自訂食材共 80 筆
- **WHEN** 取得 dashboard
- **THEN** `statusCounts.UNTRIED + TRYING + UNLOCKED + ALLERGIC = 80`

#### Scenario: 初始狀態
- **GIVEN** 寶寶 B 為新建立、無任何 FeedingRecord
- **WHEN** 取得 B 的 dashboard
- **THEN** `statusCounts.UNTRIED = 80, TRYING = 0, UNLOCKED = 0, ALLERGIC = 0`

### Requirement: 試敏破關進度

系統 SHALL 提供 `progress` 結構，含 unlocked、total、percent (0–100) 與 byCategory 分組。

#### Scenario: 整體百分比
- **GIVEN** 寶寶 B 已解鎖 16 個食材，全部 food_item 共 80 個
- **WHEN** 取得 dashboard
- **THEN** `progress.unlocked = 16, total = 80, percent = 20`

#### Scenario: 分 category 進度
- **GIVEN** VEGETABLE 共 30 個，寶寶 B 已解鎖 6 個
- **WHEN** 取得 dashboard
- **THEN** `progress.byCategory` 含一筆 `{ category: "VEGETABLE", unlocked: 6, total: 30 }`

#### Scenario: progress 獨立端點
- **WHEN** 使用者 `GET /api/v1/babies/{babyId}/progress`
- **THEN** 回應與 dashboard.progress 結構一致

### Requirement: 最近解鎖徽章

系統 SHALL 在 dashboard response 的 `recentUnlocks` 提供該寶寶最近 5 個解鎖徽章 (按 unlockedAt DESC)。

#### Scenario: 取最近 5 個
- **GIVEN** 寶寶 B 解鎖 8 個徽章
- **WHEN** 取得 dashboard
- **THEN** `recentUnlocks.length = 5`，且 `unlockedAt` 由新到舊

#### Scenario: 無解鎖
- **GIVEN** 寶寶 B 無任何已解鎖徽章
- **WHEN** 取得 dashboard
- **THEN** `recentUnlocks = []`

### Requirement: 推薦食材

系統 SHALL 在 dashboard response 的 `recommendations` 提供與 `/recommendations` 端點相同邏輯的 5 個推薦。

#### Scenario: dashboard.recommendations 與獨立端點一致
- **WHEN** 使用者同時呼叫 dashboard 與 `/recommendations?limit=5`
- **THEN** 兩者 `recommendations`／`data` 內容相同 (相同食材順序)
