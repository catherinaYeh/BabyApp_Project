import clsx from 'clsx';

type Risk = 'LOW' | 'MEDIUM' | 'HIGH';

const STYLES: Record<Risk, { bg: string; text: string; label: string }> = {
  LOW: { bg: 'bg-sage-soft', text: 'text-sage-dark', label: '低敏' },
  MEDIUM: { bg: 'bg-mustard-soft', text: 'text-mustard-dark', label: '中敏' },
  HIGH: { bg: 'bg-blush-soft', text: 'text-blush-dark', label: '高敏' },
};

export function AllergyBadge({ risk, className }: { risk: Risk; className?: string }) {
  const style = STYLES[risk];
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border border-bark-faded/20 px-2.5 py-0.5 text-[11px] font-medium',
        style.bg,
        style.text,
        className,
      )}
    >
      {style.label}
    </span>
  );
}
