import { Link } from 'react-router-dom';
import { useDashboard } from '@/lib/hooks';
import { useAppStore } from '@/lib/store';
import { ProgressRing } from '@/components/common/ProgressRing';
import { AllergyBadge } from '@/components/common/AllergyBadge';
import { TrialStatusChip } from '@/components/common/TrialStatusChip';
import { EmptyState } from '@/components/common/EmptyState';
import { Spinner } from '@/components/common/Spinner';

export function HomePage() {
  const activeBabyId = useAppStore((s) => s.activeBabyId);
  const openAdd = useAppStore((s) => s.openAddFeedingSheet);
  const { data, isLoading, isError } = useDashboard(activeBabyId);

  if (!activeBabyId) {
    return (
      <EmptyState
        icon="👶"
        title="先建立一個寶寶"
        description="建立寶寶後就能開始記錄與解鎖食材"
        action={
          <Link
            to="/babies/new"
            className="inline-flex items-center gap-1 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white"
          >
            前往建立
          </Link>
        }
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (isError || !data) {
    return <EmptyState icon="⚠️" title="載入失敗" description="請確認 API 正在運作" />;
  }

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <section className="rounded-2xl bg-gradient-to-br from-brand/10 to-accent-game/20 p-4">
        <p className="text-xs text-slate-500">今天也辛苦了</p>
        <p className="text-lg font-semibold">
          {data.baby.name} <span className="num text-slate-400">{data.baby.ageMonth}M</span>
        </p>
      </section>

      {/* Status cards (4) */}
      <section className="grid grid-cols-4 gap-2">
        {(
          [
            { key: 'UNTRIED', label: '未嘗試', color: 'bg-status-untried text-slate-700' },
            { key: 'TRYING', label: '嘗試中', color: 'bg-status-trying text-amber-900' },
            { key: 'UNLOCKED', label: '已解鎖', color: 'bg-status-unlocked text-emerald-900' },
            { key: 'ALLERGIC', label: '過敏', color: 'bg-status-allergic text-red-900' },
          ] as const
        ).map((s) => (
          <div key={s.key} className={`rounded-2xl p-3 text-center ${s.color}`}>
            <div className="num text-2xl">{data.statusCounts[s.key]}</div>
            <div className="text-[11px] opacity-80">{s.label}</div>
          </div>
        ))}
      </section>

      {/* Progress */}
      <section className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm">
        <ProgressRing percent={data.progress.percent} />
        <div className="flex-1">
          <p className="text-sm text-slate-500">已解鎖食材</p>
          <p className="num text-2xl">
            {data.progress.unlocked}{' '}
            <span className="text-base text-slate-400">/ {data.progress.total}</span>
          </p>
          <Link to="/foods" className="mt-1 inline-block text-xs text-brand">
            看完整圖鑑 →
          </Link>
        </div>
      </section>

      {/* Recommendations */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">下一個試試看</h2>
          <span className="text-[11px] text-slate-400">低敏優先</span>
        </div>
        {data.recommendations.length === 0 ? (
          <EmptyState icon="🎉" title="全部食材都嘗試過了" description="副食品大冒險完成!" />
        ) : (
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {data.recommendations.map((f) => (
              <li key={f.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => openAdd(f.id)}
                  className="flex w-32 flex-col items-start gap-2 rounded-2xl bg-white p-3 text-left shadow-sm transition-transform active:scale-95"
                >
                  <AllergyBadge risk={f.allergyRisk} />
                  <span className="text-sm font-medium">{f.name}</span>
                  <span className="text-[10px] text-slate-400">{f.category}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recent unlocks */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">最近解鎖徽章</h2>
          <Link to="/achievements" className="text-xs text-brand">
            全部 →
          </Link>
        </div>
        {data.recentUnlocks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-center text-xs text-slate-400">
            還沒有解鎖徽章。記錄餵食就有機會喔!
          </div>
        ) : (
          <ul className="space-y-2">
            {data.recentUnlocks.map((u) => (
              <li
                key={u.achievement.id}
                className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm"
              >
                <span className="text-2xl">{u.achievement.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{u.achievement.name}</p>
                  <p className="text-xs text-slate-500">{u.achievement.description}</p>
                </div>
                <TrialStatusChip status="UNLOCKED" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
