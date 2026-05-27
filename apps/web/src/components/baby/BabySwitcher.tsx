import { ChevronDown } from 'lucide-react';
import { useBabies } from '@/lib/hooks';
import { useAppStore } from '@/lib/store';

export function BabySwitcher() {
  const { data } = useBabies();
  const activeId = useAppStore((s) => s.activeBabyId);
  const toggle = useAppStore((s) => s.toggleBabyPicker);

  const active = data?.data?.find((b) => b.id === activeId) ?? data?.data?.[0];

  return (
    <button
      type="button"
      onClick={() => toggle(true)}
      className="flex items-center gap-2 rounded-full border border-bark-faded/30 bg-cream-card px-3 py-1.5 shadow-sm transition-colors hover:bg-cream-deep"
    >
      {active ? (
        <>
          <span
            className="inline-block h-7 w-7 shrink-0 rounded-full border-2 border-cream-card shadow"
            style={{ backgroundColor: active.avatarColor }}
            aria-hidden
          />
          <span className="flex flex-col items-start leading-tight">
            <span className="serif text-sm font-semibold text-bark">{active.name}</span>
            <span className="text-[10px] tracking-widest text-bark-soft">{active.ageMonth} M</span>
          </span>
        </>
      ) : (
        <span className="text-sm text-bark-soft">尚未建立寶寶</span>
      )}
      <ChevronDown size={16} className="text-bark-faded" />
    </button>
  );
}
