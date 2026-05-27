import { api } from './client';
import type { components } from '@/types/api';

export type Achievement = components['schemas']['Achievement'];
export type BabyAchievement = components['schemas']['BabyAchievement'];

export const achievementsApi = {
  listAll: () => api.get<{ data: Achievement[] }>(`/achievements`),
  listForBaby: (babyId: string) =>
    api.get<{ data: BabyAchievement[] }>(`/babies/${babyId}/achievements`),
};
