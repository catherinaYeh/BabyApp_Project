import { api } from './client';
import type { components } from '@/types/api';

export type FeedingRecord = components['schemas']['FeedingRecord'];
export type FeedingCreate = components['schemas']['FeedingCreate'];
export type FeedingCreateResponse = components['schemas']['FeedingCreateResponse'];
export type FeedingListResponse = components['schemas']['FeedingListResponse'];

export type FeedingListParams = {
  view?: 'week' | 'month';
  from?: string;
  to?: string;
  foodId?: string;
  limit?: number;
};

export const feedingsApi = {
  list: (babyId: string, params: FeedingListParams = {}) => {
    const search = new URLSearchParams();
    if (params.view) search.set('view', params.view);
    if (params.from) search.set('from', params.from);
    if (params.to) search.set('to', params.to);
    if (params.foodId) search.set('foodId', params.foodId);
    search.set('limit', String(params.limit ?? 50));
    return api.get<FeedingListResponse>(`/babies/${babyId}/feedings?${search.toString()}`);
  },
  create: (babyId: string, input: FeedingCreate) =>
    api.post<FeedingCreateResponse>(`/babies/${babyId}/feedings`, input),
  remove: (babyId: string, feedingId: string) =>
    api.delete(`/babies/${babyId}/feedings/${feedingId}`),
};
