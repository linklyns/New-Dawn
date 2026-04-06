import { create } from 'zustand';
import { api } from '../lib/api';

interface User {
  email: string;
  displayName: string;
  role: string;
  has2fa: boolean;
}

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
    set({ token, user, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('nd_token');
    set({ token: null, user: null, isAuthenticated: false });
  },
  setUser: (user) => set({ user }),
  initialize: async () => {
    const token = localStorage.getItem('nd_token');
    if (!token) return;
    try {
      const user = await api.get<User>('/api/auth/me');
      set({ user, token, isAuthenticated: true });
    } catch {
      localStorage.removeItem('nd_token');
      set({ token: null, user: null, isAuthenticated: false });
    }
  },
}));
