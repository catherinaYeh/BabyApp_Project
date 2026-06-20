import { EmptyState } from './EmptyState';

/**
 * Friendly error state with a retry action for failed data queries.
 * Reuses EmptyState so the look matches the rest of the app (no new visual
 * style). Pass the query's `refetch` as `onRetry`.
 */
export function QueryError({
  onRetry,
  title = '糟糕，載入失敗了',
  description = '請確認網路連線後再試一次',
}: {
  onRetry: () => void;
  title?: string;
  description?: string;
}) {
  return (
    <EmptyState
      icon="🌧️"
      title={title}
      description={description}
      action={
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1 rounded-full bg-terracotta px-4 py-2 text-sm font-semibold text-cream"
        >
          重試
        </button>
      }
    />
  );
}
