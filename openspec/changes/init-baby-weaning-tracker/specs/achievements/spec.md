## ADDED Requirements

### Requirement: 徽章定義使用 condition DSL

系統 SHALL 將每個 Achievement 的解鎖條件存於 `condition` (JSONB)，支援以下 type：`UNLOCK_COUNT_BY_CATEGORY`、`UNLOCK_COUNT_BY_RISK`、`FIRST_FEEDING_BY_AGE`、`TOTAL_UNLOCK`。

#### Scenario: 列出徽章定義
- **WHEN** 使用者 `GET /api/v1/achievements`
- **THEN** 系統回應 `data` 陣列含所有 Achievement，每筆有 `code`、`name`、`description`、`icon`、`condition`

#### Scenario: 不支援的 condition.type
- **GIVEN** 自訂寫入了未定義 type 的 condition
- **WHEN** AchievementEvaluator 執行
- **THEN** 系統記錄 warning log 並跳過該徽章評估，其他徽章不受影響

### Requirement: 寫入 FeedingRecord 後同步評估徽章

系統 SHALL 在 FeedingRecord 建立、修改、刪除後同步呼叫 AchievementEvaluator，並在建立 API response 中回傳該寶寶本次新解鎖的徽章。

#### Scenario: UNLOCK_COUNT_BY_CATEGORY 達成
- **GIVEN** 徽章 `UNLOCK_5_VEG` (UNLOCK_COUNT_BY_CATEGORY, VEGETABLE, 5)；寶寶 B 已解鎖 4 個 VEGETABLE 食材
- **WHEN** 寶寶 B 解鎖第 5 個 VEGETABLE 食材 (POST 第 3 筆 NONE 紀錄使其達 UNLOCKED)
- **THEN** POST response 的 `newlyUnlockedAchievements` 含 `UNLOCK_5_VEG`，且 `achievement_unlock` 表新增該紀錄

#### Scenario: UNLOCK_COUNT_BY_RISK 達成
- **GIVEN** 徽章 `UNLOCK_3_HIGH` (UNLOCK_COUNT_BY_RISK, HIGH, 3)；寶寶 B 已解鎖 2 個 HIGH 食材
- **WHEN** 寶寶 B 解鎖第 3 個 HIGH 食材
- **THEN** response 的 `newlyUnlockedAchievements` 含 `UNLOCK_3_HIGH`

#### Scenario: FIRST_FEEDING_BY_AGE 達成
- **GIVEN** 徽章 `FIRST_FEEDING_6M` (FIRST_FEEDING_BY_AGE, ageMonth=6)；寶寶 B 出生日 `2025-11-26`
- **WHEN** 寶寶 B 在 2026-05-26 (滿 6M 當日) 留下第一筆 FeedingRecord
- **THEN** response 的 `newlyUnlockedAchievements` 含 `FIRST_FEEDING_6M`

#### Scenario: TOTAL_UNLOCK 達成
- **GIVEN** 徽章 `TOTAL_UNLOCK_30` (TOTAL_UNLOCK, 30)；寶寶 B 已解鎖 29 個食材
- **WHEN** 寶寶 B 解鎖第 30 個食材
- **THEN** response 的 `newlyUnlockedAchievements` 含 `TOTAL_UNLOCK_30`

### Requirement: 不重複解鎖

系統 SHALL 對 `(babyId, achievementId)` 在 `achievement_unlock` 表強制唯一，已解鎖過的不再次出現於 `newlyUnlockedAchievements`。

#### Scenario: 重複條件不重發
- **GIVEN** 寶寶 B 已解鎖 `UNLOCK_5_VEG`
- **WHEN** 寶寶 B 解鎖第 6 個、第 7 個 VEGETABLE 食材
- **THEN** 後續 POST response 的 `newlyUnlockedAchievements` 不再包含 `UNLOCK_5_VEG`

### Requirement: 查詢寶寶徽章進度

系統 SHALL 提供 `GET /api/v1/babies/{babyId}/achievements` 回傳該寶寶對每個徽章的解鎖狀態與進度。

#### Scenario: 未解鎖徽章顯示進度
- **GIVEN** 徽章 `UNLOCK_10_VEG` 條件為解鎖 10 個 VEGETABLE；寶寶 B 已解鎖 4 個
- **WHEN** 使用者 `GET /api/v1/babies/{B}/achievements`
- **THEN** 回應包含該徽章紀錄 `{ unlocked: false, progress: { current: 4, target: 10 } }`

#### Scenario: 已解鎖徽章
- **GIVEN** 寶寶 B 已解鎖 `UNLOCK_5_VEG`
- **WHEN** 查詢
- **THEN** 該徽章紀錄 `{ unlocked: true, unlockedAt: <ISO timestamp> }`

### Requirement: 預載徽章定義 (seed)

系統 SHALL 在初始化時 seed 至少 12 個徽章定義，涵蓋各 condition type。

#### Scenario: seed 後可查
- **WHEN** 執行 `prisma db seed`
- **THEN** `achievement` 表至少有 12 筆紀錄，且至少各有 1 筆使用 UNLOCK_COUNT_BY_CATEGORY、UNLOCK_COUNT_BY_RISK、FIRST_FEEDING_BY_AGE、TOTAL_UNLOCK 四種 type
