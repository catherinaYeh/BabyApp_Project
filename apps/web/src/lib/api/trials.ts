import { api } from './client';
import type { components } from '@/types/api';

export type TrialState = components['schemas']['TrialState'];

export const trialsApi = {
  list: (babyId: string) => api.get<{ data: TrialState[] }>(`/babies/${babyId}/trials`),
};
