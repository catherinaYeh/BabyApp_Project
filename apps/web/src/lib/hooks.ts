import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { babiesApi, type BabyCreate, type BabyUpdate } from './api/babies';
import { foodsApi, type FoodCreate, type FoodFilters, type FoodUpdate } from './api/foods';
import { feedingsApi, type FeedingListParams } from './api/feedings';
import { dashboardApi } from './api/dashboard';
import { trialsApi } from './api/trials';
import { achievementsApi } from './api/achievements';
import { useAppStore } from './store';

export const useBabies = () =>
  useQuery({
    queryKey: ['babies'],
    queryFn: () => babiesApi.list(),
  });

export const useFoods = (filters: FoodFilters = {}) =>
  useQuery({
    queryKey: ['foods', filters],
    queryFn: () => foodsApi.list(filters),
  });

export const useDashboard = (babyId: string | null) =>
  useQuery({
    queryKey: ['dashboard', babyId],
    enabled: !!babyId,
    queryFn: () => dashboardApi.get(babyId!),
  });

export const useFeedings = (babyId: string | null, params: FeedingListParams = {}) =>
  useQuery({
    queryKey: ['feedings', babyId, params],
    enabled: !!babyId,
    queryFn: () => feedingsApi.list(babyId!, params),
  });

export const useTrials = (babyId: string | null) =>
  useQuery({
    queryKey: ['trials', babyId],
    enabled: !!babyId,
    queryFn: () => trialsApi.list(babyId!),
  });

export const useBabyAchievements = (babyId: string | null) =>
  useQuery({
    queryKey: ['baby-achievements', babyId],
    enabled: !!babyId,
    queryFn: () => achievementsApi.listForBaby(babyId!),
  });

export function useCreateBaby() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BabyCreate) => babiesApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['babies'] });
    },
  });
}

export function useUpdateBaby(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BabyUpdate) => babiesApi.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['babies'] });
      qc.invalidateQueries({ queryKey: ['dashboard', id] });
    },
  });
}

export function useDeleteBaby() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => babiesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['babies'] });
    },
  });
}

export function useCreateFeeding() {
  const qc = useQueryClient();
  const pushUnlocks = useAppStore((s) => s.pushUnlocks);
  return useMutation({
    mutationFn: (args: { babyId: string; input: Parameters<typeof feedingsApi.create>[1] }) =>
      feedingsApi.create(args.babyId, args.input),
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ['feedings', vars.babyId] });
      qc.invalidateQueries({ queryKey: ['dashboard', vars.babyId] });
      qc.invalidateQueries({ queryKey: ['trials', vars.babyId] });
      qc.invalidateQueries({ queryKey: ['baby-achievements', vars.babyId] });
      if (data.newlyUnlockedAchievements?.length) {
        pushUnlocks(data.newlyUnlockedAchievements);
      }
    },
  });
}

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

export function useDeleteFeeding(babyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (feedingId: string) => feedingsApi.remove(babyId, feedingId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feedings', babyId] });
      qc.invalidateQueries({ queryKey: ['dashboard', babyId] });
      qc.invalidateQueries({ queryKey: ['trials', babyId] });
      qc.invalidateQueries({ queryKey: ['baby-achievements', babyId] });
    },
  });
}
