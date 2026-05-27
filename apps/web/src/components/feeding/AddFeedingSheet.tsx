import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useCreateFeeding, useFoods } from '@/lib/hooks';
import { AllergyBadge } from '@/components/common/AllergyBadge';
import { ApiError } from '@/lib/api/client';

function nowIsoLocal() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

function toIsoWithOffset(localValue: string) {
  // localValue is e.g. "2026-05-27T11:30"; treat as local time.
  const d = new Date(localValue);
  return d.toISOString();
}

export function AddFeedingSheet() {
  const open = useAppStore((s) => s.addFeedingSheet.open);
  const prefillFoodId = useAppStore((s) => s.addFeedingSheet.prefillFoodId);
  const close = useAppStore((s) => s.closeAddFeedingSheet);
  const activeBabyId = useAppStore((s) => s.activeBabyId);
  const create = useCreateFeeding();

  const [search, setSearch] = useState('');
  const [foodId, setFoodId] = useState<string | undefined>(prefillFoodId);
  const [fedAt, setFedAt] = useState(nowIsoLocal());
  const [amountMl, setAmountMl] = useState(20);
  const [reaction, setReaction] = useState<'NONE' | 'MILD' | 'SEVERE'>('NONE');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: foods } = useFoods({
    search: search.length > 0 ? search : undefined,
    sort: 'risk_asc',
    limit: 30,
  });

  const selected = useMemo(() => foods?.data?.find((f) => f.id === foodId), [foods, foodId]);

  if (!open) return null;

  function reset() {
    setSearch('');
    setFoodId(undefined);
    setFedAt(nowIsoLocal());
    setAmountMl(20);
    setReaction('NONE');
    setNote('');
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!activeBabyId) {
      setError('請先建立或選擇寶寶');
      return;
    }
    if (!foodId) {
      setError('請選擇食材');
      return;
    }
    try {
      await create.mutateAsync({
        babyId: activeBabyId,
        input: {
          foodId,
          fedAt: toIsoWithOffset(fedAt),
          amountMl,
          reaction,
          ...(note ? { note } : {}),
        },
      });
      reset();
      close();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.problem.status === 409) {
          setError('已有同時間紀錄,請調整時間或回去編輯舊紀錄');
        } else {
          const msg = err.problem.errors?.[0]?.message ?? err.problem.detail ?? err.problem.title;
          setError(msg);
        }
      } else {
        setError(String(err));
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-bark/40" onClick={close} />
      <form
        onSubmit={submit}
        className="absolute bottom-0 left-1/2 max-h-[85vh] w-full max-w-mobile -translate-x-1/2 overflow-y-auto rounded-t-4xl border-t border-bark-faded/20 bg-cream-card pb-8 shadow-paper"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-bark-faded/20 bg-cream-card px-5 py-3">
          <div>
            <h2 className="serif text-lg font-semibold text-bark">記錄一筆嚐鮮</h2>
            <p className="text-[10px] tracking-[0.2em] text-bark-soft">A NEW PAGE</p>
          </div>
          <button type="button" onClick={close} aria-label="關閉" className="text-bark-faded">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4 px-5 pt-4">
          {!selected && (
            <div>
              <input
                type="text"
                placeholder="搜尋食材"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-bark-faded/30 bg-cream/50 px-3 py-2 text-bark focus:border-terracotta focus:outline-none"
              />
              <ul className="mt-2 max-h-44 divide-y divide-bark-faded/20 overflow-y-auto rounded-xl border border-bark-faded/20 bg-cream/50">
                {foods?.data?.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => setFoodId(f.id)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-cream-deep/50"
                    >
                      <span className="serif text-sm text-bark">{f.name}</span>
                      <AllergyBadge risk={f.allergyRisk} />
                    </button>
                  </li>
                ))}
                {foods?.data?.length === 0 && (
                  <li className="py-3 text-center text-xs text-bark-soft">沒有符合的食材</li>
                )}
              </ul>
            </div>
          )}
          {selected && (
            <div className="flex items-center justify-between rounded-xl border border-bark-faded/20 bg-cream/50 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="serif text-base font-semibold text-bark">{selected.name}</span>
                <AllergyBadge risk={selected.allergyRisk} />
              </div>
              <button
                type="button"
                onClick={() => setFoodId(undefined)}
                className="text-xs font-semibold text-terracotta"
              >
                換食材
              </button>
            </div>
          )}

          <label className="block">
            <span className="text-sm text-bark-soft">時間</span>
            <input
              type="datetime-local"
              value={fedAt}
              onChange={(e) => setFedAt(e.target.value)}
              className="mt-1 w-full rounded-xl border border-bark-faded/30 bg-cream/50 px-3 py-2 text-bark focus:border-terracotta focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-sm text-bark-soft">份量 (ml)</span>
            <input
              type="number"
              min={1}
              max={1000}
              value={amountMl}
              onChange={(e) => setAmountMl(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-bark-faded/30 bg-cream/50 px-3 py-2 text-bark focus:border-terracotta focus:outline-none"
            />
          </label>

          <fieldset>
            <legend className="text-sm text-bark-soft">反應</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(
                [
                  { v: 'NONE', label: '無反應', emoji: '🌿' },
                  { v: 'MILD', label: '輕微', emoji: '🌼' },
                  { v: 'SEVERE', label: '嚴重', emoji: '⚠️' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setReaction(opt.v)}
                  className={`flex flex-col items-center gap-0.5 rounded-xl border px-2 py-2 text-sm transition-colors ${
                    reaction === opt.v
                      ? 'border-terracotta bg-terracotta-soft/40 text-bark'
                      : 'border-bark-faded/30 text-bark-soft'
                  }`}
                >
                  <span className="text-lg">{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </fieldset>

          {reaction !== 'NONE' && (
            <label className="block">
              <span className="text-sm text-bark-soft">備註</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="例如:臉部紅疹"
                className="mt-1 w-full rounded-xl border border-bark-faded/30 bg-cream/50 px-3 py-2 text-bark focus:border-terracotta focus:outline-none"
              />
            </label>
          )}

          {error && <p className="text-sm text-blush-dark">{error}</p>}

          <button
            type="submit"
            disabled={create.isPending}
            className="w-full rounded-2xl bg-terracotta py-3 font-semibold text-cream shadow-fab disabled:opacity-50"
          >
            {create.isPending ? '紀錄中…' : '把這一頁收下'}
          </button>
        </div>
      </form>
    </div>
  );
}
