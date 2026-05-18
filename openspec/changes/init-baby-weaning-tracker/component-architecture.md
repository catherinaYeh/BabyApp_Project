# React Component Architecture

- **Change ID**: `init-baby-weaning-tracker`
- **Stack**: React 18 + TypeScript + Vite + React Router v6 + TanStack Query v5 + Zustand + Tailwind CSS + shadcn/ui + Framer Motion

## 1. 設計準則 (Principles)

1. **Mobile-first**：所有頁面在 360×640 viewport 完整顯示；桌機版以最大寬度 480px 居中。
2. **單一職責**：頁面 (Page) 只組裝 + 接資料；UI 元件 (Component) 只渲染；領域元件 (Feature) 負責商業邏輯 hook。
3. **狀態分層**：
   - **Server state** → TanStack Query (`useBabies`, `useDashboard` ...)
   - **UI state** → Local `useState` / `useReducer`
   - **Cross-component UI state** (active baby、drawer 開關) → Zustand `useAppStore`
4. **路由與資料解耦**：每個 Page 自己決定要叫哪些 query；不在 Router loader 內取資料。
5. **設計系統優先**：所有新元件先看 `components/ui/` 有沒有可用 shadcn primitive，再考慮自做。

## 2. 目錄結構 (Directory Layout)

```
apps/web/
├── src/
│   ├── main.tsx                  # entry
│   ├── App.tsx                   # router + providers
│   ├── router.tsx                # route definitions
│   ├── styles/
│   │   ├── globals.css
│   │   └── tailwind.css
│   ├── lib/
│   │   ├── api/                  # 由 openapi-typescript 產生 + fetcher 包裝
│   │   │   ├── client.ts
│   │   │   ├── babies.ts
│   │   │   ├── foods.ts
│   │   │   ├── feedings.ts
│   │   │   ├── trials.ts
│   │   │   ├── achievements.ts
│   │   │   └── dashboard.ts
│   │   ├── hooks/                # TanStack Query hooks
│   │   │   ├── useBabies.ts
│   │   │   ├── useActiveBaby.ts
│   │   │   ├── useFoods.ts
│   │   │   ├── useFeedings.ts
│   │   │   ├── useDashboard.ts
│   │   │   ├── useTrials.ts
│   │   │   └── useAchievements.ts
│   │   ├── store/
│   │   │   └── appStore.ts       # Zustand: activeBabyId, drawer state
│   │   ├── utils/
│   │   │   ├── date.ts           # 月齡計算、週/月區間
│   │   │   ├── csv.ts            # 範例下載
│   │   │   └── allergy.ts        # 敏度色彩對應
│   │   └── constants.ts
│   ├── pages/                    # 路由 = 頁面
│   │   ├── HomePage.tsx
│   │   ├── FoodCatalogPage.tsx
│   │   ├── FoodDetailPage.tsx
│   │   ├── HistoryPage.tsx
│   │   ├── AchievementsPage.tsx
│   │   ├── BabiesPage.tsx
│   │   ├── BabyEditPage.tsx
│   │   ├── ImportPage.tsx
│   │   └── SettingsPage.tsx
│   ├── components/
│   │   ├── ui/                   # shadcn primitives (button, dialog, sheet, …)
│   │   ├── layout/
│   │   │   ├── AppShell.tsx       # 最外殼: header + bottom-nav + safe-area
│   │   │   ├── TopBar.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   └── FabAddFeeding.tsx  # 浮動 "+" 按鈕
│   │   ├── baby/
│   │   │   ├── BabySwitcher.tsx
│   │   │   ├── BabyAvatar.tsx
│   │   │   └── BabyForm.tsx
│   │   ├── food/
│   │   │   ├── FoodCard.tsx
│   │   │   ├── FoodList.tsx
│   │   │   ├── AllergyBadge.tsx   # LOW/MED/HIGH 顏色
│   │   │   └── CategoryTabs.tsx
│   │   ├── feeding/
│   │   │   ├── AddFeedingSheet.tsx   # 半屏表單 (US01)
│   │   │   ├── FeedingTimeline.tsx
│   │   │   ├── WeekCalendar.tsx
│   │   │   └── MonthCalendar.tsx
│   │   ├── dashboard/
│   │   │   ├── StatusCountCard.tsx
│   │   │   ├── ProgressRing.tsx       # 環形進度
│   │   │   ├── RecommendationStrip.tsx
│   │   │   └── RecentUnlockBanner.tsx
│   │   ├── achievement/
│   │   │   ├── BadgeWall.tsx
│   │   │   ├── BadgeCard.tsx
│   │   │   └── BadgeUnlockToast.tsx   # Framer Motion 彈窗
│   │   ├── import/
│   │   │   ├── CsvDropzone.tsx
│   │   │   ├── ImportPreviewTable.tsx
│   │   │   └── ImportResultSummary.tsx
│   │   └── common/
│   │       ├── EmptyState.tsx
│   │       ├── ErrorState.tsx
│   │       ├── LoadingSpinner.tsx
│   │       └── ConfirmDialog.tsx
│   └── types/
│       └── api.ts                 # 由 openapi-typescript 產生
├── tests/
│   ├── unit/                      # Vitest
│   └── e2e/                       # Playwright
├── public/
│   └── manifest.webmanifest       # PWA 預備 (後續版本)
├── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── vite.config.ts
```

## 3. 路由 (Routing)

| Path                          | Page                  | 對應 User Story |
| ----------------------------- | --------------------- | --------------- |
| `/`                           | `HomePage`            | US02, US04, US07 |
| `/foods`                      | `FoodCatalogPage`     | US06            |
| `/foods/:foodId`              | `FoodDetailPage`      | US06            |
| `/history`                    | `HistoryPage`         | US03            |
| `/achievements`               | `AchievementsPage`    | US05            |
| `/babies`                     | `BabiesPage`          | US07            |
| `/babies/:babyId/edit`        | `BabyEditPage`        | US06, US07      |
| `/babies/new`                 | `BabyEditPage` (new)  | US07            |
| `/import`                     | `ImportPage`          | US08            |
| `/settings`                   | `SettingsPage`        | —               |

底部導覽 (`BottomNav`) 固定顯示：**首頁 / 圖鑑 / +(FAB) / 歷史 / 徽章**。

## 4. 元件樹 (Component Tree)

```
<App>
  <QueryClientProvider>
    <ZustandStoreReady>
      <Router>
        <AppShell>
          <TopBar>
            <BabySwitcher />        ← 點開出 BabyPickerDrawer
          </TopBar>
          <main>
            ┌── <HomePage> ────────────────────────────────────┐
            │   <StatusCountCard /> × 4 (UNTRIED/TRYING/...)   │
            │   <ProgressRing />                               │
            │   <RecommendationStrip />                        │
            │   <RecentUnlockBanner />                         │
            └──────────────────────────────────────────────────┘
            ┌── <FoodCatalogPage> ─────────────────────────────┐
            │   <CategoryTabs />                               │
            │   <FoodList>                                     │
            │     <FoodCard>                                   │
            │       <AllergyBadge />                           │
            │       <TrialStatusChip />                        │
            │     </FoodCard>                                  │
            │   </FoodList>                                    │
            └──────────────────────────────────────────────────┘
            ┌── <FoodDetailPage> ──────────────────────────────┐
            │   <FoodHeader /> (name, category, allergyBadge)  │
            │   <TrialStatusChip />                            │
            │   <FeedingTimeline foodId={…} />                 │
            │   [Buttons] 編輯 / 刪除 (非系統)                  │
            └──────────────────────────────────────────────────┘
            ┌── <HistoryPage> ─────────────────────────────────┐
            │   <ViewToggle week|month />                      │
            │   <WeekCalendar /> | <MonthCalendar />           │
            │   <FeedingTimeline />                            │
            └──────────────────────────────────────────────────┘
            ┌── <AchievementsPage> ────────────────────────────┐
            │   <BadgeWall>                                    │
            │     <BadgeCard locked | unlocked />              │
            │   </BadgeWall>                                   │
            └──────────────────────────────────────────────────┘
            ┌── <BabiesPage> ──────────────────────────────────┐
            │   <BabyCard /> × N                               │
            │   + 新增寶寶                                     │
            └──────────────────────────────────────────────────┘
            ┌── <ImportPage> ──────────────────────────────────┐
            │   <CsvDropzone />                                │
            │   <ImportPreviewTable />  (dryRun=true)          │
            │   <ImportResultSummary /> (after submit)         │
            └──────────────────────────────────────────────────┘
          </main>
          <FabAddFeeding />            ← 開啟 <AddFeedingSheet />
          <BottomNav />
          <BadgeUnlockToast />         ← global, 監聽 mutation 結果
          <AddFeedingSheet />          ← portal, 半屏
        </AppShell>
      </Router>
    </ZustandStoreReady>
  </QueryClientProvider>
</App>
```

## 5. 狀態管理 (State Management)

### 5.1 Zustand `useAppStore`

```ts
type AppState = {
  activeBabyId: string | null;
  setActiveBabyId: (id: string) => void;

  addFeedingSheetOpen: boolean;
  openAddFeedingSheet: (prefill?: { foodId?: string }) => void;
  closeAddFeedingSheet: () => void;

  babyPickerOpen: boolean;
  toggleBabyPicker: () => void;

  pendingUnlocks: Achievement[];   // 由 mutation 注入，BadgeUnlockToast 消費
  pushUnlock: (a: Achievement) => void;
  consumeUnlock: () => Achievement | undefined;
};
```

`activeBabyId` 與 `pendingUnlocks` 持久化於 `localStorage`（zustand `persist` middleware）。

### 5.2 TanStack Query 規則

| Query Key                                  | Hook                       | Endpoint                                  | 失效時機                            |
| ------------------------------------------ | -------------------------- | ----------------------------------------- | ----------------------------------- |
| `['babies']`                               | `useBabies`                | `GET /babies`                             | Baby CRUD mutation                  |
| `['baby', babyId]`                         | `useBaby(id)`              | `GET /babies/{id}`                        | 該 baby 更新                        |
| `['foods', filters]`                       | `useFoods`                 | `GET /foods`                              | Food CRUD                           |
| `['food', foodId]`                         | `useFood(id)`              | `GET /foods/{id}`                         | 該 food 更新                        |
| `['feedings', babyId, filters]`            | `useFeedings(babyId, ...)` | `GET /babies/{id}/feedings`               | Feeding CRUD / import               |
| `['trials', babyId]`                       | `useTrials(babyId)`        | `GET /babies/{id}/trials`                 | Feeding CRUD / import               |
| `['dashboard', babyId]`                    | `useDashboard(babyId)`     | `GET /babies/{id}/dashboard`              | Feeding CRUD / import               |
| `['progress', babyId]`                     | `useProgress(babyId)`      | `GET /babies/{id}/progress`               | Feeding CRUD / import               |
| `['achievements']`                         | `useAchievements`          | `GET /achievements`                       | 永不（靜態）                        |
| `['baby-achievements', babyId]`            | `useBabyAchievements(id)`  | `GET /babies/{id}/achievements`           | Feeding CRUD / import               |

### 5.3 Mutation Pattern

`useCreateFeeding`：

```ts
const { mutate } = useMutation({
  mutationFn: api.feedings.create,
  onSuccess: ({ feeding, newlyUnlockedAchievements }) => {
    queryClient.invalidateQueries({ queryKey: ['feedings', feeding.babyId] });
    queryClient.invalidateQueries({ queryKey: ['trials',   feeding.babyId] });
    queryClient.invalidateQueries({ queryKey: ['dashboard', feeding.babyId] });
    queryClient.invalidateQueries({ queryKey: ['progress',  feeding.babyId] });
    queryClient.invalidateQueries({ queryKey: ['baby-achievements', feeding.babyId] });
    newlyUnlockedAchievements.forEach(useAppStore.getState().pushUnlock);
  },
});
```

## 6. 設計系統 (Design System)

### 6.1 色彩

| Token                    | 用途                  | 值          |
| ------------------------ | --------------------- | ----------- |
| `--allergy-low`          | 低敏標籤              | `#4ADE80`   |
| `--allergy-medium`       | 中敏標籤              | `#FACC15`   |
| `--allergy-high`         | 高敏標籤              | `#F87171`   |
| `--status-untried`       | 未嘗試 chip 背景      | `#E5E7EB`   |
| `--status-trying`        | 嘗試中 chip 背景      | `#FDE68A`   |
| `--status-unlocked`      | 已解鎖 chip 背景      | `#86EFAC`   |
| `--status-allergic`      | 過敏 chip 背景        | `#FCA5A5`   |
| `--brand`                | 主色 (按鈕/FAB)       | `#FF7AA2`   |
| `--accent-game`          | 解鎖動畫光暈          | `#FFD580`   |

### 6.2 字體

- 標題：`Noto Sans TC` 700
- 內文：`Noto Sans TC` 400 / 500
- 數字 (進度/百分比)：`Manrope` 600

### 6.3 元件規範

- **AllergyBadge**：圓形 + 文字 (低/中/高)；色碼依 `allergy-*`。
- **TrialStatusChip**：膠囊型 + icon (鎖頭/嘗試中/解鎖/警示)。
- **ProgressRing**：SVG，圓周隨 percent 增長；解鎖時 Framer Motion `scale` 1→1.05→1。
- **FabAddFeeding**：固定底部偏左 16px、寬高 56px，bottom-nav 之上 16px。
- **BadgeUnlockToast**：頂部 sheet，含 confetti (Framer Motion + tsparticles)，3 秒自動關閉，可手動關閉。

## 7. 關鍵互動流程 (Key Flows)

### 7.1 US01 快速紀錄

```
User taps FAB
  → AddFeedingSheet 開啟（預設 fedAt = now，amountMl 20）
  → 食材輸入：search 帶推薦 (依 activeBabyId 的 untried + low risk)
  → reaction 預設 NONE
  → submit → useCreateFeeding mutation
  → 成功：sheet 關閉，dashboard 數字動畫更新，若有新徽章顯示 BadgeUnlockToast
  → 失敗 (409 duplicate)：sheet 內顯示提示「已有同時間紀錄，請調整時間或回去編輯舊紀錄」
```

### 7.2 US07 切換寶寶

```
User taps BabySwitcher (TopBar)
  → BabyPickerDrawer 從底部上拉
  → 列出 useBabies()；當前用 ✓ 標示
  → 點選 → setActiveBabyId(id) → drawer 關閉
  → 全部以 babyId 為 key 的 query 自動觸發 fetch
```

### 7.3 US08 CSV 匯入

```
ImportPage
  → CsvDropzone 接收檔案 (本地驗證 ≤ 2MB)
  → 顯示前 10 列 preview（純前端解析確認標頭）
  → POST .../feedings:import (dryRun=true) → ImportPreviewTable 顯示衝突/錯誤列
  → 使用者確認後 POST (dryRun=false)
  → ImportResultSummary：imported / skipped / errors
  → 自動 invalidate feedings/trials/dashboard
```

## 8. 測試策略

| 層級            | 工具                       | 範圍                                                |
| --------------- | -------------------------- | --------------------------------------------------- |
| 單元測試        | Vitest                     | utils (date, allergy), Zustand store, formatter     |
| 元件測試        | Vitest + Testing Library   | FoodCard, ProgressRing, AddFeedingSheet (mock API)  |
| Hook 測試       | Vitest + MSW               | TanStack Query hooks (invalidation, error paths)    |
| e2e             | Playwright                 | Happy path: 建 baby → 加食材 → 紀錄 → 看徽章        |
| Visual          | Storybook + Chromatic (選用) | shadcn 衍生元件回歸                                 |

## 9. 共用型別自動同步 (Type Generation)

```bash
# 從 openapi.yaml 產生 TypeScript types
pnpm dlx openapi-typescript ../openspec/changes/init-baby-weaning-tracker/openapi.yaml \
  -o src/types/api.ts
```

於 `package.json`：`"types:gen": "openapi-typescript ../openspec/.../openapi.yaml -o src/types/api.ts"`，pre-commit hook 自動執行以確保前後端契約同步。
