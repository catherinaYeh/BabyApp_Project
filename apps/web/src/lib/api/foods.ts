import { api } from './client';
import type { components } from '@/types/api';

export type FoodItem = components['schemas']['FoodItem'];
export type FoodListResponse = components['schemas']['FoodListResponse'];

export type FoodFilters = {
  category?: FoodItem['category'];
  allergyRisk?: FoodItem['allergyRisk'];
  search?: string;
  sort?: 'risk_asc' | 'risk_desc' | 'name_asc' | 'name_desc';
  limit?: number;
};

export const foodsApi = {
  list: (filters: FoodFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.category) params.set('category', filters.category);
    if (filters.allergyRisk) params.set('allergyRisk', filters.allergyRisk);
    if (filters.search) params.set('search', filters.search);
    if (filters.sort) params.set('sort', filters.sort);
    params.set('limit', String(filters.limit ?? 100));
    return api.get<FoodListResponse>(`/foods?${params.toString()}`);
  },
};
