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
