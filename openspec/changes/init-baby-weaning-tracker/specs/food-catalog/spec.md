## ADDED Requirements

### Requirement: 食材圖鑑系統預載

系統 SHALL 在初始化時 seed 一份台灣常見副食品列表 (~80 項)，每項標註 `category` 與 `allergyRisk`。

#### Scenario: 初次部署資料庫
- **WHEN** 執行 `prisma db seed`
- **THEN** `food_item` 表至少有 80 筆 `is_system = true` 的紀錄，且涵蓋 VEGETABLE、FRUIT、SEAFOOD、MEAT、EGG、DAIRY、GRAIN、MUSHROOM、NUT、OTHER 全部 10 個 category

#### Scenario: 重新執行 seed 不會重複建立
- **GIVEN** seed 已執行一次
- **WHEN** 再次執行 seed
- **THEN** 系統項數量維持不變，且每項屬性以 seed 檔為準（idempotent upsert by name）

### Requirement: 使用者自訂食材

系統 SHALL 允許使用者新增、修改、刪除自訂食材 (`is_system = false`)。

#### Scenario: 新增自訂食材
- **WHEN** 使用者 `POST /api/v1/foods` 含 `name`、`category`、`allergyRisk`
- **THEN** 系統回應 `201 Created`，新食材 `isSystem = false`

#### Scenario: 名稱重複
- **GIVEN** 已存在名為 `紅蘿蔔泥` 的食材
- **WHEN** 使用者再次嘗試 `POST /api/v1/foods` 同樣的 `name`
- **THEN** 系統回應 `409 Conflict` 與 problem+json

#### Scenario: 編輯自訂食材
- **GIVEN** 自訂食材 `id = X`，`isSystem = false`
- **WHEN** 使用者 `PATCH /api/v1/foods/{X}` 修改 `allergyRisk`
- **THEN** 系統回應 `200 OK` 與更新後的食材

### Requirement: 系統預載食材唯讀

系統 SHALL 拒絕對 `isSystem = true` 的食材執行 `PATCH` 或 `DELETE`。

#### Scenario: 嘗試編輯系統食材
- **GIVEN** 系統食材 `id = S`，`isSystem = true`
- **WHEN** 使用者 `PATCH /api/v1/foods/{S}`
- **THEN** 系統回應 `403 Forbidden` 與 problem+json，detail 說明系統食材唯讀

#### Scenario: 嘗試刪除系統食材
- **GIVEN** 系統食材 `id = S`，`isSystem = true`
- **WHEN** 使用者 `DELETE /api/v1/foods/{S}`
- **THEN** 系統回應 `403 Forbidden`

### Requirement: 刪除被引用食材的保護

系統 SHALL 拒絕刪除已被 FeedingRecord 引用的自訂食材。

#### Scenario: 食材已被引用
- **GIVEN** 自訂食材 `X` 被至少一筆 FeedingRecord 參照
- **WHEN** 使用者 `DELETE /api/v1/foods/{X}`
- **THEN** 系統回應 `409 Conflict` 與 problem+json，detail 說明被引用無法刪除

### Requirement: 食材列表查詢與排序

系統 SHALL 支援按 category、allergyRisk、名稱搜尋與排序。

#### Scenario: 按敏度遞增排序
- **WHEN** 使用者 `GET /api/v1/foods?sort=risk_asc`
- **THEN** 回應依序排出 LOW → MEDIUM → HIGH 的食材

#### Scenario: 按 category 篩選
- **WHEN** 使用者 `GET /api/v1/foods?category=VEGETABLE`
- **THEN** 回應只含 `category = VEGETABLE` 的食材

#### Scenario: 名稱模糊搜尋
- **WHEN** 使用者 `GET /api/v1/foods?search=蛋`
- **THEN** 回應包含所有 `name` 含「蛋」的食材，且不區分大小寫

### Requirement: 食材敏度分級

每個 FoodItem SHALL 標示 `allergyRisk` 為 LOW、MEDIUM、HIGH 之一。

#### Scenario: 不可為 null
- **WHEN** 使用者 `POST /api/v1/foods` 未提供 `allergyRisk`
- **THEN** 系統回應 `422` 與 `errors[].path = "allergyRisk"`

#### Scenario: 不可為未定義值
- **WHEN** 使用者 `POST /api/v1/foods` 傳 `allergyRisk = "UNKNOWN"`
- **THEN** 系統回應 `422`
