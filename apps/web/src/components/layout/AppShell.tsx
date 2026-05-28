import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, Plus, History, Trophy, Settings } from 'lucide-react';
import { BabySwitcher } from '@/components/baby/BabySwitcher';
import { BabyPickerDrawer } from '@/components/baby/BabyPickerDrawer';
import { useAppStore } from '@/lib/store';

const TABS = [
  { to: '/', label: '首頁', icon: Home },
  { to: '/foods', label: '圖鑑', icon: BookOpen },
  { to: '/history', label: '日誌', icon: History },
  { to: '/achievements', label: '徽章', icon: Trophy },
];

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const openAdd = useAppStore((s) => s.openAddFeedingSheet);

  return (
    <div className="mobile-container relative flex min-h-screen flex-col pb-24">
      <header className="sticky top-0 z-30 border-b border-bark-faded/20 bg-cream/85 px-5 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <div className="leading-tight">
            <p className="serif text-lg font-semibold text-bark">寶寶的食物冒險</p>
            <p className="text-[10px] tracking-[0.2em] text-bark-soft">A WEANING JOURNAL</p>
          </div>
          <div className="flex items-center gap-1">
            <BabySwitcher />
            <Link
              to="/settings"
              aria-label="設定"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-bark-faded/30 bg-cream-card text-bark-soft transition-colors hover:bg-cream-deep"
            >
              <Settings size={16} />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pt-4">{children}</main>

      {/* Floating Add button */}
      <button
        type="button"
        onClick={() => openAdd()}
        className="fixed bottom-[88px] left-1/2 z-20 flex h-14 w-14 -translate-x-[calc(50%+96px)] items-center justify-center rounded-full bg-terracotta text-cream shadow-fab transition-transform active:scale-95"
        aria-label="新增餵食"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      <nav className="fixed bottom-0 left-1/2 z-10 w-full max-w-mobile -translate-x-1/2 border-t border-bark-faded/30 bg-cream-card/95 px-2 py-2 backdrop-blur">
        <ul className="grid grid-cols-4 gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active =
              tab.to === '/' ? location.pathname === '/' : location.pathname.startsWith(tab.to);
            return (
              <li key={tab.to}>
                <Link
                  to={tab.to}
                  className={`flex flex-col items-center gap-0.5 rounded-2xl py-2 text-[11px] transition-colors ${
                    active ? 'text-terracotta' : 'text-bark-soft'
                  }`}
                >
                  <Icon size={20} strokeWidth={active ? 2.2 : 1.6} />
                  <span className={active ? 'font-semibold' : ''}>{tab.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <BabyPickerDrawer />
    </div>
  );
}
