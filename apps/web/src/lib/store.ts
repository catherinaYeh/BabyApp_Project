import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { components } from '@/types/api';

type Achievement = components['schemas']['Achievement'];

type AppState = {
  activeBabyId: string | null;
  setActiveBabyId: (id: string | null) => void;

  // UI overlays
  addFeedingSheet: { open: boolean; prefillFoodId?: string };
  openAddFeedingSheet: (prefillFoodId?: string) => void;
  closeAddFeedingSheet: () => void;

  babyPickerOpen: boolean;
  toggleBabyPicker: (open?: boolean) => void;

  // Achievement-unlock toasts
  pendingUnlocks: Achievement[];
  pushUnlocks: (a: Achievement[]) => void;
  shiftUnlock: () => Achievement | undefined;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      activeBabyId: null,
      setActiveBabyId: (id) => set({ activeBabyId: id }),

      addFeedingSheet: { open: false },
      openAddFeedingSheet: (prefillFoodId) =>
        set({ addFeedingSheet: { open: true, prefillFoodId } }),
      closeAddFeedingSheet: () => set({ addFeedingSheet: { open: false } }),

      babyPickerOpen: false,
      toggleBabyPicker: (open) => set({ babyPickerOpen: open ?? !get().babyPickerOpen }),

      pendingUnlocks: [],
      pushUnlocks: (list) => set({ pendingUnlocks: [...get().pendingUnlocks, ...list] }),
      shiftUnlock: () => {
        const [first, ...rest] = get().pendingUnlocks;
        set({ pendingUnlocks: rest });
        return first;
      },
    }),
    {
      name: 'baby-app-store',
      partialize: (s) => ({ activeBabyId: s.activeBabyId }),
    },
  ),
);
