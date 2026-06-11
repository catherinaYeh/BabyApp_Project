import { Link } from 'react-router-dom';
import { ChevronRight, Upload, Heart, Github } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { THEME_OPTIONS } from '@/lib/theme';

const APP_VERSION = '0.1.0';

export function SettingsPage() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  return (
    <div className="space-y-4">
      <h2 className="serif text-xl font-semibold text-bark">設定</h2>

      <section className="space-y-2">
        <p className="text-[10px] tracking-[0.2em] text-bark-soft">主題風格 THEME</p>
        <div className="grid grid-cols-3 gap-3">
          {THEME_OPTIONS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTheme(t.value)}
              className={`overflow-hidden rounded-2xl border-2 bg-cream-card text-left shadow-paper transition-transform active:scale-95 ${
                theme === t.value ? 'border-terracotta' : 'border-transparent'
              }`}
            >
              <span
                className="flex h-14 items-center justify-center text-lg"
                style={{ background: t.preview }}
              >
                {t.icon}
              </span>
              <span className="block px-2 py-1.5 text-center">
                <span className="block text-[11px] font-semibold text-bark">{t.label}</span>
                <span className="block text-[9px] text-bark-soft">
                  {theme === t.value ? '✓ 使用中' : '點擊切換'}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="paper-card divide-y divide-bark-faded/15">
        <Link
          to="/import"
          className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-cream-deep/30"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mustard-soft text-mustard-dark">
            <Upload size={16} />
          </span>
          <div className="flex-1">
            <p className="serif text-sm font-semibold text-bark">批次匯入舊紀錄</p>
            <p className="text-xs text-bark-soft">把過往的紀錄一次匯入,不重複的會自動跳過</p>
          </div>
          <ChevronRight size={16} className="text-bark-faded" />
        </Link>

        <Link
          to="/babies"
          className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-cream-deep/30"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sage-soft text-sage-dark">
            <Heart size={16} />
          </span>
          <div className="flex-1">
            <p className="serif text-sm font-semibold text-bark">管理寶寶</p>
            <p className="text-xs text-bark-soft">新增、編輯或刪除寶寶檔案</p>
          </div>
          <ChevronRight size={16} className="text-bark-faded" />
        </Link>

        <a
          href="https://github.com/catherinaYeh/BabyApp_Project"
          target="_blank"
          rel="noreferrer noopener"
          className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-cream-deep/30"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-terracotta-soft text-terracotta-dark">
            <Github size={16} />
          </span>
          <div className="flex-1">
            <p className="serif text-sm font-semibold text-bark">原始碼</p>
            <p className="text-xs text-bark-soft">github.com/catherinaYeh/BabyApp_Project</p>
          </div>
          <ChevronRight size={16} className="text-bark-faded" />
        </a>
      </section>

      <section className="paper-card p-4 text-xs text-bark-soft">
        <p className="serif text-bark">關於</p>
        <p className="mt-1">寶寶的食物冒險 · A Weaning Journal</p>
        <p className="num mt-1">v{APP_VERSION}</p>
        <p className="mt-2 text-[10px]">食材敏度分級僅供參考,過敏疑慮請諮詢醫師。</p>
      </section>
    </div>
  );
}
