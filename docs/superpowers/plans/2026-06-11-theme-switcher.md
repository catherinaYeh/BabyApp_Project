# 三主題切換系統實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 設定頁可在三主題（手帳紙感 paper／夢幻糖果 candy／午夜星圖 night）之間切換，選擇跨重啟保留。

**Architecture:** 全部色票轉成 CSS 變數（RGB 分量形式），Tailwind 色票名稱不變改指向變數；`<html data-theme>` 切換變數作用域；主題特效（星空、雲朵、光暈、漸層）以 `[data-theme]` 選擇器掛在新檔 `themes.css`，元件對主題無感知。Zustand persist 記住選擇。

**Tech Stack:** React 18 + TypeScript、Tailwind CSS 3（CSS variables + `<alpha-value>`）、Zustand persist、Vitest + Testing Library。

**Spec:** `docs/superpowers/specs/2026-06-11-theme-switcher-design.md`

**重要背景（給零上下文的工程師）：**

- pnpm monorepo，前端在 `apps/web`，指令用 `pnpm --filter web <script>` 從 repo 根目錄執行。
- 既有 palette 在 `apps/web/tailwind.config.ts`（cream/bark/terracotta/sage/mustard/blush/status 系列）。`brand`、`accent`、`allergy`、`backgroundImage.paper`、`backgroundSize.paper` 已 grep 確認無元件引用（body 的紙紋會搬進 themes.css），可刪。
- 全域樣式在 `apps/web/src/styles/globals.css`（注意 line 12 有重複的 `bg-paper bg-paper`，整行會被取代）。
- store 在 `apps/web/src/lib/store.ts`，已用 zustand `persist` + `partialize`。
- 測試放 `apps/web/tests/`，jsdom 環境、`@` alias 指向 `src`、setup 已載入 jest-dom。
- 注意：repo 全域 `pnpm lint` 因既有 eslint config 問題本來就是紅的（優化報告已列），不要把它當成你改壞的訊號；只要你新增/修改的檔案沒有「新」錯誤即可。
- commit 用 conventional commits；pre-commit 跑 prettier。

---

### Task 1: 主題型別、applyTheme helper、store 狀態（TDD）

**Files:**

- Create: `apps/web/src/lib/theme.ts`
- Test: `apps/web/tests/theme.test.ts`
- Modify: `apps/web/src/lib/store.ts`
- Modify: `apps/web/tests/useAppStore.test.ts`

- [ ] **Step 1: 寫失敗測試（theme helper）**

建立 `apps/web/tests/theme.test.ts`：

```ts
import { describe, test, expect, afterEach } from 'vitest';
import { applyTheme, THEME_OPTIONS } from '@/lib/theme';

afterEach(() => {
  delete document.documentElement.dataset.theme;
});

describe('applyTheme', () => {
  test('paper 會移除 data-theme 屬性', () => {
    document.documentElement.dataset.theme = 'night';
    applyTheme('paper');
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  test.each(['candy', 'night'] as const)('%s 會設定 data-theme', (t) => {
    applyTheme(t);
    expect(document.documentElement.dataset.theme).toBe(t);
  });
});

describe('THEME_OPTIONS', () => {
  test('依序包含三個主題', () => {
    expect(THEME_OPTIONS.map((t) => t.value)).toEqual(['paper', 'candy', 'night']);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm --filter web exec vitest run tests/theme.test.ts`
Expected: FAIL（找不到模組 `@/lib/theme`）。

- [ ] **Step 3: 實作 theme.ts**

建立 `apps/web/src/lib/theme.ts`：

```ts
export type Theme = 'paper' | 'candy' | 'night';

export const THEME_OPTIONS: Array<{
  value: Theme;
  label: string;
  icon: string;
  /** 設定頁預覽卡縮圖底色（固定值，不跟隨當前主題） */
  preview: string;
}> = [
  {
    value: 'paper',
    label: '手帳紙感',
    icon: '📖',
    preview: 'linear-gradient(160deg, #FBF6E9, #F2EAD3)',
  },
  {
    value: 'candy',
    label: '夢幻糖果',
    icon: '🍭',
    preview: 'linear-gradient(135deg, #FFE3F1, #E3EDFF, #E0FFF4)',
  },
  {
    value: 'night',
    label: '午夜星圖',
    icon: '✦',
    preview: 'radial-gradient(ellipse at 50% 0%, #232A54, #0B1026)',
  },
];

/** 同步主題到 <html data-theme>；paper 為預設作用域（:root），不掛屬性。 */
export function applyTheme(theme: Theme): void {
  if (theme === 'paper') {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = theme;
  }
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm --filter web exec vitest run tests/theme.test.ts`
Expected: 4 tests PASS。

- [ ] **Step 5: store 加 theme 狀態（先補測試）**

修改 `apps/web/tests/useAppStore.test.ts`——`beforeEach` 的 `setState` 物件加一行 `theme: 'paper',`，並在 describe 區塊內加兩個測試：

```ts
test('theme 預設為 paper', () => {
  expect(useAppStore.getState().theme).toBe('paper');
});

test('setTheme 更新主題', () => {
  useAppStore.getState().setTheme('night');
  expect(useAppStore.getState().theme).toBe('night');
});
```

修改 `apps/web/src/lib/store.ts`：

1. 頂部加 import：`import type { Theme } from './theme';`
2. `AppState` type 加（放在 `activeBabyId` 之後）：

```ts
  theme: Theme;
  setTheme: (theme: Theme) => void;
```

3. store 實作加（放在 `setActiveBabyId` 之後）：

```ts
      theme: 'paper',
      setTheme: (theme) => set({ theme }),
```

4. `partialize` 改為：

```ts
      partialize: (s) => ({ activeBabyId: s.activeBabyId, theme: s.theme }),
```

- [ ] **Step 6: 跑全部測試與型別檢查**

Run: `pnpm --filter web test && pnpm --filter web typecheck`
Expected: 全部 PASS（含新的 theme/store 測試）、tsc 無錯誤。

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/theme.ts apps/web/tests/theme.test.ts apps/web/src/lib/store.ts apps/web/tests/useAppStore.test.ts
git commit -m "feat(web): add theme state and applyTheme helper"
```

---

### Task 2: 色票變數化（themes.css、tailwind.config、globals.css、ProgressRing、TrialStatusChip）

**Files:**

- Create: `apps/web/src/styles/themes.css`
- Modify: `apps/web/src/styles/globals.css`
- Modify: `apps/web/tailwind.config.ts`
- Modify: `apps/web/src/main.tsx`
- Modify: `apps/web/src/components/common/ProgressRing.tsx:23,31`
- Modify: `apps/web/src/components/common/TrialStatusChip.tsx`

- [ ] **Step 1: 建立 themes.css（三組變數＋主題特效）**

建立 `apps/web/src/styles/themes.css`，完整內容：

```css
/* ============================================================
   主題 token：RGB 分量存放（供 Tailwind <alpha-value> 使用）。
   :root = 手帳紙感（預設）；data-theme 切換整組作用域。
   ============================================================ */

:root {
  --c-cream: 251 246 233;
  --c-cream-card: 255 252 243;
  --c-cream-deep: 242 234 211;
  --c-bark: 74 53 40;
  --c-bark-soft: 122 99 84;
  --c-bark-faded: 181 164 147;
  --c-terracotta: 214 125 92;
  --c-terracotta-dark: 185 99 66;
  --c-terracotta-soft: 241 200 183;
  --c-sage: 156 175 136;
  --c-sage-dark: 122 142 105;
  --c-sage-soft: 212 225 197;
  --c-mustard: 224 172 76;
  --c-mustard-dark: 185 135 36;
  --c-mustard-soft: 246 227 183;
  --c-blush: 232 168 154;
  --c-blush-dark: 199 120 102;
  --c-blush-soft: 247 217 210;
  --c-status-untried: 232 221 201;

  --shadow-card: 0 1px 0 rgba(74, 53, 40, 0.06), 0 8px 20px -12px rgba(74, 53, 40, 0.18);
  --shadow-fab: 0 8px 22px -6px rgba(214, 125, 92, 0.55);
  --shadow-ribbon: 2px 2px 0 rgba(74, 53, 40, 0.12);
  --grad-primary: none;
}

/* 🍭 夢幻糖果 */
[data-theme='candy'] {
  --c-cream: 255 244 250;
  --c-cream-card: 255 255 255;
  --c-cream-deep: 240 235 255;
  --c-bark: 90 74 110;
  --c-bark-soft: 154 138 176;
  --c-bark-faded: 197 186 215;
  --c-terracotta: 255 143 199;
  --c-terracotta-dark: 214 102 161;
  --c-terracotta-soft: 255 214 235;
  --c-sage: 109 199 138;
  --c-sage-dark: 61 164 94;
  --c-sage-soft: 212 247 220;
  --c-mustard: 255 184 92;
  --c-mustard-dark: 207 148 48;
  --c-mustard-soft: 255 240 205;
  --c-blush: 255 143 170;
  --c-blush-dark: 214 106 133;
  --c-blush-soft: 255 224 230;
  --c-status-untried: 240 235 255;

  --shadow-card: 0 6px 18px rgba(157, 143, 255, 0.22), inset 0 -3px 0 rgba(255, 143, 199, 0.18);
  --shadow-fab: 0 6px 16px rgba(199, 155, 255, 0.55);
  --shadow-ribbon: 2px 2px 0 rgba(157, 143, 255, 0.25);
  --grad-primary: linear-gradient(135deg, #ff9ed2, #c79bff);
}

/* ✦ 午夜星圖 */
[data-theme='night'] {
  --c-cream: 11 16 38;
  --c-cream-card: 22 27 58;
  --c-cream-deep: 35 42 84;
  --c-bark: 243 233 210;
  --c-bark-soft: 141 147 184;
  --c-bark-faded: 100 107 145;
  --c-terracotta: 232 196 106;
  --c-terracotta-dark: 201 161 78;
  --c-terracotta-soft: 92 76 38;
  --c-sage: 168 230 161;
  --c-sage-dark: 126 191 120;
  --c-sage-soft: 38 64 44;
  --c-mustard: 255 217 138;
  --c-mustard-dark: 230 184 92;
  --c-mustard-soft: 77 62 28;
  --c-blush: 231 140 120;
  --c-blush-dark: 212 110 92;
  --c-blush-soft: 84 38 34;
  --c-status-untried: 42 48 84;

  --shadow-card: 0 0 20px rgba(120, 140, 255, 0.15);
  --shadow-fab: 0 0 18px rgba(232, 196, 106, 0.55);
  --shadow-ribbon: 2px 2px 0 rgba(232, 196, 106, 0.2);
  --grad-primary: linear-gradient(135deg, #e8c46a, #b8860b);
}

/* ============================================================
   主題切換過渡
   ============================================================ */
html,
body {
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
}

/* ============================================================
   Body 背景層（各主題專屬，純 CSS 零圖片）
   ============================================================ */

/* 手帳紙感：點點紙紋（原 tailwind bg-paper utility 搬入）。
   isolation 讓 ::before/::after 裝飾層（z-index:-1）能畫在
   body 背景之上、內容之下。 */
body {
  isolation: isolate;
  background-image: radial-gradient(circle at 1px 1px, rgba(74, 53, 40, 0.06) 1px, transparent 0);
  background-size: 14px 14px;
  background-attachment: fixed;
}

/* 糖果：全息粉彩漸層 */
[data-theme='candy'] body {
  background-image: linear-gradient(150deg, #ffe3f1 0%, #e3edff 38%, #e0fff4 72%, #fff5d9 100%);
  background-size: cover;
  background-attachment: fixed;
}

/* 星空：深藍径向漸層 */
[data-theme='night'] body {
  background-image: radial-gradient(ellipse at 50% 0%, #232a54 0%, #0b1026 55%, #070a1a 100%);
  background-size: cover;
  background-attachment: fixed;
}

/* 糖果：兩朵飄浮雲（fixed 覆蓋層，不擋互動） */
@keyframes theme-floaty {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

[data-theme='candy'] body::before,
[data-theme='candy'] body::after {
  content: '';
  position: fixed;
  z-index: -1;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.65);
  filter: blur(4px);
  pointer-events: none;
  animation: theme-floaty 6s ease-in-out infinite;
}
[data-theme='candy'] body::before {
  width: 130px;
  height: 64px;
  top: 96px;
  right: -30px;
}
[data-theme='candy'] body::after {
  width: 90px;
  height: 48px;
  bottom: 140px;
  left: -20px;
  animation-delay: -3s;
}

/* 星空：星點層（fixed 覆蓋層）＋緩慢閃爍 */
@keyframes theme-twinkle {
  0%,
  100% {
    opacity: 0.9;
  }
  50% {
    opacity: 0.35;
  }
}

[data-theme='night'] body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-image:
    radial-gradient(1px 1px at 15% 12%, #fff 50%, transparent 51%),
    radial-gradient(1.5px 1.5px at 78% 8%, #ffe9b3 50%, transparent 51%),
    radial-gradient(1px 1px at 60% 22%, #cdd6ff 50%, transparent 51%),
    radial-gradient(1px 1px at 30% 38%, #fff 50%, transparent 51%),
    radial-gradient(1.5px 1.5px at 90% 45%, #fff 50%, transparent 51%),
    radial-gradient(1px 1px at 8% 60%, #ffe9b3 50%, transparent 51%),
    radial-gradient(1px 1px at 50% 72%, #fff 50%, transparent 51%),
    radial-gradient(1.5px 1.5px at 72% 85%, #cdd6ff 50%, transparent 51%),
    radial-gradient(1px 1px at 25% 90%, #fff 50%, transparent 51%);
  animation: theme-twinkle 4s ease-in-out infinite;
}

/* ============================================================
   主題特效（元件無感知，靠選擇器加料）
   ============================================================ */

/* fancy 主題：主行動色按鈕改漸層（蓋在 background-color 之上） */
[data-theme='candy'] .bg-terracotta,
[data-theme='night'] .bg-terracotta {
  background-image: var(--grad-primary);
}

/* 糖果：頁面標題霓彩漸層字 */
[data-theme='candy'] h2.serif {
  background-image: linear-gradient(90deg, #ff8fc7, #9d8fff, #5ec8ff);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}

/* 星空：頁面標題柔光 */
[data-theme='night'] h2.serif {
  text-shadow: 0 0 12px rgba(232, 196, 106, 0.35);
}

/* 星空：紙卡改金線描邊＋微光暈 */
[data-theme='night'] .paper-card {
  border-color: rgba(232, 196, 106, 0.3);
}

/* 星空彩蛋：已解鎖狀態 chip 尾端加一顆星 */
[data-theme='night'] [data-status='UNLOCKED']::after {
  content: '✦';
  margin-left: 2px;
  color: #ffe9b3;
  text-shadow: 0 0 6px rgba(232, 196, 106, 0.8);
}

/* ============================================================
   可近性：尊重減少動態偏好
   ============================================================ */
@media (prefers-reduced-motion: reduce) {
  [data-theme='candy'] body::before,
  [data-theme='candy'] body::after,
  [data-theme='night'] body::before {
    animation: none;
  }
}
```

- [ ] **Step 2: tailwind.config.ts 色票改指向變數**

整個 `apps/web/tailwind.config.ts` 改為（`fontFamily`/`maxWidth`/`borderRadius` 不變；`colors` 與 `boxShadow` 改變數；刪除 `allergy`、`brand`、`accent`、`backgroundImage`、`backgroundSize`）：

```ts
import type { Config } from 'tailwindcss';

/** 色票一律指向 themes.css 的 CSS 變數，data-theme 切換整組換色。 */
const v = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: { DEFAULT: v('--c-cream'), card: v('--c-cream-card'), deep: v('--c-cream-deep') },
        bark: { DEFAULT: v('--c-bark'), soft: v('--c-bark-soft'), faded: v('--c-bark-faded') },
        terracotta: {
          DEFAULT: v('--c-terracotta'),
          dark: v('--c-terracotta-dark'),
          soft: v('--c-terracotta-soft'),
        },
        sage: { DEFAULT: v('--c-sage'), dark: v('--c-sage-dark'), soft: v('--c-sage-soft') },
        mustard: {
          DEFAULT: v('--c-mustard'),
          dark: v('--c-mustard-dark'),
          soft: v('--c-mustard-soft'),
        },
        blush: { DEFAULT: v('--c-blush'), dark: v('--c-blush-dark'), soft: v('--c-blush-soft') },
        status: {
          untried: v('--c-status-untried'),
          trying: v('--c-mustard-soft'),
          unlocked: v('--c-sage-soft'),
          allergic: v('--c-blush-soft'),
        },
      },
      fontFamily: {
        serif: ['Fraunces', 'Noto Serif TC', 'Georgia', 'serif'],
        sans: ['Quicksand', 'Noto Sans TC', 'system-ui', 'sans-serif'],
        num: ['Fraunces', 'Manrope', 'Noto Sans TC', 'sans-serif'],
      },
      maxWidth: {
        mobile: '480px',
      },
      boxShadow: {
        fab: 'var(--shadow-fab)',
        paper: 'var(--shadow-card)',
        ribbon: 'var(--shadow-ribbon)',
      },
      borderRadius: {
        '4xl': '2.25rem',
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 3: globals.css 調整**

兩處修改：

1. body 區塊（原 line 11-14）改為（紙紋已搬去 themes.css）：

```css
body {
  @apply min-h-screen;
}
```

2. `.paper-card` 的寫死邊框色（原 line 39）改為變數：

```css
border: 1px solid rgb(var(--c-bark) / 0.06);
```

- [ ] **Step 4: main.tsx 載入 themes.css**

`apps/web/src/main.tsx` 在 `import './styles/globals.css';` 之後加一行：

```ts
import './styles/themes.css';
```

- [ ] **Step 5: ProgressRing 改用主題色（Tailwind stroke utilities）**

`apps/web/src/components/common/ProgressRing.tsx`：兩個 `<circle>` 的 `stroke` 屬性改 className——

底圈（原 line 23 `stroke="#F2EAD3"`）改為：移除 `stroke` 屬性、加 `className="stroke-cream-deep"`。
進度圈（原 line 31 `stroke="#E0AC4C"`）改為：移除 `stroke` 屬性、加 `className="stroke-mustard"`。

- [ ] **Step 6: TrialStatusChip 加 data-status 鉤子（夜空彩蛋用）**

`apps/web/src/components/common/TrialStatusChip.tsx` 的 `<span>` 加屬性 `data-status={status}`（放在 `className` 之前即可）。元件不讀主題，純粹給 CSS 選擇器用。

- [ ] **Step 7: 驗證（測試＋型別＋production build）**

Run: `pnpm --filter web test && pnpm --filter web typecheck && pnpm --filter web build`
Expected: 測試全 PASS、tsc 無錯誤、vite build 成功（CSS 變數寫法若有打錯字，build 階段 Tailwind 會報錯）。

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/styles/themes.css apps/web/src/styles/globals.css apps/web/tailwind.config.ts apps/web/src/main.tsx apps/web/src/components/common/ProgressRing.tsx apps/web/src/components/common/TrialStatusChip.tsx
git commit -m "feat(web): tokenize palette as CSS variables with candy/night themes"
```

---

### Task 3: AppShell 同步 data-theme ＋ 設定頁切換器（TDD）

**Files:**

- Modify: `apps/web/src/components/layout/AppShell.tsx`
- Modify: `apps/web/src/pages/SettingsPage.tsx`
- Test: `apps/web/tests/SettingsPage.test.tsx`

- [ ] **Step 1: 寫失敗測試（設定頁切換器）**

建立 `apps/web/tests/SettingsPage.test.tsx`：

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, beforeEach } from 'vitest';
import { SettingsPage } from '@/pages/SettingsPage';
import { useAppStore } from '@/lib/store';

beforeEach(() => {
  useAppStore.setState({ theme: 'paper' });
});

describe('SettingsPage 主題切換器', () => {
  test('顯示三個主題選項，預設標示手帳紙感使用中', () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /手帳紙感/ })).toHaveTextContent('✓ 使用中');
    expect(screen.getByRole('button', { name: /夢幻糖果/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /午夜星圖/ })).toBeInTheDocument();
  });

  test('點擊夢幻糖果會切換 store 的 theme', () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /夢幻糖果/ }));
    expect(useAppStore.getState().theme).toBe('candy');
    expect(screen.getByRole('button', { name: /夢幻糖果/ })).toHaveTextContent('✓ 使用中');
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm --filter web exec vitest run tests/SettingsPage.test.tsx`
Expected: FAIL（找不到「手帳紙感」按鈕——切換器尚未存在）。

- [ ] **Step 3: SettingsPage 加主題切換器**

修改 `apps/web/src/pages/SettingsPage.tsx`：

1. 頂部加 import：

```tsx
import { useAppStore } from '@/lib/store';
import { THEME_OPTIONS } from '@/lib/theme';
```

2. 元件內（`return` 之前）加：

```tsx
const theme = useAppStore((s) => s.theme);
const setTheme = useAppStore((s) => s.setTheme);
```

3. 在 `<h2>設定</h2>` 之後、第一個 `<section className="paper-card ...">` 之前插入：

```tsx
<section className="space-y-2">
  <p className="text-[10px] tracking-[0.2em] text-bark-soft">主題風格 THEME</p>
  <div className="grid grid-cols-3 gap-3">
    {THEME_OPTIONS.map((t) => (
      <button
        key={t.value}
        type="button"
        onClick={() => setTheme(t.value)}
        className={`overflow-hidden rounded-2xl border-2 bg-cream-card text-left shadow-paper transition-transform active:scale-95 ${
          theme === t.value ? 'border-terracotta' : 'border-transparent'
        }`}
      >
        <span
          className="flex h-14 items-center justify-center text-lg"
          style={{ background: t.preview }}
        >
          {t.icon}
        </span>
        <span className="block px-2 py-1.5 text-center">
          <span className="block text-[11px] font-semibold text-bark">{t.label}</span>
          <span className="block text-[9px] text-bark-soft">
            {theme === t.value ? '✓ 使用中' : '點擊切換'}
          </span>
        </span>
      </button>
    ))}
  </div>
</section>
```

- [ ] **Step 4: AppShell 同步 data-theme**

修改 `apps/web/src/components/layout/AppShell.tsx`：

1. import 調整：

```tsx
import { useEffect, type ReactNode } from 'react';
import { applyTheme } from '@/lib/theme';
```

（原本的 `import type { ReactNode } from 'react';` 整行取代為上面第一行。）

2. 元件內（`const openAdd = ...` 之後）加：

```tsx
const theme = useAppStore((s) => s.theme);
useEffect(() => {
  applyTheme(theme);
}, [theme]);
```

- [ ] **Step 5: 跑測試確認通過**

Run: `pnpm --filter web exec vitest run tests/SettingsPage.test.tsx`
Expected: 2 tests PASS。

- [ ] **Step 6: 全套驗證**

Run: `pnpm --filter web test && pnpm --filter web typecheck`
Expected: 全部 PASS。

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/layout/AppShell.tsx apps/web/src/pages/SettingsPage.tsx apps/web/tests/SettingsPage.test.tsx
git commit -m "feat(web): add theme picker in settings and sync data-theme"
```

---

### Task 4: 三主題視覺驗證（真實瀏覽器）

**Files:** 無（驗證步驟；發現的明顯 off-palette 問題在本 task 內修）

- [ ] **Step 1: 啟動環境**

```bash
docker compose up -d postgres        # 若已在跑可略過
cd apps/api && pnpm dev &            # API :3000
cd apps/web && pnpm dev &            # Web :5173（proxy /api）
```

- [ ] **Step 2: Playwright 截圖三主題**

用 Playwright（apps/web 內已安裝）寫一個臨時腳本（放 /tmp，不進 repo）：對每個主題（透過 `localStorage` 預先寫入 `baby-app-store` 的 `{"state":{"theme":"candy"},"version":0}` 或點設定頁卡片），截 `/`（首頁）與 `/foods`（圖鑑）兩頁，共 6 張圖。

- [ ] **Step 3: 目視檢查清單**

逐張確認：

1. night：文字可讀（米金字 vs 深藍底）、星空有出現且不擋互動、卡片金線、FAB 金色光暈、標題柔光、`已解鎖` chip 有 ✦。
2. candy：粉彩漸層背景＋雲朵、主按鈕粉紫漸層、h2 霓彩字、卡片糖果陰影。
3. paper：與改版前無視覺差異（token 化不應改變預設外觀）。
4. 三主題下 ProgressRing 圓環顏色跟著主題走。
5. 設定頁切換即時生效、重新整理後主題保留。
6. 突兀的寫死色票（如 BadgeUnlockToast、EmptyState）若在 fancy 主題下明顯違和，改成對應的 palette class（屬本 task 範圍）。

- [ ] **Step 4: 修正發現的問題後最終驗證**

Run: `pnpm --filter web test && pnpm --filter web typecheck && pnpm --filter web build`
Expected: 全 PASS。

- [ ] **Step 5: Commit（若 Step 3 有修正）**

```bash
git add -A apps/web/src
git commit -m "fix(web): polish off-palette colors across themes"
```
