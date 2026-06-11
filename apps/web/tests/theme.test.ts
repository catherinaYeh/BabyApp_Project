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
