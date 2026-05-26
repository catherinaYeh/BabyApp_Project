## ADDED Requirements

### Requirement: 多寶寶檔案 CRUD

系統 SHALL 支援多個寶寶檔案的建立、查詢、更新與刪除，每個寶寶有唯一 ID、姓名、出生日期、avatar 色彩。

#### Scenario: 建立寶寶
- **WHEN** 使用者送出 `POST /api/v1/babies` 含有效 `name` (1–30 字) 與 `birthDate` (ISO date)
- **THEN** 系統回應 `201 Created` 與該寶寶的完整資料，包含自動產生的 `id` (UUID)、預設 `avatarColor`、`createdAt`、`updatedAt`

#### Scenario: 列出寶寶
- **WHEN** 使用者送出 `GET /api/v1/babies`
- **THEN** 系統回應 `200 OK` 與 `data: Baby[]` 陣列以及 `meta.nextCursor` 分頁資訊

#### Scenario: 取得單一寶寶
- **WHEN** 使用者送出 `GET /api/v1/babies/{babyId}` 且該 ID 存在
- **THEN** 系統回應 `200 OK` 與該寶寶完整資料

#### Scenario: 寶寶不存在
- **WHEN** 使用者送出 `GET /api/v1/babies/{babyId}` 且該 ID 不存在
- **THEN** 系統回應 `404 Not Found` 與 RFC 7807 problem+json

#### Scenario: 更新寶寶
- **WHEN** 使用者送出 `PATCH /api/v1/babies/{babyId}` 含部分欄位
- **THEN** 系統回應 `200 OK` 與更新後的寶寶資料，且 `updatedAt` 已刷新

#### Scenario: 刪除寶寶會 cascade 刪除餵食紀錄
- **WHEN** 使用者送出 `DELETE /api/v1/babies/{babyId}` 且該寶寶有 FeedingRecord 與 AchievementUnlock
- **THEN** 系統回應 `204 No Content`，且所有該寶寶的 FeedingRecord 與 AchievementUnlock 一併刪除

### Requirement: 月齡動態推算

系統 SHALL 從 `birthDate` 動態推算寶寶當下月齡 (整數月)，不另存欄位避免不一致。

#### Scenario: 整月齡
- **GIVEN** 寶寶出生日為 `2025-11-15`
- **WHEN** 在 `2026-05-26` 取得該寶寶資料
- **THEN** 回應的 `ageMonth = 6` (因為 2026-05-15 滿 6 月，2026-05-26 已過該日)

#### Scenario: 尚未滿月
- **GIVEN** 寶寶出生日為 `2026-05-20`
- **WHEN** 在 `2026-05-26` 取得該寶寶資料
- **THEN** 回應的 `ageMonth = 0`

#### Scenario: 跨年計算
- **GIVEN** 寶寶出生日為 `2025-03-10`
- **WHEN** 在 `2026-05-26` 取得該寶寶資料
- **THEN** 回應的 `ageMonth = 14`

### Requirement: 寶寶欄位驗證

系統 SHALL 對寶寶輸入欄位執行驗證，違反回 `422 Unprocessable Entity`。

#### Scenario: 姓名過長
- **WHEN** 使用者建立寶寶 `name` 超過 30 字
- **THEN** 系統回應 `422` 與 `errors[].path = "name"`、`message` 描述長度限制

#### Scenario: 姓名空白
- **WHEN** 使用者建立寶寶 `name` 為空字串
- **THEN** 系統回應 `422` 與相應 errors

#### Scenario: avatarColor 格式錯誤
- **WHEN** 使用者建立寶寶 `avatarColor = "red"` (非 `#RRGGBB`)
- **THEN** 系統回應 `422` 與 `errors[].path = "avatarColor"`

#### Scenario: birthDate 為未來日
- **WHEN** 使用者建立寶寶 `birthDate` 晚於今天
- **THEN** 系統回應 `422` 與 `errors[].message` 說明 birthDate 不能為未來

### Requirement: 寶寶為其他資源的 scope 根

系統 SHALL 將 FeedingRecord、AchievementUnlock 以 `babyId` 為頂層 scope，跨寶寶資源完全隔離。

#### Scenario: 切換寶寶後資源隔離
- **GIVEN** 寶寶 A 有 5 筆 FeedingRecord、寶寶 B 有 3 筆
- **WHEN** 客戶端呼叫 `GET /api/v1/babies/{B.id}/feedings`
- **THEN** 回應只包含寶寶 B 的 3 筆，不包含 A 的任何紀錄
