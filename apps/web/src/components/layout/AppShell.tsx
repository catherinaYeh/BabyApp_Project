import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, Plus, History, Trophy } from 'lucide-react';
import { BabySwitcher } from '@/components/baby/BabySwitcher';
import { BabyPickerDrawer } from '@/components/baby/BabyPickerDrawer';
import { useAppStore } from '@/lib/store';

const TABS = [
  { to: '/', label: '首頁', icon: Home },
  { to: '/foods', label: '圖鑑', icon: BookOpen },
  { to: '/history', label: '歷史', icon: History },
  { to: '/achievements', label: '徽章', icon: Trophy },
];

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const openAdd = useAppStore((s) => s.openAddFeedingSheet);

  return (
    <div className="mobile-container flex min-h-screen flex-col bg-slate-50 pb-24">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-100 bg-white/80 px-4 py-3 backdrop-blur">
        <h1 className="text-sm font-semibold text-slate-700">寶寶副食品試敏</h1>
        <BabySwitcher />
      </header>

      <main className="flex-1 px-4 pt-4">{children}</main>

      {/* Floating Add button */}
      <button
        type="button"
        onClick={() => openAdd()}
        className="fixed bottom-20 left-1/2 z-20 flex h-14 w-14 -translate-x-[calc(50%+96px)] items-center justify-center rounded-full bg-brand text-white shadow-fab transition-transform active:scale-95"
        aria-label="新增餵食"
      >
        <Plus size={26} />
      </button>

      <nav className="fixed bottom-0 left-1/2 z-10 w-full max-w-mobile -translate-x-1/2 border-t border-slate-100 bg-white/95 px-2 py-2 backdrop-blur">
        <ul className="grid grid-cols-4 gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active =
              tab.to === '/' ? location.pathname === '/' : location.pathname.startsWith(tab.to);
            return (
              <li key={tab.to}>
                <Link
                  to={tab.to}
                  className={`flex flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] ${
                    active ? 'text-brand' : 'text-slate-500'
                  }`}
                >
                  <Icon size={20} />
                  {tab.label}
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
