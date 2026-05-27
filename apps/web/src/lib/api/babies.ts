import { api } from './client';
import type { components } from '@/types/api';

export type Baby = components['schemas']['Baby'];
export type BabyCreate = components['schemas']['BabyCreate'];
export type BabyUpdate = components['schemas']['BabyUpdate'];
export type BabyListResponse = components['schemas']['BabyListResponse'];

export const babiesApi = {
  list: () => api.get<BabyListResponse>('/babies?limit=100'),
  get: (id: string) => api.get<Baby>(`/babies/${id}`),
  create: (input: BabyCreate) => api.post<Baby>('/babies', input),
  update: (id: string, input: BabyUpdate) => api.patch<Baby>(`/babies/${id}`, input),
  remove: (id: string) => api.delete(`/babies/${id}`),
};
