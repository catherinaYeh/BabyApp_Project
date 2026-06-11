# 圖鑑頁自訂食材（完整 CRUD）設計

日期：2026-06-11
狀態：已確認（使用者核准）

## 目標

讓使用者能在「食材圖鑑」頁（`/foods`）自行新增食材，並可編輯、刪除自己新增的食材。系統內建（`isSystem: true`）的 80 種食材維持唯讀。

## 範圍

- **純前端改動**。後端 `POST/PATCH/DELETE /api/v1/foods` 已完整實作（含系統食材保護、名稱唯一檢查、被餵食紀錄引用時禁止刪除），不需修改。
- 不做使用者帳號／權限——本 app 為單一使用者架構，所有自訂食材全域可見。

## UI 設計

### 入口

1. **新增**：圖鑑頁標題列（「食材圖鑑」h2）右側放「＋ 新增」膠囊按鈕（terracotta 配色，與現有 filter 按鈕風格一致）。點擊開啟空白表單 Sheet。
2. **編輯**：自訂食材卡片（`isSystem: false`）右下角顯示小鉛筆 icon 按鈕；點卡片本體維持原行為（開啟新增餵食紀錄 Sheet），點鉛筆開啟編輯模式 Sheet。
3. **自訂徽章**：自訂食材卡片顯示小型「自訂」標記，與系統食材區分。
4. **刪除**：編輯 Sheet 內的刪除按鈕，採按鈕內二次確認（第一次點擊變為「確認刪除？」，再點一次才執行），不使用系統 `confirm()`。

### FoodFormSheet 元件

新元件 `apps/web/src/components/foods/FoodFormSheet.tsx`，比照 `AddFeedingSheet` 的底部抽屜模式（fixed bottom drawer + backdrop）。同一元件支援兩種模式：

- `mode: 'create'`：空白表單，送出呼叫 `useCreateFood`。
- `mode: 'edit'`（帶入既有 `FoodItem`）：預填欄位，送出呼叫 `useUpdateFood`，並顯示刪除按鈕。

### 表單欄位（對齊後端 `food.schema.ts` Zod 驗證）

| 欄位     | 形式                                                  | 驗證                  |
| -------- | ----------------------------------------------------- | --------------------- |
| 名稱     | 文字輸入                                              | 必填，trim 後 1–30 字 |
| 分類     | 10 個分類膠囊按鈕（沿用圖鑑頁 CATEGORIES 樣式與標籤） | 必填                  |
| 過敏風險 | 低敏／中敏／高敏 三選一（沿用 AllergyBadge 配色語彙） | 必填                  |

## 資料層

- `apps/web/src/lib/api/foods.ts`：新增 `foodsApi.create` / `foodsApi.update` / `foodsApi.remove`。
- hooks：新增 `useCreateFood` / `useUpdateFood` / `useDeleteFood`，成功後 `invalidateQueries({ queryKey: ['foods'] })`。
- Sheet 開關狀態：沿用現有模式。`AddFeedingSheet` 的開關放在 Zustand store；FoodFormSheet 僅由圖鑑頁使用，狀態以 `useState` 保留在 `FoodCatalogPage` 內即可（YAGNI，不進全域 store）。

## 錯誤處理

- 名稱重複（HTTP 409）：表單內顯示「已有同名食材」。
- 刪除時被餵食紀錄引用（HTTP 409）：Sheet 內顯示「此食材已有餵食紀錄，無法刪除」。
- 其他錯誤：沿用 `ApiError` → 表單頂部錯誤訊息的既有模式（同 AddFeedingSheet）。

## 測試

- 前端 Vitest 元件測試（跟隨專案既有測試慣例）：
  - 表單驗證（空名稱不可送出、超過 30 字擋下）
  - create 模式送出呼叫 create API；edit 模式預填且呼叫 update API
  - 刪除二次確認流程（第一次點擊不刪、第二次才呼叫 delete）
  - 409 錯誤訊息顯示
- 後端零改動，不新增後端測試。

## 已考慮的替代方案

- 點自訂食材卡片開詳情頁再編輯：多一層跳轉且改變現有點卡片行為 → 不採用。
- 系統 `confirm()` 刪除確認：與 app 視覺風格不符 → 改用按鈕內二次確認。
- 獨立 `/foods/new` 頁面表單：操作流程離開圖鑑頁 → 不採用，改用底部 Sheet。
