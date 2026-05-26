## ADDED Requirements

### Requirement: 試敏狀態自動推導

系統 SHALL 對每個 (baby, food) 組合動態推導 `trialStatus` 為下列其一：`UNTRIED`、`TRYING`、`UNLOCKED`、`ALLERGIC`，不存於 FeedingRecord 上。

#### Scenario: UNTRIED
- **GIVEN** 寶寶 B 對食材 F 無任何 FeedingRecord
- **WHEN** 查詢 `GET /api/v1/babies/{B}/trials`
- **THEN** 該 (B, F) 紀錄的 `status = "UNTRIED"`、`attempts = 0`、`hasReaction = false`

#### Scenario: TRYING
- **GIVEN** 寶寶 B 對食材 F 有 1 筆 `reaction = NONE` 的 FeedingRecord
- **WHEN** 查詢
- **THEN** `status = "TRYING"`、`attempts = 1`、`hasReaction = false`

#### Scenario: UNLOCKED
- **GIVEN** 寶寶 B 對食材 F 有 3 筆且全部 `reaction = NONE`
- **WHEN** 查詢
- **THEN** `status = "UNLOCKED"`、`attempts = 3`、`hasReaction = false`

#### Scenario: ALLERGIC 一旦觸發即鎖定
- **GIVEN** 寶寶 B 對食材 F 有 1 筆 `reaction = SEVERE`、之後再有 1 筆 `reaction = NONE`
- **WHEN** 查詢
- **THEN** `status = "ALLERGIC"`、`hasReaction = true` (即使後續紀錄正常)

### Requirement: 列表支援按 status / category 篩選

系統 SHALL 支援按 trial status、food category 過濾。

#### Scenario: 只列 UNTRIED
- **WHEN** 使用者 `GET /api/v1/babies/{B}/trials?status=UNTRIED`
- **THEN** 回應只含 `status = UNTRIED` 的 (B, food) 紀錄

#### Scenario: 按 category 篩選
- **WHEN** 使用者 `GET /api/v1/babies/{B}/trials?category=VEGETABLE`
- **THEN** 回應只含 VEGETABLE 食材

### Requirement: 下一個建議食材

系統 SHALL 提供 `/babies/{babyId}/recommendations` 回傳建議下一個嘗試的食材列表，優先順序為「敏度遞增 + 類別多元化」。

#### Scenario: 預設 5 個推薦
- **GIVEN** 寶寶 B 已對若干食材留下紀錄
- **WHEN** 使用者 `GET /api/v1/babies/{B}/recommendations`
- **THEN** 回應 `data` 陣列預設長度 ≤ 5，每項為 UNTRIED 食材

#### Scenario: 敏度由低至高
- **GIVEN** UNTRIED 食材含 LOW × 10、MEDIUM × 5、HIGH × 3
- **WHEN** 使用者 `GET /api/v1/babies/{B}/recommendations?limit=10`
- **THEN** 回應前面的食材 `allergyRisk` 不晚於後面 (LOW → MEDIUM → HIGH)

#### Scenario: 類別多元化
- **GIVEN** UNTRIED 食材含 VEGETABLE × 8 LOW
- **WHEN** 使用者 `GET /api/v1/babies/{B}/recommendations?limit=5`
- **THEN** 系統回應中同一 category 至多 2 個，其他名額讓給其他 category（即使敏度較高）

#### Scenario: 全部嘗試完
- **GIVEN** 寶寶 B 對所有食材都不是 UNTRIED
- **WHEN** 使用者 `GET /api/v1/babies/{B}/recommendations`
- **THEN** 回應 `data` 為空陣列，且 HTTP 200

### Requirement: 試敏狀態查詢效能

系統 SHALL 透過 materialized view `baby_food_trial` 提供查詢，並在 FeedingRecord 變動後刷新。

#### Scenario: 寫入後讀取看得到變化
- **GIVEN** 寶寶 B 對食材 F 從未紀錄 (UNTRIED)
- **WHEN** 使用者 POST 一筆 (B, F, NONE) 後立即 `GET /api/v1/babies/{B}/trials`
- **THEN** (B, F) 紀錄已變為 `TRYING`

#### Scenario: 大量紀錄不退化
- **GIVEN** 寶寶 B 有 1000 筆 FeedingRecord 分布於 80 種食材
- **WHEN** 使用者 `GET /api/v1/babies/{B}/trials`
- **THEN** 回應在 200ms 以內 (本機 PostgreSQL 15)
