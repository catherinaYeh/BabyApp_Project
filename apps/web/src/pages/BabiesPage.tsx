import { Link } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { useBabies, useDeleteBaby } from '@/lib/hooks';
import { useAppStore } from '@/lib/store';
import { EmptyState } from '@/components/common/EmptyState';
import { QueryError } from '@/components/common/QueryError';

export function BabiesPage() {
  const { data, isLoading, isError, refetch } = useBabies();
  const activeId = useAppStore((s) => s.activeBabyId);
  const setActive = useAppStore((s) => s.setActiveBabyId);
  const del = useDeleteBaby();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="serif text-xl font-semibold text-bark">寶寶</h2>
        <Link
          to="/babies/new"
          className="inline-flex items-center gap-1 rounded-full bg-terracotta px-3 py-1.5 text-sm font-semibold text-cream shadow-sm"
        >
          <Plus size={16} /> 新增
        </Link>
      </div>

      {isLoading && <p className="text-sm text-bark-soft">載入中…</p>}

      {isError && <QueryError onRetry={() => refetch()} />}

      {!isLoading && !isError && (!data?.data || data.data.length === 0) && (
        <EmptyState
          icon="👶"
          title="還沒有寶寶"
          description="新增一個寶寶開始記錄試敏歷程"
          action={
            <Link
              to="/babies/new"
              className="inline-flex items-center gap-1 rounded-full bg-terracotta px-4 py-2 text-sm font-semibold text-cream"
            >
              <Plus size={16} /> 新增寶寶
            </Link>
          }
        />
      )}

      <ul className="space-y-2">
        {data?.data?.map((b) => (
          <li key={b.id} className="paper-card flex items-center justify-between p-3">
            <button
              type="button"
              onClick={() => setActive(b.id)}
              className="flex flex-1 items-center gap-3 text-left"
            >
              <span
                className="inline-block h-12 w-12 shrink-0 rounded-full border border-bark-faded/20"
                style={{ backgroundColor: b.avatarColor }}
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="serif text-base font-semibold text-bark">{b.name}</span>
                  {b.id === activeId && (
                    <span className="rounded-full bg-terracotta-soft px-2 py-0.5 text-[10px] font-semibold text-terracotta-dark">
                      使用中
                    </span>
                  )}
                </div>
                <div className="text-xs text-bark-soft">
                  {b.birthDate} · {b.ageMonth} 月齡
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`確定要刪除「${b.name}」?所有餵食紀錄一併移除。`)) {
                  del.mutate(b.id);
                }
              }}
              className="rounded-full p-2 text-bark-faded transition-colors hover:bg-blush-soft hover:text-blush-dark"
              aria-label="刪除"
            >
              <Trash2 size={18} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
