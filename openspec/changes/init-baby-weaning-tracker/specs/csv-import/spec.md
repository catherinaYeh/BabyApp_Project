## ADDED Requirements

### Requirement: CSV 批次匯入端點

系統 SHALL 提供 `POST /api/v1/babies/{babyId}/feedings:import` 接受 multipart `file` 上傳 CSV，UTF-8 編碼，第一列為標頭 `food_name,fed_at,amount_ml,reaction,note`。

#### Scenario: 正常匯入
- **GIVEN** CSV 含 10 列有效資料，所有 food_name 都對應到系統或自訂食材
- **WHEN** 使用者 `POST .../feedings:import` 上傳該檔
- **THEN** 系統回應 `200 OK` 與 `{ imported: 10, skipped: 0, errors: [] }`，10 筆 FeedingRecord 建立

#### Scenario: 食材名稱大小寫不敏感
- **GIVEN** CSV 第 1 列 `food_name = " 紅蘿蔔泥 "` (含前後空白)
- **WHEN** 上傳
- **THEN** 系統 trim 後對 `food_item.name = "紅蘿蔔泥"` 匹配並成功匯入

### Requirement: Skip-on-conflict 衝突策略

系統 SHALL 在遇到 `(babyId, foodId, fedAt)` 既有紀錄時，把該列計入 `skipped` 而非覆寫，並繼續處理其他列。

#### Scenario: 唯一鍵衝突
- **GIVEN** 已有紀錄 `(B, F, 2026-05-20T11:30:00+08:00)`
- **WHEN** CSV 包含同三元組的列
- **THEN** 回應 `skipped` 數字 +1，既有紀錄維持不變

#### Scenario: 部分衝突部分成功
- **GIVEN** 10 列 CSV 其中 3 列衝突、7 列新增
- **WHEN** 上傳
- **THEN** 回應 `{ imported: 7, skipped: 3, errors: [] }`

### Requirement: 解析錯誤逐列回報

系統 SHALL 在某列解析失敗時記錄於 `errors[]` 並繼續處理其他列，不整批失敗。

#### Scenario: 食材名稱不存在
- **WHEN** CSV 某列 `food_name = "外星食物"` 對應不到任何 food_item
- **THEN** 回應 `errors[]` 含一筆 `{ row, message: "food not found: 外星食物", raw: {...} }`

#### Scenario: 格式錯誤
- **WHEN** CSV 某列 `amount_ml = "abc"` (非數字)
- **THEN** 回應 `errors[]` 含 `{ row, message: 描述 amount_ml 解析錯誤 }`

#### Scenario: 多種錯誤混合
- **GIVEN** CSV 10 列：5 列正常、2 列食材不存在、1 列 amount_ml 錯、2 列衝突
- **WHEN** 上傳
- **THEN** 回應 `{ imported: 5, skipped: 2, errors: [{row, ...}, {row, ...}, {row, ...}] }` (3 筆 errors)

### Requirement: CSV 上傳大小限制

系統 SHALL 拒絕超過 2MB 或超過 5000 列的 CSV，回 `400 Bad Request`。

#### Scenario: 檔案過大
- **WHEN** 上傳 3MB 的 CSV
- **THEN** 系統回應 `400` 與 problem+json，detail 說明大小限制

#### Scenario: 列數過多
- **WHEN** 上傳 5001 列的 CSV
- **THEN** 系統回應 `400` 與相應錯誤訊息

### Requirement: dryRun 預覽模式

系統 SHALL 支援 `dryRun=true` 參數，回傳預估結果但不寫入資料庫。

#### Scenario: dryRun 不寫入
- **GIVEN** 資料庫 FeedingRecord 數量為 N
- **WHEN** 使用者上傳 CSV 含 dryRun=true
- **THEN** 系統回應 imported/skipped/errors 統計，但 FeedingRecord 數量仍為 N

#### Scenario: dryRun 結果與實際匯入一致
- **GIVEN** CSV 內容固定
- **WHEN** 先以 dryRun=true 取得統計 X，再以 dryRun=false 實際匯入取得統計 Y
- **THEN** X 與 Y 的 imported/skipped/errors 數量完全一致

### Requirement: attemptCount 在批次匯入時正確編號

系統 SHALL 在 CSV 匯入時，依「現有紀錄數 + 該批次內 fedAt 順序」自動編號 attemptCount。

#### Scenario: 從零開始批次
- **GIVEN** 寶寶 B 對食材 F 無既有紀錄
- **WHEN** CSV 含 3 筆 (B, F, t1), (B, F, t2), (B, F, t3)，t1 < t2 < t3
- **THEN** 匯入後 attemptCount 依時序為 1, 2, 3

#### Scenario: 累加於既有
- **GIVEN** 寶寶 B 對食材 F 已有 2 筆紀錄 (attemptCount 1, 2)
- **WHEN** CSV 含 2 筆 (B, F, t3), (B, F, t4)，t3 < t4
- **THEN** 匯入後新增的 attemptCount 為 3, 4
