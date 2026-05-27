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
      className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm transition-colors hover:bg-slate-50"
    >
      {active ? (
        <>
          <span
            className="inline-block h-7 w-7 shrink-0 rounded-full border-2 border-white shadow"
            style={{ backgroundColor: active.avatarColor }}
            aria-hidden
          />
          <span className="flex flex-col items-start leading-tight">
            <span className="text-sm font-semibold">{active.name}</span>
            <span className="text-[10px] text-slate-500">{active.ageMonth}M</span>
          </span>
        </>
      ) : (
        <span className="text-sm text-slate-500">尚未建立寶寶</span>
      )}
      <ChevronDown size={16} className="text-slate-400" />
    </button>
  );
}
