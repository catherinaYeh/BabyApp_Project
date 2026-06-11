export type Theme = 'paper' | 'candy' | 'night';

export const THEME_OPTIONS: Array<{
  value: Theme;
  label: string;
  icon: string;
  /** 設定頁預覽卡縮圖底色（固定值，不跟隨當前主題） */
  preview: string;
}> = [
  {
    value: 'paper',
    label: '手帳紙感',
    icon: '📖',
    preview: 'linear-gradient(160deg, #FBF6E9, #F2EAD3)',
  },
  {
    value: 'candy',
    label: '夢幻糖果',
    icon: '🍭',
    preview: 'linear-gradient(135deg, #FFE3F1, #E3EDFF, #E0FFF4)',
  },
  {
    value: 'night',
    label: '午夜星圖',
    icon: '✦',
    preview: 'radial-gradient(ellipse at 50% 0%, #232A54, #0B1026)',
  },
];

/** 同步主題到 <html data-theme>；paper 為預設作用域（:root），不掛屬性。 */
export function applyTheme(theme: Theme): void {
  if (theme === 'paper') {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = theme;
  }
}
