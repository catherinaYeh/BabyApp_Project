import { useState } from 'react';
import { X } from 'lucide-react';
import { useCreateFood, useDeleteFood, useUpdateFood } from '@/lib/hooks';
import { ApiError } from '@/lib/api/client';
import type { FoodItem } from '@/lib/api/foods';
import type { components } from '@/types/api';

type FoodCategory = components['schemas']['FoodCategory'];
type AllergyRisk = components['schemas']['AllergyRisk'];

const CATEGORIES: Array<{ value: FoodCategory; label: string }> = [
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

const RISKS: Array<{ value: AllergyRisk; label: string; activeClass: string }> = [
  { value: 'LOW', label: '低敏', activeClass: 'border-sage bg-sage-soft/60 text-bark' },
  { value: 'MEDIUM', label: '中敏', activeClass: 'border-mustard bg-mustard-soft/60 text-bark' },
  { value: 'HIGH', label: '高敏', activeClass: 'border-blush-dark bg-blush-soft/60 text-bark' },
];

function errorMessage(err: unknown, conflictMessage: string): string {
  if (err instanceof ApiError) {
    if (err.problem.status === 409) return conflictMessage;
    return err.problem.errors?.[0]?.message ?? err.problem.detail ?? err.problem.title;
  }
  return String(err);
}

type Props = {
  /** 有傳 food 即為編輯模式，否則為新增模式。 */
  food?: FoodItem;
  onClose: () => void;
};

export function FoodFormSheet({ food, onClose }: Props) {
  const create = useCreateFood();
  const update = useUpdateFood();
  const remove = useDeleteFood();

  const [name, setName] = useState(food?.name ?? '');
  const [category, setCategory] = useState<FoodCategory | undefined>(food?.category);
  const [risk, setRisk] = useState<AllergyRisk | undefined>(food?.allergyRisk);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isEdit = !!food;
  const pending = create.isPending || update.isPending || remove.isPending;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError('請輸入食材名稱');
      return;
    }
    if (trimmed.length > 30) {
      setError('名稱最多 30 字');
      return;
    }
    if (!category) {
      setError('請選擇分類');
      return;
    }
    if (!risk) {
      setError('請選擇過敏風險');
      return;
    }
    try {
      if (food) {
        await update.mutateAsync({
          id: food.id,
          input: { name: trimmed, category, allergyRisk: risk },
        });
      } else {
        await create.mutateAsync({ name: trimmed, category, allergyRisk: risk });
      }
      onClose();
    } catch (err) {
      setError(errorMessage(err, '已有同名食材'));
    }
  }

  async function handleDelete() {
    if (!food) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setError(null);
    try {
      await remove.mutateAsync(food.id);
      onClose();
    } catch (err) {
      setError(errorMessage(err, '此食材已有餵食紀錄，無法刪除'));
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-bark/40" onClick={onClose} />
      <form
        onSubmit={submit}
        className="absolute bottom-0 left-1/2 max-h-[85vh] w-full max-w-mobile -translate-x-1/2 overflow-y-auto rounded-t-4xl border-t border-bark-faded/20 bg-cream-card pb-8 shadow-paper"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-bark-faded/20 bg-cream-card px-5 py-3">
          <div>
            <h2 className="serif text-lg font-semibold text-bark">
              {isEdit ? '編輯食材' : '新增食材'}
            </h2>
            <p className="text-[10px] tracking-[0.2em] text-bark-soft">
              {isEdit ? 'EDIT INGREDIENT' : 'NEW INGREDIENT'}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="關閉" className="text-bark-faded">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 px-5 pt-4">
          <label className="block">
            <span className="text-sm text-bark-soft">名稱</span>
            <input
              type="text"
              value={name}
              maxLength={30}
              placeholder="例如:酪梨"
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-bark-faded/30 bg-cream/50 px-3 py-2 text-bark focus:border-terracotta focus:outline-none"
            />
          </label>

          <fieldset>
            <legend className="text-sm text-bark-soft">分類</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    category === c.value
                      ? 'border-terracotta bg-terracotta text-cream'
                      : 'border-bark-faded/30 bg-cream/50 text-bark-soft'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm text-bark-soft">過敏風險</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {RISKS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRisk(r.value)}
                  className={`rounded-xl border px-2 py-2 text-sm transition-colors ${
                    risk === r.value ? r.activeClass : 'border-bark-faded/30 text-bark-soft'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </fieldset>

          {error && <p className="text-sm text-blush-dark">{error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-2xl bg-terracotta py-3 font-semibold text-cream shadow-fab disabled:opacity-50"
          >
            {pending ? '處理中…' : isEdit ? '儲存修改' : '加入圖鑑'}
          </button>

          {isEdit && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className={`w-full rounded-2xl border py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                confirmingDelete
                  ? 'border-blush-dark bg-blush-soft/60 text-blush-dark'
                  : 'border-bark-faded/30 text-bark-soft'
              }`}
            >
              {confirmingDelete ? '確認刪除？' : '刪除這個食材'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
