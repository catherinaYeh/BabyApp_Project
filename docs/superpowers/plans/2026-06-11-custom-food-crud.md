# 圖鑑頁自訂食材 CRUD 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在食材圖鑑頁（`/foods`）加入使用者自訂食材的新增／編輯／刪除功能（純前端，後端 API 已存在）。

**Architecture:** 新增一個 `FoodFormSheet` 底部抽屜元件（同時支援 create / edit 模式），加上 `foodsApi` 的 create/update/remove 方法與三個 React Query mutation hooks。圖鑑頁標題列加「＋新增」按鈕、自訂食材卡片加鉛筆編輯鈕與「自訂」徽章。刪除採按鈕內二次確認。

**Tech Stack:** React 18 + TypeScript、TanStack React Query 5、Tailwind CSS 3、Vitest + Testing Library。

**Spec:** `docs/superpowers/specs/2026-06-11-custom-food-crud-design.md`

**重要背景（給零上下文的工程師）：**

- 這是 pnpm monorepo，前端在 `apps/web`。所有指令在 repo 根目錄用 `pnpm --filter web <script>` 執行。
- 後端 `POST/PATCH/DELETE /api/v1/foods` 已完整實作（`apps/api/src/modules/foods/`），會擋系統食材（`isSystem: true`）的修改、名稱重複回 409、刪除被餵食紀錄引用的食材回 409。**後端零改動。**
- API 型別由 OpenAPI 產生在 `apps/web/src/types/api.ts`，`FoodCreate`／`FoodUpdate` schema 已存在（line 353-362），不需重新產生。
- API 錯誤格式為 problem+json，前端用 `ApiError`（`apps/web/src/lib/api/client.ts`）包裝，`err.problem.status` 拿 HTTP 狀態碼。
- 既有底部抽屜範例：`apps/web/src/components/feeding/AddFeedingSheet.tsx`（樣式、錯誤處理都照它）。
- 測試放 `apps/web/tests/*.test.tsx`，jsdom 環境、`@testing-library/jest-dom/vitest` 已在 setup 載入、`@` alias 指向 `src`。
- commit 用 conventional commits（commitlint 會擋），pre-commit 會跑 prettier。

---

### Task 1: foodsApi 的 create/update/remove 與 mutation hooks

**Files:**

- Modify: `apps/web/src/lib/api/foods.ts`
- Modify: `apps/web/src/lib/hooks.ts`

- [ ] **Step 1: 在 foods.ts 加入型別與 API 方法**

把 `apps/web/src/lib/api/foods.ts` 的型別區與 `foodsApi` 改成：

```ts
export type FoodItem = components['schemas']['FoodItem'];
export type FoodCreate = components['schemas']['FoodCreate'];
export type FoodUpdate = components['schemas']['FoodUpdate'];
export type FoodListResponse = components['schemas']['FoodListResponse'];
```

`foodsApi` 物件在 `list` 之後加三個方法（比照 `apps/web/src/lib/api/babies.ts` 的寫法）：

```ts
  create: (input: FoodCreate) => api.post<FoodItem>('/foods', input),
  update: (id: string, input: FoodUpdate) => api.patch<FoodItem>(`/foods/${id}`, input),
  remove: (id: string) => api.delete(`/foods/${id}`),
```

- [ ] **Step 2: 在 hooks.ts 加入三個 mutation hooks**

修改 `apps/web/src/lib/hooks.ts` 第 3 行的 import：

```ts
import { foodsApi, type FoodCreate, type FoodFilters, type FoodUpdate } from './api/foods';
```

檔案底部加上（比照 `useCreateBaby` 等既有寫法）：

```ts
export function useCreateFood() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: FoodCreate) => foodsApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['foods'] });
    },
  });
}

export function useUpdateFood() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; input: FoodUpdate }) => foodsApi.update(args.id, args.input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['foods'] });
    },
  });
}

export function useDeleteFood() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => foodsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['foods'] });
    },
  });
}
```

- [ ] **Step 3: 確認型別檢查通過**

Run: `pnpm --filter web typecheck`
Expected: 無錯誤、exit code 0。

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/api/foods.ts apps/web/src/lib/hooks.ts
git commit -m "feat(web): add food create/update/delete api and hooks"
```

---

### Task 2: FoodFormSheet 元件（TDD）

**Files:**

- Test: `apps/web/tests/FoodFormSheet.test.tsx`
- Create: `apps/web/src/components/foods/FoodFormSheet.tsx`

- [ ] **Step 1: 寫失敗測試**

建立 `apps/web/tests/FoodFormSheet.test.tsx`：

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { FoodFormSheet } from '@/components/foods/FoodFormSheet';
import { ApiError } from '@/lib/api/client';
import type { FoodItem } from '@/lib/api/foods';

const createMutateAsync = vi.fn();
const updateMutateAsync = vi.fn();
const deleteMutateAsync = vi.fn();

vi.mock('@/lib/hooks', () => ({
  useCreateFood: () => ({ mutateAsync: createMutateAsync, isPending: false }),
  useUpdateFood: () => ({ mutateAsync: updateMutateAsync, isPending: false }),
  useDeleteFood: () => ({ mutateAsync: deleteMutateAsync, isPending: false }),
}));

const customFood: FoodItem = {
  id: 'food-1',
  name: '地瓜葉',
  category: 'VEGETABLE',
  allergyRisk: 'LOW',
  isSystem: false,
  createdAt: '2026-06-11T00:00:00.000Z',
  updatedAt: '2026-06-11T00:00:00.000Z',
};

beforeEach(() => {
  createMutateAsync.mockReset().mockResolvedValue(customFood);
  updateMutateAsync.mockReset().mockResolvedValue(customFood);
  deleteMutateAsync.mockReset().mockResolvedValue(undefined);
});

describe('FoodFormSheet（create 模式）', () => {
  test('空名稱不可送出', () => {
    render(<FoodFormSheet onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '加入圖鑑' }));
    expect(screen.getByText('請輸入食材名稱')).toBeInTheDocument();
    expect(createMutateAsync).not.toHaveBeenCalled();
  });

  test('未選分類不可送出', () => {
    render(<FoodFormSheet onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('例如:酪梨'), { target: { value: '酪梨' } });
    fireEvent.click(screen.getByRole('button', { name: '加入圖鑑' }));
    expect(screen.getByText('請選擇分類')).toBeInTheDocument();
    expect(createMutateAsync).not.toHaveBeenCalled();
  });

  test('填妥後送出會呼叫 create（名稱 trim）並關閉', async () => {
    const onClose = vi.fn();
    render(<FoodFormSheet onClose={onClose} />);
    fireEvent.change(screen.getByPlaceholderText('例如:酪梨'), { target: { value: ' 酪梨 ' } });
    fireEvent.click(screen.getByRole('button', { name: '水果' }));
    fireEvent.click(screen.getByRole('button', { name: '低敏' }));
    fireEvent.click(screen.getByRole('button', { name: '加入圖鑑' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(createMutateAsync).toHaveBeenCalledWith({
      name: '酪梨',
      category: 'FRUIT',
      allergyRisk: 'LOW',
    });
  });

  test('名稱重複（409）顯示錯誤訊息', async () => {
    createMutateAsync.mockRejectedValue(
      new ApiError({ type: 'about:blank', title: 'Conflict', status: 409 }),
    );
    render(<FoodFormSheet onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('例如:酪梨'), { target: { value: '蘋果' } });
    fireEvent.click(screen.getByRole('button', { name: '水果' }));
    fireEvent.click(screen.getByRole('button', { name: '低敏' }));
    fireEvent.click(screen.getByRole('button', { name: '加入圖鑑' }));
    expect(await screen.findByText('已有同名食材')).toBeInTheDocument();
  });
});

describe('FoodFormSheet（edit 模式）', () => {
  test('預填既有食材並以 update 送出', async () => {
    const onClose = vi.fn();
    render(<FoodFormSheet food={customFood} onClose={onClose} />);
    const input = screen.getByPlaceholderText('例如:酪梨') as HTMLInputElement;
    expect(input.value).toBe('地瓜葉');
    fireEvent.change(input, { target: { value: '地瓜' } });
    fireEvent.click(screen.getByRole('button', { name: '儲存修改' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(updateMutateAsync).toHaveBeenCalledWith({
      id: 'food-1',
      input: { name: '地瓜', category: 'VEGETABLE', allergyRisk: 'LOW' },
    });
  });

  test('刪除需二次確認', async () => {
    const onClose = vi.fn();
    render(<FoodFormSheet food={customFood} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: '刪除這個食材' }));
    expect(deleteMutateAsync).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '確認刪除？' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(deleteMutateAsync).toHaveBeenCalledWith('food-1');
  });

  test('刪除被引用（409）顯示錯誤且不關閉', async () => {
    deleteMutateAsync.mockRejectedValue(
      new ApiError({ type: 'about:blank', title: 'Conflict', status: 409 }),
    );
    const onClose = vi.fn();
    render(<FoodFormSheet food={customFood} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: '刪除這個食材' }));
    fireEvent.click(screen.getByRole('button', { name: '確認刪除？' }));
    expect(await screen.findByText('此食材已有餵食紀錄，無法刪除')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm --filter web test -- FoodFormSheet`
Expected: FAIL，錯誤為找不到模組 `@/components/foods/FoodFormSheet`。

- [ ] **Step 3: 實作 FoodFormSheet**

建立 `apps/web/src/components/foods/FoodFormSheet.tsx`（樣式語彙完全比照 `AddFeedingSheet.tsx`）：

```tsx
import { useState } from 'react';
import { X } from 'lucide-react';
import { useCreateFood, useDeleteFood, useUpdateFood } from '@/lib/hooks';
import { ApiError } from '@/lib/api/client';
import type { FoodItem } from '@/lib/api/foods';
import type { components } from '@/types/api';

type FoodCategory = components['schemas']['FoodCategory'];
type AllergyRisk = components['schemas']['AllergyRisk'];

const CATEGORIES: Array<{ value: FoodCategory; label: string }> = [
  { value: 'VEGETABLE', label: '蔬菜' },
  { value: 'FRUIT', label: '水果' },
  { value: 'GRAIN', label: '五穀' },
  { value: 'MEAT', label: '肉類' },
  { value: 'SEAFOOD', label: '海鮮' },
  { value: 'EGG', label: '蛋' },
  { value: 'DAIRY', label: '乳製' },
  { value: 'MUSHROOM', label: '菇類' },
  { value: 'NUT', label: '堅果' },
  { value: 'OTHER', label: '其他' },
];

const RISKS: Array<{ value: AllergyRisk; label: string; activeClass: string }> = [
  { value: 'LOW', label: '低敏', activeClass: 'border-sage bg-sage-soft/60 text-bark' },
  { value: 'MEDIUM', label: '中敏', activeClass: 'border-mustard bg-mustard-soft/60 text-bark' },
  { value: 'HIGH', label: '高敏', activeClass: 'border-blush-dark bg-blush-soft/60 text-bark' },
];

function errorMessage(err: unknown, conflictMessage: string): string {
  if (err instanceof ApiError) {
    if (err.problem.status === 409) return conflictMessage;
    return err.problem.errors?.[0]?.message ?? err.problem.detail ?? err.problem.title;
  }
  return String(err);
}

type Props = {
  /** 有傳 food 即為編輯模式，否則為新增模式。 */
  food?: FoodItem;
  onClose: () => void;
};

export function FoodFormSheet({ food, onClose }: Props) {
  const create = useCreateFood();
  const update = useUpdateFood();
  const remove = useDeleteFood();

  const [name, setName] = useState(food?.name ?? '');
  const [category, setCategory] = useState<FoodCategory | undefined>(food?.category);
  const [risk, setRisk] = useState<AllergyRisk | undefined>(food?.allergyRisk);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isEdit = !!food;
  const pending = create.isPending || update.isPending || remove.isPending;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError('請輸入食材名稱');
      return;
    }
    if (trimmed.length > 30) {
      setError('名稱最多 30 字');
      return;
    }
    if (!category) {
      setError('請選擇分類');
      return;
    }
    if (!risk) {
      setError('請選擇過敏風險');
      return;
    }
    try {
      if (food) {
        await update.mutateAsync({
          id: food.id,
          input: { name: trimmed, category, allergyRisk: risk },
        });
      } else {
        await create.mutateAsync({ name: trimmed, category, allergyRisk: risk });
      }
      onClose();
    } catch (err) {
      setError(errorMessage(err, '已有同名食材'));
    }
  }

  async function handleDelete() {
    if (!food) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setError(null);
    try {
      await remove.mutateAsync(food.id);
      onClose();
    } catch (err) {
      setError(errorMessage(err, '此食材已有餵食紀錄，無法刪除'));
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-bark/40" onClick={onClose} />
      <form
        onSubmit={submit}
        className="absolute bottom-0 left-1/2 max-h-[85vh] w-full max-w-mobile -translate-x-1/2 overflow-y-auto rounded-t-4xl border-t border-bark-faded/20 bg-cream-card pb-8 shadow-paper"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-bark-faded/20 bg-cream-card px-5 py-3">
          <div>
            <h2 className="serif text-lg font-semibold text-bark">
              {isEdit ? '編輯食材' : '新增食材'}
            </h2>
            <p className="text-[10px] tracking-[0.2em] text-bark-soft">
              {isEdit ? 'EDIT INGREDIENT' : 'NEW INGREDIENT'}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="關閉" className="text-bark-faded">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 px-5 pt-4">
          <label className="block">
            <span className="text-sm text-bark-soft">名稱</span>
            <input
              type="text"
              value={name}
              maxLength={30}
              placeholder="例如:酪梨"
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-bark-faded/30 bg-cream/50 px-3 py-2 text-bark focus:border-terracotta focus:outline-none"
            />
          </label>

          <fieldset>
            <legend className="text-sm text-bark-soft">分類</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    category === c.value
                      ? 'border-terracotta bg-terracotta text-cream'
                      : 'border-bark-faded/30 bg-cream/50 text-bark-soft'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm text-bark-soft">過敏風險</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {RISKS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRisk(r.value)}
                  className={`rounded-xl border px-2 py-2 text-sm transition-colors ${
                    risk === r.value ? r.activeClass : 'border-bark-faded/30 text-bark-soft'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </fieldset>

          {error && <p className="text-sm text-blush-dark">{error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-2xl bg-terracotta py-3 font-semibold text-cream shadow-fab disabled:opacity-50"
          >
            {pending ? '處理中…' : isEdit ? '儲存修改' : '加入圖鑑'}
          </button>

          {isEdit && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className={`w-full rounded-2xl border py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                confirmingDelete
                  ? 'border-blush-dark bg-blush-soft/60 text-blush-dark'
                  : 'border-bark-faded/30 text-bark-soft'
              }`}
            >
              {confirmingDelete ? '確認刪除？' : '刪除這個食材'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm --filter web test -- FoodFormSheet`
Expected: 8 tests PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/web/tests/FoodFormSheet.test.tsx apps/web/src/components/foods/FoodFormSheet.tsx
git commit -m "feat(web): add FoodFormSheet for custom food create/edit/delete"
```

---

### Task 3: 圖鑑頁整合（新增按鈕、編輯鉛筆、自訂徽章）

**Files:**

- Modify: `apps/web/src/pages/FoodCatalogPage.tsx`

- [ ] **Step 1: 修改 FoodCatalogPage**

對 `apps/web/src/pages/FoodCatalogPage.tsx` 做以下修改：

1. import 區改為：

```tsx
import { useMemo, useState } from 'react';
import { Pencil, Plus, Search } from 'lucide-react';
import { useFoods, useTrials } from '@/lib/hooks';
import { useAppStore } from '@/lib/store';
import { AllergyBadge } from '@/components/common/AllergyBadge';
import { TrialStatusChip } from '@/components/common/TrialStatusChip';
import { Spinner } from '@/components/common/Spinner';
import { FoodFormSheet } from '@/components/foods/FoodFormSheet';
import type { FoodItem } from '@/lib/api/foods';
import type { components } from '@/types/api';
```

2. 元件內加一個 sheet 狀態（放在既有 useState 之後）：

```tsx
const [foodForm, setFoodForm] = useState<{ open: false } | { open: true; food?: FoodItem }>({
  open: false,
});
```

3. 標題列（原 line 63）改為標題＋新增按鈕：

```tsx
<div className="flex items-center justify-between">
  <h2 className="serif text-xl font-semibold text-bark">食材圖鑑</h2>
  <button
    type="button"
    onClick={() => setFoodForm({ open: true })}
    className="flex items-center gap-1 rounded-full bg-terracotta px-3 py-1.5 text-xs font-semibold text-cream shadow-fab transition-transform active:scale-95"
  >
    <Plus size={14} />
    新增
  </button>
</div>
```

4. 卡片 `<li>`（原 line 127-141）改為 relative 容器＋自訂徽章＋鉛筆編輯鈕（鉛筆是卡片按鈕的「兄弟」元素，避免巢狀 button）：

```tsx
<li key={f.id} className="relative">
  <button
    type="button"
    onClick={() => openAdd(f.id)}
    className="flex h-full w-full flex-col items-start gap-2 rounded-3xl border border-bark-faded/15 bg-cream-card p-3 text-left shadow-paper transition-transform active:scale-95"
  >
    <div className="flex w-full items-center justify-between">
      <AllergyBadge risk={f.allergyRisk} />
      {status && <TrialStatusChip status={status} />}
    </div>
    <span className="serif text-base font-semibold text-bark">{f.name}</span>
    <span className="flex items-center gap-1.5 text-[10px] tracking-widest text-bark-soft">
      {f.category}
      {!f.isSystem && (
        <span className="rounded-full bg-sage-soft px-1.5 py-0.5 text-[9px] font-semibold tracking-normal text-sage-dark">
          自訂
        </span>
      )}
    </span>
  </button>
  {!f.isSystem && (
    <button
      type="button"
      aria-label={`編輯 ${f.name}`}
      onClick={() => setFoodForm({ open: true, food: f })}
      className="absolute bottom-2 right-2 rounded-full border border-bark-faded/30 bg-cream p-1.5 text-bark-soft transition-colors hover:text-terracotta"
    >
      <Pencil size={12} />
    </button>
  )}
</li>
```

5. 元件 return 的最外層 `<div className="space-y-4">` 結尾（空狀態區塊之後）加上：

```tsx
{
  foodForm.open && (
    <FoodFormSheet food={foodForm.food} onClose={() => setFoodForm({ open: false })} />
  );
}
```

注意：`foodForm.open` 為 true 時才 mount `FoodFormSheet`，每次開啟都是全新 mount，state 由 `useState` 初始值帶入，不需要 `useEffect` 同步。

- [ ] **Step 2: 型別檢查與 lint**

Run: `pnpm --filter web typecheck && pnpm --filter web lint`
Expected: 皆無錯誤。

- [ ] **Step 3: 跑全部前端測試**

Run: `pnpm --filter web test`
Expected: 全部 PASS（既有 4 個測試檔＋新的 FoodFormSheet 測試）。

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/FoodCatalogPage.tsx
git commit -m "feat(web): add custom food entry points to food catalog page"
```

---

### Task 4: 端對端手動驗證

**Files:** 無（驗證步驟）

- [ ] **Step 1: 啟動開發環境**

Run: `docker compose up -d`（啟動 Postgres 與 API，若已在跑可略過）然後 `pnpm --filter web dev`。
若 API 未跑：`pnpm --filter api dev`（API 在 :3000，web dev server 會 proxy `/api`）。

- [ ] **Step 2: 驗證流程**

在瀏覽器開 `http://localhost:5173/foods`，依序確認：

1. 標題列右側有「＋新增」按鈕，點擊開啟底部 Sheet。
2. 直接按「加入圖鑑」→ 顯示「請輸入食材名稱」。
3. 填「酪梨」＋分類「水果」＋「低敏」→ 送出後 Sheet 關閉，列表出現「酪梨」卡片，卡片有「自訂」徽章與鉛筆按鈕。
4. 再新增一次「酪梨」→ 顯示「已有同名食材」。
5. 點「酪梨」卡片鉛筆 → Sheet 預填，改名「酪梨泥」儲存 → 列表更新。
6. 點系統食材卡片（如「米湯」）→ 無鉛筆、無自訂徽章，點卡片本體仍開啟餵食紀錄 Sheet。
7. 對「酪梨泥」記錄一筆餵食 → 再開編輯點刪除兩次 → 顯示「此食材已有餵食紀錄，無法刪除」。
8. 刪掉該餵食紀錄後再刪「酪梨泥」→ 第一次點「刪除這個食材」變「確認刪除？」，第二次點才刪除，列表移除。

- [ ] **Step 3: 完成（最終 commit 已在 Task 3 完成，若驗證發現問題回頭修）**
