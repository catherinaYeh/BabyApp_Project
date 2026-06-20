import { useBabyAchievements } from '@/lib/hooks';
import { useAppStore } from '@/lib/store';
import { EmptyState } from '@/components/common/EmptyState';
import { QueryError } from '@/components/common/QueryError';
import { Spinner } from '@/components/common/Spinner';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

export function AchievementsPage() {
  const activeBabyId = useAppStore((s) => s.activeBabyId);
  const { data, isLoading, isError, refetch } = useBabyAchievements(activeBabyId);

  if (!activeBabyId) {
    return <EmptyState icon="🏆" title="先選一位寶寶" description="切換寶寶後查看徽章" />;
  }

  if (isError) {
    return <QueryError onRetry={() => refetch()} />;
  }

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  const unlocked = data.data.filter((a) => a.unlocked);
  const locked = data.data.filter((a) => !a.unlocked);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="serif text-xl font-semibold text-bark">徽章牆</h2>
        <p className="text-xs text-bark-soft">
          已收集 <span className="num text-terracotta">{unlocked.length}</span> / {data.data.length}{' '}
          枚
        </p>
      </div>

      {unlocked.length > 0 && (
        <section>
          <div className="ribbon-label mb-3">已解鎖</div>
          <ul className="grid grid-cols-2 gap-3">
            {unlocked.map((a) => (
              <li
                key={a.achievement.id}
                className="flex flex-col items-center gap-1 rounded-3xl border border-mustard/30 bg-gradient-to-br from-mustard-soft to-cream-card p-4 text-center shadow-paper"
              >
                <span className="text-4xl">{a.achievement.icon}</span>
                <span className="serif text-base font-semibold text-bark">
                  {a.achievement.name}
                </span>
                <span className="text-[10px] text-bark-soft">{a.achievement.description}</span>
                <span className="num mt-1 text-[10px] tracking-widest text-sage-dark">
                  {formatDate(a.unlockedAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {locked.length > 0 && (
        <section>
          <div className="ribbon-label mb-3">待解鎖</div>
          <ul className="grid grid-cols-2 gap-3">
            {locked.map((a) => {
              const p = a.progress;
              const current = p?.current ?? 0;
              const target = p?.target ?? 1;
              const ratio = p ? Math.min(100, (current / target) * 100) : 0;
              return (
                <li
                  key={a.achievement.id}
                  className="flex flex-col items-center gap-1 rounded-3xl border border-bark-faded/15 bg-cream-card p-4 text-center opacity-90"
                >
                  <span className="text-4xl grayscale">{a.achievement.icon}</span>
                  <span className="serif text-base font-semibold text-bark-soft">
                    {a.achievement.name}
                  </span>
                  <span className="text-[10px] text-bark-soft">{a.achievement.description}</span>
                  {p && (
                    <div className="mt-2 w-full">
                      <div className="num text-[11px] text-bark-soft">
                        {current} / {target}
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-cream-deep">
                        <div
                          className="h-full rounded-full bg-mustard transition-all"
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
