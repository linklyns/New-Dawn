import { create } from 'zustand';
import Cookies from 'js-cookie';

export type ThemeMode = 'auto' | 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  applyTheme: () => void;
}

const getStoredMode = (): ThemeMode => {
  const stored = Cookies.get('nd_theme') as ThemeMode | undefined;
  return stored ?? 'auto';
};

const prefersDarkQuery = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

const getIsDark = (mode: ThemeMode) => {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return prefersDarkQuery?.matches ?? false;
};

const applyThemeMode = (mode: ThemeMode) => {
  const dark = getIsDark(mode);
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', dark);
  }
  return dark;
};

const initialMode = getStoredMode();

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: initialMode,
  isDark: getIsDark(initialMode),
  setMode: (mode: ThemeMode) => {
    Cookies.set('nd_theme', mode, { expires: 365 });
    const dark = applyThemeMode(mode);
    set({ mode, isDark: dark });
  },
  applyTheme: () => {
    const mode = get().mode;
    const dark = applyThemeMode(mode);
    set({ isDark: dark });
  },
}));

// Apply theme on initialization
applyThemeMode(initialMode);

// Listen for system preference changes
if (prefersDarkQuery) {
  prefersDarkQuery.addEventListener('change', () => {
    const currentMode = useThemeStore.getState().mode;
    if (currentMode === 'auto') {
      const dark = applyThemeMode('auto');
      useThemeStore.setState({ isDark: dark });
    }
  });
}
