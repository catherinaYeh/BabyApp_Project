import { useMemo, useState } from 'react';
import { Pencil, Plus, Search } from 'lucide-react';
import { useFoods, useTrials } from '@/lib/hooks';
import { useAppStore } from '@/lib/store';
import { AllergyBadge } from '@/components/common/AllergyBadge';
import { TrialStatusChip } from '@/components/common/TrialStatusChip';
import { Spinner } from '@/components/common/Spinner';
import { FoodFormSheet } from '@/components/foods/FoodFormSheet';
import type { FoodItem } from '@/lib/api/foods';
import type { components } from '@/types/api';

type FoodCategory = components['schemas']['FoodCategory'];
type AllergyRisk = components['schemas']['AllergyRisk'];

const CATEGORIES: Array<{ value: FoodCategory | 'ALL'; label: string }> = [
  { value: 'ALL', label: '全部' },
  { value: 'VEGETABLE', label: '蔬菜' },
  { value: 'FRUIT', label: '水果' },
  { value: 'GRAIN', label: '五穀' },
  { value: 'MEAT', label: '肉類' },
  { value: 'SEAFOOD', label: '海鮮' },
  { value: 'EGG', label: '蛋' },
  { value: 'DAIRY', label: '乳製' },
  { value: 'MUSHROOM', label: '菇類' },
  { value: 'NUT', label: '堅果' },
  { value: 'OTHER', label: '其他' },
];

const RISKS: Array<{ value: AllergyRisk | 'ALL'; label: string }> = [
  { value: 'ALL', label: '全部敏度' },
  { value: 'LOW', label: '低敏' },
  { value: 'MEDIUM', label: '中敏' },
  { value: 'HIGH', label: '高敏' },
];

export function FoodCatalogPage() {
  const [category, setCategory] = useState<FoodCategory | 'ALL'>('ALL');
  const [risk, setRisk] = useState<AllergyRisk | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [foodForm, setFoodForm] = useState<{ open: false } | { open: true; food?: FoodItem }>({
    open: false,
  });

  const filters = useMemo(
    () => ({
      ...(category !== 'ALL' ? { category } : {}),
      ...(risk !== 'ALL' ? { allergyRisk: risk } : {}),
      ...(search ? { search } : {}),
      sort: 'risk_asc' as const,
      limit: 100,
    }),
    [category, risk, search],
  );

  const { data: foodsResp, isLoading } = useFoods(filters);
  const activeBabyId = useAppStore((s) => s.activeBabyId);
  const openAdd = useAppStore((s) => s.openAddFeedingSheet);
  const { data: trialsResp } = useTrials(activeBabyId);

  const statusByFood = useMemo(() => {
    const map = new Map<string, components['schemas']['TrialStatus']>();
    trialsResp?.data?.forEach((t) => map.set(t.foodId, t.status));
    return map;
  }, [trialsResp]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="serif text-xl font-semibold text-bark">食材圖鑑</h2>
        <button
          type="button"
          onClick={() => setFoodForm({ open: true })}
          className="flex items-center gap-1 rounded-full bg-terracotta px-3 py-1.5 text-xs font-semibold text-cream shadow-fab transition-transform active:scale-95"
        >
          <Plus size={14} />
          新增
        </button>
      </div>

      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-bark-faded"
        />
        <input
          type="text"
          placeholder="搜尋食材"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-full border border-bark-faded/30 bg-cream-card py-2 pl-9 pr-3 text-sm text-bark focus:border-terracotta focus:outline-none"
        />
      </div>

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2 pb-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                category === c.value
                  ? 'border-terracotta bg-terracotta text-cream'
                  : 'border-bark-faded/30 bg-cream-card text-bark-soft'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {RISKS.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => setRisk(r.value)}
            className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
              risk === r.value
                ? 'border-mustard bg-mustard-soft text-mustard-dark'
                : 'border-bark-faded/30 text-bark-soft'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="text-xs text-bark-soft">共 {foodsResp?.meta?.total ?? 0} 個食材</div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}

      <ul className="grid grid-cols-2 gap-3">
        {foodsResp?.data?.map((f) => {
          const status = statusByFood.get(f.id);
          return (
            <li key={f.id} className="relative">
              <button
                type="button"
                onClick={() => openAdd(f.id)}
                className="flex h-full w-full flex-col items-start gap-2 rounded-3xl border border-bark-faded/15 bg-cream-card p-3 text-left shadow-paper transition-transform active:scale-95"
              >
                <div className="flex w-full items-center justify-between">
                  <AllergyBadge risk={f.allergyRisk} />
                  {status && <TrialStatusChip status={status} />}
                </div>
                <span className="serif text-base font-semibold text-bark">{f.name}</span>
                <span className="flex items-center gap-1.5 text-[10px] tracking-widest text-bark-soft">
                  {f.category}
                  {!f.isSystem && (
                    <span className="rounded-full bg-sage-soft px-1.5 py-0.5 text-[9px] font-semibold tracking-normal text-sage-dark">
                      自訂
                    </span>
                  )}
                </span>
              </button>
              {!f.isSystem && (
                <button
                  type="button"
                  aria-label={`編輯 ${f.name}`}
                  onClick={() => setFoodForm({ open: true, food: f })}
                  className="absolute bottom-2 right-2 rounded-full border border-bark-faded/30 bg-cream p-1.5 text-bark-soft transition-colors hover:text-terracotta"
                >
                  <Pencil size={12} />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {!isLoading && foodsResp?.data?.length === 0 && (
        <div className="rounded-3xl border border-dashed border-bark-faded/40 bg-cream-card p-8 text-center text-sm text-bark-soft">
          沒有符合的食材
        </div>
      )}

      {foodForm.open && (
        <FoodFormSheet food={foodForm.food} onClose={() => setFoodForm({ open: false })} />
      )}
    </div>
  );
}
