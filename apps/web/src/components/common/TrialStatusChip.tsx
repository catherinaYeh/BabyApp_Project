import clsx from 'clsx';
import { Leaf, Sprout, Sparkles, ShieldAlert } from 'lucide-react';

type Status = 'UNTRIED' | 'TRYING' | 'UNLOCKED' | 'ALLERGIC';

const STYLES: Record<Status, { bg: string; text: string; label: string; Icon: typeof Leaf }> = {
  UNTRIED: { bg: 'bg-status-untried', text: 'text-bark-soft', label: '未嘗試', Icon: Leaf },
  TRYING: { bg: 'bg-status-trying', text: 'text-mustard-dark', label: '嘗試中', Icon: Sprout },
  UNLOCKED: { bg: 'bg-status-unlocked', text: 'text-sage-dark', label: '已解鎖', Icon: Sparkles },
  ALLERGIC: { bg: 'bg-status-allergic', text: 'text-blush-dark', label: '過敏', Icon: ShieldAlert },
};

export function TrialStatusChip({ status, className }: { status: Status; className?: string }) {
  const { bg, text, label, Icon } = STYLES[status];
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border border-bark-faded/20 px-2.5 py-0.5 text-[11px] font-medium',
        bg,
        text,
        className,
      )}
    >
      <Icon size={12} strokeWidth={2} />
      {label}
    </span>
  );
}
