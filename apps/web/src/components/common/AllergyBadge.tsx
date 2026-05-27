import clsx from 'clsx';

type Risk = 'LOW' | 'MEDIUM' | 'HIGH';

const STYLES: Record<Risk, { bg: string; text: string; label: string }> = {
  LOW: { bg: 'bg-allergy-low/20', text: 'text-allergy-low', label: '低敏' },
  MEDIUM: { bg: 'bg-allergy-medium/20', text: 'text-allergy-medium', label: '中敏' },
  HIGH: { bg: 'bg-allergy-high/20', text: 'text-allergy-high', label: '高敏' },
};

export function AllergyBadge({ risk, className }: { risk: Risk; className?: string }) {
  const style = STYLES[risk];
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        style.bg,
        style.text,
        className,
      )}
    >
      {style.label}
    </span>
  );
}
