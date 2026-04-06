import { create } from 'zustand';
import Cookies from 'js-cookie';

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: Cookies.get('nd_theme') === 'dark',
  toggle: () =>
    set((state) => {
      const newDark = !state.isDark;
      Cookies.set('nd_theme', newDark ? 'dark' : 'light', { expires: 365 });
      document.documentElement.classList.toggle('dark', newDark);
      return { isDark: newDark };
    }),
}));

// Initialize on load
if (Cookies.get('nd_theme') === 'dark') {
  document.documentElement.classList.add('dark');
}
