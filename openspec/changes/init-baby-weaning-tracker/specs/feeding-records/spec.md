## ADDED Requirements

### Requirement: 餵食紀錄為不可變事件流

系統 SHALL 將每次餵食記為一筆 FeedingRecord，包含 `babyId`、`foodId`、`fedAt` (timestamptz)、`amountMl`、`attemptCount`、`reaction`、`note?`。

#### Scenario: 建立紀錄
- **WHEN** 使用者 `POST /api/v1/babies/{babyId}/feedings` 含 `foodId`、`fedAt`、`amountMl`，未指定 `reaction`
- **THEN** 系統回應 `201 Created`，預設 `reaction = NONE`，`attemptCount` 自動編號

#### Scenario: 建立紀錄並標示過敏
- **WHEN** 使用者 `POST /api/v1/babies/{babyId}/feedings` 含 `reaction = "MILD"` 與 `note = "輕微紅疹"`
- **THEN** 系統回應 `201 Created`，紀錄保留 `reaction` 與 `note`

### Requirement: 每次餵食自動編號 attemptCount

系統 SHALL 在建立 FeedingRecord 時自動計算 `attemptCount = COUNT(*) + 1`，計算範圍為相同 `(babyId, foodId)` 的既有紀錄數。

#### Scenario: 首次嘗試
- **GIVEN** 寶寶 B 從未對食材 F 留下任何 FeedingRecord
- **WHEN** 使用者 `POST /api/v1/babies/{B}/feedings` 食用食材 F
- **THEN** 新建紀錄 `attemptCount = 1`

#### Scenario: 第三次嘗試
- **GIVEN** 寶寶 B 已有 2 筆食材 F 的 FeedingRecord
- **WHEN** 使用者 `POST /api/v1/babies/{B}/feedings` 再次紀錄食材 F
- **THEN** 新建紀錄 `attemptCount = 3`

### Requirement: 唯一鍵衝突回 409

系統 SHALL 對 `(babyId, foodId, fedAt)` 強制唯一，重複時拒絕。

#### Scenario: 同寶寶同食材同時間
- **GIVEN** 已有紀錄 `(B, F, 2026-05-26T11:30:00+08:00)`
- **WHEN** 使用者再次 `POST` 完全相同的三元組
- **THEN** 系統回應 `409 Conflict` 與 problem+json，前端 UI 顯示「已有同時間紀錄」提示

### Requirement: 餵食紀錄欄位驗證

系統 SHALL 對輸入欄位執行驗證。

#### Scenario: amountMl 範圍
- **WHEN** 使用者 `POST` 含 `amountMl = 0` 或 `> 1000`
- **THEN** 系統回應 `422` 與 `errors[].path = "amountMl"`

#### Scenario: note 過長
- **WHEN** 使用者 `POST` 含 `note` 超過 500 字
- **THEN** 系統回應 `422`

#### Scenario: foodId 不存在
- **WHEN** 使用者 `POST` 含 `foodId` 不存在於 food_item 表
- **THEN** 系統回應 `422` 與 `errors[].path = "foodId"`

### Requirement: 列表查詢支援週/月視圖與篩選

系統 SHALL 支援以 `view=week|month`、`from`、`to`、`foodId`、`reaction` 過濾。

#### Scenario: 週視圖
- **WHEN** 使用者 `GET /api/v1/babies/{babyId}/feedings?view=week`
- **THEN** 系統將 `from` / `to` 自動套用為當週週一 00:00 至週日 23:59:59 並回應該區間內的紀錄

#### Scenario: 月視圖
- **WHEN** 使用者 `GET /api/v1/babies/{babyId}/feedings?view=month`
- **THEN** 系統將 `from` / `to` 自動套用為當月 1 號 00:00 至月底 23:59:59

#### Scenario: 自訂時間區間
- **WHEN** 使用者 `GET /api/v1/babies/{babyId}/feedings?from=2026-05-01T00:00:00%2B08:00&to=2026-05-15T23:59:59%2B08:00`
- **THEN** 系統回應該區間紀錄

#### Scenario: 按食材篩選
- **WHEN** 使用者 `GET /api/v1/babies/{babyId}/feedings?foodId={F}`
- **THEN** 系統只回應寶寶對食材 F 的紀錄

### Requirement: 餵食紀錄 CRUD

系統 SHALL 支援單筆紀錄查詢、修改、刪除。

#### Scenario: 修改紀錄
- **WHEN** 使用者 `PATCH /api/v1/babies/{babyId}/feedings/{feedingId}` 修改 `amountMl`
- **THEN** 系統回應 `200 OK`，且觸發試敏狀態與徽章重新評估

#### Scenario: 刪除紀錄
- **WHEN** 使用者 `DELETE /api/v1/babies/{babyId}/feedings/{feedingId}`
- **THEN** 系統回應 `204 No Content`，且觸發試敏狀態與徽章重新評估

### Requirement: 寫入後刷新衍生資料

系統 SHALL 在 FeedingRecord 建立、修改、刪除後同步刷新試敏狀態 (materialized view) 與評估徽章。

#### Scenario: 建立後回應含解鎖徽章
- **GIVEN** 寶寶 B 對食材 F 已有 2 筆 NONE 紀錄；存在徽章 `UNLOCK_5_VEG`，B 目前已解鎖 4 個 VEGETABLE
- **WHEN** 使用者 `POST` 第 3 筆 F (F 屬 VEGETABLE，且 NONE)
- **THEN** 回應 `201 Created` 的 `newlyUnlockedAchievements` 陣列包含 `UNLOCK_5_VEG` 徽章

#### Scenario: 刪除後狀態回滾
- **GIVEN** 寶寶 B 對食材 F 有 3 筆 NONE 紀錄 → `baby_food_trial.status = UNLOCKED`
- **WHEN** 使用者刪除其中 1 筆
- **THEN** materialized view 刷新後 `(B, F).status = TRYING`
