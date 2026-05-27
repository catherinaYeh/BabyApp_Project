import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-bark-faded/40 bg-cream-card p-8 text-center">
      {icon && <div className="text-3xl">{icon}</div>}
      <h3 className="serif text-lg text-bark">{title}</h3>
      {description && <p className="text-sm text-bark-soft">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
