import { create } from 'zustand';
import { api } from '../lib/api';
import { syncUserPreferenceCookies } from '../lib/userPreferences';
import type { User } from '../types/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  setUser: (user: User) => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('nd_token'),
  isAuthenticated: !!localStorage.getItem('nd_token'),
  login: (token, user) => {
    localStorage.setItem('nd_token', token);
    syncUserPreferenceCookies(user);
    set({ token, user, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('nd_token');
    set({ token: null, user: null, isAuthenticated: false });
  },
  setUser: (user) => {
    syncUserPreferenceCookies(user);
    set({ user });
  },
  initialize: async () => {
    const token = localStorage.getItem('nd_token');
    if (!token) return;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const user = await api.get<User>('/api/auth/me', { signal: controller.signal });
      clearTimeout(timeout);
      syncUserPreferenceCookies(user);
      set({ user, token, isAuthenticated: true });
    } catch {
      localStorage.removeItem('nd_token');
      set({ token: null, user: null, isAuthenticated: false });
    }
  },
}));
