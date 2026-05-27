import { Link } from 'react-router-dom';
import { useDashboard } from '@/lib/hooks';
import { useAppStore } from '@/lib/store';
import { ProgressRing } from '@/components/common/ProgressRing';
import { AllergyBadge } from '@/components/common/AllergyBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { Spinner } from '@/components/common/Spinner';

const STATUS_CARDS = [
  { key: 'UNTRIED', label: '未嘗試', emoji: '🍃', bg: 'bg-status-untried text-bark-soft' },
  { key: 'TRYING', label: '嘗試中', emoji: '🌱', bg: 'bg-status-trying text-mustard-dark' },
  { key: 'UNLOCKED', label: '已解鎖', emoji: '🌟', bg: 'bg-status-unlocked text-sage-dark' },
  { key: 'ALLERGIC', label: '過敏', emoji: '⚠️', bg: 'bg-status-allergic text-blush-dark' },
] as const;

export function HomePage() {
  const activeBabyId = useAppStore((s) => s.activeBabyId);
  const openAdd = useAppStore((s) => s.openAddFeedingSheet);
  const { data, isLoading, isError } = useDashboard(activeBabyId);

  if (!activeBabyId) {
    return (
      <EmptyState
        icon="👶"
        title="先來認識新主角吧"
        description="建立一個寶寶檔案,翻開副食品的第一頁"
        action={
          <Link
            to="/babies/new"
            className="inline-flex items-center gap-1 rounded-full bg-terracotta px-4 py-2 text-sm font-semibold text-cream shadow-sm"
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
    return <EmptyState icon="🌧️" title="頁面翻不開了" description="請確認 API 正在運作" />;
  }

  return (
    <div className="space-y-5">
      {/* Storybook greeting */}
      <section className="relative overflow-hidden rounded-4xl bg-gradient-to-br from-cream-deep via-cream-card to-terracotta-soft/40 p-5 shadow-paper">
        <p className="text-[10px] tracking-[0.3em] text-bark-soft">
          CHAPTER · {data.baby.ageMonth} M
        </p>
        <p className="serif mt-1 text-2xl font-semibold text-bark">{data.baby.name} 的食物日記</p>
        <p className="mt-2 text-sm text-bark-soft">「今天又翻開了一頁,你又認識了哪些新味道呢?」</p>
        <div className="pointer-events-none absolute -right-3 -top-3 text-5xl opacity-30">🍂</div>
      </section>

      {/* Status cards */}
      <section className="grid grid-cols-4 gap-2">
        {STATUS_CARDS.map((s) => (
          <div
            key={s.key}
            className={`rounded-2xl border border-bark-faded/15 p-3 text-center ${s.bg}`}
          >
            <div className="text-lg leading-none">{s.emoji}</div>
            <div className="num mt-1 text-2xl text-bark">{data.statusCounts[s.key]}</div>
            <div className="mt-0.5 text-[11px] text-bark-soft">{s.label}</div>
          </div>
        ))}
      </section>

      {/* Progress */}
      <section className="paper-card flex items-center gap-4 p-5">
        <ProgressRing percent={data.progress.percent} />
        <div className="flex-1">
          <p className="text-[10px] tracking-[0.2em] text-bark-soft">UNLOCKED</p>
          <p className="num mt-1 text-3xl text-bark">
            {data.progress.unlocked}
            <span className="ml-1 text-base font-normal text-bark-faded">
              / {data.progress.total}
            </span>
          </p>
          <Link
            to="/foods"
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-terracotta"
          >
            翻開完整圖鑑 →
          </Link>
        </div>
      </section>

      {/* Recommendations */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="serif text-lg text-bark">下一頁試試看</h2>
          <span className="ribbon-label">低敏優先</span>
        </div>
        {data.recommendations.length === 0 ? (
          <EmptyState icon="🎉" title="所有食材都翻過一輪了" description="副食品大冒險完成!" />
        ) : (
          <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
            {data.recommendations.map((f) => (
              <li key={f.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => openAdd(f.id)}
                  className="flex w-36 flex-col items-start gap-2 rounded-3xl border border-bark-faded/15 bg-cream-card p-4 text-left shadow-paper transition-transform active:scale-95"
                >
                  <AllergyBadge risk={f.allergyRisk} />
                  <span className="serif text-base font-semibold text-bark">{f.name}</span>
                  <span className="text-[10px] tracking-widest text-bark-soft">{f.category}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recent unlocks */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="serif text-lg text-bark">最近的勳章</h2>
          <Link to="/achievements" className="text-xs font-semibold text-terracotta">
            看全部 →
          </Link>
        </div>
        {data.recentUnlocks.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-bark-faded/40 bg-cream-card p-5 text-center text-xs text-bark-soft">
            ✿ 還沒有任何徽章。記錄一次餵食就有機會喔!
          </div>
        ) : (
          <ul className="space-y-2">
            {data.recentUnlocks.map((u) => (
              <li key={u.achievement.id} className="paper-card flex items-center gap-3 p-3">
                <span className="text-3xl">{u.achievement.icon}</span>
                <div className="flex-1">
                  <p className="serif text-base font-semibold text-bark">{u.achievement.name}</p>
                  <p className="text-xs text-bark-soft">{u.achievement.description}</p>
                </div>
                <span className="text-[10px] tracking-widest text-sage-dark">UNLOCKED</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
