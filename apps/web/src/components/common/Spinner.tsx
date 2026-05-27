export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div
      className="inline-block animate-spin rounded-full border-2 border-cream-deep border-t-terracotta"
      style={{ width: size, height: size }}
      aria-label="Loading"
    />
  );
}
