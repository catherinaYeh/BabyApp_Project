import { beforeEach, describe, test, expect } from 'vitest';
import { useAppStore } from '@/lib/store';

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState({
      activeBabyId: null,
      theme: 'paper',
      addFeedingSheet: { open: false },
      babyPickerOpen: false,
      pendingUnlocks: [],
    });
  });

  test('theme 預設為 paper', () => {
    expect(useAppStore.getState().theme).toBe('paper');
  });

  test('setTheme 更新主題', () => {
    useAppStore.getState().setTheme('night');
    expect(useAppStore.getState().theme).toBe('night');
  });

  test('setActiveBabyId persists in state', () => {
    useAppStore.getState().setActiveBabyId('baby-1');
    expect(useAppStore.getState().activeBabyId).toBe('baby-1');
  });

  test('openAddFeedingSheet accepts prefillFoodId', () => {
    useAppStore.getState().openAddFeedingSheet('food-42');
    expect(useAppStore.getState().addFeedingSheet).toEqual({
      open: true,
      prefillFoodId: 'food-42',
    });
  });

  test('toggleBabyPicker without arg flips', () => {
    useAppStore.getState().toggleBabyPicker();
    expect(useAppStore.getState().babyPickerOpen).toBe(true);
    useAppStore.getState().toggleBabyPicker();
    expect(useAppStore.getState().babyPickerOpen).toBe(false);
  });

  test('pushUnlocks queues + shiftUnlock returns FIFO', () => {
    const a = { id: '1', code: 'A', name: 'A name' } as never;
    const b = { id: '2', code: 'B', name: 'B name' } as never;
    useAppStore.getState().pushUnlocks([a, b]);
    expect(useAppStore.getState().pendingUnlocks).toHaveLength(2);
    expect(useAppStore.getState().shiftUnlock()?.id).toBe('1');
    expect(useAppStore.getState().shiftUnlock()?.id).toBe('2');
    expect(useAppStore.getState().shiftUnlock()).toBeUndefined();
  });
});
