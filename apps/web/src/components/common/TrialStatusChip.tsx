import clsx from 'clsx';
import { LockKeyhole, Sparkles, Hourglass, ShieldAlert } from 'lucide-react';

type Status = 'UNTRIED' | 'TRYING' | 'UNLOCKED' | 'ALLERGIC';

const STYLES: Record<
  Status,
  { bg: string; text: string; label: string; Icon: typeof LockKeyhole }
> = {
  UNTRIED: { bg: 'bg-status-untried', text: 'text-slate-600', label: '未嘗試', Icon: LockKeyhole },
  TRYING: { bg: 'bg-status-trying', text: 'text-amber-900', label: '嘗試中', Icon: Hourglass },
  UNLOCKED: { bg: 'bg-status-unlocked', text: 'text-emerald-900', label: '已解鎖', Icon: Sparkles },
  ALLERGIC: { bg: 'bg-status-allergic', text: 'text-red-900', label: '過敏', Icon: ShieldAlert },
};

export function TrialStatusChip({ status, className }: { status: Status; className?: string }) {
  const { bg, text, label, Icon } = STYLES[status];
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        bg,
        text,
        className,
      )}
    >
      <Icon size={12} />
      {label}
    </span>
  );
}
