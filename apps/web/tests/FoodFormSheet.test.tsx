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
