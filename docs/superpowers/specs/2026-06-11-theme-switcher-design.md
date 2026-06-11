# 三主題切換系統設計（手帳紙感／夢幻糖果／午夜星圖）

日期：2026-06-11
狀態：已確認（使用者核准設計；本階段僅設計，尚未實作）
視覺參考：`.superpowers/brainstorm/37672-1781186995/content/`（fancy-style.html、design-preview.html，gitignored，僅本機）

## 目標

讓使用者在設定頁於三個主題之間切換，選擇跨重啟保留：

1. **手帳紙感 paper**（現有風格，預設）：奶油紙底＋terracotta，維持現狀。
2. **🍭 夢幻糖果 candy**（fancy・日）：全息粉彩漸層背景＋飄浮雲朵、雲朵白卡＋糖果色內陰影、粉紫漸層主按鈕＋果凍陰影、霓彩漸層標題字、徽章帶 emoji（低敏🌱／中敏🌼／高敏⚠️）。
3. **✦ 午夜星圖 night**（fancy・夜）：深夜藍星空背景（純 CSS 星點＋緩慢閃爍）、半透明卡片＋金線描邊＋光暈、鎏金漸層主按鈕、米金襯線標題＋柔光、已解鎖食材卡顯示 ✦「已點亮」彩蛋。

## 範圍

- 純前端（`apps/web`），無後端、無資料庫變更。
- 主題深度：**換色票＋主題特效**（背景層、陰影/光暈、漸層按鈕與標題、徽章彩蛋）。不做per-主題的版面/圓角/字級重設計（維護成本過高，YAGNI）。
- 切換入口：設定頁（`/settings`）三張預覽卡。不做 header 快速切換鈕、不做跟隨系統深色模式、不做依時間自動切換。

## 架構：CSS 變數 + `data-theme`

### Token 層（`apps/web/src/styles/globals.css`）

- 三組變數作用域：`:root`（paper 預設）、`[data-theme='candy']`、`[data-theme='night']`。
- Token 範圍：
  - **色票**：現有 palette 全部（cream/cream-card/cream-deep、bark/bark-soft/bark-faded、terracotta 系、sage 系、mustard 系、blush 系、allergy、status）。變數存 RGB 分量（如 `--c-bark: 74 53 40`）以支援 Tailwind `<alpha-value>`。
  - **陰影**：`--shadow-card`、`--shadow-fab`、`--shadow-ribbon`（night 主題下變為光暈；candy 變為糖果色柔影）。
  - **漸層**：`--grad-primary`（主按鈕/FAB 背景；paper 主題下為 terracotta 純色的等價漸層，元件可一律用 `background-image`）。
  - **背景層**：body 背景（paper＝點點紙紋；candy＝四色全息漸層＋兩朵 CSS 雲；night＝径向深藍漸層＋多層 radial-gradient 星點）。全部純 CSS，零圖片資源。
- 主題特效掛在 `[data-theme]` 選擇器下（如 `[data-theme='night'] .serif` 加 text-shadow），**元件對主題無感知**。
- 動畫：星星 twinkle、雲朵 floaty 以 keyframes 實作；`@media (prefers-reduced-motion: reduce)` 全部停用。
- 切換過渡：`html` 上 `transition: background-color .3s` 等色彩過渡，避免閃跳。

### Tailwind 層（`apps/web/tailwind.config.ts`)

- 色票值改為 `rgb(var(--c-xxx) / <alpha-value>)` 形式，**名稱不變**（bark、cream-card…），因此現有元件 class 全部不需修改。
- `boxShadow.paper/fab/ribbon` 改引用對應 CSS 變數。
- 順手刪除無引用的 legacy aliases（`brand`、`accent.game`、`allergy.*` 若確認無使用）——優化報告已列為死碼。

### 狀態層（`apps/web/src/lib/store.ts`）

- `AppState` 加 `theme: 'paper' | 'candy' | 'night'`（預設 `'paper'`）與 `setTheme`。
- 加入 `persist` 的 `partialize`（與 `activeBabyId` 並列）。
- 在路由根 layout `AppShell` 以 `useEffect` 同步 `document.documentElement.dataset.theme = theme`（所有頁面都經過 AppShell，保證生效）；`'paper'` 時移除屬性。

### 切換器 UI（`apps/web/src/pages/SettingsPage.tsx`）

- 新增「主題風格 THEME」區塊：三張迷你預覽卡（縮小版漸層縮圖＋主題名＋使用中打勾），點卡即 `setTheme`，即時生效。
- 預覽卡縮圖以各主題的固定漸層/色票渲染（不跟隨當前主題變色，保持可辨識）。

## 連帶整理（在範圍內的既有問題）

- `ProgressRing` 寫死的 hex（`#F2EAD3`、`#E0AC4C`）改讀 CSS 變數，否則 night 主題會出現突兀奶油色圓環（優化報告 off-palette 項目）。
- 其他寫死色票若在三主題下明顯突兀（如 `BadgeUnlockToast`），實作時一併改為變數；以「夜間模式目視掃一遍」為驗收。

## 對比度與可近性

- night 主題文字 token（`--c-bark` → 米白 `#f3e9d2` 級）與背景需滿足 WCAG AA（4.5:1）；candy 主題文字用深紫灰（`#5a4a6e` 級）確保在粉彩底上可讀。
- 星星/雲朵動畫尊重 `prefers-reduced-motion`。
- 切換卡片需可鍵盤操作（button 元素＋焦點樣式）。

## 測試

- 單元（Vitest）：store 的 `theme` 預設值、`setTheme`、persist partialize；根元件同步 `data-theme` 屬性。
- 視覺驗證（實作階段）：Playwright 對三主題各截圖（首頁＋圖鑑頁），人工確認對比度與特效。

## 已考慮的替代方案

- **Tailwind 主題 variant（candy:/night: 前綴）**：每個元件要寫三套 class，爆炸式重複 → 不採用。
- **三份獨立樣式表動態載入**：隔離徹底但三份檔案會 drift → 不採用。
- **只留兩主題（candy 日／night 夜，紙感退役）**：使用者選擇保留紙感為預設，三主題並存。
- **header 快速循環切換鈕**：三主題循環易誤觸且不直觀 → 只做設定頁選擇器。
