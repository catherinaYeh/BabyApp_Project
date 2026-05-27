import { api } from './client';
import type { components } from '@/types/api';

export type Dashboard = components['schemas']['Dashboard'];

export const dashboardApi = {
  get: (babyId: string) => api.get<Dashboard>(`/babies/${babyId}/dashboard`),
};
