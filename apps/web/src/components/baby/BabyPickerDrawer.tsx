import { Check, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBabies } from '@/lib/hooks';
import { useAppStore } from '@/lib/store';

export function BabyPickerDrawer() {
  const open = useAppStore((s) => s.babyPickerOpen);
  const toggle = useAppStore((s) => s.toggleBabyPicker);
  const activeId = useAppStore((s) => s.activeBabyId);
  const setActive = useAppStore((s) => s.setActiveBabyId);
  const { data } = useBabies();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30" onClick={() => toggle(false)} />
      <div className="absolute bottom-0 left-1/2 w-full max-w-mobile -translate-x-1/2 rounded-t-3xl bg-white pb-6 pt-3 shadow-xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />
        <h2 className="px-5 pb-3 text-base font-semibold">切換寶寶</h2>
        <ul className="max-h-72 overflow-y-auto">
          {data?.data?.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => {
                  setActive(b.id);
                  toggle(false);
                }}
                className="flex w-full items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50"
              >
                <span
                  className="inline-block h-9 w-9 shrink-0 rounded-full border border-slate-100"
                  style={{ backgroundColor: b.avatarColor }}
                />
                <span className="flex flex-1 flex-col items-start">
                  <span className="font-medium">{b.name}</span>
                  <span className="text-xs text-slate-500">
                    {b.birthDate} · {b.ageMonth} 月齡
                  </span>
                </span>
                {b.id === activeId && <Check size={18} className="text-brand" />}
              </button>
            </li>
          ))}
          {(!data?.data || data.data.length === 0) && (
            <li className="px-5 py-6 text-center text-sm text-slate-500">尚未建立寶寶</li>
          )}
        </ul>
        <div className="border-t border-slate-100 pt-2">
          <Link
            to="/babies/new"
            onClick={() => toggle(false)}
            className="flex items-center gap-2 px-5 py-3 text-sm font-medium text-brand"
          >
            <Plus size={16} /> 新增寶寶
          </Link>
        </div>
      </div>
    </div>
  );
}
