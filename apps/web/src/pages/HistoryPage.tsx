import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { components } from '@/types/api';
import { useFeedings, useFoods, useDeleteFeeding } from '@/lib/hooks';
import { useAppStore } from '@/lib/store';
import { AllergyBadge } from '@/components/common/AllergyBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { QueryError } from '@/components/common/QueryError';
import { Spinner } from '@/components/common/Spinner';

type FoodItem = components['schemas']['FoodItem'];
type FeedingRecord = components['schemas']['FeedingRecord'];

const REACTION_LABELS: Record<FeedingRecord['reaction'], { label: string; color: string }> = {
  NONE: { label: '無反應', color: 'text-sage-dark' },
  MILD: { label: '輕微', color: 'text-mustard-dark' },
  SEVERE: { label: '嚴重', color: 'text-blush-dark' },
};

function formatDayHeader(iso: string): string {
  const d = new Date(iso);
  const weekday = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日 · 週${weekday}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function HistoryPage() {
  const activeBabyId = useAppStore((s) => s.activeBabyId);
  const [view, setView] = useState<'week' | 'month' | 'all'>('week');

  const {
    data: feedingsResp,
    isLoading,
    isError,
    refetch,
  } = useFeedings(activeBabyId, view === 'all' ? { limit: 100 } : { view, limit: 100 });
  const { data: foodsResp } = useFoods({ limit: 100 });
  const deleteFeeding = useDeleteFeeding(activeBabyId ?? '');

  const foodById = useMemo(() => {
    const map = new Map<string, FoodItem>();
    foodsResp?.data?.forEach((f) => map.set(f.id, f));
    return map;
  }, [foodsResp]);

  // Group feedings by local date
  const groups = useMemo<[string, FeedingRecord[]][]>(() => {
    const acc = new Map<string, FeedingRecord[]>();
    feedingsResp?.data?.forEach((fd) => {
      const day = new Date(fd.fedAt).toLocaleDateString('en-CA'); // YYYY-MM-DD
      const arr = acc.get(day) ?? [];
      arr.push(fd);
      acc.set(day, arr);
    });
    return Array.from(acc.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [feedingsResp]);

  if (!activeBabyId) {
    return <EmptyState icon="📖" title="先選一位寶寶" description="切換寶寶後再翻開日誌" />;
  }

  return (
    <div className="space-y-4">
      <h2 className="serif text-xl font-semibold text-bark">餵食日誌</h2>

      <div className="flex gap-2">
        {(
          [
            { v: 'week', label: '本週' },
            { v: 'month', label: '本月' },
            { v: 'all', label: '全部' },
          ] as const
        ).map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => setView(o.v)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              view === o.v
                ? 'border-terracotta bg-terracotta text-cream'
                : 'border-bark-faded/30 bg-cream-card text-bark-soft'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="text-xs text-bark-soft">共 {feedingsResp?.meta?.total ?? 0} 筆紀錄</div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}

      {isError && <QueryError onRetry={() => refetch()} />}

      {!isLoading && !isError && groups.length === 0 && (
        <EmptyState icon="✿" title="這段時間還沒有紀錄" description="點右下角 + 試著紀錄一筆吧" />
      )}

      <ol className="space-y-4">
        {groups.map(([day, items]) => (
          <li key={day}>
            <div className="ribbon-label mb-2">{formatDayHeader(day)}</div>
            <ul className="space-y-2">
              {items.map((fd) => {
                const food = foodById.get(fd.foodId);
                const reaction = REACTION_LABELS[fd.reaction];
                return (
                  <li key={fd.id} className="paper-card flex items-center gap-3 p-3">
                    <div className="num w-12 shrink-0 text-bark-soft">{formatTime(fd.fedAt)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="serif text-base font-semibold text-bark">
                          {food?.name ?? '食材'}
                        </span>
                        {food && <AllergyBadge risk={food.allergyRisk} />}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-bark-soft">
                        <span className="num">{fd.amountMl} ml</span>
                        <span>·</span>
                        <span>第 {fd.attemptCount} 次</span>
                        <span>·</span>
                        <span className={reaction.color}>{reaction.label}</span>
                      </div>
                      {fd.note && (
                        <p className="mt-1 text-xs italic text-bark-soft">「{fd.note}」</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('確定刪除這筆紀錄?')) deleteFeeding.mutate(fd.id);
                      }}
                      className="rounded-full p-2 text-bark-faded transition-colors hover:bg-blush-soft hover:text-blush-dark"
                      aria-label="刪除"
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
