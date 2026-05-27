import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import type { components } from '@/types/api';

type Achievement = components['schemas']['Achievement'];

const DISMISS_AFTER_MS = 3200;

/**
 * Pops the head of `pendingUnlocks` and displays it as a celebratory banner
 * at the top of the screen. Auto-dismisses after a few seconds.
 */
export function BadgeUnlockToast() {
  const pending = useAppStore((s) => s.pendingUnlocks);
  const shift = useAppStore((s) => s.shiftUnlock);
  const [current, setCurrent] = useState<Achievement | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (current || pending.length === 0) return;
    const next = shift();
    if (next) {
      setCurrent(next);
      requestAnimationFrame(() => setShow(true));
    }
  }, [pending, current, shift]);

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => setShow(false), DISMISS_AFTER_MS);
    return () => clearTimeout(timer);
  }, [current]);

  function handleExited() {
    if (!show) setCurrent(null);
  }

  if (!current) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-4"
      aria-live="polite"
    >
      <div
        onTransitionEnd={handleExited}
        className={`pointer-events-auto mt-4 w-full max-w-mobile transform rounded-3xl border border-mustard/40 bg-gradient-to-br from-mustard-soft via-cream-card to-terracotta-soft p-4 shadow-paper transition-all duration-300 ${
          show ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-4xl">{current.icon}</span>
          <div className="flex-1 leading-tight">
            <p className="text-[10px] tracking-[0.3em] text-bark-soft">★ NEW ACHIEVEMENT ★</p>
            <p className="serif text-lg font-semibold text-bark">{current.name}</p>
            <p className="text-xs text-bark-soft">{current.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
