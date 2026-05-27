import { EmptyState } from '@/components/common/EmptyState';

export function StubPage({ title }: { title: string }) {
  return <EmptyState icon="🚧" title={title} description="此頁面將於後續 milestone 完成" />;
}
